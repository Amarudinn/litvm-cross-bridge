import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Info, Wallet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { usePoolStore } from '@/stores/poolStore'
import { getTokensByChain, getToken } from '@/config/tokens'
import { getFeeTierLabel, type FeeTier } from '@/config/pools'
import { cn } from '@/lib/utils'
import { type Address } from 'viem'
import type { usePoolActions } from '@/hooks/usePoolActions'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { usePoolInfo } from '@/hooks/usePoolInfo'
import { PoolStatusModal } from './PoolStatusModal'
import { Loader2 } from 'lucide-react'

const FEE_TIERS: FeeTier[] = [500, 3000, 10000]

interface AddLiquidityProps {
  chainId: number
  poolActions: ReturnType<typeof usePoolActions>
}

function TokenDropdown({ chainId, value, onChange, excludeSymbol, label }: {
  chainId: number
  value: string
  onChange: (symbol: string) => void
  excludeSymbol?: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const tokens = getTokensByChain(chainId).filter(t => t.address !== 'native' && t.symbol !== excludeSymbol)
  const selected = tokens.find(t => t.symbol === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer',
          open
            ? 'border-primary/30 bg-primary/5'
            : 'border-border/40 bg-muted/20 hover:border-border/60'
        )}
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <img src={selected.icon} alt={selected.symbol} className="w-5 h-5 rounded-full" />
            <span className="text-sm font-medium">{selected.symbol}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{label}</span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden"
          >
            <div className="p-1.5 space-y-0.5">
              {tokens.map((t) => {
                const isSelected = value === t.symbol
                return (
                  <button
                    key={t.symbol}
                    onClick={() => { onChange(t.symbol); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer',
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary/15'
                        : 'hover:bg-muted/50 text-foreground'
                    )}
                  >
                    <img src={t.icon} alt={t.symbol} className="w-5 h-5 rounded-full ring-1 ring-border/30" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{t.symbol}</p>
                      <p className="text-[10px] text-muted-foreground">{t.name}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DepositInput({ token, symbol, balance, amount, onAmountChange }: {
  token: { icon: string; symbol: string } | undefined
  symbol: string
  balance: number
  amount: string
  onAmountChange: (val: string) => void
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {token && <img src={token.icon} alt={symbol} className="w-4 h-4 rounded-full" />}
          <span className="text-xs text-muted-foreground font-medium">{symbol || 'Select token'}</span>
        </div>
        {symbol && <span className="text-[10px] text-muted-foreground">{balance.toFixed(6)}</span>}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => {
          if (/^[0-9]*\.?[0-9]*$/.test(e.target.value)) onAmountChange(e.target.value)
        }}
        placeholder="0.0"
        className="w-full bg-transparent text-xl font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
      />
      {symbol && balance > 0 && (
        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/20">
          {[25, 50, 75].map((pct) => (
            <button
              key={pct}
              onClick={() => onAmountChange((balance * pct / 100).toFixed(8))}
              className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              {pct}%
            </button>
          ))}
          <button
            onClick={() => onAmountChange(balance.toFixed(8))}
            className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
          >
            MAX
          </button>
        </div>
      )}
    </div>
  )
}

export function AddLiquidity({ chainId, poolActions }: AddLiquidityProps) {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const {
    token0Symbol, token1Symbol, feeTier, amount0, amount1, fullRange,
    setToken0Symbol, setToken1Symbol, setFeeTier, setAmount0, setAmount1, setFullRange,
    setPriceLower, setPriceUpper,
  } = usePoolStore()

  const tokens = getTokensByChain(chainId)
  const token0 = getToken(chainId, token0Symbol)
  const token1 = getToken(chainId, token1Symbol)
  const balances = useTokenBalances(chainId)

  const balance0 = token0Symbol ? parseFloat(balances[token0Symbol] || '0') : 0
  const balance1 = token1Symbol ? parseFloat(balances[token1Symbol] || '0') : 0

  // Check if pool exists and get current price
  const poolInfo = usePoolInfo(
    chainId,
    token0?.address || '',
    token1?.address || '',
    feeTier
  )

  // Auto-calculate other amount based on pool price
  const handleAmount0Change = (val: string) => {
    setAmount0(val)
    if (isConnected && poolInfo.exists && poolInfo.price && val && parseFloat(val) > 0) {
      const calculated = (parseFloat(val) * poolInfo.price).toFixed(8)
      setAmount1(calculated)
    }
  }

  const handleAmount1Change = (val: string) => {
    setAmount1(val)
    if (isConnected && poolInfo.exists && poolInfo.price && poolInfo.price > 0 && val && parseFloat(val) > 0) {
      const calculated = (parseFloat(val) / poolInfo.price).toFixed(8)
      setAmount0(calculated)
    }
  }

  const handleAddLiquidity = () => {
    const t0 = tokens.find(t => t.symbol === token0Symbol)
    const t1 = tokens.find(t => t.symbol === token1Symbol)
    if (!t0 || !t1 || !amount0 || !amount1) return

    let t0Addr = t0.address as Address
    let t1Addr = t1.address as Address
    let amt0 = amount0
    let amt1 = amount1
    let dec0 = t0.decimals
    let dec1 = t1.decimals

    if (t0Addr.toLowerCase() > t1Addr.toLowerCase()) {
      [t0Addr, t1Addr] = [t1Addr, t0Addr];
      [amt0, amt1] = [amt1, amt0];
      [dec0, dec1] = [dec1, dec0]
    }

    const tickSpacing = feeTier === 500 ? 10 : feeTier === 3000 ? 60 : 200
    // Full range: nearest valid ticks within MIN_TICK/MAX_TICK divisible by tickSpacing
    const MIN_TICK = -887272
    const MAX_TICK = 887272
    const tickLower = fullRange ? Math.ceil(MIN_TICK / tickSpacing) * tickSpacing : -50000
    const tickUpper = fullRange ? Math.floor(MAX_TICK / tickSpacing) * tickSpacing : 50000

    const roundedLower = Math.floor(tickLower / tickSpacing) * tickSpacing
    const roundedUpper = Math.ceil(tickUpper / tickSpacing) * tickSpacing

    poolActions.addLiquidity(
      t0Addr, t1Addr, feeTier,
      roundedLower, roundedUpper,
      amt0, amt1, dec0, dec1,
    )
  }

  const isExecuting = poolActions.status === 'approving' || poolActions.status === 'executing'
  const pairSelected = token0Symbol && token1Symbol

  return (
    <div className="space-y-3">
      {/* Pool Status Modal */}
      <PoolStatusModal
        status={poolActions.status}
        error={poolActions.error}
        onReset={poolActions.reset}
        type="add"
      />

      {/* Step 1: Select Pair */}
      <div className="rounded-xl border border-border/30 bg-muted/10 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">1. Select Pair</p>
          {pairSelected && (
            <div className="flex -space-x-1">
              {token0 && <img src={token0.icon} alt={token0Symbol} className="w-4 h-4 rounded-full border border-background" />}
              {token1 && <img src={token1.icon} alt={token1Symbol} className="w-4 h-4 rounded-full border border-background" />}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TokenDropdown
            chainId={chainId}
            value={token0Symbol}
            onChange={setToken0Symbol}
            excludeSymbol={token1Symbol}
            label="Token A"
          />
          <TokenDropdown
            chainId={chainId}
            value={token1Symbol}
            onChange={setToken1Symbol}
            excludeSymbol={token0Symbol}
            label="Token B"
          />
        </div>
      </div>

      {/* Step 2: Fee Tier + Range */}
      <div className="rounded-xl border border-border/30 bg-muted/10 p-3.5 space-y-3">
        <p className="text-xs font-medium text-foreground">2. Fee & Range</p>

        {/* Fee Tier */}
        <div className="grid grid-cols-3 gap-1.5">
          {FEE_TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() => setFeeTier(tier)}
              className={cn(
                'py-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer text-center',
                feeTier === tier
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground/70 border border-border/20'
              )}
            >
              {getFeeTierLabel(tier)}
            </button>
          ))}
        </div>

        {/* Range toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Price Range</span>
          <button
            onClick={() => setFullRange(!fullRange)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer',
              fullRange
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent'
            )}
          >
            Full Range
          </button>
        </div>

        {!fullRange && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
              <label className="text-[9px] text-muted-foreground block mb-1">Min</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                onChange={(e) => setPriceLower(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/20 p-2.5">
              <label className="text-[9px] text-muted-foreground block mb-1">Max</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="∞"
                onChange={(e) => setPriceUpper(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pool Info */}
      {isConnected && token0Symbol && token1Symbol && (
        <div className={cn(
          'rounded-xl p-3 text-xs',
          poolInfo.exists
            ? 'border border-border/30 bg-muted/10'
            : 'border border-primary/20 bg-primary/5'
        )}>
          {poolInfo.loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Checking pool...</span>
            </div>
          ) : poolInfo.exists ? (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>Pool exists</span>
              </div>
              {poolInfo.price !== null && (
                <p className="text-[11px] text-foreground font-medium pl-[18px]">
                  1 {token0Symbol} = {poolInfo.price < 0.000001 ? poolInfo.price.toExponential(4) : poolInfo.price.toFixed(6)} {token1Symbol}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground pl-[18px]">
                Your deposit ratio should match the current pool price.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-primary">
                <Info className="h-3 w-3" />
                <span className="font-medium">New pool</span>
              </div>
              <p className="text-[10px] text-muted-foreground pl-[18px]">
                This pool doesn't exist yet. It will be created with the price based on your deposit ratio.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Deposit */}
      <div className={cn('rounded-xl border border-border/30 bg-muted/10 p-3.5 space-y-2.5', !isConnected && 'opacity-50 pointer-events-none')}>
        <p className="text-xs font-medium text-foreground">3. Deposit</p>
        <DepositInput
          token={token0}
          symbol={token0Symbol}
          balance={balance0}
          amount={amount0}
          onAmountChange={handleAmount0Change}
        />
        <div className="flex justify-center">
          <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
        </div>
        <DepositInput
          token={token1}
          symbol={token1Symbol}
          balance={balance1}
          amount={amount1}
          onAmountChange={handleAmount1Change}
        />
      </div>

      {/* Summary */}
      {isConnected && pairSelected && amount0 && amount1 && (
        <div className="rounded-xl border border-border/30 bg-muted/10 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Pair</span>
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                {token0 && <img src={token0.icon} alt={token0Symbol} className="w-3.5 h-3.5 rounded-full border border-background" />}
                {token1 && <img src={token1.icon} alt={token1Symbol} className="w-3.5 h-3.5 rounded-full border border-background" />}
              </div>
              <span className="text-[11px] font-medium">{token0Symbol}/{token1Symbol}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Fee Tier</span>
            <span className="text-[11px] font-medium">{getFeeTierLabel(feeTier)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Range</span>
            <span className="text-[11px] font-medium">{fullRange ? 'Full Range' : 'Custom'}</span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={isConnected ? handleAddLiquidity : () => openConnectModal?.()}
        disabled={isConnected && (!token0Symbol || !token1Symbol || !amount0 || !amount1 || isExecuting)}
        className={cn(
          'w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 btn-shine',
          !isConnected
            ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground cursor-pointer'
            : token0Symbol && token1Symbol && amount0 && amount1 && !isExecuting
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 cursor-pointer'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
        {!isConnected && <Wallet className="h-4 w-4" />}
        {!isConnected ? 'Connect Wallet' : !token0Symbol || !token1Symbol ? 'Select tokens' : !amount0 || !amount1 ? 'Enter amounts' : isExecuting ? 'Adding...' : 'Add Liquidity'}
      </button>
    </div>
  )
}
