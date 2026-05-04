import { useEffect } from 'react'
import { useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useBridgeStore } from '@/stores/bridgeStore'
import { WRAPPED_ZKLTC_ADDRESS, BRIDGE_VAULT_ADDRESS } from '@/config/contracts'
import { wrappedZkLTCAbi } from '@/abi/WrappedZkLTC'
import { bridgeVaultAbi } from '@/abi/BridgeVault'

export function useTransactionStatus() {
  const activeTx = useBridgeStore((s) => s.activeTx)
  const direction = useBridgeStore((s) => s.direction)
  const setActiveTx = useBridgeStore((s) => s.setActiveTx)

  const sourceChainId = direction === 'lock' ? 4441 : 11155111

  // Step 1: Wait for source chain confirmation
  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: activeTx.hash ?? undefined,
    chainId: sourceChainId,
    query: {
      enabled: !!activeTx.hash && activeTx.status === 'confirming',
    },
  })

  // Set startedAt when status moves to confirming (tx submitted to blockchain)
  useEffect(() => {
    if (activeTx.status === 'confirming' && !activeTx.startedAt) {
      setActiveTx({ startedAt: Date.now() })
    }
  }, [activeTx.status, activeTx.startedAt, setActiveTx])

  // Step 2: When source tx is confirmed, extract nonce from event log and move to relaying
  useEffect(() => {
    if (isConfirmed && receipt && activeTx.status === 'confirming') {
      const logs = receipt.logs
      if (logs.length > 0) {
        // Find the Locked or Burned event log (last log from our contract)
        const lastLog = logs[logs.length - 1]
        const data = lastLog.data
        if (data && data.length >= 66) {
          // Both Locked and Burned events have nonce as the last uint256 in data
          // Locked(sender, recipient, amount, fee, nonce) → data = amount(32) + fee(32) + nonce(32)
          // Burned(sender, recipient, amount, fee, nonce) → data = amount(32) + fee(32) + nonce(32)
          const nonceHex = ('0x' + data.slice(-64)) as `0x${string}`
          const sourceNonce = BigInt(nonceHex)
          setActiveTx({ status: 'relaying', sourceNonce })
        } else {
          setActiveTx({ status: 'relaying' })
        }
      } else {
        setActiveTx({ status: 'relaying' })
      }
    }
  }, [isConfirmed, receipt, activeTx.status, setActiveTx])

  // Step 3: Poll destination chain isProcessed(sourceTxHash, sourceNonce)
  // The contract's isProcessed() takes the SOURCE tx hash and SOURCE nonce,
  // then internally computes processId = keccak256(abi.encodePacked(txHash, nonce))
  const destChainId = direction === 'lock' ? 11155111 : 4441
  const destAddress = direction === 'lock' ? WRAPPED_ZKLTC_ADDRESS : BRIDGE_VAULT_ADDRESS
  const destAbi = direction === 'lock' ? wrappedZkLTCAbi : bridgeVaultAbi

  const canPoll =
    activeTx.status === 'relaying' &&
    !!activeTx.hash &&
    activeTx.sourceNonce !== undefined

  const { data: isProcessed } = useReadContract({
    address: destAddress,
    abi: destAbi,
    functionName: 'isProcessed',
    args: canPoll ? [activeTx.hash!, activeTx.sourceNonce!] : undefined,
    chainId: destChainId,
    query: {
      enabled: canPoll,
      refetchInterval: 5000,
    },
  })

  // Step 4: When relay is confirmed on destination, mark as completed
  useEffect(() => {
    if (isProcessed === true && activeTx.status === 'relaying') {
      setActiveTx({ status: 'completed', completedAt: Date.now() })
    }
  }, [isProcessed, activeTx.status, setActiveTx])

  return {
    status: activeTx.status,
    hash: activeTx.hash,
    error: activeTx.error,
    receipt,
    sourceChainId,
    destChainId,
  }
}
