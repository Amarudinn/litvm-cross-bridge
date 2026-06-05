import { useParams, useSearchParams } from 'react-router-dom';
import { useMarket } from '@/hooks/use-market';
import { useBuyTicket, useClaim } from '@/hooks/use-buy-ticket';
import { useAccount, useReadContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEth, formatTimeLeft, cn } from '@/lib/utils';
import type { MarketRule } from '@/hooks/use-markets';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/config/contract';
import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Trophy, ArrowLeft, ShareNetwork, Wallet, ChatCircle, ListBullets, ArrowSquareOut, ShoppingCart, Minus, Plus, PaperPlaneTilt, Ticket } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useCategories } from '@/hooks/use-categories';
import { getCategoryIcon } from '@/lib/category-icons';
import { useComments } from '@/hooks/use-comments';
import { useToast } from '@/components/ui/toast';
import { supabase } from '@/config/supabase';

const DEFAULT_MARKET_RULES: MarketRule[] = [
  {
    title: 'Result Source',
    description: 'This market resolves based on the official match result at full time (90 minutes + injury time). Extra time and penalties do not count.',
  },
  {
    title: 'Market Close',
    description: 'Market closes 1 hour before kick-off.',
  },
  {
    title: 'Postponed Match',
    description: 'If the match is postponed more than 48 hours, the market will be cancelled and all tickets refunded.',
  },
  {
    title: 'Official Result',
    description: 'Resolution is based on the official result published by the league.',
  },
  {
    title: 'Dispute',
    description: 'In case of dispute, the market creator has final resolution authority.',
  },
];

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-3 py-3 transition-colors hover:border-border/60">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('font-mono text-sm font-semibold', accent ? 'text-foreground' : 'text-foreground')}>{value}</dd>
    </div>
  );
}

function formatCommentTime(dateStr: string) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function OutcomeBar({ label, tickets, totalTickets, selected, onSelect, disabled, status }: {
  label: string;
  tickets: number;
  totalTickets: number;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  status: string;
}) {
  const pct = totalTickets > 0 ? (tickets / totalTickets) * 100 : 0;
  const outcomeColors: Record<string, { bar: string; text: string; selectedBorder: string }> = {
    OPEN: { bar: 'bg-emerald-400', text: 'text-emerald-400', selectedBorder: 'border-emerald-400/60' },
    CLOSED: { bar: 'bg-amber-400', text: 'text-amber-400', selectedBorder: 'border-amber-400/60' },
    RESOLVED: { bar: 'bg-blue-400', text: 'text-blue-400', selectedBorder: 'border-blue-400/60' },
    CANCELLED: { bar: 'bg-red-400', text: 'text-red-400', selectedBorder: 'border-red-400/60' },
    PAUSED: { bar: 'bg-violet-400', text: 'text-violet-400', selectedBorder: 'border-violet-400/60' },
  };
  const colors = outcomeColors[status] || outcomeColors.OPEN;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'group relative w-full cursor-pointer overflow-hidden rounded-2xl border-2 bg-card p-3 text-left transition-all duration-300 ease-[var(--ease-out)]',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        selected ? colors.selectedBorder : 'border-border hover:border-border/60'
      )}
    >
      <div
        className={cn('pointer-events-none absolute inset-y-0 left-0 opacity-60 transition-all duration-700 ease-[var(--ease-out)]', colors.bar)}
        style={{ width: `${Math.max(pct, 3)}%` }}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-foreground">{label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-right">
          <span className="font-mono text-[11px] text-foreground">{tickets} tickets</span>
          <span className={cn('font-mono text-base font-bold', colors.text)}>{pct.toFixed(0)}%</span>
        </div>
      </div>
    </button>
  );
}

