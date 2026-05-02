import { Card, CardContent } from '@/components/ui/card'
import { ChainSelector } from './ChainSelector'
import { AmountInput } from './AmountInput'
import { FeeBreakdown } from './FeeBreakdown'
import { BridgeButton } from './BridgeButton'

export function BridgeCard() {
  return (
    <div className="relative w-full max-w-[420px] mx-auto">
      {/* Animated gradient border */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-border-spin" />
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10 blur-md group-hover:opacity-25 transition-opacity duration-500 animate-border-spin" />

      <Card className="relative rounded-2xl border-0 bg-card shadow-2xl group">
        <CardContent className="p-4 md:p-5">
          <ChainSelector />
          <AmountInput />
          <FeeBreakdown />
          <div className="mt-4 md:mt-5">
            <BridgeButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
