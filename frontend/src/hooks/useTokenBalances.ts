import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { formatUnits, type Address, createPublicClient, http } from 'viem'
import { getTokensByChain } from '@/config/tokens'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'
import { useBalanceStore } from '@/stores/balanceStore'

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

function getClientForChain(chainId: number) {
  const chain = chainId === LITEFORGE_CHAIN_ID ? liteforge : chainId === SEPOLIA_CHAIN_ID ? sepolia : baseSepolia
  const rpcUrl = chainId === LITEFORGE_CHAIN_ID
    ? 'https://liteforge.rpc.caldera.xyz/http'
    : chainId === SEPOLIA_CHAIN_ID
      ? 'https://ethereum-sepolia-rpc.publicnode.com'
      : 'https://base-sepolia-rpc.publicnode.com'
  return createPublicClient({ chain, transport: http(rpcUrl) })
}

export function useTokenBalances(chainId: number) {
  const [balances, setBalances] = useState<Record<string, string>>({})
  const { address } = useAccount()
  const version = useBalanceStore((s) => s.version)

  useEffect(() => {
    if (!address) {
      setBalances({})
      return
    }

    const fetchBalances = async () => {
      const client = getClientForChain(chainId)
      const tokens = getTokensByChain(chainId)
      const result: Record<string, string> = {}

      for (const token of tokens) {
        try {
          if (token.address === 'native') {
            const balance = await client.getBalance({ address })
            result[token.symbol] = formatUnits(balance, token.decimals)
          } else {
            const balance = await client.readContract({
              address: token.address as Address,
              abi: ERC20_BALANCE_ABI,
              functionName: 'balanceOf',
              args: [address],
            })
            result[token.symbol] = formatUnits(balance, token.decimals)
          }
        } catch {
          result[token.symbol] = '0'
        }
      }

      setBalances(result)
    }

    fetchBalances()
  }, [address, chainId, version])

  return balances
}
