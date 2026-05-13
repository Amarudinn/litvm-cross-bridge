import { useState } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { encodeFunctionData, parseUnits, type Address, maxUint256, createPublicClient, http } from 'viem'
import { POSITION_MANAGER, UNISWAP_V3_FACTORY } from '@/config/dex'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'
import { useBalanceStore } from '@/stores/balanceStore'
import type { PoolPosition } from './usePoolPositions'

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const FACTORY_ABI = [
  {
    name: 'getPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'createPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenA', type: 'address' },
      { name: 'tokenB', type: 'address' },
      { name: 'fee', type: 'uint24' },
    ],
    outputs: [{ name: 'pool', type: 'address' }],
  },
] as const

const POOL_ABI = [
  {
    name: 'initialize',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'sqrtPriceX96', type: 'uint160' }],
    outputs: [],
  },
] as const

// 1:1 price = 2^96
const SQRT_PRICE_1_TO_1 = BigInt('79228162514264337593543950336')

// Calculate sqrtPriceX96 from token amounts (after sorting)
// price = amount1Wei / amount0Wei (token1 per token0 in wei)
// sqrtPriceX96 = sqrt(amount1Wei / amount0Wei) * 2^96
// Using: sqrtPriceX96 = sqrt(amount1Wei * 2^192 / amount0Wei) for precision
function calculateSqrtPriceX96(amount0Wei: bigint, amount1Wei: bigint): bigint {
  if (amount0Wei === BigInt(0) || amount1Wei === BigInt(0)) return SQRT_PRICE_1_TO_1

  // For better precision with BigInt:
  // sqrtPriceX96 = sqrt(amount1Wei * 2^192 / amount0Wei)
  // But sqrt of BigInt is tricky, so we use a hybrid approach:
  // Scale both to avoid precision loss
  const Q192 = BigInt(2) ** BigInt(192)

  // Calculate amount1 * 2^192 / amount0
  const numerator = amount1Wei * Q192
  const ratio = numerator / amount0Wei

  // BigInt sqrt using Newton's method
  const sqrtPriceX96 = bigIntSqrt(ratio)

  // Clamp to valid range (MIN_SQRT_RATIO to MAX_SQRT_RATIO)
  const MIN_SQRT_RATIO = BigInt('4295128739')
  const MAX_SQRT_RATIO = BigInt('1461446703485210103287273052203988822378723970342')

  if (sqrtPriceX96 < MIN_SQRT_RATIO) return MIN_SQRT_RATIO
  if (sqrtPriceX96 > MAX_SQRT_RATIO) return MAX_SQRT_RATIO

  return sqrtPriceX96
}

// Newton's method for BigInt square root
function bigIntSqrt(n: bigint): bigint {
  if (n < BigInt(0)) throw new Error('Square root of negative number')
  if (n === BigInt(0)) return BigInt(0)
  if (n === BigInt(1)) return BigInt(1)

  let x = n
  let y = (x + BigInt(1)) / BigInt(2)
  while (y < x) {
    x = y
    y = (x + n / x) / BigInt(2)
  }
  return x
}

const NFT_PM_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'token0', type: 'address' },
        { name: 'token1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickLower', type: 'int24' },
        { name: 'tickUpper', type: 'int24' },
        { name: 'amount0Desired', type: 'uint256' },
        { name: 'amount1Desired', type: 'uint256' },
        { name: 'amount0Min', type: 'uint256' },
        { name: 'amount1Min', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
    }],
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
  {
    name: 'decreaseLiquidity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'liquidity', type: 'uint128' },
        { name: 'amount0Min', type: 'uint256' },
        { name: 'amount1Min', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    }],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
  {
    name: 'collect',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'tokenId', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'amount0Max', type: 'uint128' },
        { name: 'amount1Max', type: 'uint128' },
      ],
    }],
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' },
    ],
  },
] as const

export type PoolActionStatus = 'idle' | 'signing' | 'approving' | 'executing' | 'collecting' | 'success' | 'error'

