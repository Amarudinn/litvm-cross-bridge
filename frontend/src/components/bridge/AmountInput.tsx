import { useAccount, useBalance } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { useBridgeStore } from '@/stores/bridgeStore'
import { useWrappedZkLTC } from '@/hooks/useWrappedZkLTC'
import { formatAmount } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'

export function AmountInput() {
  const direction = useBridgeStore((s) => s.direction)
  const amount = useBridgeStore((s) => s.amount)
  const setAmount = useBridgeStore((s) => s.setAmount)
  const { address } = useAccount()

  // Native zkLTC balance on LiteForge
  const { data: nativeBalance } = useBalance({
    address,
    chainId: 4441,
    query: {
      enabled: !!address,
      refetchInterval: 15000,
    },
  })

  // wzkLTC balance on Sepolia
  const { balance: wrappedBalance } = useWrappedZkLTC(address)

  const isLock = direction === 'lock'
  const token = isLock ? 'zkLTC' : 'wzkLTC'
  const icon = '/ltc.png' // Both zkLTC and wzkLTC use ltc logo

  const currentBalance = isLock
    ? nativeBalance?.value
    : wrappedBalance

  const formattedBalance = currentBalance !== undefined
    ? formatAmount(currentBalance)
    : '0.0'

  const handleMax = () => {
    if (currentBalance === undefined) return

    if (isLock) {
      // Leave a small gas buffer (0.01 zkLTC) for native token
      const gasBuffer = parseUnits('0.01', 18)
      const maxAmount = currentBalance > gasBuffer ? currentBalance - gasBuffer : 0n
      setAmount(formatUnits(maxAmount, 18))
    } else {
      setAmount(formatUnits(currentBalance, 18))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow only valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
    }
  }

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Amount</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wallet className="h-3 w-3" />
          <span>{formattedBalance} {token}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={handleChange}
          className="flex-1 bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/30 min-w-0"
        />
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMax}
            className="h-7 px-2.5 text-xs font-semibold"
            disabled={!currentBalance}
          >
            MAX
          </Button>
          <div className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1">
            <img src={icon} alt={token} className="w-5 h-5 rounded-full" />
            <span className="text-sm font-medium">{token}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
