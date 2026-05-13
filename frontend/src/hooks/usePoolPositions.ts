import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { type Address, createPublicClient, http, formatUnits } from 'viem'
import { POSITION_MANAGER } from '@/config/dex'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'
import { useBalanceStore } from '@/stores/balanceStore'

const NFT_POSITION_MANAGER_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'positions',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'nonce', type: 'uint96' },
      { name: 'operator', type: 'address' },
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'feeGrowthInside0LastX128', type: 'uint256' },
      { name: 'feeGrowthInside1LastX128', type: 'uint256' },
      { name: 'tokensOwed0', type: 'uint128' },
      { name: 'tokensOwed1', type: 'uint128' },
    ],
  },
] as const

export interface PoolPosition {
  tokenId: bigint
  token0: string
  token1: string
  fee: number
  tickLower: number
  tickUpper: number
  liquidity: bigint
  tokensOwed0: bigint
  tokensOwed1: bigint
}

function getClientForChain(chainId: number) {
  const chain = chainId === LITEFORGE_CHAIN_ID ? liteforge : chainId === SEPOLIA_CHAIN_ID ? sepolia : baseSepolia
  const rpcUrl = chainId === LITEFORGE_CHAIN_ID
    ? 'https://liteforge.rpc.caldera.xyz/http'
    : chainId === SEPOLIA_CHAIN_ID
      ? 'https://sepolia.drpc.org'
      : 'https://base-sepolia-rpc.publicnode.com'
  return createPublicClient({ chain, transport: http(rpcUrl) })
}

export function usePoolPositions(chainId: number) {
  const [positions, setPositions] = useState<PoolPosition[]>([])
  const [loading, setLoading] = useState(false)
  const { address } = useAccount()
  const version = useBalanceStore((s) => s.version)

  useEffect(() => {
    if (!address) {
      setPositions([])
      return
    }

    const fetchPositions = async () => {
      setLoading(true)
      try {
        const client = getClientForChain(chainId)
        const nftPm = POSITION_MANAGER[chainId] as Address
        if (!nftPm) {
          setPositions([])
          return
        }

        // Get number of positions
        const balance = await client.readContract({
          address: nftPm,
          abi: NFT_POSITION_MANAGER_ABI,
          functionName: 'balanceOf',
          args: [address],
        })

        const count = Number(balance)
        if (count === 0) {
          setPositions([])
          setLoading(false)
          return
        }

        // Fetch each position in parallel
        const tokenIds = await Promise.all(
          Array.from({ length: count }, (_, i) =>
            client.readContract({
              address: nftPm,
              abi: NFT_POSITION_MANAGER_ABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [address, BigInt(i)],
            }).catch(() => null)
          )
        )

        const positionData = await Promise.all(
          tokenIds
            .filter((id): id is bigint => id !== null)
            .map((tokenId) =>
              client.readContract({
                address: nftPm,
                abi: NFT_POSITION_MANAGER_ABI,
                functionName: 'positions',
                args: [tokenId],
              }).then(pos => ({ tokenId, pos })).catch(() => null)
            )
        )

        const results: PoolPosition[] = positionData
          .filter((item): item is { tokenId: bigint; pos: any } => item !== null && item.pos[7] > BigInt(0))
          .map(({ tokenId, pos }) => ({
            tokenId,
            token0: pos[2],
            token1: pos[3],
            fee: pos[4],
            tickLower: pos[5],
            tickUpper: pos[6],
            liquidity: pos[7],
            tokensOwed0: pos[10],
            tokensOwed1: pos[11],
          }))

        setPositions(results)
      } catch (err) {
        console.error('Failed to fetch positions:', err)
        setPositions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPositions()
  }, [address, chainId, version])

  return { positions, loading }
}
