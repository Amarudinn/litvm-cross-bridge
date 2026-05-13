import { useState } from 'react'
import { Droplets, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { usePoolStore } from '@/stores/poolStore'
import { getFeeTierLabel, type Pool } from '@/config/pools'
import { getTokensByChain, getToken } from '@/config/tokens'
import { formatUnits } from 'viem'
import { useRemoveQuote } from '@/hooks/useRemoveQuote'
import type { PoolPosition } from '@/hooks/usePoolPositions'

interface PoolListProps {
  positions: PoolPosition[]
  pools: Pool[]
  loading: boolean
}

function getSymbol(address: string, chainId: number): string {
  const tokens = getTokensByChain(chainId)
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase())
  return token?.symbol || address.slice(0, 6) + '...'
}

export function PoolList({ positions, pools, loading }: PoolListProps) {
  const { setView, selectedChainId, setSelectedTokenId, setToken0Symbol, setToken1Symbol, setFeeTier } = usePoolStore()
  const [activeTab, setActiveTab] = useState<'positions' | 'pools'>('positions')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (positions.length === 0 && pools.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
          <Droplets className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No pools on this chain</p>
          <p className="text-xs text-muted-foreground mt-1">Select a different chain or add liquidity</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Tab switch */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/30 border border-border/20">
        <button
          onClick={() => setActiveTab('positions')}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
            activeTab === 'positions'
              ? 'bg-background/90 text-foreground shadow-sm border border-border/50'
              : 'text-muted-foreground hover:text-foreground/80'
          )}
        >
          Your Positions {positions.length > 0 && `(${positions.length})`}
        </button>
        <button
          onClick={() => setActiveTab('pools')}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
            activeTab === 'pools'
              ? 'bg-background/90 text-foreground shadow-sm border border-border/50'
              : 'text-muted-foreground hover:text-foreground/80'
          )}
        >
          Available Pools {pools.length > 0 && `(${pools.length})`}
        </button>
      </div>

      {/* Content */}
      <div className={cn(
        activeTab === 'positions' && positions.length > 6 && 'max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent',
        activeTab === 'pools' && pools.length > 6 && 'max-h-[360px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent'
      )}>
        {activeTab === 'positions' && (
          positions.length > 0 ? (
            <div className="space-y-2">
              {positions.map((position) => (
                <PositionCard
                  key={position.tokenId.toString()}
                  position={position}
                  chainId={selectedChainId}
                  onRemove={() => { setSelectedTokenId(position.tokenId.toString()); setView('remove') }}
                  onAdd={() => {
                    const sym0 = getSymbol(position.token0, selectedChainId)
                    const sym1 = getSymbol(position.token1, selectedChainId)
                    setToken0Symbol(sym0)
                    setToken1Symbol(sym1)
                    setFeeTier(position.fee as 500 | 3000 | 10000)
                    setView('add')
                  }}
                  expanded={expandedId === position.tokenId.toString()}
                  onToggle={() => setExpandedId(expandedId === position.tokenId.toString() ? null : position.tokenId.toString())}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">No positions yet</p>
            </div>
          )
        )}

        {activeTab === 'pools' && (
          pools.length > 0 ? (
            <div className="space-y-1.5">
              {pools.map((pool) => (
                <button
                  key={pool.id}
                  onClick={() => {
                    setToken0Symbol(pool.token0)
                    setToken1Symbol(pool.token1)
                    setFeeTier(pool.feeTier)
                    setView('add')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/20 border border-border/30 hover:border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex -space-x-1.5">
                    <img
                      src={getToken(pool.chainId, pool.token0)?.icon || ''}
                      alt={pool.token0}
                      className="w-5 h-5 rounded-full border border-background object-cover"
                    />
                    <img
                      src={getToken(pool.chainId, pool.token1)?.icon || ''}
                      alt={pool.token1}
                      className="w-5 h-5 rounded-full border border-background object-cover"
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-medium">{pool.token0}/{pool.token1}</p>
                    <p className="text-[10px] text-muted-foreground">Fee: {getFeeTierLabel(pool.feeTier)}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">No pools available</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function PositionCard({ position, chainId, onRemove, onAdd, expanded, onToggle }: {
  position: PoolPosition
  chainId: number
  onRemove: () => void
  onAdd: () => void
  expanded: boolean
  onToggle: () => void
}) {
  const token0Symbol = getSymbol(position.token0, chainId)
  const token1Symbol = getSymbol(position.token1, chainId)
  const feeLabel = getFeeTierLabel(position.fee as 500 | 3000 | 10000)
  const token0Icon = getToken(chainId, token0Symbol)?.icon || ''
  const token1Icon = getToken(chainId, token1Symbol)?.icon || ''
  const token0Decimals = getToken(chainId, token0Symbol)?.decimals || 18
  const token1Decimals = getToken(chainId, token1Symbol)?.decimals || 18

  // Fetch token amounts for this position
  const { amount0, amount1, loading: quoteLoading } = useRemoveQuote(chainId, position, 100)
  const value0 = parseFloat(formatUnits(BigInt(amount0), token0Decimals))
  const value1 = parseFloat(formatUnits(BigInt(amount1), token1Decimals))

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden">
      {/* Header - clickable to toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3.5 cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1.5">
            <img
              src={getToken(chainId, token0Symbol)?.icon || ''}
              alt={token0Symbol}
              className="w-6 h-6 rounded-full border-2 border-background object-cover"
            />
            <img
              src={getToken(chainId, token1Symbol)?.icon || ''}
              alt={token1Symbol}
              className="w-6 h-6 rounded-full border-2 border-background object-cover"
            />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold">{token0Symbol}/{token1Symbol}</p>
            <p className="text-[10px] text-muted-foreground">{feeLabel} fee tier</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')} />
        </div>
      </button>

      {/* Expandable detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 space-y-3 border-t border-border/30 pt-3">
              {/* Token values */}
              {quoteLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-lg bg-muted/30 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img src={token0Icon} alt={token0Symbol} className="w-4 h-4 rounded-full" />
                      <span className="text-xs text-muted-foreground">{token0Symbol}</span>
                    </div>
                    <span className="text-xs font-medium">{value0 > 0 ? value0.toFixed(6) : '0'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img src={token1Icon} alt={token1Symbol} className="w-4 h-4 rounded-full" />
                      <span className="text-xs text-muted-foreground">{token1Symbol}</span>
                    </div>
                    <span className="text-xs font-medium">{value1 > 0 ? value1.toFixed(6) : '0'}</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onAdd}
                  className="flex-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Add
                </button>
                <button
                  onClick={onRemove}
                  className="flex-1 px-3 py-2 rounded-lg bg-muted/50 text-foreground text-xs font-medium hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
