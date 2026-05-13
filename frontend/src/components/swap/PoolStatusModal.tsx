import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Check, Loader2, Clock, Coins, ExternalLink, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { PoolActionStatus } from '@/hooks/usePoolActions'

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

interface PoolStatusModalProps {
  status: PoolActionStatus
  error: string | null
  onReset: () => void
  type: 'add' | 'remove'
}

export function PoolStatusModal({ status, error, onReset, type }: PoolStatusModalProps) {
  const [startedAt, setStartedAt] = useState<number>(0)

  const isOpen = status !== 'idle'
  const isCompleted = status === 'success'
  const isError = status === 'error'

  // Start timer after MetaMask confirm (status moves to 'executing' or 'collecting')
  useEffect(() => {
    if ((status === 'executing' || status === 'collecting') && startedAt === 0) {
      setStartedAt(Date.now())
    }
    if (!isOpen) {
      setStartedAt(0)
    }
  }, [status, isOpen])

  const title = type === 'add' ? 'Add Liquidity' : 'Remove Liquidity'

  const steps: Step[] = type === 'add'
    ? getAddSteps(status)
    : getRemoveSteps(status)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && (isCompleted || isError) && onReset()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isError
              ? `${title} Failed`
              : isCompleted
                ? `${title} Completed`
                : title}
          </DialogTitle>
          <DialogDescription>
            {isError
              ? 'Something went wrong with your transaction.'
              : isCompleted
                ? `Your ${type === 'add' ? 'liquidity has been added' : 'liquidity has been removed'} successfully.`
                : `Track the progress of your ${type === 'add' ? 'add liquidity' : 'remove liquidity'} transaction.`}
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
            <Button className="w-full" onClick={onReset}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress steps */}
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-colors shrink-0',
                      step.status === 'done' && 'bg-green-500/20 border-green-500 text-green-500',
                      step.status === 'active' && 'border-blue-500 text-blue-500',
                      step.status === 'pending' && 'border-muted-foreground/30 text-muted-foreground/30'
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

                  {step.status === 'active' && startedAt > 0 && (
                    <ElapsedTimer startedAt={startedAt} />
                  )}

                  {step.status === 'active' && startedAt === 0 && (
                    <motion.div
                      className="ml-auto h-2 w-2 rounded-full bg-blue-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              variant={isCompleted ? 'default' : 'outline'}
              className="w-full"
              onClick={onReset}
            >
              {isCompleted ? 'Done' : 'Close'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function getAddSteps(status: PoolActionStatus): Step[] {
  const getStatus = (step: number): StepStatus => {
    switch (step) {
      case 0: // Approving
        if (status === 'approving') return 'active'
        if (status === 'signing' || status === 'executing' || status === 'success') return 'done'
        return 'pending'
      case 1: // Signing (mint)
        if (status === 'signing') return 'active'
        if (status === 'executing' || status === 'success') return 'done'
        return 'pending'
      case 2: // Executing
        if (status === 'executing') return 'active'
        if (status === 'success') return 'done'
        return 'pending'
      case 3: // Complete
        if (status === 'success') return 'done'
        return 'pending'
      default:
        return 'pending'
    }
  }

  return [
    { label: 'Approving Tokens', icon: <Clock className="h-4 w-4" />, status: getStatus(0) },
    { label: 'Signing', icon: <Wallet className="h-4 w-4" />, status: getStatus(1) },
    { label: 'Adding Liquidity', icon: <Coins className="h-4 w-4" />, status: getStatus(2) },
    { label: 'Complete', icon: <Check className="h-4 w-4" />, status: getStatus(3) },
  ]
}

function getRemoveSteps(status: PoolActionStatus): Step[] {
  const getStatus = (step: number): StepStatus => {
    switch (step) {
      case 0: // Signing
        if (status === 'signing') return 'active'
        if (status === 'executing' || status === 'collecting' || status === 'success') return 'done'
        return 'pending'
      case 1: // Removing
        if (status === 'executing') return 'active'
        if (status === 'collecting' || status === 'success') return 'done'
        return 'pending'
      case 2: // Collecting
        if (status === 'collecting') return 'active'
        if (status === 'success') return 'done'
        return 'pending'
      case 3: // Complete
        if (status === 'success') return 'done'
        return 'pending'
      default:
        return 'pending'
    }
  }

  return [
    { label: 'Signing', icon: <Wallet className="h-4 w-4" />, status: getStatus(0) },
    { label: 'Removing Liquidity', icon: <Clock className="h-4 w-4" />, status: getStatus(1) },
    { label: 'Collecting Tokens', icon: <Coins className="h-4 w-4" />, status: getStatus(2) },
    { label: 'Complete', icon: <Check className="h-4 w-4" />, status: getStatus(3) },
  ]
}
