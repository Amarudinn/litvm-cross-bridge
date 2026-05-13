import { usePoolStore } from '@/stores/poolStore'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { formatUnits } from 'viem'
import { getTokensByChain, getToken } from '@/config/tokens'
import { getFeeTierLabel } from '@/config/pools'
import { usePoolPositions, type PoolPosition } from '@/hooks/usePoolPositions'
import { useRemoveQuote } from '@/hooks/useRemoveQuote'
import { PoolStatusModal } from './PoolStatusModal'
import type { usePoolActions } from '@/hooks/usePoolActions'

const PERCENT_PRESETS = [25, 50, 75, 100]

interface RemoveLiquidityProps {
  chainId: number
  poolActions: ReturnType<typeof usePoolActions>
}

function getSymbol(address: string, chainId: number): string {
  const tokens = getTokensByChain(chainId)
  const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase())
  return token?.symbol || address.slice(0, 6) + '...'
}

export function RemoveLiquidity({ chainId, poolActions }: RemoveLiquidityProps) {
  const { removePercent, setRemovePercent, setView, selectedTokenId } = usePoolStore()
  const { positions } = usePoolPositions(chainId)

  // Find the selected position by tokenId, fallback to first
  const position = selectedTokenId
    ? positions.find(p => p.tokenId.toString() === selectedTokenId) || positions[0]
    : positions[0]
  const { amount0, amount1, loading: quoteLoading } = useRemoveQuote(chainId, position, removePercent)

  if (!position) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-sm text-muted-foreground">No position to remove</p>
      </div>
    )
  }

  const token0Symbol = getSymbol(position.token0, chainId)
  const token1Symbol = getSymbol(position.token1, chainId)
  const token0Icon = getToken(chainId, token0Symbol)?.icon || ''
  const token1Icon = getToken(chainId, token1Symbol)?.icon || ''
  const token0Decimals = getToken(chainId, token0Symbol)?.decimals || 18
  const token1Decimals = getToken(chainId, token1Symbol)?.decimals || 18
  const feeLabel = getFeeTierLabel(position.fee as 500 | 3000 | 10000)
  const isExecuting = poolActions.status === 'executing'

  const totalLiquidity = parseFloat(formatUnits(position.liquidity, 18))

  // Format simulated amounts
  const receive0 = parseFloat(formatUnits(BigInt(amount0), token0Decimals))
  const receive1 = parseFloat(formatUnits(BigInt(amount1), token1Decimals))

  const handleRemove = () => {
    poolActions.removeLiquidity(position, removePercent)
  }

  return (
    <div className="space-y-4">
      {/* Pool Status Modal */}
      <PoolStatusModal
        status={poolActions.status}
        error={poolActions.error}
        onReset={() => { poolActions.reset(); setView('list') }}
        type="remove"
      />

      {/* Position Info */}
      <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              <img src={token0Icon} alt={token0Symbol} className="w-6 h-6 rounded-full border-2 border-background object-cover" />
              <img src={token1Icon} alt={token1Symbol} className="w-6 h-6 rounded-full border-2 border-background object-cover" />
            </div>
            <div>
              <p className="text-sm font-semibold">{token0Symbol}/{token1Symbol}</p>
              <p className="text-[10px] text-muted-foreground">{feeLabel} fee tier</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Liquidity</p>
            <p className="text-xs font-medium">{totalLiquidity.toFixed(6)}</p>
          </div>
        </div>
      </div>

      {/* Remove Percentage */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Remove Amount</p>
          <p className="text-lg font-bold text-foreground">{removePercent}%</p>
        </div>

        <input
          type="range"
          min={1}
          max={100}
          value={removePercent}
          onChange={(e) => setRemovePercent(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-muted/60 cursor-pointer accent-primary"
        />

        <div className="flex items-center gap-1.5">
          {PERCENT_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setRemovePercent(p)}
              className={cn(
                'flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                removePercent === p
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent'
              )}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* Preview - exact amounts from simulation */}
      <div className="rounded-xl border border-border/30 bg-muted/10 p-3 space-y-2">
        <p className="text-[10px] text-muted-foreground font-medium">You will receive</p>
        {quoteLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <img src={token0Icon} alt={token0Symbol} className="w-4 h-4 rounded-full" />
                <span className="text-xs text-muted-foreground">{token0Symbol}</span>
              </div>
              <span className="text-xs font-medium">{receive0 > 0 ? receive0.toFixed(6) : '0'}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <img src={token1Icon} alt={token1Symbol} className="w-4 h-4 rounded-full" />
                <span className="text-xs text-muted-foreground">{token1Symbol}</span>
              </div>
              <span className="text-xs font-medium">{receive1 > 0 ? receive1.toFixed(6) : '0'}</span>
            </div>
          </>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleRemove}
        disabled={isExecuting}
        className={cn(
          'w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2',
          !isExecuting
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isExecuting ? 'Removing...' : `Remove ${removePercent}%`}
      </button>
    </div>
  )
}
