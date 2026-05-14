import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { parseUnits } from 'viem'
import { Loader2, Wallet, ArrowLeftRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useBridgeStore } from '@/stores/bridgeStore'
import { useBridgeVault } from '@/hooks/useBridgeVault'
import { useWrappedZkLTC } from '@/hooks/useWrappedZkLTC'
import { useLock } from '@/hooks/useLock'
import { useBurn } from '@/hooks/useBurn'
import { LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { cn } from '@/lib/utils'

function BridgeBtn({
  onClick,
  disabled,
  loading,
  children,
  variant = 'primary',
}: {
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'disabled'
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!(disabled || loading) ? { scale: 1.01 } : undefined}
      whileTap={!(disabled || loading) ? { scale: 0.98 } : undefined}
      className={cn(
        'w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all duration-200 btn-shine',
        variant === 'primary' && 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground cursor-pointer',
        variant === 'secondary' && 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 cursor-pointer',
        variant === 'disabled' && 'bg-muted/60 text-muted-foreground/70 cursor-not-allowed',
        (disabled || loading) && 'opacity-60 cursor-not-allowed'
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  )
}

export function BridgeButton() {
  const direction = useBridgeStore((s) => s.direction)
  const destChain = useBridgeStore((s) => s.destChain)
  const amount = useBridgeStore((s) => s.amount)
  const activeTx = useBridgeStore((s) => s.activeTx)

  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { openConnectModal } = useConnectModal()

  const { minLockAmount } = useBridgeVault()
  const { balance: wrappedBalance, minBurnAmount } = useWrappedZkLTC(address)

  const { data: nativeBalance } = useBalance({
    address,
    chainId: LITEFORGE_CHAIN_ID,
    query: { enabled: !!address },
  })

  const { lock } = useLock()
  const { burn } = useBurn()

  const isLock = direction === 'lock'

  // Determine required chain based on direction
  const requiredChainId = isLock
    ? LITEFORGE_CHAIN_ID
    : (destChain === 'baseSepolia' ? BASE_SEPOLIA_CHAIN_ID : SEPOLIA_CHAIN_ID)

  const chainName = isLock
    ? 'LiteForge'
    : (destChain === 'baseSepolia' ? 'Base Sepolia' : 'Sepolia')

  const token = isLock ? 'zkLTC' : 'wzkLTC'

  // Parse amount
  let amountWei: bigint = 0n
  let validAmount = false
  try {
    if (amount && parseFloat(amount) > 0) {
      amountWei = parseUnits(amount, 18)
      validAmount = true
    }
  } catch {
    validAmount = false
  }

  const userBalance = isLock ? nativeBalance?.value : wrappedBalance
  const minAmount = isLock ? minLockAmount : minBurnAmount

  // Handle bridge action
  const handleBridge = async () => {
    if (!address) return
    const recipient = address
    if (isLock) {
      await lock(amountWei, recipient)
    } else {
      await burn(amountWei, recipient)
    }
  }

  // Button state logic
  if (!isConnected) {
    return (
      <BridgeBtn onClick={openConnectModal} variant="primary">
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </BridgeBtn>
    )
  }

  if (chainId !== requiredChainId) {
    return (
      <BridgeBtn
        onClick={() => switchChain({ chainId: requiredChainId })}
        variant="secondary"
      >
        <ArrowLeftRight className="h-4 w-4" />
        Switch to {chainName}
      </BridgeBtn>
    )
  }

  if (activeTx.status === 'signing') {
    return (
      <BridgeBtn disabled loading variant="primary">
        Confirm in Wallet...
      </BridgeBtn>
    )
  }

  if (activeTx.status === 'confirming') {
    return (
      <BridgeBtn disabled loading variant="primary">
        Confirming...
      </BridgeBtn>
    )
  }

  if (!validAmount) {
    return (
      <BridgeBtn disabled variant="disabled">
        Enter Amount
      </BridgeBtn>
    )
  }

  if (minAmount !== undefined && amountWei < minAmount) {
    return (
      <BridgeBtn disabled variant="disabled">
        Below Minimum
      </BridgeBtn>
    )
  }

  if (userBalance !== undefined && amountWei > userBalance) {
    return (
      <BridgeBtn disabled variant="disabled">
        Insufficient Balance
      </BridgeBtn>
    )
  }

  return (
    <BridgeBtn onClick={handleBridge} variant="primary">
      Bridge {amount} {token}
    </BridgeBtn>
  )
}
