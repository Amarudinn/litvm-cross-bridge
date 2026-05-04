import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Clock, ArrowLeftRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBridgeStore } from '@/stores/bridgeStore'

type StepStatus = 'pending' | 'active' | 'done'

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

export function TxProgressSteps() {
  const activeTx = useBridgeStore((s) => s.activeTx)
  const direction = useBridgeStore((s) => s.direction)

  const sourceChain = direction === 'lock' ? 'LiteForge' : 'Sepolia'
  const destChain = direction === 'lock' ? 'Sepolia' : 'LiteForge'

  const getStepStatus = (step: number): StepStatus => {
    const { status } = activeTx
    switch (step) {
      case 0: // Signing
        if (status === 'signing') return 'active'
        if (status === 'confirming' || status === 'relaying' || status === 'completed') return 'done'
        return 'pending'
      case 1: // Confirming
        if (status === 'confirming') return 'active'
        if (status === 'relaying' || status === 'completed') return 'done'
        return 'pending'
      case 2: // Relaying
        if (status === 'relaying') return 'active'
        if (status === 'completed') return 'done'
        return 'pending'
      case 3: // Complete
        if (status === 'completed') return 'done'
        return 'pending'
      default:
        return 'pending'
    }
  }

  const steps: Step[] = [
    {
      label: 'Signing',
      icon: <Wallet className="h-4 w-4" />,
      status: getStepStatus(0),
    },
    {
      label: `Confirming on ${sourceChain}`,
      icon: <Clock className="h-4 w-4" />,
      status: getStepStatus(1),
    },
    {
      label: `Relaying to ${destChain}`,
      icon: <ArrowLeftRight className="h-4 w-4" />,
      status: getStepStatus(2),
    },
    {
      label: 'Complete',
      icon: <Check className="h-4 w-4" />,
      status: getStepStatus(3),
    },
  ]

  // Calculate total time when completed
  const totalTime = activeTx.startedAt && activeTx.completedAt
    ? Math.floor((activeTx.completedAt - activeTx.startedAt) / 1000)
    : null

  // Show live timer when confirming or relaying
  const showTimer = activeTx.startedAt && (activeTx.status === 'confirming' || activeTx.status === 'relaying')

  return (
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
              'text-sm',
              step.status === 'done' && 'text-green-500',
              step.status === 'active' && 'text-foreground font-medium',
              step.status === 'pending' && 'text-muted-foreground/50'
            )}
          >
            {step.label}
          </span>

          {/* Live timer on active step (confirming or relaying) */}
          {step.status === 'active' && showTimer && activeTx.startedAt && (
            <ElapsedTimer startedAt={activeTx.startedAt} />
          )}

          {/* Total time on Complete step */}
          {i === 3 && step.status === 'done' && totalTime !== null && (
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
  )
}
