import { useState, useEffect } from 'react'
import { createPublicClient, http, encodeFunctionData, type Address } from 'viem'
import { useAccount } from 'wagmi'
import { POSITION_MANAGER } from '@/config/dex'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'
import type { PoolPosition } from './usePoolPositions'

const DECREASE_LIQUIDITY_ABI = [
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
] as const

function getClient(chainId: number) {
  const chain = chainId === LITEFORGE_CHAIN_ID ? liteforge : chainId === SEPOLIA_CHAIN_ID ? sepolia : baseSepolia
  const rpcUrl = chainId === LITEFORGE_CHAIN_ID
    ? 'https://liteforge.rpc.caldera.xyz/http'
    : chainId === SEPOLIA_CHAIN_ID
      ? 'https://sepolia.drpc.org'
      : 'https://base-sepolia-rpc.publicnode.com'
  return createPublicClient({ chain, transport: http(rpcUrl) })
}

export function useRemoveQuote(chainId: number, position: PoolPosition | undefined, percent: number) {
  // Store full (100%) amounts and calculate proportionally
  const [fullAmount0, setFullAmount0] = useState<bigint>(BigInt(0))
  const [fullAmount1, setFullAmount1] = useState<bigint>(BigInt(0))
  const [loading, setLoading] = useState(false)
  const { address } = useAccount()

  // Fetch once for 100% on mount or when position changes
  useEffect(() => {
    if (!position || !address) {
      setFullAmount0(BigInt(0))
      setFullAmount1(BigInt(0))
      return
    }

    const simulate = async () => {
      setLoading(true)
      try {
        const client = getClient(chainId)
        const nftPm = POSITION_MANAGER[chainId] as Address
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)

        const data = encodeFunctionData({
          abi: DECREASE_LIQUIDITY_ABI,
          functionName: 'decreaseLiquidity',
          args: [{
            tokenId: position.tokenId,
            liquidity: position.liquidity, // 100%
            amount0Min: BigInt(0),
            amount1Min: BigInt(0),
            deadline,
          }],
        })

        const result = await client.call({
          to: nftPm,
          data,
          account: address,
        })

        if (result.data) {
          const hex = result.data.slice(2)
          const amt0 = BigInt('0x' + hex.slice(0, 64))
          const amt1 = BigInt('0x' + hex.slice(64, 128))
          setFullAmount0(amt0)
          setFullAmount1(amt1)
        }
      } catch (err) {
        console.error('Remove quote simulation failed:', err)
        setFullAmount0(BigInt(0))
        setFullAmount1(BigInt(0))
      } finally {
        setLoading(false)
      }
    }

    simulate()
  }, [position?.tokenId.toString(), chainId, address])

  // Calculate proportional amounts locally (no RPC needed)
  const amount0 = (fullAmount0 * BigInt(percent) / BigInt(100)).toString()
  const amount1 = (fullAmount1 * BigInt(percent) / BigInt(100)).toString()

  return { amount0, amount1, loading }
}
