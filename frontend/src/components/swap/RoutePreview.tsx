import { ArrowRight, Zap, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSwapStore, type SwapRoute } from '@/stores/swapStore'
import { POOLS } from '@/config/pools'
import { getFeeTierLabel } from '@/config/pools'
import { getTokensByChain } from '@/config/tokens'

interface RoutePreviewProps {
  route: SwapRoute
}

export function RoutePreview({ route }: RoutePreviewProps) {
  const { amountIn, tokenIn, tokenOut, fromChainId, toChainId } = useSwapStore()
  const priceImpact = parseFloat(route.priceImpact) || 0
  const highImpact = route.pools.length > 0 && priceImpact > 10
  const veryHighImpact = route.pools.length > 0 && priceImpact > 20

  // Calculate fee values
  const inputAmount = parseFloat(amountIn) || 0
  const poolFeeTier = route.pools[0] ? parseInt(route.pools[0]) : 10000
  const poolFeePercent = poolFeeTier / 10000 // e.g. 10000 -> 1%
  const aggregatorFeeValue = inputAmount * 0.001 // 0.1%
  const poolFeeValue = inputAmount * (poolFeePercent / 100)
  const inputSymbol = tokenIn?.symbol || ''

  // Get token icons for route path
  const allTokens = [...getTokensByChain(fromChainId), ...getTokensByChain(toChainId)]
  const getTokenIcon = (symbol: string) => {
    const token = allTokens.find(t => t.symbol === symbol)
    return token?.icon
  }

  return (
    <div className="relative rounded-2xl border-0 bg-card shadow-2xl p-3.5 space-y-2.5 z-[1]">
      {/* Route Path */}
      <div className="flex items-center gap-2">
        <GitBranch className="h-3.5 w-3.5 text-primary/70 shrink-0" />
        <div className="flex items-center gap-1.5 flex-wrap">
          {route.path.map((step, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {step === 'bridge' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold border border-primary/10">
                  <Zap className="h-2.5 w-2.5" />
                  Bridge
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50 text-xs font-semibold text-foreground border border-border/20">
                  {getTokenIcon(step) && (
                    <img src={getTokenIcon(step)} alt={step} className="w-3.5 h-3.5 rounded-full" />
                  )}
                  {step}
                </span>
              )}
              {i < route.path.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/20" />

      {/* Details */}
      <div className="space-y-1.5">
        {route.pools.length > 0 && (
          <DetailRow
            label="Price Impact"
            value={route.priceImpact === '~' ? 'Estimated' : `${route.priceImpact}%`}
            warn={highImpact}
            critical={veryHighImpact}
          />
        )}
        {route.pools.length > 0 && route.pools[0] !== 'wrap' && (
          <>
            <DetailRow
              label="Aggregator Fee"
              value={`${aggregatorFeeValue.toFixed(6)} ${inputSymbol} (0.1%)`}
            />
            <DetailRow
              label="Pool Fee"
              value={`${poolFeeValue.toFixed(6)} ${inputSymbol} (${getFeeTierLabel(poolFeeTier as 500 | 3000 | 10000)})`}
            />
          </>
        )}
        {route.isCrossChain && route.bridgeFee && (
          <DetailRow label="Bridge Fee" value={`${route.bridgeFee} ${inputSymbol} (0.3%)`} />
        )}
        <DetailRow label="Source" value={
          route.pools[0] === 'wrap' ? 'Wrap/Unwrap' :
          route.pools.length > 0 ? 'Multyra V3' : 'Multyra Bridge'
        } highlight />
      </div>
    </div>
  )
}

function DetailRow({ label, value, warn, critical, highlight }: { label: string; value: string; warn?: boolean; critical?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
        {label}
      </span>
      <span className={cn(
        'text-[11px] font-medium',
        critical ? 'text-destructive' : warn ? 'text-amber-500' : highlight ? 'text-primary' : 'text-foreground/80'
      )}>
        {value}
      </span>
    </div>
  )
}
