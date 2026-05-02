import { useWriteContract } from 'wagmi'
import { WRAPPED_ZKLTC_ADDRESS } from '@/config/contracts'
import { wrappedZkLTCAbi } from '@/abi/WrappedZkLTC'
import { useBridgeStore } from '@/stores/bridgeStore'

export function useBurn() {
  const { writeContractAsync } = useWriteContract()
  const setActiveTx = useBridgeStore((s) => s.setActiveTx)

  const burn = async (amountWei: bigint, recipient: `0x${string}`) => {
    setActiveTx({ status: 'signing', hash: null })
    try {
      const hash = await writeContractAsync({
        address: WRAPPED_ZKLTC_ADDRESS,
        abi: wrappedZkLTCAbi,
        functionName: 'burn',
        args: [amountWei, recipient],
        chainId: 11155111,
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

  return { burn }
}
