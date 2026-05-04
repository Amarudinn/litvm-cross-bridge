import { motion } from 'framer-motion'
import { ArrowDownUp } from 'lucide-react'
import { useBridgeStore } from '@/stores/bridgeStore'
import { cn } from '@/lib/utils'

interface ChainBoxProps {
  label: string
  chainName: string
  chainIcon: string
  token: string
  tokenIcon: string
}

function ChainBox({ label, chainName, chainIcon, token, tokenIcon }: ChainBoxProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={chainIcon} alt={chainName} className="w-8 h-8 rounded-full" />
          <div>
            <p className="font-semibold text-sm leading-tight">{chainName}</p>
            <p className="text-xs text-muted-foreground">{token}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-muted/60 rounded-full px-2.5 py-1">
          <img src={tokenIcon} alt={token} className="w-4 h-4 rounded-full" />
          <span className="text-xs font-medium text-muted-foreground">{token}</span>
        </div>
      </div>
    </div>
  )
}

export function ChainSelector() {
  const direction = useBridgeStore((s) => s.direction)
  const toggleDirection = useBridgeStore((s) => s.toggleDirection)

  const isLock = direction === 'lock'

  return (
    <div className="relative space-y-2">
      <ChainBox
        label="From"
        chainName={isLock ? 'LiteForge' : 'Sepolia'}
        chainIcon={isLock ? '/litvm.png' : '/eth.png'}
        token={isLock ? 'zkLTC' : 'wzkLTC'}
        tokenIcon="/ltc.png"
      />

      <div className="flex justify-center -my-1 relative z-10">
        <motion.button
          onClick={toggleDirection}
          animate={{ rotate: isLock ? 0 : 180 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={cn(
            'h-9 w-9 rounded-full bg-muted/80 backdrop-blur-sm',
            'flex items-center justify-center',
            'hover:bg-accent transition-colors cursor-pointer'
          )}
        >
          <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
        </motion.button>
      </div>

      <ChainBox
        label="To"
        chainName={isLock ? 'Sepolia' : 'LiteForge'}
        chainIcon={isLock ? '/eth.png' : '/litvm.png'}
        token={isLock ? 'wzkLTC' : 'zkLTC'}
        tokenIcon="/ltc.png"
      />
    </div>
  )
}
