import { parseUnits, formatUnits } from 'viem'
import { useBridgeStore } from '@/stores/bridgeStore'
import { useBridgeVault } from '@/hooks/useBridgeVault'
import { useWrappedZkLTC } from '@/hooks/useWrappedZkLTC'
import { formatAmount } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { Info } from 'lucide-react'

export function FeeBreakdown() {
  const direction = useBridgeStore((s) => s.direction)
  const amount = useBridgeStore((s) => s.amount)

  const { feePercent: vaultFee, minLockAmount, isLoading: vaultLoading } = useBridgeVault()
  const { feePercent: wrappedFee, minBurnAmount, isLoading: wrappedLoading } = useWrappedZkLTC()

  const isLock = direction === 'lock'

  const feePercent = isLock ? vaultFee : wrappedFee
  const minAmount = isLock ? minLockAmount : minBurnAmount
  const isLoading = isLock ? vaultLoading : wrappedLoading
  const sourceToken = isLock ? 'zkLTC' : 'wzkLTC'
  const destToken = isLock ? 'wzkLTC' : 'zkLTC'

  // Calculate fee and receive amount
  let amountWei: bigint = 0n
  let feeWei: bigint = 0n
  let receiveWei: bigint = 0n

  try {
    if (amount && parseFloat(amount) > 0) {
      amountWei = parseUnits(amount, 18)
      if (feePercent !== undefined) {
        feeWei = (amountWei * feePercent) / 10000n
        receiveWei = amountWei - feeWei
      }
    }
  } catch {
    // Invalid number input, ignore
  }

  const feePercentDisplay = feePercent !== undefined ? Number(feePercent) / 100 : undefined

  if (isLoading) {
    return (
      <div className="space-y-2 mt-4 px-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-0">
      {/* Fee info rows */}
      <div className="px-1 py-2 space-y-2 text-sm">
        <Row
          label="Fee"
          value={feePercentDisplay !== undefined ? `${feePercentDisplay}%` : '—'}
        />

        {amountWei > 0n && (
          <Row
            label="Fee amount"
            value={`${formatAmount(feeWei)} ${sourceToken}`}
          />
        )}

        <Row
          label="Min. amount"
          value={
            minAmount !== undefined
              ? `${formatUnits(minAmount, 18)} ${sourceToken}`
              : '—'
          }
        />
      </div>

      {/* Receive amount - highlighted */}
      {amountWei > 0n && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>You will receive</span>
          </div>
          <span className="text-sm font-semibold text-primary">
            ~{formatAmount(receiveWei)} {destToken}
          </span>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={highlight ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>{label}</span>
      <span className={highlight ? 'text-amber-500 font-medium' : 'text-foreground/80'}>{value}</span>
    </div>
  )
}
