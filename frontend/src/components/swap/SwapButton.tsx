import { useState } from 'react'
import { useSwapStore } from '@/stores/swapStore'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Loader2, Zap, Check, AlertCircle, AlertTriangle, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import type { SwapStatus } from '@/hooks/useSwap'
import type { CrossChainStatus } from '@/hooks/useCrossChainSwap'

interface SwapButtonProps {
  swapHook: { status: SwapStatus; execute: () => void; reset: () => void }
  crossChainHook: { status: CrossChainStatus; execute: () => void; reset: () => void }
  isCrossChain: boolean
}

export function SwapButton({ swapHook, crossChainHook, isCrossChain }: SwapButtonProps) {
  const { tokenIn, tokenOut, amountIn, amountOut, isLoadingRoute, route, fromChainId } = useSwapStore()
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [confirmInput, setConfirmInput] = useState('')

  const status = isCrossChain ? crossChainHook.status : swapHook.status
  const needsChainSwitch = isConnected && chainId !== fromChainId

  // Price impact checks
  const priceImpact = route ? (parseFloat(route.priceImpact) || 0) : 0
  const hasPoolSwap = route ? route.pools.length > 0 : false
  const isBridgeOnly = isCrossChain && (
    (tokenIn?.symbol === 'zkLTC' && tokenOut?.symbol === 'wzkLTC') ||
    (tokenIn?.symbol === 'wzkLTC' && tokenOut?.symbol === 'zkLTC') ||
    (route && route.pools.length === 0)
  )
  const isHighImpact = hasPoolSwap && priceImpact > 10
  const needsConfirmation = hasPoolSwap && priceImpact > 20
  const isConfirmed = confirmInput.toLowerCase() === 'confirm'

  const getButtonState = () => {
    // Active states
    if (status === 'checking-allowance' || status === 'approving_swap' || status === 'approving_burn' || status === 'approving')
      return { label: 'Approving...', disabled: true, variant: 'loading' as const, icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    if (status === 'swapping' || status === 'swapping_source' || status === 'swapping_dest')
      return { label: 'Swapping...', disabled: true, variant: 'loading' as const, icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    if (status === 'bridging')
      return { label: 'Bridging...', disabled: true, variant: 'loading' as const, icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    if (status === 'waiting_relay')
      return { label: 'Waiting for relay...', disabled: true, variant: 'loading' as const, icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    if (status === 'success' || status === 'completed')
      return { label: 'Swap Successful!', disabled: true, variant: 'success' as const, icon: <Check className="h-4 w-4" /> }
    if (status === 'error')
      return { label: 'Try Again', disabled: false, variant: 'error' as const, icon: <AlertCircle className="h-4 w-4" /> }

    // Pre-swap states
    if (!isConnected) return { label: 'Connect Wallet', disabled: false, variant: 'primary' as const, icon: <Wallet className="h-4 w-4" /> }
    if (needsChainSwitch) return { label: `Switch to ${fromChainId === 4441 ? 'LiteForge' : fromChainId === 11155111 ? 'Sepolia' : 'Base Sepolia'}`, disabled: false, variant: 'primary' as const, icon: null }
    if (!tokenIn) return { label: 'Select input token', disabled: true, variant: 'muted' as const, icon: null }
    if (!tokenOut) return { label: 'Select output token', disabled: true, variant: 'muted' as const, icon: null }
    if (!amountIn || parseFloat(amountIn) <= 0) return { label: 'Enter amount', disabled: true, variant: 'muted' as const, icon: null }
    if (isLoadingRoute) return { label: 'Finding best route...', disabled: true, variant: 'loading' as const, icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    if (!route || !amountOut) return { label: 'No route available', disabled: true, variant: 'muted' as const, icon: null }

    // Needs confirmation but not confirmed yet
    if (needsConfirmation && !isConfirmed) return { label: 'Swap Anyway', disabled: true, variant: 'muted' as const, icon: <AlertTriangle className="h-4 w-4" /> }

    if (isCrossChain) {
      return { label: isBridgeOnly ? 'Bridge' : 'Swap Cross-chain', disabled: false, variant: 'primary' as const, icon: <Zap className="h-4 w-4" /> }
    }

    return { label: 'Swap', disabled: false, variant: 'primary' as const, icon: null }
  }

  const handleClick = () => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    if (status === 'error') {
      isCrossChain ? crossChainHook.reset() : swapHook.reset()
      return
    }
    if (needsChainSwitch) {
      switchChain({ chainId: fromChainId })
      return
    }
    setConfirmInput('')
    isCrossChain ? crossChainHook.execute() : swapHook.execute()
  }

  const state = getButtonState()

  return (
    <div className="space-y-2 mt-1">
      {/* Price impact warning */}
      {isHighImpact && status === 'idle' && (
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium',
          needsConfirmation ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'
        )}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            {needsConfirmation
              ? `Price impact is ${route?.priceImpact}%. Type "confirm" below to proceed.`
              : `Price impact is ${route?.priceImpact}%. Proceed with caution.`
            }
          </span>
        </div>
      )}

      {/* Confirmation input for very high price impact */}
      {needsConfirmation && status === 'idle' && (
        <input
          type="text"
          value={confirmInput}
          onChange={(e) => setConfirmInput(e.target.value)}
          placeholder='Type "confirm" to proceed'
          className="w-full px-4 py-3 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-destructive/50"
        />
      )}

      {/* Swap button */}
      <motion.button
        disabled={state.disabled}
        onClick={handleClick}
        whileHover={!state.disabled ? { scale: 1.01 } : undefined}
        whileTap={!state.disabled ? { scale: 0.98 } : undefined}
        className={cn(
          'w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all duration-200 btn-shine',
          state.variant === 'primary' && 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground cursor-pointer',
          state.variant === 'loading' && 'bg-muted/80 text-muted-foreground cursor-wait',
          state.variant === 'muted' && 'bg-muted/60 text-muted-foreground/70 cursor-not-allowed',
          state.variant === 'success' && 'bg-green-500/90 text-white cursor-not-allowed',
          state.variant === 'error' && 'bg-destructive/90 text-white cursor-pointer'
        )}
      >
        {state.icon}
        {state.label}
      </motion.button>
    </div>
  )
}
