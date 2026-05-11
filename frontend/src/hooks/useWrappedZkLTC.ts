import { useReadContract } from 'wagmi'
import { WRAPPED_ZKLTC_ADDRESS, WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { wrappedZkLTCAbi } from '@/abi/WrappedZkLTC'
import { useBridgeStore } from '@/stores/bridgeStore'

function useWrappedOnChain(contractAddress: `0x${string}`, chainId: number, userAddress?: `0x${string}`) {
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: contractAddress,
    abi: wrappedZkLTCAbi,
    functionName: 'balanceOf',
    args: [userAddress!],
    chainId,
    query: {
      enabled: !!userAddress,
      refetchInterval: 15000,
    },
  })

  const { data: feePercent, isLoading: feeLoading } = useReadContract({
    address: contractAddress,
    abi: wrappedZkLTCAbi,
    functionName: 'feePercent',
    chainId,
  })

  const { data: minBurnAmount, isLoading: minLoading } = useReadContract({
    address: contractAddress,
    abi: wrappedZkLTCAbi,
    functionName: 'minBurnAmount',
    chainId,
  })

  const { data: totalSupply, isLoading: supplyLoading } = useReadContract({
    address: contractAddress,
    abi: wrappedZkLTCAbi,
    functionName: 'totalSupply',
    chainId,
    query: {
      refetchInterval: 30000,
    },
  })

  const { data: nonce, isLoading: nonceLoading } = useReadContract({
    address: contractAddress,
    abi: wrappedZkLTCAbi,
    functionName: 'nonce',
    chainId,
  })

  return {
    balance: balance as bigint | undefined,
    feePercent: feePercent as bigint | undefined,
    minBurnAmount: minBurnAmount as bigint | undefined,
    totalSupply: totalSupply as bigint | undefined,
    nonce: nonce as bigint | undefined,
    isLoading: balanceLoading || feeLoading || minLoading || supplyLoading || nonceLoading,
  }
}

/**
 * Hook to read WrappedZkLTC data based on current destChain selection
 */
export function useWrappedZkLTC(userAddress?: `0x${string}`) {
  const destChain = useBridgeStore((s) => s.destChain)
  const isBaseSepolia = destChain === 'baseSepolia'

  const contractAddress = isBaseSepolia ? WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS : WRAPPED_ZKLTC_ADDRESS
  const chainId = isBaseSepolia ? BASE_SEPOLIA_CHAIN_ID : SEPOLIA_CHAIN_ID

  return useWrappedOnChain(contractAddress, chainId, userAddress)
}
