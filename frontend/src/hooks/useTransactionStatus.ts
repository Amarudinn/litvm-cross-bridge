import { useEffect } from 'react'
import { useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { useBridgeStore } from '@/stores/bridgeStore'
import { WRAPPED_ZKLTC_ADDRESS, WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS, BRIDGE_VAULT_ADDRESS, LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { wrappedZkLTCAbi } from '@/abi/WrappedZkLTC'
import { bridgeVaultV2Abi } from '@/abi/BridgeVaultV2'

export function useTransactionStatus() {
  const activeTx = useBridgeStore((s) => s.activeTx)
  const direction = useBridgeStore((s) => s.direction)
  const destChain = useBridgeStore((s) => s.destChain)
  const setActiveTx = useBridgeStore((s) => s.setActiveTx)

  const isBaseSepolia = destChain === 'baseSepolia'

  // Source chain depends on direction:
  // lock: source = LiteForge
  // burn: source = Sepolia/BaseSepolia (based on destChain)
  const sourceChainId = direction === 'lock'
    ? LITEFORGE_CHAIN_ID
    : (isBaseSepolia ? BASE_SEPOLIA_CHAIN_ID : SEPOLIA_CHAIN_ID)

  // Step 1: Wait for source chain confirmation
  const { data: receipt, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: activeTx.hash ?? undefined,
    chainId: sourceChainId,
    confirmations: 1,
    pollingInterval: 3_000,
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
        const lastLog = logs[logs.length - 1]
        const data = lastLog.data
        if (data && data.length >= 66) {
          if (direction === 'lock') {
            // V2 Locked has 4 non-indexed fields: amount, fee, nonce, destChainId
            const nonceHex = ('0x' + data.slice(130, 194)) as `0x${string}`
            const sourceNonce = BigInt(nonceHex)
            setActiveTx({ status: 'relaying', sourceNonce })
          } else {
            // Burned has 3 non-indexed fields: amount, fee, nonce
            const nonceHex = ('0x' + data.slice(-64)) as `0x${string}`
            const sourceNonce = BigInt(nonceHex)
            setActiveTx({ status: 'relaying', sourceNonce })
          }
        } else {
          setActiveTx({ status: 'relaying' })
        }
      } else {
        setActiveTx({ status: 'relaying' })
      }
    }
  }, [isConfirmed, receipt, activeTx.status, direction, setActiveTx])

  // Step 3: Poll destination chain isProcessed(sourceTxHash, sourceNonce)
  const destChainId = direction === 'lock'
    ? (isBaseSepolia ? BASE_SEPOLIA_CHAIN_ID : SEPOLIA_CHAIN_ID)
    : LITEFORGE_CHAIN_ID

  const destAddress = direction === 'lock'
    ? (isBaseSepolia ? WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS : WRAPPED_ZKLTC_ADDRESS)
    : BRIDGE_VAULT_ADDRESS

  const destAbi = direction === 'lock' ? wrappedZkLTCAbi : bridgeVaultV2Abi

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
