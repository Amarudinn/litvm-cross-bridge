import { useState, useEffect } from 'react'
import { createPublicClient, http, type Address } from 'viem'
import { UNISWAP_V3_FACTORY } from '@/config/dex'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'

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
] as const

const POOL_SLOT0_ABI = [
  {
    name: 'slot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
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

export interface PoolInfo {
  exists: boolean
  poolAddress: string | null
  price: number | null // token1 per token0
}

export function usePoolInfo(chainId: number, token0Address: string, token1Address: string, fee: number) {
  const [info, setInfo] = useState<PoolInfo>({ exists: false, poolAddress: null, price: null })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token0Address || !token1Address || token0Address === 'native' || token1Address === 'native') {
      setInfo({ exists: false, poolAddress: null, price: null })
      return
    }

    const fetchPoolInfo = async () => {
      setLoading(true)
      try {
        const client = getClient(chainId)
        const factoryAddress = UNISWAP_V3_FACTORY[chainId] as Address
        if (!factoryAddress) {
          setInfo({ exists: false, poolAddress: null, price: null })
          return
        }

        // Sort tokens
        let t0 = token0Address as Address
        let t1 = token1Address as Address
        let swapped = false
        if (t0.toLowerCase() > t1.toLowerCase()) {
          [t0, t1] = [t1, t0]
          swapped = true
        }

        const poolAddress = await client.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'getPool',
          args: [t0, t1, fee],
        })

        if (!poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
          setInfo({ exists: false, poolAddress: null, price: null })
          return
        }

        // Get current price from slot0
        const slot0 = await client.readContract({
          address: poolAddress as Address,
          abi: POOL_SLOT0_ABI,
          functionName: 'slot0',
        })

        const sqrtPriceX96 = slot0[0]
        // price = (sqrtPriceX96 / 2^96)^2
        const Q96 = BigInt(2) ** BigInt(96)
        const priceRaw = Number(sqrtPriceX96) / Number(Q96)
        let price = priceRaw * priceRaw

        // If tokens were swapped, invert price
        if (swapped) {
          price = price > 0 ? 1 / price : 0
        }

        setInfo({ exists: true, poolAddress: poolAddress as string, price })
      } catch (err) {
        console.error('Failed to fetch pool info:', err)
        setInfo({ exists: false, poolAddress: null, price: null })
      } finally {
        setLoading(false)
      }
    }

    const timeout = setTimeout(fetchPoolInfo, 300)
    return () => clearTimeout(timeout)
  }, [chainId, token0Address, token1Address, fee])

  return { ...info, loading }
}
