import { motion } from 'framer-motion'
import { ArrowDownUp, ChevronDown } from 'lucide-react'
import { useBridgeStore, type DestChain } from '@/stores/bridgeStore'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

interface ChainBoxProps {
  label: string
  chainName: string
  chainIcon: string
  token: string
  tokenIcon: string
  showSelector?: boolean
  onChainSelect?: (chain: DestChain) => void
  selectedChain?: DestChain
}

const DEST_CHAINS: { key: DestChain; name: string; icon: string }[] = [
  { key: 'sepolia', name: 'Sepolia', icon: '/eth.png' },
  { key: 'baseSepolia', name: 'Base Sepolia', icon: '/base.jpeg' },
]

function ChainBox({ label, chainName, chainIcon, token, tokenIcon, showSelector, onChainSelect, selectedChain }: ChainBoxProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-4" ref={ref}>
      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{label}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 relative">
          <img src={chainIcon} alt={chainName} className="w-8 h-8 rounded-full" />
          <div>
            {showSelector ? (
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 font-semibold text-sm leading-tight hover:text-primary transition-colors cursor-pointer"
              >
                {chainName}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
              </button>
            ) : (
              <p className="font-semibold text-sm leading-tight">{chainName}</p>
            )}
            <p className="text-xs text-muted-foreground">{token}</p>
          </div>

          {/* Dropdown */}
          {showSelector && open && (
            <div className="absolute top-full left-0 mt-2 z-50 w-48 rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden">
              {DEST_CHAINS.map((chain) => (
                <button
                  key={chain.key}
                  onClick={() => { onChainSelect?.(chain.key); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors cursor-pointer',
                    selectedChain === chain.key
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted/60 text-foreground'
                  )}
                >
                  <img src={chain.icon} alt={chain.name} className="w-5 h-5 rounded-full" />
                  {chain.name}
                </button>
              ))}
            </div>
          )}
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
  const destChain = useBridgeStore((s) => s.destChain)
  const toggleDirection = useBridgeStore((s) => s.toggleDirection)
  const setDestChain = useBridgeStore((s) => s.setDestChain)

  const isLock = direction === 'lock'

  const destChainName = destChain === 'baseSepolia' ? 'Base Sepolia' : 'Sepolia'
  const destChainIcon = destChain === 'baseSepolia' ? '/base.jpeg' : '/eth.png'

  return (
    <div className="relative space-y-2">
      <ChainBox
        label="From"
        chainName={isLock ? 'LiteForge' : destChainName}
        chainIcon={isLock ? '/litvm.png' : destChainIcon}
        token={isLock ? 'zkLTC' : 'wzkLTC'}
        tokenIcon="/ltc.png"
        showSelector={!isLock}
        onChainSelect={setDestChain}
        selectedChain={destChain}
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
        chainName={isLock ? destChainName : 'LiteForge'}
        chainIcon={isLock ? destChainIcon : '/litvm.png'}
        token={isLock ? 'wzkLTC' : 'zkLTC'}
        tokenIcon="/ltc.png"
        showSelector={isLock}
        onChainSelect={setDestChain}
        selectedChain={destChain}
      />
    </div>
  )
}
