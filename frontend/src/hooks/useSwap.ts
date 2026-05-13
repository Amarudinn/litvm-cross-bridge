import { useState } from 'react'
import { useAccount, useChainId, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, encodeFunctionData, type Address, maxUint256, createPublicClient, http } from 'viem'
import { useSwapStore } from '@/stores/swapStore'
import { useBalanceStore } from '@/stores/balanceStore'
import { MULTYRA_ROUTER_ADDRESS, WETH_ADDRESS } from '@/config/dex'
import { POOLS } from '@/config/pools'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const MULTYRA_ROUTER_ABI = [
  {
    name: 'swapExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'poolFee', type: 'uint24' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMinimum', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'swapExactNativeForToken',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenOut', type: 'address' },
      { name: 'poolFee', type: 'uint24' },
      { name: 'amountOutMinimum', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    name: 'swapExactInputSingleAndUnwrap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'poolFee', type: 'uint24' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMinimum', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const

export type SwapStatus = 'idle' | 'checking-allowance' | 'approving' | 'swapping' | 'success' | 'error'

export function useSwap() {
  const [status, setStatus] = useState<SwapStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { address } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const invalidateBalances = useBalanceStore((s) => s.invalidate)

  const { tokenIn, tokenOut, amountIn, amountOut, slippage, fromChainId, route } = useSwapStore()

  // Find the correct fee tier for the token pair
  const getPoolFee = (): number => {
    // Use fee tier from route (already determined by best quote)
    if (route && route.pools[0]) {
      const tier = parseInt(route.pools[0])
      if (!isNaN(tier) && tier > 0) return tier
    }
    if (!tokenIn || !tokenOut) return 3000
    // Fallback: lookup from POOLS config
    const symbolIn = tokenIn.address === 'native' ? 'WETH' : tokenIn.symbol
    const symbolOut = tokenOut.address === 'native' ? 'WETH' : tokenOut.symbol
    const pool = POOLS.find(
      (p) =>
        p.chainId === fromChainId &&
        ((p.token0 === symbolIn && p.token1 === symbolOut) ||
          (p.token0 === symbolOut && p.token1 === symbolIn))
    )
    return pool?.feeTier ?? 3000
  }

  // Get chain object for writeContract
  const getChain = () => {
    switch (fromChainId) {
      case 4441: return liteforge
      case 11155111: return sepolia
      case 84532: return baseSepolia
      default: return sepolia
    }
  }

  // Dedicated public client for the source chain (not tied to wallet active chain)
  const getClient = () => {
    const chain = getChain()
    const rpcUrl = fromChainId === LITEFORGE_CHAIN_ID
      ? 'https://liteforge.rpc.caldera.xyz/http'
      : fromChainId === SEPOLIA_CHAIN_ID
        ? 'https://sepolia.drpc.org'
        : 'https://base-sepolia-rpc.publicnode.com'
    return createPublicClient({ chain, transport: http(rpcUrl) })
  }

  const execute = async () => {
    if (!address || !walletClient || !publicClient || !tokenIn || !tokenOut || !amountIn || !amountOut) {
      return
    }

    // Ensure wallet is on the correct chain
    if (chainId !== fromChainId) {
      setError('Please switch to the correct network first')
      setStatus('error')
      return
    }

    const routerAddress = MULTYRA_ROUTER_ADDRESS[fromChainId] as Address
    if (!routerAddress) {
      setError('Router not available on this chain')
      setStatus('error')
      return
    }

    try {
      setError(null)
      setTxHash(null)

      const amountInWei = parseUnits(amountIn, tokenIn.decimals)
      const slippageBps = Math.floor(parseFloat(slippage) * 100)
      // For small testnet pools, use generous slippage to avoid reverts
      // minOut = estimated * (1 - slippage%) with minimum 50% tolerance
      const estimatedOut = parseUnits(amountOut, tokenOut.decimals)
      const slippageMultiplier = Math.max(10000 - slippageBps * 10, 5000) // at least 50% tolerance
      const minOut = estimatedOut * BigInt(slippageMultiplier) / BigInt(10000)
      const poolFee = getPoolFee()
      const chain = getChain()

      const isNativeIn = tokenIn.address === 'native'
      const isNativeOut = tokenOut.address === 'native'
      const wethAddress = WETH_ADDRESS[fromChainId] as Address

      // Check if this is a simple wrap (native → WETH) or unwrap (WETH → native)
      const isWrap = isNativeIn && tokenOut.address?.toLowerCase() === wethAddress?.toLowerCase()
      const isUnwrap = isNativeOut && tokenIn.address?.toLowerCase() === wethAddress?.toLowerCase()

      if (isWrap) {
        // Wrap: deposit native to WETH contract
        setStatus('swapping')
        const hash = await walletClient.sendTransaction({
          to: wethAddress,
          value: amountInWei,
          chain,
          data: '0xd0e30db0' as `0x${string}`, // deposit()
          gas: BigInt(60000),
        })
        setTxHash(hash)
        await getClient().waitForTransactionReceipt({ hash })
        setStatus('success')
        invalidateBalances()
        return
      }

      if (isUnwrap) {
        // Unwrap: withdraw WETH to native
        setStatus('swapping')
        const withdrawData = encodeFunctionData({
          abi: [{ name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'wad', type: 'uint256' }], outputs: [] }] as const,
          functionName: 'withdraw',
          args: [amountInWei],
        })
        const hash = await walletClient.sendTransaction({
          to: wethAddress,
          data: withdrawData,
          chain,
          gas: BigInt(60000),
        })
        setTxHash(hash)
        await getClient().waitForTransactionReceipt({ hash })
        setStatus('success')
        invalidateBalances()
        return
      }

      // Resolve actual addresses (native → WETH)
      const resolvedTokenOut = isNativeOut ? wethAddress : (tokenOut.address as Address)

      if (isNativeIn) {
        // Native token swap (zkLTC on LiteForge)
        setStatus('swapping')

        const swapData = encodeFunctionData({
          abi: MULTYRA_ROUTER_ABI,
          functionName: 'swapExactNativeForToken',
          args: [resolvedTokenOut, poolFee, minOut],
        })

        const hash = await walletClient.sendTransaction({
          to: routerAddress,
          data: swapData,
          value: amountInWei,
          chain,
          gas: BigInt(300000),
        })

        setTxHash(hash)

        await getClient().waitForTransactionReceipt({ hash })
        setStatus('success')
        invalidateBalances()
      } else {
        // ERC-20 swap — check allowance first
        setStatus('checking-allowance')

        const allowance = await getClient().readContract({
          address: tokenIn.address as Address,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, routerAddress],
        })

        if (allowance < amountInWei) {
          // Approve using sendTransaction with explicit gas
          setStatus('approving')

          const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [routerAddress, maxUint256],
          })

          const approveHash = await walletClient.sendTransaction({
            to: tokenIn.address as Address,
            data: approveData,
            chain,
            gas: BigInt(60000),
          })

          await getClient().waitForTransactionReceipt({ hash: approveHash })
        }

        // Execute swap
        setStatus('swapping')

        let swapData: `0x${string}`
        if (isNativeOut) {
          // Swap ERC-20 → native (swap + unwrap in 1 tx)
          swapData = encodeFunctionData({
            abi: MULTYRA_ROUTER_ABI,
            functionName: 'swapExactInputSingleAndUnwrap',
            args: [
              tokenIn.address as Address,
              poolFee,
              amountInWei,
              minOut,
            ],
          })
        } else {
          // Swap ERC-20 → ERC-20
          swapData = encodeFunctionData({
            abi: MULTYRA_ROUTER_ABI,
            functionName: 'swapExactInputSingle',
            args: [
              tokenIn.address as Address,
              resolvedTokenOut,
              poolFee,
              amountInWei,
              minOut,
            ],
          })
        }

        const hash = await walletClient.sendTransaction({
          to: routerAddress,
          data: swapData,
          chain,
          gas: BigInt(350000),
        })

        setTxHash(hash)

        const receipt = await getClient().waitForTransactionReceipt({ hash })
        if (receipt.status === 'reverted') {
          setError('Transaction reverted on-chain')
          setStatus('error')
          return
        }

        setStatus('success')
        invalidateBalances()
      }
    } catch (err: any) {
      console.error('Swap failed:', err)
      setStatus('error')
      const message = err?.shortMessage || err?.message || 'Swap failed'
      setError(message)
    }
  }

  const reset = () => {
    setStatus('idle')
    setTxHash(null)
    setError(null)
  }

  return {
    status,
    txHash,
    error,
    execute,
    reset,
  }
}
