import { type Address, parseUnits, decodeFunctionResult, encodeFunctionData, createPublicClient, http } from 'viem'
import { DexId, type DexConfig, getDexesForChain, WETH_ADDRESS } from '@/config/dex'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'
import type { Token } from '@/config/tokens'

// --- Types ---

export interface DexQuote {
  dexId: DexId
  dexName: string
  routerAddress: string
  amountOut: bigint
  // V3-specific
  fee?: number
  sqrtPriceX96After?: bigint
  // V2-specific
  v2Path?: string[]
}

// --- ABIs ---

const QUOTER_V2_ABI = [
  {
    name: 'quoteExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'fee', type: 'uint24' },
          { name: 'sqrtPriceLimitX96', type: 'uint160' },
        ],
      },
    ],
    outputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'sqrtPriceX96After', type: 'uint160' },
      { name: 'initializedTicksCrossed', type: 'uint32' },
      { name: 'gasEstimate', type: 'uint256' },
    ],
  },
] as const

const V2_ROUTER_ABI = [
  {
    name: 'getAmountsOut',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const

// --- Client ---

function getClientForChain(chainId: number) {
  const chain = chainId === LITEFORGE_CHAIN_ID ? liteforge : chainId === SEPOLIA_CHAIN_ID ? sepolia : baseSepolia
  const rpcUrl = chainId === LITEFORGE_CHAIN_ID
    ? 'https://liteforge.rpc.caldera.xyz/http'
    : chainId === SEPOLIA_CHAIN_ID
      ? 'https://sepolia.drpc.org'
      : 'https://base-sepolia-rpc.publicnode.com'
  return createPublicClient({ chain, transport: http(rpcUrl) })
}

// --- V3 Quoter ---

async function quoteV3(
  chainId: number,
  dex: DexConfig,
  tokenInAddress: string,
  tokenOutAddress: string,
  amountInWei: bigint,
  wethAddress: string,
): Promise<DexQuote | null> {
  if (!dex.quoterAddress) return null

  const resolvedIn = tokenInAddress === 'native' ? wethAddress : tokenInAddress
  const resolvedOut = tokenOutAddress === 'native' ? wethAddress : tokenOutAddress
  const feeTiers = dex.feeTiers ?? [500, 3000, 10000]
  const client = getClientForChain(chainId)

  const results = await Promise.allSettled(
    feeTiers.map(async (fee) => {
      const calldata = encodeFunctionData({
        abi: QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: resolvedIn as Address,
            tokenOut: resolvedOut as Address,
            amountIn: amountInWei,
            fee,
            sqrtPriceLimitX96: BigInt(0),
          },
        ],
      })

      const { data } = await client.call({
        to: dex.quoterAddress as Address,
        data: calldata,
        blockTag: 'latest',
      })

      if (!data || data === '0x') throw new Error('No data')

      const result = decodeFunctionResult({
        abi: QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        data,
      })

      return { fee, amountOut: result[0] as bigint, sqrtPriceX96After: result[1] as bigint }
    })
  )

  // Pick best fee tier
  let best: { fee: number; amountOut: bigint; sqrtPriceX96After: bigint } | null = null
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.amountOut > 0n) {
      if (!best || r.value.amountOut > best.amountOut) {
        best = r.value
      }
    }
  }

  if (!best) return null

  return {
    dexId: dex.id,
    dexName: dex.name,
    routerAddress: dex.routerAddress,
    amountOut: best.amountOut,
    fee: best.fee,
    sqrtPriceX96After: best.sqrtPriceX96After,
  }
}

// --- V2 Quoter ---

async function quoteV2(
  chainId: number,
  dex: DexConfig,
  tokenInAddress: string,
  tokenOutAddress: string,
  amountInWei: bigint,
  wethAddress: string,
): Promise<DexQuote | null> {
  const resolvedIn = tokenInAddress === 'native' ? wethAddress : tokenInAddress
  const resolvedOut = tokenOutAddress === 'native' ? wethAddress : tokenOutAddress
  const client = getClientForChain(chainId)

  // Try direct path first, then multi-hop via WETH
  const paths: Address[][] = [
    [resolvedIn as Address, resolvedOut as Address],
  ]

  // Add WETH hop if tokens aren't already WETH
  if (resolvedIn.toLowerCase() !== wethAddress.toLowerCase() && resolvedOut.toLowerCase() !== wethAddress.toLowerCase()) {
    paths.push([resolvedIn as Address, wethAddress as Address, resolvedOut as Address])
  }

  let bestResult: { amountOut: bigint; path: Address[] } | null = null

  for (const path of paths) {
    try {
      const calldata = encodeFunctionData({
        abi: V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountInWei, path],
      })

      const { data } = await client.call({
        to: dex.routerAddress as Address,
        data: calldata,
      })

      if (!data || data === '0x') continue

      const result = decodeFunctionResult({
        abi: V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        data,
      })

      // result is an array of amounts (or wrapped in array depending on viem version)
      const amounts = (Array.isArray(result[0]) ? result[0] : result) as bigint[]
      const amountOut = amounts[amounts.length - 1]

      if (amountOut > 0n && (!bestResult || amountOut > bestResult.amountOut)) {
        bestResult = { amountOut, path }
      }
    } catch {
      // Path doesn't exist or no liquidity, try next
      continue
    }
  }

  if (!bestResult) return null

  return {
    dexId: dex.id,
    dexName: dex.name,
    routerAddress: dex.routerAddress,
    amountOut: bestResult.amountOut,
    v2Path: bestResult.path as string[],
  }
}

// --- Multi-DEX Quote ---

export async function getMultiDexQuotes(
  chainId: number,
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
): Promise<DexQuote[]> {
  const dexes = getDexesForChain(chainId)
  const weth = WETH_ADDRESS[chainId]
  if (!weth || dexes.length === 0) return []

  const amountInWei = parseUnits(amountIn, tokenIn.decimals)
  if (amountInWei === 0n) return []

  const quotePromises = dexes.map((dex) => {
    if (dex.type === 'v3') {
      return quoteV3(chainId, dex, tokenIn.address, tokenOut.address, amountInWei, weth)
    } else if (dex.type === 'v2') {
      // Use DEX-specific WETH if available, otherwise fallback to global
      const v2Weth = dex.wethAddress || weth
      return quoteV2(chainId, dex, tokenIn.address, tokenOut.address, amountInWei, v2Weth)
    }
    return Promise.resolve(null)
  })

  const results = await Promise.allSettled(quotePromises)

  return results
    .filter((r): r is PromiseFulfilledResult<DexQuote | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((q): q is DexQuote => q !== null)
}

export function pickBestQuote(quotes: DexQuote[]): DexQuote | null {
  if (quotes.length === 0) return null
  return quotes.reduce((best, q) => q.amountOut > best.amountOut ? q : best)
}
