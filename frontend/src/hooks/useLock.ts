import { useWriteContract } from 'wagmi'
import { BRIDGE_VAULT_ADDRESS } from '@/config/contracts'
import { bridgeVaultAbi } from '@/abi/BridgeVault'
import { useBridgeStore } from '@/stores/bridgeStore'

export function useLock() {
  const { writeContractAsync } = useWriteContract()
  const setActiveTx = useBridgeStore((s) => s.setActiveTx)

  const lock = async (amountWei: bigint, recipient: `0x${string}`) => {
    setActiveTx({ status: 'signing', hash: null })
    try {
      const hash = await writeContractAsync({
        address: BRIDGE_VAULT_ADDRESS,
        abi: bridgeVaultAbi,
        functionName: 'lock',
        args: [recipient],
        value: amountWei,
        chainId: 4441,
      })
      setActiveTx({ hash, status: 'confirming' })
      return hash
    } catch (err: unknown) {
      const error = err as { shortMessage?: string; message?: string }
      setActiveTx({
        status: 'failed',
        error: error?.shortMessage || error?.message || 'Transaction failed',
      })
      throw err
    }
  }

  return { lock }
}
