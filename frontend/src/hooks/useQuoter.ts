import { usePublicClient } from 'wagmi'
import { type Address, parseUnits, decodeFunctionResult, encodeFunctionData, createPublicClient, http } from 'viem'
import { QUOTER_V2 } from '@/config/dex'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'
import type { Token } from '@/config/tokens'

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

export interface QuoteResult {
  amountOut: bigint
  sqrtPriceX96After: bigint
  gasEstimate: bigint
}

// Create dedicated client per chain for quoting
function getClientForChain(chainId: number) {
  const chain = chainId === LITEFORGE_CHAIN_ID ? liteforge : chainId === SEPOLIA_CHAIN_ID ? sepolia : baseSepolia
  const rpcUrl = chainId === LITEFORGE_CHAIN_ID
    ? 'https://liteforge.rpc.caldera.xyz/http'
    : chainId === SEPOLIA_CHAIN_ID
      ? 'https://sepolia.drpc.org'
      : 'https://base-sepolia-rpc.publicnode.com'
  return createPublicClient({ chain, transport: http(rpcUrl) })
}

export function useQuoter() {
  const getQuote = async (
    chainId: number,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string,
    fee: number = 3000
  ): Promise<QuoteResult | null> => {
    const quoterAddress = QUOTER_V2[chainId] as Address
    if (!quoterAddress) return null

    try {
      const amountInWei = parseUnits(amountIn, tokenIn.decimals)
      const client = getClientForChain(chainId)

      const calldata = encodeFunctionData({
        abi: QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        args: [
          {
            tokenIn: tokenIn.address as Address,
            tokenOut: tokenOut.address as Address,
            amountIn: amountInWei,
            fee,
            sqrtPriceLimitX96: BigInt(0),
          },
        ],
      })

      // Use raw call — QuoterV2 uses state-modifying pattern
      const { data } = await client.call({
        to: quoterAddress,
        data: calldata,
        blockTag: 'latest',
      })

      if (!data || data === '0x') return null

      const result = decodeFunctionResult({
        abi: QUOTER_V2_ABI,
        functionName: 'quoteExactInputSingle',
        data,
      })

      return {
        amountOut: result[0],
        sqrtPriceX96After: result[1],
        gasEstimate: result[3],
      }
    } catch (err) {
      console.error('Quote failed:', err)
      return null
    }
  }

  return { getQuote }
}
