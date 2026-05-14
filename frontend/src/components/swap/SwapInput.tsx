import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Token } from '@/config/tokens'

interface SwapInputProps {
  token: Token | null
  tokens: Token[]
  amount: string
  onAmountChange: (amount: string) => void
  onTokenSelect: (token: Token) => void
  readOnly?: boolean
  loading?: boolean
  usdValue?: string
  balances?: Record<string, string>
  disabledSymbols?: string[]
}

export function SwapInput({
  token,
  tokens,
  amount,
  onAmountChange,
  onTokenSelect,
  readOnly = false,
  loading = false,
  usdValue,
  balances = {},
  disabledSymbols = [],
}: SwapInputProps) {
  const [showSelector, setShowSelector] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filteredTokens = tokens.filter(
    (t) => (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
           t.name.toLowerCase().includes(search.toLowerCase())) &&
           !disabledSymbols.includes(t.symbol)
  )

  const balance = token ? balances[token.symbol] : undefined
  const balanceNum = balance ? parseFloat(balance) : 0

  const handlePercentage = (percent: number) => {
    if (balanceNum > 0) {
      const value = (balanceNum * percent / 100).toFixed(8)
      onAmountChange(value)
    }
  }

  return (
    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 relative hover:border-border/70 transition-colors" ref={ref}>
      {/* Amount + Token selector row */}
      <div className="flex items-center gap-3">
        {/* Amount Input */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-8 w-32 rounded-lg bg-muted/40 animate-pulse" />
          ) : (
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const val = e.target.value
                if (/^[0-9]*\.?[0-9]*$/.test(val)) onAmountChange(val)
              }}
              placeholder="0.0"
              readOnly={readOnly}
              className={cn(
                'w-full bg-transparent text-2xl font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none tracking-tight',
                readOnly && 'cursor-default'
              )}
            />
          )}
          {usdValue && parseFloat(usdValue) > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">${usdValue}</p>
          )}
        </div>

        {/* Token Selector Button */}
        <button
          onClick={() => setShowSelector(!showSelector)}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer shrink-0',
            token
              ? 'bg-muted/50 hover:bg-muted/70 border border-border/30 hover:border-border/50'
              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
          )}
        >
          {token ? (
            <>
              <img src={token.icon} alt={token.symbol} className="w-5 h-5 rounded-full ring-1 ring-border/20" />
              <span className="text-sm font-bold">{token.symbol}</span>
            </>
          ) : (
            <span className="text-sm font-bold">Select token</span>
          )}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', showSelector && 'rotate-180')} />
        </button>
      </div>

      {/* Balance + Percentage buttons */}
      {token && balance && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <span className="text-[11px] text-muted-foreground">
            Balance: {balanceNum.toFixed(6)} {token.symbol}
          </span>
          {!readOnly && (
            <div className="flex items-center gap-1">
              {[25, 50, 75].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handlePercentage(pct)}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  {pct}%
                </button>
              ))}
              <button
                onClick={() => handlePercentage(100)}
                className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
              >
                MAX
              </button>
            </div>
          )}
        </div>
      )}

      {/* Token Selector Modal */}
      {showSelector && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => { setShowSelector(false); setSearch('') }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <p className="text-sm font-semibold text-foreground">Select Token</p>
              <button
                onClick={() => { setShowSelector(false); setSearch('') }}
                className="p-1 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-border/40">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/30">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search token..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Token List */}
            <div className="max-h-64 overflow-y-auto p-1.5">
              {filteredTokens.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No tokens found</p>
              ) : (
                filteredTokens.map((t) => {
                  const isSelected = token?.symbol === t.symbol && token?.chainId === t.chainId
                  const bal = balances[t.symbol]
                  return (
                    <button
                      key={`${t.chainId}-${t.symbol}`}
                      onClick={() => { onTokenSelect(t); setShowSelector(false); setSearch('') }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/50 text-foreground'
                      )}
                    >
                      <img src={t.icon} alt={t.symbol} className="w-7 h-7 rounded-full ring-1 ring-border/30" />
                      <div className="flex-1 text-left">
                        <p className={cn('text-sm font-medium', isSelected && 'text-primary')}>{t.symbol}</p>
                        <p className="text-[10px] text-muted-foreground">{t.name}</p>
                      </div>
                      <div className="text-right">
                        {bal && parseFloat(bal) > 0 && (
                          <p className="text-[11px] font-medium text-muted-foreground">{parseFloat(bal).toFixed(4)}</p>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
