import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Check, ArrowLeftRight, ArrowRight, ArrowDownUp, Loader2, Clock, ExternalLink, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getExplorerUrl, shortenTxHash } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { SwapStatus } from '@/hooks/useSwap'
import type { CrossChainStatus } from '@/hooks/useCrossChainSwap'

type StepStatus = 'pending' | 'active' | 'done' | 'error'

interface Step {
  label: string
  icon: React.ReactNode
  status: StepStatus
}

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(Math.floor((Date.now() - startedAt) / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <span className="ml-auto text-xs font-mono text-muted-foreground">
      {elapsed}s
    </span>
  )
}

interface SwapStatusModalProps {
  // Same-chain swap
  swapStatus: SwapStatus
  swapTxHash: string | null
  swapError: string | null
  onSwapReset: () => void
  // Cross-chain swap
  crossStatus: CrossChainStatus
  crossTxHash: string | null
  crossError: string | null
  onCrossReset: () => void
  // Context
  isCrossChain: boolean
  isBridgeOnly?: boolean
  tokenInSymbol?: string
  tokenOutSymbol?: string
  fromChainName?: string
  toChainName?: string
  fromChainId?: number
}

export function SwapStatusModal({
  swapStatus,
  swapTxHash,
  swapError,
  onSwapReset,
  crossStatus,
  crossTxHash,
  crossError,
  onCrossReset,
  isCrossChain,
  isBridgeOnly = false,
  tokenInSymbol = '',
  tokenOutSymbol = '',
  fromChainName = '',
  toChainName = '',
  fromChainId,
}: SwapStatusModalProps) {
  const [startedAt, setStartedAt] = useState<number>(0)
  const [completedAt, setCompletedAt] = useState<number>(0)

  const status = isCrossChain ? crossStatus : swapStatus
  const txHash = isCrossChain ? crossTxHash : swapTxHash
  const error = isCrossChain ? crossError : swapError
  const onReset = isCrossChain ? onCrossReset : onSwapReset

  const isOpen = status !== 'idle'
  const isCompleted = status === 'success' || status === 'completed'
  const isError = status === 'error'

  // Start timer only when we have a tx hash (means MetaMask confirmed)
  useEffect(() => {
    if (txHash && startedAt === 0) {
      setStartedAt(Date.now())
    }
    if (!isOpen) {
      setStartedAt(0)
      setCompletedAt(0)
    }
  }, [txHash, isOpen])

  // Record completion time
  useEffect(() => {
    if (isCompleted && completedAt === 0 && startedAt > 0) {
      setCompletedAt(Date.now())
    }
  }, [isCompleted, completedAt, startedAt])

  // Calculate total time when completed
  const totalTime = startedAt && completedAt
    ? Math.floor((completedAt - startedAt) / 1000)
    : null

  // Show live timer when actively processing (not signing, not completed)
  const showTimer = startedAt > 0 && !isCompleted && !isError && status !== 'checking-allowance'

  const handleClose = () => {
    onReset()
  }

  // Build steps based on swap type
  const steps: Step[] = isCrossChain
    ? (isBridgeOnly ? getBridgeOnlySteps(crossStatus, fromChainName, toChainName) : getCrossChainSteps(crossStatus))
    : getSameChainSteps(swapStatus)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isError
              ? (isBridgeOnly ? 'Bridge Failed' : 'Swap Failed')
              : isCompleted
                ? (isBridgeOnly ? 'Bridge Completed' : 'Swap Completed')
                : isBridgeOnly
                  ? 'Bridge Transaction'
                  : isCrossChain
                    ? 'Cross-chain Swap'
                    : 'Swap Transaction'}
          </DialogTitle>
          <DialogDescription>
            {isError
              ? 'Something went wrong with your transaction.'
              : isCompleted
                ? (isBridgeOnly ? 'Your bridge transaction has been completed successfully.' : 'Your swap has been completed successfully.')
                : (isBridgeOnly ? 'Track the progress of your bridge transaction.' : 'Track the progress of your swap transaction.')}
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Token pair info */}
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-sm font-medium">{tokenInSymbol}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{tokenOutSymbol}</span>
              {isCrossChain && (
                <span className="text-[10px] text-muted-foreground ml-1">({fromChainName} → {toChainName})</span>
              )}
            </div>

            {/* Progress steps */}
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors shrink-0',
                      step.status === 'done' && 'bg-green-500/20 border-green-500 text-green-500',
                      step.status === 'active' && 'border-blue-500 text-blue-500',
                      step.status === 'pending' && 'border-muted-foreground/30 text-muted-foreground/30',
                      step.status === 'error' && 'border-destructive text-destructive'
                    )}
                  >
                    {step.status === 'done' ? (
                      <Check className="h-4 w-4" />
                    ) : step.status === 'active' ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        {step.icon}
                      </motion.div>
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm flex-1',
                      step.status === 'done' && 'text-green-500',
                      step.status === 'active' && 'text-foreground font-medium',
                      step.status === 'pending' && 'text-muted-foreground/50'
                    )}
                  >
                    {step.label}
                  </span>

                  {/* Live timer on active step */}
                  {step.status === 'active' && showTimer && startedAt > 0 && (
                    <ElapsedTimer startedAt={startedAt} />
                  )}

                  {/* Total time on Complete step */}
                  {i === steps.length - 1 && step.status === 'done' && totalTime !== null && (
                    <span className="ml-auto text-xs font-mono text-green-400">
                      {totalTime}s
                    </span>
                  )}

                  {/* Pulsing dot for active step (only if no timer shown) */}
                  {step.status === 'active' && !showTimer && (
                    <motion.div
                      className="ml-auto h-2 w-2 rounded-full bg-blue-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Tx hash with explorer link */}
            {txHash && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transaction</span>
                  <a
                    href={getExplorerUrl(fromChainId || 4441, 'tx', txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {shortenTxHash(txHash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            <Button
              variant={isCompleted ? 'default' : 'outline'}
              className="w-full"
              onClick={handleClose}
            >
              {isCompleted ? 'Done' : 'Close'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function getSameChainSteps(status: SwapStatus): Step[] {
  const getStatus = (step: number): StepStatus => {
    switch (step) {
      case 0: // Approve
        if (status === 'checking-allowance' || status === 'approving') return 'active'
        if (status === 'swapping' || status === 'success') return 'done'
        return 'pending'
      case 1: // Swap
        if (status === 'swapping') return 'active'
        if (status === 'success') return 'done'
        return 'pending'
      case 2: // Complete
        if (status === 'success') return 'done'
        return 'pending'
      default:
        return 'pending'
    }
  }

  return [
    { label: 'Approve Token', icon: <Wallet className="h-4 w-4" />, status: getStatus(0) },
    { label: 'Execute Swap', icon: <ArrowDownUp className="h-4 w-4" />, status: getStatus(1) },
    { label: 'Complete', icon: <Check className="h-4 w-4" />, status: getStatus(2) },
  ]
}

function getBridgeOnlySteps(status: CrossChainStatus, fromChainName: string, toChainName: string): Step[] {
  const getStatus = (step: number): StepStatus => {
    switch (step) {
      case 0: // Signing
        if (status === 'approving_burn') return 'active'
        if (status === 'bridging' || status === 'waiting_relay' || status === 'completed') return 'done'
        return 'pending'
      case 1: // Confirming
        if (status === 'bridging') return 'active'
        if (status === 'waiting_relay' || status === 'completed') return 'done'
        return 'pending'
      case 2: // Relaying
        if (status === 'waiting_relay') return 'active'
        if (status === 'completed') return 'done'
        return 'pending'
      case 3: // Complete
        if (status === 'completed') return 'done'
        return 'pending'
      default:
        return 'pending'
    }
  }

  return [
    { label: 'Signing', icon: <Wallet className="h-4 w-4" />, status: getStatus(0) },
    { label: `Confirming on ${fromChainName}`, icon: <Clock className="h-4 w-4" />, status: getStatus(1) },
    { label: `Relaying to ${toChainName}`, icon: <ArrowLeftRight className="h-4 w-4" />, status: getStatus(2) },
    { label: 'Complete', icon: <Check className="h-4 w-4" />, status: getStatus(3) },
  ]
}

function getCrossChainSteps(status: CrossChainStatus): Step[] {
  const getStatus = (step: number): StepStatus => {
    switch (step) {
      case 0: // Bridge/Lock or Swap source
        if (status === 'swapping_source' || status === 'approving_burn' || status === 'bridging') return 'active'
        if (status === 'waiting_relay' || status === 'approving_swap' || status === 'swapping_dest' || status === 'completed') return 'done'
        return 'pending'
      case 1: // Relay
        if (status === 'waiting_relay') return 'active'
        if (status === 'approving_swap' || status === 'swapping_dest' || status === 'completed') return 'done'
        return 'pending'
      case 2: // Swap on destination
        if (status === 'approving_swap' || status === 'swapping_dest') return 'active'
        if (status === 'completed') return 'done'
        return 'pending'
      case 3: // Complete
        if (status === 'completed') return 'done'
        return 'pending'
      default:
        return 'pending'
    }
  }

  return [
    { label: 'Signing', icon: <Wallet className="h-4 w-4" />, status: getStatus(0) },
    { label: 'Waiting for Relay', icon: <Clock className="h-4 w-4" />, status: getStatus(1) },
    { label: 'Swap on Destination', icon: <ArrowLeftRight className="h-4 w-4" />, status: getStatus(2) },
    { label: 'Complete', icon: <Check className="h-4 w-4" />, status: getStatus(3) },
  ]
}
