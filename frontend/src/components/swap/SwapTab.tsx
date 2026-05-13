import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDownUp, Settings2, Zap, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { useSwapStore } from '@/stores/swapStore'
import { getTokensByChain } from '@/config/tokens'
import { POOLS } from '@/config/pools'
import { SWAP_CHAINS, AGGREGATOR_FEE_BPS, FEE_DENOMINATOR, WETH_ADDRESS } from '@/config/dex'
import { useQuoter } from '@/hooks/useQuoter'
import { useTokenBalances } from '@/hooks/useTokenBalances'
import { useSwap } from '@/hooks/useSwap'
import { useCrossChainSwap } from '@/hooks/useCrossChainSwap'
import { formatUnits } from 'viem'
import { SwapInput } from './SwapInput'
import { SwapSettings } from './SwapSettings'
import { SwapButton } from './SwapButton'
import { SwapStatusModal } from './SwapStatusModal'

export function SwapTab() {
  const {
    fromChainId, toChainId, tokenIn, tokenOut,
    amountIn, amountOut, isLoadingRoute,
    setFromChainId, setToChainId, setTokenIn, setTokenOut,
    setAmountIn, setAmountOut, setRoute, setIsLoadingRoute,
    switchTokens, resetSwap,
  } = useSwapStore()

  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { getQuote } = useQuoter()
  const fromBalances = useTokenBalances(fromChainId)
  const toBalances = useTokenBalances(toChainId)

  // Swap hooks
  const swap = useSwap()
  const crossChain = useCrossChainSwap()

  // Counter to force re-quote after swap completes
  const [quoteRefresh, setQuoteRefresh] = useState(0)
  useEffect(() => {
    if (swap.status === 'success' || crossChain.status === 'completed') {
      setTimeout(() => setQuoteRefresh((c) => c + 1), 3000)
    }
  }, [swap.status, crossChain.status])

  const isCrossChain = fromChainId !== toChainId
  const fromChainName = SWAP_CHAINS.find(c => c.chainId === fromChainId)?.name || ''
  const toChainName = SWAP_CHAINS.find(c => c.chainId === toChainId)?.name || ''

  // Detect bridge-only based on token selection (no need to wait for route/quote)
  const isBridgeOnly = isCrossChain && (
    (tokenIn?.symbol === 'zkLTC' && tokenOut?.symbol === 'wzkLTC') ||
    (tokenIn?.symbol === 'wzkLTC' && tokenOut?.symbol === 'zkLTC')
  )

  // Auto switch chain when fromChainId changes (skip initial mount)
  const { isConnected } = useAccount()
  const walletChainId = useChainId()
  const { switchChain } = useSwitchChain()
  const isInitialMount = useRef(true)
  const isWalletSync = useRef(false)

  // Sync fromChainId with wallet's active chain on mount and when wallet switches
  // Skip sync when a swap/bridge is in progress (cross-chain swap switches chain internally)
  useEffect(() => {
    const isSwapping = swap.status !== 'idle' || crossChain.status !== 'idle'
    if (isSwapping) return
    if (isConnected && walletChainId && [4441, 11155111, 84532].includes(walletChainId)) {
      isWalletSync.current = true
      setFromChainId(walletChainId)
    }
  }, [walletChainId, isConnected])

  // Auto switch wallet chain when user changes fromChainId via selector (not from wallet sync)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (isWalletSync.current) {
      isWalletSync.current = false
      return
    }
    if (isConnected && walletChainId !== fromChainId) {
      switchChain({ chainId: fromChainId })
    }
  }, [fromChainId])

  // Filter tokens: disable same token pair + cross-chain restrictions
  const fromTokens = getTokensByChain(fromChainId)
  const toTokens = getTokensByChain(toChainId)

  // Disable selected token from opposite selector (prevent same pair)
  const disabledFromSymbols = tokenOut ? [tokenOut.symbol] : []
  const disabledToSymbols = tokenIn ? [tokenIn.symbol] : []

  // Cross-chain from LiteForge: only allow zkLTC as input (MULTY can't bridge)
  // Cross-chain from Sepolia/Base to LiteForge: allow all tokens (wzkLTC, MULTY, WETH)
  const filteredFromTokens = isCrossChain && fromChainId === 4441
    ? fromTokens.filter(t => t.symbol === 'zkLTC')
    : fromTokens

  // Cross-chain to LiteForge: only allow zkLTC as output
  // Cross-chain from LiteForge to Sepolia/Base: allow all destination tokens
  const filteredToTokens = isCrossChain && toChainId === 4441
    ? toTokens.filter(t => t.symbol === 'zkLTC')
    : toTokens

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])


  // Route calculation using on-chain QuoterV2
  useEffect(() => {
    if (!tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
      setAmountOut('')
      setRoute(null)
      return
    }

    setIsLoadingRoute(true)

    const fetchQuote = async () => {
      try {
        // Determine which chain to quote on
        const quoteChainId = isCrossChain ? toChainId : fromChainId

        // Cross-chain between Sepolia and Base Sepolia not supported (no direct bridge)
        if (isCrossChain && fromChainId !== 4441 && toChainId !== 4441) {
          setAmountOut('')
          setRoute(null)
          setIsLoadingRoute(false)
          return
        }

        // Cross-chain LiteForge → Dest: zkLTC → wzkLTC (bridge only, no swap)
        if (isCrossChain && tokenOut.symbol === 'wzkLTC' && (tokenIn.address === 'native' || tokenIn.symbol === 'zkLTC')) {
          const input = parseFloat(amountIn)
          const bridgeFee = input * 0.003
          const output = input - bridgeFee
          setAmountOut(output.toFixed(6))
          setRoute({
            path: [tokenIn.symbol, 'bridge', 'wzkLTC'],
            pools: [],
            estimatedOutput: output.toFixed(6),
            priceImpact: '0.00',
            isCrossChain: true,
            bridgeFee: bridgeFee.toFixed(6),
          })
          setIsLoadingRoute(false)
          return
        }

        // Cross-chain Dest → LiteForge: wzkLTC → zkLTC (bridge back, no swap)
        if (isCrossChain && tokenIn.symbol === 'wzkLTC' && tokenOut.symbol === 'zkLTC') {
          const input = parseFloat(amountIn)
          const bridgeFee = input * 0.003
          const output = input - bridgeFee
          setAmountOut(output.toFixed(6))
          setRoute({
            path: ['wzkLTC', 'bridge', 'zkLTC'],
            pools: [],
            estimatedOutput: output.toFixed(6),
            priceImpact: '0.00',
            isCrossChain: true,
            bridgeFee: bridgeFee.toFixed(6),
          })
          setIsLoadingRoute(false)
          return
        }

        // Wrap/Unwrap: native ↔ WETH (1:1, no pool needed)
        const wethAddr = WETH_ADDRESS[fromChainId]
        const isWrap = !isCrossChain && tokenIn.address === 'native' && tokenOut.address?.toLowerCase() === wethAddr?.toLowerCase()
        const isUnwrap = !isCrossChain && tokenOut.address === 'native' && tokenIn.address?.toLowerCase() === wethAddr?.toLowerCase()

        if (isWrap || isUnwrap) {
          const input = parseFloat(amountIn)
          setAmountOut(input.toFixed(6))
          setRoute({
            path: [tokenIn.symbol, tokenOut.symbol],
            pools: ['wrap'],
            estimatedOutput: input.toFixed(6),
            priceImpact: '0.00',
            isCrossChain: false,
          })
          setIsLoadingRoute(false)
          return
        }

        // Cross-chain Dest → LiteForge: MULTY/WETH → zkLTC (swap to wzkLTC then bridge)
        if (isCrossChain && toChainId === 4441 && tokenIn.symbol !== 'wzkLTC') {
          // Quote swap tokenIn → wzkLTC on source chain
          const wzkLTCToken = getTokensByChain(fromChainId).find(t => t.symbol === 'wzkLTC')
          if (!wzkLTCToken) {
            setAmountOut('')
            setRoute(null)
            setIsLoadingRoute(false)
            return
          }

          const input = parseFloat(amountIn)
          const aggregatorFee = (input * AGGREGATOR_FEE_BPS) / FEE_DENOMINATOR
          const netInput = input - aggregatorFee
          const netInputStr = netInput.toFixed(8)

          const poolSymbolIn = tokenIn.symbol
          const poolSymbolOut = 'wzkLTC'
          const pool = POOLS.find(
            (p) => p.chainId === fromChainId &&
              ((p.token0 === poolSymbolIn && p.token1 === poolSymbolOut) ||
                (p.token0 === poolSymbolOut && p.token1 === poolSymbolIn))
          )
          const feeTier = pool?.feeTier ?? 10000

          const quote = await getQuote(fromChainId, tokenIn, wzkLTCToken, netInputStr, feeTier)
          if (quote && quote.amountOut > BigInt(0)) {
            const wzkLTCAmount = parseFloat(formatUnits(quote.amountOut, 18))
            const bridgeFee = wzkLTCAmount * 0.003
            const finalOutput = wzkLTCAmount - bridgeFee
            setAmountOut(finalOutput.toFixed(6))

            // Calculate real price impact
            let impact = 0
            try {
              const refQuote = await getQuote(fromChainId, tokenIn, wzkLTCToken, '0.000001', feeTier)
              if (refQuote && refQuote.amountOut > BigInt(0)) {
                const refOut = parseFloat(formatUnits(refQuote.amountOut, 18))
                const midPrice = refOut / 0.000001
                const execPrice = wzkLTCAmount / netInput
                impact = midPrice > 0 ? Math.abs((midPrice - execPrice) / midPrice * 100) : 0
              }
            } catch {
              impact = 0
            }

            setRoute({
              path: [tokenIn.symbol, 'wzkLTC', 'bridge', 'zkLTC'],
              pools: [pool?.id || 'multyra-v3'],
              estimatedOutput: finalOutput.toFixed(6),
              priceImpact: impact.toFixed(2),
              isCrossChain: true,
              bridgeFee: bridgeFee.toFixed(6),
            })
          } else {
            setAmountOut('')
            setRoute(null)
          }
          setIsLoadingRoute(false)
          return
        }

        // For native tokens, use WETH address for quoting (pool uses WETH)
        const quoteTokenIn = (() => {
          let t = isCrossChain && tokenIn.address === 'native'
            ? getTokensByChain(toChainId).find(tk => tk.symbol === 'wzkLTC')
            : tokenIn
          // If native, create a virtual token with WETH address for quoting
          if (t && t.address === 'native') {
            const wethAddr = WETH_ADDRESS[quoteChainId]
            if (wethAddr) {
              t = { ...t, address: wethAddr }
            }
          }
          return t
        })()
        const quoteTokenOut = (() => {
          let t = tokenOut
          if (t && t.address === 'native') {
            const wethAddr = WETH_ADDRESS[quoteChainId]
            if (wethAddr) {
              t = { ...t, address: wethAddr }
            }
          }
          return t
        })()

        if (!quoteTokenIn || !quoteTokenOut) {
          setAmountOut('')
          setRoute(null)
          setIsLoadingRoute(false)
          return
        }

        // Calculate net input after fees
        const input = parseFloat(amountIn)
        const aggregatorFee = (input * AGGREGATOR_FEE_BPS) / FEE_DENOMINATOR
        const bridgeFee = isCrossChain ? input * 0.003 : 0
        const netInput = input - aggregatorFee - bridgeFee
        const netInputStr = netInput.toFixed(tokenIn.decimals > 6 ? 8 : 6)

        // Try all fee tiers and pick the best quote
        const FEE_TIERS = [500, 3000, 10000]
        let bestQuote: { amountOut: bigint } | null = null
        let bestFeeTier = 3000

        const quoteResults = await Promise.all(
          FEE_TIERS.map(async (tier) => {
            try {
              const q = await getQuote(quoteChainId, quoteTokenIn, quoteTokenOut, netInputStr, tier)
              return { tier, quote: q }
            } catch {
              return { tier, quote: null }
            }
          })
        )

        for (const { tier, quote } of quoteResults) {
          if (quote && quote.amountOut > BigInt(0)) {
            if (!bestQuote || quote.amountOut > bestQuote.amountOut) {
              bestQuote = quote
              bestFeeTier = tier
            }
          }
        }

        if (bestQuote && bestQuote.amountOut > BigInt(0)) {
          const outputFormatted = formatUnits(bestQuote.amountOut, quoteTokenOut.decimals)
          setAmountOut(parseFloat(outputFormatted).toFixed(6))

          // Calculate price impact using a small reference quote
          // Compare execution price vs mid-price (quote for tiny amount)
          let impact = 0
          try {
            const refAmount = '0.000001' // tiny amount for mid-price reference
            const refQuote = await getQuote(quoteChainId, quoteTokenIn, quoteTokenOut, refAmount, bestFeeTier)
            if (refQuote && refQuote.amountOut > BigInt(0)) {
              const refOut = parseFloat(formatUnits(refQuote.amountOut, quoteTokenOut.decimals))
              const midPrice = refOut / 0.000001 // output per 1 unit input
              const execPrice = parseFloat(outputFormatted) / netInput
              impact = midPrice > 0 ? Math.abs((midPrice - execPrice) / midPrice * 100) : 0
            }
          } catch {
            impact = 0.1
          }

          const path = isCrossChain
            ? [tokenIn.symbol, 'bridge', tokenOut.symbol]
            : [tokenIn.symbol, tokenOut.symbol]

          setRoute({
            path,
            pools: [bestFeeTier.toString()],
            estimatedOutput: parseFloat(outputFormatted).toFixed(6),
            priceImpact: impact.toFixed(2),
            isCrossChain,
            bridgeFee: isCrossChain ? bridgeFee.toFixed(6) : undefined,
          })
        } else {
          // Quote returned 0 or failed — no liquidity available
          setAmountOut('')
          setRoute(null)
        }
      } catch (err) {
        console.error('Quote error:', err)
        setAmountOut('')
        setRoute(null)
      } finally {
        setIsLoadingRoute(false)
      }
    }

    const timeout = setTimeout(fetchQuote, 600)
    return () => clearTimeout(timeout)
  }, [amountIn, tokenIn, tokenOut, fromChainId, toChainId, quoteRefresh])

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-semibold leading-none">Swap</h3>
          <AnimatePresence>
            {isCrossChain && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium border border-primary/10 leading-none"
              >
                <Zap className="h-3 w-3" />
                {isBridgeOnly ? 'Bridge' : 'Cross-chain'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'p-2 rounded-lg transition-all duration-150 cursor-pointer',
              showSettings
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Settings2 className="h-4 w-4" />
          </button>

          {/* Settings Popup */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 z-50 w-72 rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden"
              >
                <div className="px-4 py-2.5 border-b border-border/30">
                  <p className="text-xs font-semibold text-foreground">Swap Settings</p>
                </div>
                <div className="p-3">
                  <SwapSettings />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* From */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">From</span>
          <ChainPill chainId={fromChainId} onChange={setFromChainId} />
        </div>
        <SwapInput
          token={tokenIn}
          tokens={filteredFromTokens}
          amount={amountIn}
          onAmountChange={setAmountIn}
          onTokenSelect={setTokenIn}
          balances={fromBalances}
          disabledSymbols={disabledFromSymbols}
        />
      </div>

      {/* Switch Button */}
      <div className="flex justify-center -my-0.5 relative z-10">
        <motion.button
          onClick={switchTokens}
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          className="h-10 w-10 rounded-full bg-background border-[3px] border-muted/60 flex items-center justify-center hover:border-primary/30 transition-colors cursor-pointer shadow-sm"
        >
          <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
        </motion.button>
      </div>

      {/* To */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">To</span>
          <ChainPill chainId={toChainId} onChange={setToChainId} />
        </div>
        <SwapInput
          token={tokenOut}
          tokens={filteredToTokens}
          amount={amountOut}
          onAmountChange={() => {}}
          onTokenSelect={setTokenOut}
          readOnly
          loading={isLoadingRoute}
          balances={toBalances}
          disabledSymbols={disabledToSymbols}
        />
      </div>

      {/* Swap Button */}
      <SwapButton
        swapHook={swap}
        crossChainHook={crossChain}
        isCrossChain={isCrossChain}
      />

      {/* Status Modal */}
      <SwapStatusModal
        swapStatus={swap.status}
        swapTxHash={swap.txHash}
        swapError={swap.error}
        onSwapReset={() => { swap.reset(); resetSwap() }}
        crossStatus={crossChain.status}
        crossTxHash={crossChain.txHash}
        crossError={crossChain.error}
        onCrossReset={() => { crossChain.reset(); resetSwap() }}
        isCrossChain={isCrossChain}
        isBridgeOnly={isBridgeOnly}
        tokenInSymbol={tokenIn?.symbol}
        tokenOutSymbol={tokenOut?.symbol}
        fromChainName={fromChainName}
        toChainName={toChainName}
        fromChainId={fromChainId}
      />
    </div>
  )
}

// Chain selector pill with dropdown
function ChainPill({ chainId, onChange }: { chainId: number; onChange: (id: number) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const chain = SWAP_CHAINS.find((c) => c.chainId === chainId)

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
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-150 text-xs cursor-pointer border',
          open
            ? 'bg-primary/5 border-primary/20 text-primary'
            : 'bg-muted/40 border-transparent hover:bg-muted/60 text-muted-foreground'
        )}
      >
        <img src={chain?.icon} alt={chain?.name} className="w-3.5 h-3.5 rounded-full" />
        <span className="font-medium">{chain?.name}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 mt-1.5 z-50 w-48 rounded-xl border border-border/50 bg-card/95 backdrop-blur-md shadow-xl overflow-hidden"
          >
            <div className="p-1.5 space-y-0.5">
              {SWAP_CHAINS.map((c) => {
                const isSelected = chainId === c.chainId
                return (
                  <button
                    key={c.chainId}
                    onClick={() => { onChange(c.chainId); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150 cursor-pointer',
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium ring-1 ring-primary/15'
                        : 'hover:bg-muted/50 text-foreground'
                    )}
                  >
                    <img src={c.icon} alt={c.name} className="w-4 h-4 rounded-full ring-1 ring-border/30" />
                    <span>{c.name}</span>
                    {isSelected && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
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
