import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownUp, ChevronDown, Check } from 'lucide-react'
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

const DEST_CHAINS: { key: DestChain; name: string; icon: string; chainId: string }[] = [
  { key: 'sepolia', name: 'Ethereum Sepolia', icon: '/eth.png', chainId: '11155111' },
  { key: 'baseSepolia', name: 'Base Sepolia', icon: '/base.jpeg', chainId: '84532' },
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
          <img src={chainIcon} alt={chainName} className="w-8 h-8 rounded-full ring-2 ring-border/30" />
          <div>
            {showSelector ? (
              <button
                onClick={() => setOpen(!open)}
                className={cn(
                  'flex items-center gap-1.5 font-semibold text-sm leading-tight transition-colors cursor-pointer',
                  'hover:text-primary',
                  open && 'text-primary'
                )}
              >
                {chainName}
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')} />
              </button>
            ) : (
              <p className="font-semibold text-sm leading-tight">{chainName}</p>
            )}
            <p className="text-xs text-muted-foreground">{token}</p>
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {showSelector && open && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full left-0 mt-2 z-50 w-56 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-border/40">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Select destination chain</p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  {DEST_CHAINS.map((chain) => {
                    const isSelected = selectedChain === chain.key
                    return (
                      <button
                        key={chain.key}
                        onClick={() => { onChainSelect?.(chain.key); setOpen(false) }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer',
                          isSelected
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                            : 'hover:bg-muted/60 text-foreground'
                        )}
                      >
                        <img src={chain.icon} alt={chain.name} className="w-6 h-6 rounded-full ring-1 ring-border/30" />
                        <div className="flex-1 text-left">
                          <p className={cn('text-sm leading-tight', isSelected && 'font-medium')}>{chain.name}</p>
                          <p className="text-[10px] text-muted-foreground">Chain ID: {chain.chainId}</p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

  const destChainName = destChain === 'baseSepolia' ? 'Base Sepolia' : 'Ethereum Sepolia'
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
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="h-10 w-10 rounded-full bg-background border-[3px] border-muted/60 flex items-center justify-center hover:border-primary/30 transition-colors cursor-pointer shadow-sm"
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
