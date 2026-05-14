import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount, useChainId } from 'wagmi'
import { usePoolStore } from '@/stores/poolStore'
import { cn } from '@/lib/utils'
import { SWAP_CHAINS } from '@/config/dex'
import { getPoolsByChain } from '@/config/pools'
import { usePoolPositions } from '@/hooks/usePoolPositions'
import { usePoolActions } from '@/hooks/usePoolActions'
import { PoolList } from './PoolList'
import { AddLiquidity } from './AddLiquidity'
import { RemoveLiquidity } from './RemoveLiquidity'

export function PoolTab() {
  const { view, selectedChainId, setView, setSelectedChainId } = usePoolStore()
  const [chainOpen, setChainOpen] = useState(false)
  const chainRef = useRef<HTMLDivElement>(null)

  const pools = getPoolsByChain(selectedChainId)
  const { positions, loading } = usePoolPositions(selectedChainId)
  const poolActions = usePoolActions(selectedChainId)
  const selectedChain = SWAP_CHAINS.find((c) => c.chainId === selectedChainId)

  // Sync chain selector with wallet's active chain (only in list view)
  const { isConnected } = useAccount()
  const walletChainId = useChainId()

  useEffect(() => {
    if (view !== 'list') return
    if (isConnected && walletChainId && [4441, 11155111, 84532].includes(walletChainId)) {
      setSelectedChainId(walletChainId)
    }
  }, [walletChainId, isConnected, view])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) setChainOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {view !== 'list' && (
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-2 p-1.5 rounded-lg cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">
                {view === 'add' && 'Add Liquidity'}
                {view === 'remove' && 'Remove Liquidity'}
              </h3>
            </button>
          )}
          {view === 'list' && (
            <h3 className="text-base font-semibold">Pool</h3>
          )}
        </div>

        {/* Chain Dropdown - right side (only in list view) */}
        {view === 'list' && (
          <div className="relative" ref={chainRef}>
            <button
              onClick={() => setChainOpen(!chainOpen)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-150 text-xs cursor-pointer border',
                chainOpen
                  ? 'bg-primary/5 border-primary/20 text-primary'
                  : 'bg-muted/40 border-transparent hover:bg-muted/60 text-muted-foreground'
              )}
            >
              <img src={selectedChain?.icon} alt={selectedChain?.name} className="w-3.5 h-3.5 rounded-full" />
              <span className="font-medium">{selectedChain?.name}</span>
              <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', chainOpen && 'rotate-180')} />
            </button>

            <AnimatePresence>
              {chainOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full right-0 mt-1.5 z-50 w-48 rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden"
                >
                  <div className="p-1.5 space-y-0.5">
                    {SWAP_CHAINS.map((c) => {
                      const isSelected = selectedChainId === c.chainId
                      return (
                        <button
                          key={c.chainId}
                          onClick={() => { setSelectedChainId(c.chainId); setChainOpen(false) }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer',
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary/15'
                              : 'hover:bg-muted/50 text-foreground'
                          )}
                        >
                          <img src={c.icon} alt={c.name} className="w-4 h-4 rounded-full ring-1 ring-border/30" />
                          <span>{c.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Content */}
      {view === 'list' && (
        <>
          <PoolList positions={positions} pools={pools} loading={loading} />
          <button
            onClick={() => setView('add')}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-colors cursor-pointer"
          >
            + New Position
          </button>
        </>
      )}
      {view === 'add' && <AddLiquidity chainId={selectedChainId} poolActions={poolActions} />}
      {view === 'remove' && <RemoveLiquidity chainId={selectedChainId} poolActions={poolActions} />}
    </div>
  )
}