export function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const marketId = Number(id);
  const { market, stats, loading } = useMarket(marketId);
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { categories } = useCategories();
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [shared, setShared] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'comments' | 'tickets'>('rules');
  const [commentText, setCommentText] = useState('');
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!tabsRef.current) return;
    const active = tabsRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) {
      setTabIndicator({ left: active.offsetLeft, width: active.offsetWidth });
    }
  }, [activeTab, loading]);

  const { buyTicket, isPending: isBuying, isConfirming: isBuyConfirming } = useBuyTicket();
  const { claim, claimRefund, isPending: isClaiming, isConfirming: isClaimConfirming } = useClaim();
  const { comments, hasMore: hasMoreComments, showMore: showMoreComments, postComment, posting } = useComments(marketId);
  const { toast, dismiss } = useToast();

  // User tickets for this market
  const [userTickets, setUserTickets] = useState<{ outcome_index: number; outcome_label: string; quantity: number }[]>([]);

  useEffect(() => {
    if (!address || !marketId) { setUserTickets([]); return; }

    async function fetchUserTickets() {
      const { data } = await supabase
        .from('tickets')
        .select('outcome_index, outcome_label, quantity')
        .eq('market_id', marketId)
        .eq('user_address', address!.toLowerCase());

      if (!data) return;

      // Aggregate by outcome
      const map = new Map<number, { outcome_index: number; outcome_label: string; quantity: number }>();
      for (const t of data) {
        const existing = map.get(t.outcome_index);
        if (existing) {
          existing.quantity += t.quantity;
        } else {
          map.set(t.outcome_index, { outcome_index: t.outcome_index, outcome_label: t.outcome_label, quantity: t.quantity });
        }
      }
      setUserTickets(Array.from(map.values()));
    }

    fetchUserTickets();

    // Realtime subscription for auto-update
    const channel = supabase
      .channel(`user-tickets-${marketId}-${address}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tickets',
        filter: `market_id=eq.${marketId}`,
      }, (payload) => {
        if (payload.new && (payload.new as { user_address: string }).user_address === address!.toLowerCase()) {
          fetchUserTickets();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [address, marketId]);

  const { data: claimableAmount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getClaimableAmount',
    args: address ? [BigInt(marketId), address] : undefined,
    query: { enabled: !!address && (market?.status === 'RESOLVED' || market?.status === 'CANCELLED') },
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Market not found</p>
        <Link to="/predict" className="mt-3 text-sm text-primary hover:underline">Back to markets</Link>
      </div>
    );
  }

  const totalTickets = stats.reduce((sum, s) => sum + s.total_tickets, 0);
  const isOpen = market.status === 'OPEN';
  const isResolved = market.status === 'RESOLVED';
  const isCancelled = market.status === 'CANCELLED';
  const canClaim = claimableAmount !== undefined && claimableAmount > 0n;

  const category = categories.find(c => c.id === market.category_id);
  const CategoryIcon = category ? getCategoryIcon(category.icon) : null;

  function incrementQuantity() {
    setQuantity((prev) => Math.min(100, Math.max(1, prev) + 1));
  }

  function decrementQuantity() {
    setQuantity((prev) => Math.max(1, prev - 1));
  }

  function handleBuy() {
    if (selectedOutcome === null) return;
    const id = toast('loading', 'Waiting for wallet confirmation...');
    buyTicket(marketId, selectedOutcome, quantity, market!.ticket_price, market!.fee, {
      onSuccess: () => {
        dismiss(id);
        toast('success', 'Tickets purchased successfully! 🎉');
      },
      onError: (err) => {
        dismiss(id);
        const msg = err.message?.includes('User rejected')
          ? 'Transaction rejected by user'
          : 'Transaction failed. Please try again.';
        toast('error', msg);
      },
    });
  }

  function handleClaim() {
    const id = toast('loading', 'Waiting for wallet confirmation...');
    if (market!.is_refund || isCancelled) {
      claimRefund(marketId, {
        onSuccess: () => {
          dismiss(id);
          toast('success', 'Refund claimed successfully! 🎉');
        },
        onError: (err) => {
          dismiss(id);
          const msg = err.message?.includes('User rejected')
            ? 'Transaction rejected by user'
            : 'Claim failed. Please try again.';
          toast('error', msg);
        },
      });
    } else {
      claim(marketId, {
        onSuccess: () => {
          dismiss(id);
          toast('success', 'Winnings claimed successfully! 🎉');
        },
        onError: (err) => {
          dismiss(id);
          const msg = err.message?.includes('User rejected')
            ? 'Transaction rejected by user'
            : 'Claim failed. Please try again.';
          toast('error', msg);
        },
      });
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }

  const statusColors: Record<string, { dot: string; text: string; border: string }> = {
    OPEN: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/20 bg-emerald-500/10' },
    CLOSED: { dot: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-500/20 bg-amber-500/10' },
    RESOLVED: { dot: 'bg-blue-400', text: 'text-blue-400', border: 'border-blue-500/20 bg-blue-500/10' },
    CANCELLED: { dot: 'bg-red-400', text: 'text-red-400', border: 'border-red-500/20 bg-red-500/10' },
    PAUSED: { dot: 'bg-violet-400', text: 'text-violet-400', border: 'border-violet-500/20 bg-violet-500/10' },
  };
  const statusColor = statusColors[market.status] || { dot: 'bg-text-secondary', text: 'text-muted-foreground', border: 'border-border bg-background' };
  const marketRules = Array.isArray(market.rules) && market.rules.length > 0 ? market.rules : DEFAULT_MARKET_RULES;

  const from = searchParams.get('from');
  let backTo = '/predict';
  let backLabel = 'Back to markets';

  if (from === 'profile') {
    const tab = searchParams.get('tab') === 'claim' ? 'claim' : 'history';
    backTo = tab === 'claim' ? '/predict/profile?tab=claim' : '/predict/profile';
    backLabel = 'Back to profile';
  } else if (from === 'markets') {
    const params = new URLSearchParams();
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    const query = params.toString();
    backTo = query ? `/predict?${query}` : '/predict';
  }

  return (
    <div>
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="order-1 lg:col-span-2 space-y-5">
          <section className="relative p-0">
            <div>
              <div className="mb-5 flex items-center justify-between gap-3">
                <Link to={backTo} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:gap-2 sm:text-sm">
                  <ArrowLeft size={14} className="sm:h-4 sm:w-4" />
                  {backLabel}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (market.match_url) window.open(market.match_url, '_blank', 'noopener,noreferrer');
                    }}
                    disabled={!market.match_url}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground disabled:cursor-not-allowed sm:h-8 sm:w-8"
                    title={market.match_url ? 'Open match detail' : 'Match detail unavailable'}
                    aria-label={market.match_url ? 'Open match detail' : 'Match detail unavailable'}
                  >
                    <ArrowSquareOut size={13} weight="bold" />
                  </button>
                  <button
                    onClick={handleShare}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2 text-[11px] text-muted-foreground sm:h-8 sm:gap-1.5 sm:px-2.5 sm:text-xs"
                  >
                    <ShareNetwork size={13} />
                    {shared ? 'Copied!' : 'Share'}
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    {category && CategoryIcon && <CategoryIcon size={13} className="text-primary sm:h-[15px] sm:w-[15px]" />}
                    {category && <span className="text-[11px] text-muted-foreground sm:text-xs">{category.name}</span>}
                  </div>
                  <div className="flex items-center gap-2 leading-none">
                    <h1 className="min-w-0 text-lg font-semibold leading-none tracking-tight text-foreground sm:text-2xl">{market.title}</h1>
                    <span className={cn('inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wide sm:gap-1.5 sm:text-[11px]', statusColor.text)}>
                      <span className="relative flex h-1 w-1 sm:h-1.5 sm:w-1.5">
                        <span className={cn('absolute inset-0 rounded-full animate-ping opacity-75', statusColor.dot)} />
                        <span className={cn('relative h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5', statusColor.dot)} />
                      </span>
                      {market.status}
                    </span>
                  </div>
                  {market.description && (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{market.description}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-2.5">
            <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider sm:text-xs">Select Outcome</h2>
            {stats.map((stat) => (
              <OutcomeBar
                key={stat.outcome_index}
                label={stat.outcome_label}
                tickets={stat.total_tickets}
                totalTickets={totalTickets}
                selected={selectedOutcome === stat.outcome_index}
                onSelect={() => setSelectedOutcome(stat.outcome_index)}
                disabled={!isOpen || !address}
                status={market.status}
              />
            ))}
          </div>

          {isResolved && !market.is_refund && (
            <Card className="border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy size={16} className="text-primary" weight="fill" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Winner</p>
                  <p className="text-sm font-medium text-primary">{market.outcomes[market.winning_outcome!]}</p>
                </div>
              </div>
            </Card>
          )}

          {isResolved && market.is_refund && (
            <Card className="border-warning/20 bg-warning/5 p-5">
              <p className="text-sm text-warning">Market resolved as refund. No winner selected.</p>
            </Card>
          )}

          {/* Mobile Market Info / Buy Tickets - shown before Rules & Comments */}
          <div className="space-y-4 lg:hidden">
            {!address && (
              <Card className="market-card border-2 p-5 transition-all duration-300 ease-[var(--ease-out)] hover:border-border/60 text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Connect wallet to participate</p>
                <Button size="sm" onClick={() => openConnectModal?.()} className="inline-flex items-center gap-2 glare-hover">
                  <Wallet size={16} weight="bold" />
                  Connect Wallet
                </Button>
              </Card>
            )}

            {isOpen && address && (
              <Card className="market-card border-2 p-5 transition-all duration-300 ease-[var(--ease-out)] hover:border-border/60">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground sm:text-base">Buy Tickets</h3>
                {selectedOutcome === null ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Select an outcome to place a bet</p>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border-2 border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">Selected outcome</span>
                        <span className="truncate text-base font-semibold text-foreground">{market.outcomes[selectedOutcome]}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Quantity</label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={decrementQuantity}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground"
                        >
                          <Minus size={14} weight="bold" />
                        </button>
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
                          className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-center font-mono text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={incrementQuantity}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground"
                        >
                          <Plus size={14} weight="bold" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Ticket price</span>
                        <span className="font-mono text-sm text-foreground">{formatEth(market.ticket_price)} zkLTC</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Fee</span>
                        <span className="font-mono text-sm text-foreground">{formatEth(market.fee)} zkLTC</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">Total cost</span>
                        <span className="font-mono text-base font-semibold text-foreground">
                          {formatEth((BigInt(market.ticket_price) + BigInt(market.fee)) * BigInt(quantity))} zkLTC
                        </span>
                      </div>
                    </div>
                    <Button className="w-full glare-hover inline-flex items-center justify-center gap-2 bg-blue-500 text-white hover:bg-blue-500/90" size="lg" onClick={handleBuy} loading={isBuying || isBuyConfirming}>
                      {!isBuyConfirming && <ShoppingCart size={17} weight="bold" />}
                      {isBuyConfirming ? 'Confirming...' : 'Buy Tickets'}
                    </Button>
                  </div>
                )}
              </Card>
            )}

            <Card className="market-card border-2 p-5 transition-all duration-300 ease-[var(--ease-out)] hover:border-border/60">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground sm:text-base">Market Info</h3>
              <dl className="space-y-2.5">
                <InfoRow label="Pool" value={`${formatEth(market.total_pool)} zkLTC`} accent />
                <InfoRow label="Tickets" value={String(totalTickets)} />
                <InfoRow label="Ticket Price" value={`${formatEth(market.ticket_price)} zkLTC`} />
                <InfoRow label="Fee / Ticket" value={`${formatEth(market.fee)} zkLTC`} />
                <InfoRow label="Minimum buy" value="1 ticket" />
                <InfoRow label="Closes" value={formatTimeLeft(market.close_time)} />
              </dl>
            </Card>

            {canClaim && address && (
              <Card className="border-blue-500/20 bg-blue-500/5 p-5">
                <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">Claim Available</h3>
                <p className="font-mono text-xl text-foreground mb-3">{formatEth(claimableAmount!)} zkLTC</p>
                <Button className="w-full glare-hover bg-blue-500 text-white hover:bg-blue-500/90" size="lg" onClick={handleClaim} loading={isClaiming || isClaimConfirming}>
                  {isClaimConfirming ? 'Confirming...' : market.is_refund || isCancelled ? 'Claim Refund' : 'Claim Winnings'}
                </Button>
              </Card>
            )}
          </div>

          {/* Rules & Comments Tabs */}
          <div className="order-3 lg:order-none rounded-3xl border-2 border-border bg-card p-5 transition-all duration-300 ease-[var(--ease-out)] hover:border-border/60">
            <div ref={tabsRef} className="relative mb-5 flex items-center border-b border-border">
              <div
                className="absolute bottom-0 h-0.5 bg-primary transition-all duration-300 ease-[var(--ease-out)]"
                style={{ left: tabIndicator.left, width: tabIndicator.width }}
              />
              <button
                data-active={activeTab === 'rules'}
                onClick={() => setActiveTab('rules')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 pb-3 text-sm font-medium transition-colors cursor-pointer',
                  activeTab === 'rules'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ListBullets size={16} />
                Rules
              </button>
              <button
                data-active={activeTab === 'comments'}
                onClick={() => setActiveTab('comments')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 pb-3 text-sm font-medium transition-colors cursor-pointer',
                  activeTab === 'comments'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <ChatCircle size={16} />
                Comments
              </button>
              <button
                data-active={activeTab === 'tickets'}
                onClick={() => setActiveTab('tickets')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 pb-3 text-sm font-medium transition-colors cursor-pointer',
                  activeTab === 'tickets'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Ticket size={16} />
                My Ticket
              </button>
            </div>

            {activeTab === 'rules' && (
              <div className="space-y-4 text-sm">
                {marketRules.map((rule, index) => (
                  <div key={index}>
                    <p className="text-[13px] font-medium text-foreground">{rule.title}</p>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{rule.description}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'comments' && (
              <div>
                {address && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 transition-colors focus-within:border-primary">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && commentText.trim()) {
                          postComment(address, commentText);
                          setCommentText('');
                        }
                      }}
                      placeholder="Write a comment..."
                      className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/45"
                    />
                    <button
                      type="button"
                      disabled={posting || !commentText.trim()}
                      onClick={() => {
                        if (commentText.trim()) {
                          postComment(address, commentText);
                          setCommentText('');
                        }
                      }}
                      className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <PaperPlaneTilt size={13} weight="bold" />
                      Send
                    </button>
                  </div>
                )}
                {!address && (
                  <div className="mb-4 flex justify-center py-2">
                    <Button
                      size="sm"
                      onClick={() => openConnectModal?.()}
                      className="inline-flex items-center gap-2 glare-hover"
                    >
                      <Wallet size={16} weight="bold" />
                      Connect Wallet
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first!</p>
                  )}
                  {comments.map((comment) => (
                    <article key={comment.id} className="py-3 border-b border-border last:border-b-0">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="truncate font-mono text-xs font-medium text-foreground">
                          {comment.user_address.slice(0, 6)}...{comment.user_address.slice(-4)}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatCommentTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{comment.content}</p>
                    </article>
                  ))}
                </div>

                {hasMoreComments && (
                  <button
                    onClick={showMoreComments}
                    className="mt-4 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground cursor-pointer"
                  >
                    Show more comments
                  </button>
                )}
              </div>
            )}

            {activeTab === 'tickets' && (
              <div>
                {!address ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Connect wallet to see your tickets.
                  </div>
                ) : userTickets.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    You have no tickets in this market.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userTickets.map((t) => {
                      const outcomeStat = stats.find(s => s.outcome_index === t.outcome_index);
                      const totalWinningTickets = outcomeStat?.total_tickets || 0;
                      // Potential payout: ticketPrice + (loserPool / totalWinningTickets) per ticket
                      const ticketPriceBig = BigInt(market.ticket_price);
                      const totalPoolBig = BigInt(market.total_pool);
                      const winnerPool = ticketPriceBig * BigInt(totalWinningTickets);
                      const loserPool = totalPoolBig > winnerPool ? totalPoolBig - winnerPool : 0n;
                      const profitPerTicket = totalWinningTickets > 0 ? loserPool / BigInt(totalWinningTickets) : 0n;
                      const payoutPerTicket = ticketPriceBig + profitPerTicket;
                      const totalPayout = payoutPerTicket * BigInt(t.quantity);

                      return (
                        <div key={t.outcome_index} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{t.outcome_label}</p>
                            <p className="text-xs text-muted-foreground">{t.quantity} {t.quantity === 1 ? 'ticket' : 'tickets'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Potential payout</p>
                            <p className="font-mono text-sm font-semibold text-foreground">{formatEth(totalPayout)} zkLTC</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="hidden space-y-4 lg:order-2 lg:block lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <Card className="market-card border-2 p-5 transition-all duration-300 ease-[var(--ease-out)] hover:border-border/60">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground sm:text-base">Market Info</h3>
            <dl className="space-y-2.5">
              <InfoRow label="Pool" value={`${formatEth(market.total_pool)} zkLTC`} accent />
              <InfoRow label="Tickets" value={String(totalTickets)} />
              <InfoRow label="Ticket Price" value={`${formatEth(market.ticket_price)} zkLTC`} />
              <InfoRow label="Fee / Ticket" value={`${formatEth(market.fee)} zkLTC`} />
              <InfoRow label="Minimum buy" value="1 ticket" />
              <InfoRow label="Closes" value={formatTimeLeft(market.close_time)} />
            </dl>
          </Card>

          {isOpen && address && (
            <Card className="market-card border-2 p-5 transition-all duration-300 ease-[var(--ease-out)] hover:border-border/60">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground sm:text-base">Buy Tickets</h3>
              {selectedOutcome === null ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Select an outcome to place a bet</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border-2 border-border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">Selected outcome</span>
                      <span className="truncate text-base font-semibold text-foreground">
                        {market.outcomes[selectedOutcome]}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Quantity</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={decrementQuantity}
                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground"
                      >
                        <Minus size={14} weight="bold" />
                      </button>
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
                        className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-center font-mono text-sm font-semibold text-foreground outline-none transition-colors focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={incrementQuantity}
                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground"
                      >
                        <Plus size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Ticket price</span>
                      <span className="font-mono text-sm text-foreground">{formatEth(market.ticket_price)} zkLTC</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Fee</span>
                      <span className="font-mono text-sm text-foreground">{formatEth(market.fee)} zkLTC</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Total cost</span>
                      <span className="font-mono text-base font-semibold text-foreground">
                        {formatEth((BigInt(market.ticket_price) + BigInt(market.fee)) * BigInt(quantity))} zkLTC
                      </span>
                    </div>
                  </div>
                  <Button
                    className="w-full glare-hover inline-flex items-center justify-center gap-2 bg-blue-500 text-white hover:bg-blue-500/90"
                    size="lg"
                    onClick={handleBuy}
                    loading={isBuying || isBuyConfirming}
                  >
                    {!isBuyConfirming && <ShoppingCart size={17} weight="bold" />}
                    {isBuyConfirming ? 'Confirming...' : 'Buy Tickets'}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {canClaim && address && (
            <Card className="border-blue-500/20 bg-blue-500/5 p-5">
              <h3 className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">Claim Available</h3>
              <p className="font-mono text-xl text-foreground mb-3">
                {formatEth(claimableAmount!)} zkLTC
              </p>
              <Button
                className="w-full glare-hover bg-blue-500 text-white hover:bg-blue-500/90"
                size="lg"
                onClick={handleClaim}
                loading={isClaiming || isClaimConfirming}
              >
                {isClaimConfirming ? 'Confirming...' : market.is_refund || isCancelled ? 'Claim Refund' : 'Claim Winnings'}
              </Button>
            </Card>
          )}

          {!address && (
            <Card className="market-card border-2 p-5 transition-all duration-300 ease-[var(--ease-out)] hover:border-border/60 text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Connect wallet to participate</p>
              <Button
                size="sm"
                onClick={() => openConnectModal?.()}
                className="inline-flex items-center gap-2 glare-hover"
              >
                <Wallet size={16} weight="bold" />
                Connect Wallet
              </Button>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}