function getChain(chainId: number) {
  switch (chainId) {
    case LITEFORGE_CHAIN_ID: return liteforge
    case SEPOLIA_CHAIN_ID: return sepolia
    case BASE_SEPOLIA_CHAIN_ID: return baseSepolia
    default: return sepolia
  }
}

function getClient(chainId: number) {
  const chain = getChain(chainId)
  const rpcUrl = chainId === LITEFORGE_CHAIN_ID
    ? 'https://liteforge.rpc.caldera.xyz/http'
    : chainId === SEPOLIA_CHAIN_ID
      ? 'https://sepolia.drpc.org'
      : 'https://base-sepolia-rpc.publicnode.com'
  return createPublicClient({ chain, transport: http(rpcUrl) })
}

export function usePoolActions(chainId: number) {
  const [status, setStatus] = useState<PoolActionStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const { address } = useAccount()
  const currentChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const invalidateBalances = useBalanceStore((s) => s.invalidate)

  const client = getClient(chainId)
  const nftPm = POSITION_MANAGER[chainId] as Address

  // Ensure wallet is on correct chain before executing
  const ensureChain = async () => {
    if (currentChainId !== chainId) {
      await switchChainAsync({ chainId })
      await new Promise((r) => setTimeout(r, 2000))
    }
    // Get current address from wallet
    const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
    return accounts[0] as string
  }

  // Send transaction via window.ethereum (reliable after chain switch)
  const sendTx = async (to: Address, data: `0x${string}`, gas: string, from: string) => {
    const hash = await (window as any).ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from, to, data, gas }],
    })
    return hash as `0x${string}`
  }

  const addLiquidity = async (
    token0: Address,
    token1: Address,
    fee: number,
    tickLower: number,
    tickUpper: number,
    amount0: string,
    amount1: string,
    decimals0: number,
    decimals1: number,
  ) => {
    if (!address) return

    try {
      setError(null)
      setStatus('approving')

      const currentAddress = await ensureChain()
      const amount0Wei = parseUnits(amount0, decimals0)
      const amount1Wei = parseUnits(amount1, decimals1)

      // Check if pool exists, create + initialize if not
      const factoryAddress = UNISWAP_V3_FACTORY[chainId] as Address
      if (factoryAddress) {
        const poolAddress = await client.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'getPool',
          args: [token0, token1, fee],
        })

        if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
          const createPoolData = encodeFunctionData({
            abi: FACTORY_ABI,
            functionName: 'createPool',
            args: [token0, token1, fee],
          })
          const createPoolHash = await sendTx(factoryAddress, createPoolData, '0x4C4B40', currentAddress)
          await client.waitForTransactionReceipt({ hash: createPoolHash })

          const newPoolAddress = await client.readContract({
            address: factoryAddress,
            abi: FACTORY_ABI,
            functionName: 'getPool',
            args: [token0, token1, fee],
          })

          const sqrtPriceX96 = calculateSqrtPriceX96(amount0Wei, amount1Wei)

          if (newPoolAddress && newPoolAddress !== '0x0000000000000000000000000000000000000000') {
            const initData = encodeFunctionData({
              abi: POOL_ABI,
              functionName: 'initialize',
              args: [sqrtPriceX96],
            })
            const initHash = await sendTx(newPoolAddress as Address, initData, '0x30D40', currentAddress)
            await client.waitForTransactionReceipt({ hash: initHash })
          }
        }
      }

      // Check allowance and approve if needed
      setStatus('approving')

      const allowance0 = await client.readContract({
        address: token0,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [currentAddress as Address, nftPm],
      })
      if (allowance0 < amount0Wei) {
        const approve0Data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [nftPm, maxUint256],
        })
        const approve0Hash = await sendTx(token0, approve0Data, '0xEA60', currentAddress)
        await client.waitForTransactionReceipt({ hash: approve0Hash })
      }

      const allowance1 = await client.readContract({
        address: token1,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [currentAddress as Address, nftPm],
      })
      if (allowance1 < amount1Wei) {
        const approve1Data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [nftPm, maxUint256],
        })
        const approve1Hash = await sendTx(token1, approve1Data, '0xEA60', currentAddress)
        await client.waitForTransactionReceipt({ hash: approve1Hash })
      }

      // Mint position
      setStatus('signing')
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)

      const mintData = encodeFunctionData({
        abi: NFT_PM_ABI,
        functionName: 'mint',
        args: [{
          token0,
          token1,
          fee,
          tickLower,
          tickUpper,
          amount0Desired: amount0Wei,
          amount1Desired: amount1Wei,
          amount0Min: BigInt(0),
          amount1Min: BigInt(0),
          recipient: currentAddress as Address,
          deadline,
        }],
      })

      const mintHash = await sendTx(nftPm, mintData, '0xF4240', currentAddress)
      setStatus('executing')
      const receipt = await client.waitForTransactionReceipt({ hash: mintHash })
      if (receipt.status === 'reverted') {
        setError('Add liquidity reverted')
        setStatus('error')
        return
      }

      setStatus('success')
      setTimeout(() => invalidateBalances(), 2000)
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || 'Add liquidity failed')
      setStatus('error')
    }
  }

  const removeLiquidity = async (position: PoolPosition, percent: number) => {
    if (!address) return

    try {
      setError(null)
      setStatus('signing')

      const currentAddress = await ensureChain()
      const liquidityToRemove = position.liquidity * BigInt(percent) / BigInt(100)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)

      // Decrease liquidity
      const decreaseData = encodeFunctionData({
        abi: NFT_PM_ABI,
        functionName: 'decreaseLiquidity',
        args: [{
          tokenId: position.tokenId,
          liquidity: liquidityToRemove,
          amount0Min: BigInt(0),
          amount1Min: BigInt(0),
          deadline,
        }],
      })

      const decreaseHash = await sendTx(nftPm, decreaseData, '0x493E0', currentAddress)
      setStatus('executing')
      const receipt1 = await client.waitForTransactionReceipt({ hash: decreaseHash })
      if (receipt1.status === 'reverted') {
        setError('Remove liquidity reverted')
        setStatus('error')
        return
      }

      // Collect tokens
      setStatus('collecting')
      const collectData = encodeFunctionData({
        abi: NFT_PM_ABI,
        functionName: 'collect',
        args: [{
          tokenId: position.tokenId,
          recipient: currentAddress as Address,
          amount0Max: BigInt('340282366920938463463374607431768211455'),
          amount1Max: BigInt('340282366920938463463374607431768211455'),
        }],
      })

      const collectHash = await sendTx(nftPm, collectData, '0x30D40', currentAddress)
      const receipt2 = await client.waitForTransactionReceipt({ hash: collectHash })
      if (receipt2.status === 'reverted') {
        setError('Collect reverted')
        setStatus('error')
        return
      }

      setStatus('success')
      setTimeout(() => invalidateBalances(), 2000)
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || 'Remove liquidity failed')
      setStatus('error')
    }
  }

  const collectFees = async (position: PoolPosition) => {
    if (!address) return

    try {
      setError(null)
      setStatus('executing')

      const currentAddress = await ensureChain()

      const collectData = encodeFunctionData({
        abi: NFT_PM_ABI,
        functionName: 'collect',
        args: [{
          tokenId: position.tokenId,
          recipient: currentAddress as Address,
          amount0Max: BigInt('340282366920938463463374607431768211455'),
          amount1Max: BigInt('340282366920938463463374607431768211455'),
        }],
      })

      const collectHash = await sendTx(nftPm, collectData, '0x30D40', currentAddress)
      const receipt = await client.waitForTransactionReceipt({ hash: collectHash })
      if (receipt.status === 'reverted') {
        setError('Collect fees reverted')
        setStatus('error')
        return
      }

      setStatus('success')
      setTimeout(() => invalidateBalances(), 2000)
    } catch (err: any) {
      setError(err?.shortMessage || err?.message || 'Collect fees failed')
      setStatus('error')
    }
  }

  const reset = () => {
    setStatus('idle')
    setError(null)
  }

  return { status, error, addLiquidity, removeLiquidity, collectFees, reset }
}
