import { useReadContract } from 'wagmi'
import { BRIDGE_VAULT_ADDRESS } from '@/config/contracts'
import { bridgeVaultV2Abi } from '@/abi/BridgeVaultV2'

export function useBridgeVault() {
  const { data: feePercent, isLoading: feeLoading } = useReadContract({
    address: BRIDGE_VAULT_ADDRESS,
    abi: bridgeVaultV2Abi,
    functionName: 'feePercent',
    chainId: 4441,
  })

  const { data: minLockAmount, isLoading: minLoading } = useReadContract({
    address: BRIDGE_VAULT_ADDRESS,
    abi: bridgeVaultV2Abi,
    functionName: 'minLockAmount',
    chainId: 4441,
  })

  const { data: availableBalance, isLoading: balanceLoading } = useReadContract({
    address: BRIDGE_VAULT_ADDRESS,
    abi: bridgeVaultV2Abi,
    functionName: 'availableBalance',
    chainId: 4441,
    query: {
      refetchInterval: 15000,
    },
  })

  const { data: nonce, isLoading: nonceLoading } = useReadContract({
    address: BRIDGE_VAULT_ADDRESS,
    abi: bridgeVaultV2Abi,
    functionName: 'nonce',
    chainId: 4441,
  })

  return {
    feePercent: feePercent as bigint | undefined,
    minLockAmount: minLockAmount as bigint | undefined,
    availableBalance: availableBalance as bigint | undefined,
    nonce: nonce as bigint | undefined,
    isLoading: feeLoading || minLoading || balanceLoading || nonceLoading,
  }
}
