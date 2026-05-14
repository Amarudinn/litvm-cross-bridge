import { useSwapStore } from '@/stores/swapStore'
import { cn } from '@/lib/utils'

export function SwapSettings() {
  const { slippage, slippagePreset, deadline, setSlippage, setSlippagePreset, setDeadline } = useSwapStore()

  const presets: { value: string; label: string }[] = [
    { value: '0.1', label: '0.1%' },
    { value: '0.5', label: '0.5%' },
    { value: '1.0', label: '1%' },
  ]

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-3">
      {/* Slippage */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Slippage Tolerance</p>
        <div className="flex items-center gap-1.5">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => setSlippagePreset(p.value as '0.1' | '0.5' | '1.0')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer',
                slippagePreset === p.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground/70 border border-transparent'
              )}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              inputMode="decimal"
              value={slippagePreset === 'custom' ? slippage : ''}
              onChange={(e) => {
                const val = e.target.value
                if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                  setSlippagePreset('custom')
                  setSlippage(val)
                }
              }}
              onFocus={() => setSlippagePreset('custom')}
              placeholder="Custom"
              className={cn(
                'w-full px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors',
                slippagePreset === 'custom' ? 'border-primary/20' : 'border-transparent'
              )}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        </div>
        {parseFloat(slippage) > 5 && (
          <p className="text-[10px] text-amber-500 mt-1">High slippage may result in unfavorable trades</p>
        )}
      </div>

      {/* Deadline */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Transaction Deadline</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={deadline}
            onChange={(e) => setDeadline(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/50 border border-border/30 text-foreground focus:outline-none focus:border-primary/40 transition-colors"
          />
          <span className="text-xs text-muted-foreground">minutes</span>
        </div>
      </div>
    </div>
  )
}
