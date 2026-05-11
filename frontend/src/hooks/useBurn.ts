import { useWriteContract } from 'wagmi'
import { WRAPPED_ZKLTC_ADDRESS, WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { wrappedZkLTCAbi } from '@/abi/WrappedZkLTC'
import { useBridgeStore } from '@/stores/bridgeStore'

export function useBurn() {
  const { writeContractAsync } = useWriteContract()
  const setActiveTx = useBridgeStore((s) => s.setActiveTx)
  const destChain = useBridgeStore((s) => s.destChain)

  const burn = async (amountWei: bigint, recipient: `0x${string}`) => {
    setActiveTx({ status: 'signing', hash: null })

    // Determine which WrappedZkLTC contract to burn from
    const isBaseSepolia = destChain === 'baseSepolia'
    const contractAddress = isBaseSepolia ? WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS : WRAPPED_ZKLTC_ADDRESS
    const chainId = isBaseSepolia ? BASE_SEPOLIA_CHAIN_ID : SEPOLIA_CHAIN_ID

    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: wrappedZkLTCAbi,
        functionName: 'burn',
        args: [amountWei, recipient],
        chainId,
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
