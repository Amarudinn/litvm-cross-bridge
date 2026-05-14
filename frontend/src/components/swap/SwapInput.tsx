import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X, Loader2, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createPublicClient, http, type Address, formatUnits } from 'viem'
import { useAccount } from 'wagmi'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'
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
  chainId?: number
}

const ERC20_METADATA_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const

function getClient(chainId: number) {
  const chain = chainId === LITEFORGE_CHAIN_ID ? liteforge : chainId === SEPOLIA_CHAIN_ID ? sepolia : baseSepolia
  const rpcUrl = chainId === LITEFORGE_CHAIN_ID
    ? 'https://liteforge.rpc.caldera.xyz/http'
    : chainId === SEPOLIA_CHAIN_ID
      ? 'https://sepolia.drpc.org'
      : 'https://base-sepolia-rpc.publicnode.com'
  return createPublicClient({ chain, transport: http(rpcUrl) })
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
  chainId = LITEFORGE_CHAIN_ID,
}: SwapInputProps) {
  const { address: walletAddress } = useAccount()
  const [showSelector, setShowSelector] = useState(false)
  const [search, setSearch] = useState('')
  const [customToken, setCustomToken] = useState<Token | null>(null)
  const [customBalance, setCustomBalance] = useState<string>('')
  const [isLoadingCustom, setIsLoadingCustom] = useState(false)
  const [showAddConfirm, setShowAddConfirm] = useState(false)
  const [pendingToken, setPendingToken] = useState<Token | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  // Check if search is a contract address
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(search.trim())

  // Fetch token by contract address
  useEffect(() => {
    if (!isAddress) {
      setCustomToken(null)
      setCustomBalance('')
      return
    }

    const fetchToken = async () => {
      setIsLoadingCustom(true)
      try {
        const client = getClient(chainId)
        const address = search.trim() as Address

        const [name, symbol, decimals] = await Promise.all([
          client.readContract({ address, abi: ERC20_METADATA_ABI, functionName: 'name' }),
          client.readContract({ address, abi: ERC20_METADATA_ABI, functionName: 'symbol' }),
          client.readContract({ address, abi: ERC20_METADATA_ABI, functionName: 'decimals' }),
        ])

        setCustomToken({
          symbol: symbol as string,
          name: name as string,
          decimals: Number(decimals),
          address: address,
          icon: '',
          chainId,
        })

        // Fetch balance if wallet connected
        if (walletAddress) {
          try {
            const bal = await client.readContract({
              address,
              abi: ERC20_METADATA_ABI,
              functionName: 'balanceOf',
              args: [walletAddress],
            })
            const formatted = parseFloat(formatUnits(bal as bigint, Number(decimals)))
            setCustomBalance(formatted > 0 ? formatted.toFixed(4) : '0')
          } catch {
            setCustomBalance('0')
          }
        } else {
          setCustomBalance('')
        }
      } catch {
        setCustomToken(null)
        setCustomBalance('')
      } finally {
        setIsLoadingCustom(false)
      }
    }

    const timeout = setTimeout(fetchToken, 300)
    return () => clearTimeout(timeout)
  }, [search, isAddress, chainId])

  // Handle custom token selection — show add confirmation only if not already saved
  const handleCustomTokenClick = () => {
    if (!customToken) return
    const storageKey = `custom_tokens_${chainId}`
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as Token[]
    const alreadySaved = existing.some(t => t.address.toLowerCase() === customToken.address.toLowerCase())
    if (alreadySaved) {
      // Already in localStorage, just select it
      onTokenSelect(customToken)
      setShowSelector(false)
      setSearch('')
      setCustomToken(null)
    } else {
      setPendingToken(customToken)
      setShowAddConfirm(true)
    }
  }

  // Add token to localStorage and select it
  const handleAddToken = () => {
    if (!pendingToken) return
    const storageKey = `custom_tokens_${chainId}`
    const existing = JSON.parse(localStorage.getItem(storageKey) || '[]') as Token[]
    const alreadyExists = existing.some(t => t.address.toLowerCase() === pendingToken.address.toLowerCase())
    if (!alreadyExists) {
      existing.push(pendingToken)
      localStorage.setItem(storageKey, JSON.stringify(existing))
    }
    onTokenSelect(pendingToken)
    setShowAddConfirm(false)
    setShowSelector(false)
    setSearch('')
    setCustomToken(null)
    setPendingToken(null)
  }

  // Select without saving to localStorage
  const handleUseOnce = () => {
    if (!pendingToken) return
    onTokenSelect(pendingToken)
    setShowAddConfirm(false)
    setShowSelector(false)
    setSearch('')
    setCustomToken(null)
    setPendingToken(null)
  }

  // Load custom tokens from localStorage
  const customTokensFromStorage = (() => {
    try {
      const storageKey = `custom_tokens_${chainId}`
      return JSON.parse(localStorage.getItem(storageKey) || '[]') as Token[]
    } catch {
      return []
    }
  })()

  const allTokens = [...tokens, ...customTokensFromStorage.filter(ct => !tokens.some(t => t.address.toLowerCase() === ct.address.toLowerCase()))]

  const filteredTokens = allTokens.filter(
    (t) => (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
           t.name.toLowerCase().includes(search.toLowerCase()) ||
           (t.address !== 'native' && t.address.toLowerCase().includes(search.toLowerCase()))) &&
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
              {isLoadingCustom ? (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Fetching token...</span>
                </div>
              ) : isAddress && customToken ? (
                <button
                  onClick={handleCustomTokenClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer hover:bg-muted/50 text-foreground"
                >
                  <div className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center ring-1 ring-border/30">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{customToken.symbol}</p>
                    <p className="text-[10px] text-muted-foreground">{customToken.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium text-muted-foreground">{customBalance || '—'}</p>
                  </div>
                </button>
              ) : isAddress && !customToken ? (
                <p className="text-xs text-muted-foreground text-center py-4">Token not found at this address</p>
              ) : filteredTokens.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No tokens found</p>
              ) : (
                filteredTokens.map((t) => {
                  const isSelected = token?.symbol === t.symbol && token?.chainId === t.chainId
                  const bal = balances[t.symbol]
                  const isCustom = customTokensFromStorage.some(ct => ct.address.toLowerCase() === t.address.toLowerCase())
                  return (
                    <button
                      key={`${t.chainId}-${t.symbol}-${t.address}`}
                      onClick={() => { onTokenSelect(t); setShowSelector(false); setSearch('') }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/50 text-foreground'
                      )}
                    >
                      {t.icon ? (
                        <img
                          src={t.icon}
                          alt={t.symbol}
                          className="w-7 h-7 rounded-full ring-1 ring-border/30"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden') }}
                        />
                      ) : null}
                      <div className={cn('w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center ring-1 ring-border/30', t.icon && 'hidden')}>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <p className={cn('text-sm font-medium', isSelected && 'text-primary')}>{t.symbol}</p>
                          {isCustom && (
                            <span className="text-[9px] font-semibold text-primary">Added</span>
                          )}
                        </div>
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

      {/* Add Token Confirmation Popup */}
      {showAddConfirm && pendingToken && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          onClick={() => { setShowAddConfirm(false); setPendingToken(null) }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center ring-1 ring-border/30">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{pendingToken.symbol}</p>
                <p className="text-[11px] text-muted-foreground">{pendingToken.name}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Token will be saved to your browser's local storage so it appears in your token list next time.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleAddToken}
                className="flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground transition-colors cursor-pointer"
              >
                Add to List
              </button>
              <button
                onClick={handleUseOnce}
                className="flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold bg-muted/60 text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Use Once
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
