import { useWriteContract } from 'wagmi'
import { BRIDGE_VAULT_ADDRESS, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { bridgeVaultV2Abi } from '@/abi/BridgeVaultV2'
import { useBridgeStore } from '@/stores/bridgeStore'

export function useLock() {
  const { writeContractAsync } = useWriteContract()
  const setActiveTx = useBridgeStore((s) => s.setActiveTx)
  const destChain = useBridgeStore((s) => s.destChain)

  const lock = async (amountWei: bigint, recipient: `0x${string}`) => {
    setActiveTx({ status: 'signing', hash: null })

    const destChainId = destChain === 'baseSepolia' ? BASE_SEPOLIA_CHAIN_ID : SEPOLIA_CHAIN_ID

    try {
      const hash = await writeContractAsync({
        address: BRIDGE_VAULT_ADDRESS,
        abi: bridgeVaultV2Abi,
        functionName: 'lock',
        args: [recipient, BigInt(destChainId)],
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
