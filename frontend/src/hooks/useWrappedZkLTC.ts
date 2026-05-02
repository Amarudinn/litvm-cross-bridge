import { useReadContract } from 'wagmi'
import { WRAPPED_ZKLTC_ADDRESS } from '@/config/contracts'
import { wrappedZkLTCAbi } from '@/abi/WrappedZkLTC'

export function useWrappedZkLTC(userAddress?: `0x${string}`) {
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: WRAPPED_ZKLTC_ADDRESS,
    abi: wrappedZkLTCAbi,
    functionName: 'balanceOf',
    args: [userAddress!],
    chainId: 11155111,
    query: {
      enabled: !!userAddress,
      refetchInterval: 15000,
    },
  })

  const { data: feePercent, isLoading: feeLoading } = useReadContract({
    address: WRAPPED_ZKLTC_ADDRESS,
    abi: wrappedZkLTCAbi,
    functionName: 'feePercent',
    chainId: 11155111,
  })

  const { data: minBurnAmount, isLoading: minLoading } = useReadContract({
    address: WRAPPED_ZKLTC_ADDRESS,
    abi: wrappedZkLTCAbi,
    functionName: 'minBurnAmount',
    chainId: 11155111,
  })

  const { data: totalSupply, isLoading: supplyLoading } = useReadContract({
    address: WRAPPED_ZKLTC_ADDRESS,
    abi: wrappedZkLTCAbi,
    functionName: 'totalSupply',
    chainId: 11155111,
    query: {
      refetchInterval: 30000,
    },
  })

  const { data: nonce, isLoading: nonceLoading } = useReadContract({
    address: WRAPPED_ZKLTC_ADDRESS,
    abi: wrappedZkLTCAbi,
    functionName: 'nonce',
    chainId: 11155111,
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
