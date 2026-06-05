import { useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useBuyTicket } from '@/hooks/use-buy-ticket';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { formatEth } from '@/lib/utils';
import type { Market } from '@/hooks/use-markets';

interface BuyTicketModalProps {
  market: Market;
  outcomeIndex: number;
  outcomeLabel: string;
  onClose: () => void;
}

export function BuyTicketModal({ market, outcomeIndex, outcomeLabel, onClose }: BuyTicketModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { buyTicket, isPending, isConfirming, isSuccess, error } = useBuyTicket();
  const { address } = useAccount();

  const costPerTicket = BigInt(market.ticket_price) + BigInt(market.fee);
  const totalCost = costPerTicket * BigInt(quantity);

  function handleBuy() {
    buyTicket(market.id, outcomeIndex, quantity, market.ticket_price, market.fee);
  }

  // Auto close after success
  if (isSuccess) {
    setTimeout(onClose, 2000);
  }

  if (!address) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[340px] rounded-2xl border border-border bg-card p-5 shadow-2xl shadow-black/40 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Buy Tickets</h3>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Market title */}
        <p className="text-[14px] text-muted-foreground truncate mb-4">{market.title}</p>

        {isSuccess ? (
          <div className="flex flex-col items-center py-6">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
              <span className="text-xl">✓</span>
            </div>
            <p className="text-sm font-medium text-emerald-400">Purchase Successful!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Selected outcome */}
            <div className="flex items-center justify-between rounded-lg bg-background border border-border p-3">
              <span className="text-xs text-muted-foreground">Outcome</span>
              <span className="text-sm font-medium text-accent">{outcomeLabel}</span>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs text-muted-foreground">Quantity</label>
              <input
                type="number"
                min={1}
                max={100}
                value={quantity === 0 ? '' : quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') { setQuantity(0); return; }
                  setQuantity(Math.max(1, Number(val)));
                }}
                onBlur={() => { if (quantity < 1) setQuantity(1); }}
                className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-accent"
              />
            </div>

            {/* Cost breakdown */}
            <div className="rounded-lg bg-background border border-border p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Ticket Price</span>
                <span className="font-mono text-[12px] text-foreground">{formatEth(market.ticket_price)} zkLTC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Fee</span>
                <span className="font-mono text-[12px] text-foreground">{formatEth(market.fee)} zkLTC</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-medium">Total</span>
                <span className="font-mono text-sm text-foreground font-medium">{formatEth(totalCost.toString())} zkLTC</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-[11px] text-danger truncate">{error.message}</p>
            )}

            {/* Buy button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleBuy}
              loading={isPending || isConfirming}
            >
              {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Confirming...' : 'Buy Tickets'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
