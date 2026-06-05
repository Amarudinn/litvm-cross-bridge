import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEth, cn } from '@/lib/utils';
import { useClaim } from '@/hooks/use-buy-ticket';
import { User, TrendUp, TrendDown, Wallet, CaretLeft, CaretRight, GearSix } from '@phosphor-icons/react';
import { useToast } from '@/components/ui/toast';

interface UserStats {
  user_address: string;
  total_volume: string;
  total_markets: number;
  total_wins: number;
  total_losses: number;
  total_refunds: number;
  total_pnl: string;
  winrate: number;
}

interface TicketHistory {
  market_id: number;
  outcome_label: string;
  outcome_index: number;
  quantity: number;
  total_paid: string;
  created_at: string;
  markets: {
    title: string;
    status: string;
    winning_outcome: number | null;
    is_refund: boolean;
  };
}

interface ClaimableMarket {
  market_id: number;
  title: string;
  is_refund: boolean;
  status: string;
  outcome_label: string;
  quantity: number;
  amount: string;
  already_claimed: boolean;
}

const PAGE_SIZE = 10;
const tabs = ['TICKET HISTORY', 'CLAIM AVAILABLE'] as const;
type ProfileTab = typeof tabs[number];

function getValidProfileTab(value: string | null): ProfileTab {
  return value === 'claim' ? 'CLAIM AVAILABLE' : 'TICKET HISTORY';
}

function getProfileTabParam(tab: ProfileTab) {
  return tab === 'CLAIM AVAILABLE' ? 'claim' : 'history';
}

function TicketRow({ ticket, activeTab }: { ticket: TicketHistory; activeTab: ProfileTab }) {
  const navigate = useNavigate();
  const tabParam = getProfileTabParam(activeTab);
  const isResolved = ticket.markets?.status === 'RESOLVED';
  const isCancelled = ticket.markets?.status === 'CANCELLED';

  return (
    <tr
      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/predict/market/${ticket.market_id}?from=profile&tab=${tabParam}`)}
    >
      <td className="py-3 px-4 text-[13px] text-foreground">{ticket.markets?.title}</td>
      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{ticket.outcome_label}</td>
      <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">{ticket.quantity}</td>
      <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">{formatEth(ticket.total_paid)}</td>
      <td className="py-3 px-4">
        <Badge className={cn(
          isResolved && 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10',
          ticket.markets?.status === 'OPEN' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10',
          ticket.markets?.status === 'CLOSED' && 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/10',
          isCancelled && 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/10'
        )}>
          {ticket.markets?.status}
        </Badge>
      </td>
    </tr>
  );
}

function TicketCard({ ticket, activeTab }: { ticket: TicketHistory; activeTab: ProfileTab }) {
  const navigate = useNavigate();
  const tabParam = getProfileTabParam(activeTab);
  const isResolved = ticket.markets?.status === 'RESOLVED';
  const isCancelled = ticket.markets?.status === 'CANCELLED';

  return (
    <div
      className="border-b border-border last:border-0 px-4 py-3 cursor-pointer active:bg-muted/30 transition-colors"
      onClick={() => navigate(`/predict/market/${ticket.market_id}?from=profile&tab=${tabParam}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{ticket.markets?.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{ticket.outcome_label} {ticket.quantity} {ticket.quantity === 1 ? 'ticket' : 'tickets'}</p>
        </div>
        <Badge className={cn(
          isResolved && 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10',
          ticket.markets?.status === 'OPEN' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10',
          ticket.markets?.status === 'CLOSED' && 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/10',
          isCancelled && 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/10'
        )}>
          {ticket.markets?.status}
        </Badge>
      </div>
      <div className="mt-1.5 font-mono text-xs text-muted-foreground">{formatEth(ticket.total_paid)} zkLTC paid</div>
    </div>
  );
}

function ClaimRow({ market, activeTab }: { market: ClaimableMarket; activeTab: ProfileTab }) {
  const navigate = useNavigate();
  const tabParam = getProfileTabParam(activeTab);
  const { claim, claimRefund, isPending, isConfirming, isSuccess, error } = useClaim();
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isSuccess && toastIdRef.current) {
      dismiss(toastIdRef.current);
      toast('success', `Claimed ${formatEth(market.amount)} zkLTC successfully! 🎉`);
      toastIdRef.current = null;
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error && toastIdRef.current) {
      dismiss(toastIdRef.current);
      const msg = error.message?.includes('User rejected')
        ? 'Transaction rejected by user'
        : 'Claim failed. Please try again.';
      toast('error', msg);
      toastIdRef.current = null;
    }
  }, [error]);

  function handleClaim(e: React.MouseEvent) {
    e.stopPropagation();
    toastIdRef.current = toast('loading', 'Waiting for wallet confirmation...');
    if (market.is_refund || market.status === 'CANCELLED') {
      claimRefund(market.market_id);
    } else {
      claim(market.market_id);
    }
  }

  const claimed = market.already_claimed || isSuccess;

  return (
    <tr
      className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => navigate(`/predict/market/${market.market_id}?from=profile&tab=${tabParam}`)}
    >
      <td className="py-3 px-4 text-[13px] text-foreground">{market.title}</td>
      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{market.outcome_label}</td>
      <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">{market.quantity}</td>
      <td className="py-3 px-4">
        <Badge className={cn(
          market.is_refund || market.status === 'CANCELLED'
            ? 'border-muted-foreground/30 bg-muted text-foreground hover:bg-muted'
            : 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10'
        )}>
          {market.is_refund || market.status === 'CANCELLED' ? 'REFUND' : 'WINNING'}
        </Badge>
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-foreground">
        {formatEth(market.amount)} zkLTC
      </td>
      <td className="py-3 px-4 text-right">
        {claimed ? (
          <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/30 px-2.5 py-1 text-[11px] font-medium text-primary">
            CLAIMED
          </span>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming}
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-wait"
          >
            {(isPending || isConfirming) && (
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            CLAIM
          </button>
        )}
      </td>
    </tr>
  );
}

function ClaimCard({ market, activeTab }: { market: ClaimableMarket; activeTab: ProfileTab }) {
  const navigate = useNavigate();
  const tabParam = getProfileTabParam(activeTab);
  const { claim, claimRefund, isPending, isConfirming, isSuccess, error } = useClaim();
  const { toast, dismiss } = useToast();
  const toastIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isSuccess && toastIdRef.current) {
      dismiss(toastIdRef.current);
      toast('success', `Claimed ${formatEth(market.amount)} zkLTC successfully! 🎉`);
      toastIdRef.current = null;
    }
  }, [isSuccess]);

  useEffect(() => {
    if (error && toastIdRef.current) {
      dismiss(toastIdRef.current);
      const msg = error.message?.includes('User rejected')
        ? 'Transaction rejected by user'
        : 'Claim failed. Please try again.';
      toast('error', msg);
      toastIdRef.current = null;
    }
  }, [error]);

  function handleClaim(e: React.MouseEvent) {
    e.stopPropagation();
    toastIdRef.current = toast('loading', 'Waiting for wallet confirmation...');
    if (market.is_refund || market.status === 'CANCELLED') {
      claimRefund(market.market_id);
    } else {
      claim(market.market_id);
    }
  }

  const claimed = market.already_claimed || isSuccess;

  return (
    <div
      className="border-b border-border last:border-0 px-4 py-3 cursor-pointer active:bg-muted/30 transition-colors"
      onClick={() => navigate(`/predict/market/${market.market_id}?from=profile&tab=${tabParam}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground truncate">{market.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{market.outcome_label} {market.quantity} {market.quantity === 1 ? 'ticket' : 'tickets'}</p>
        </div>
        <Badge className={cn(
          market.is_refund || market.status === 'CANCELLED'
            ? 'border-muted-foreground/30 bg-muted text-foreground hover:bg-muted'
            : 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/10'
        )}>
          {market.is_refund || market.status === 'CANCELLED' ? 'REFUND' : 'WINNING'}
        </Badge>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-foreground">{formatEth(market.amount)} zkLTC</span>
        {claimed ? (
          <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/30 px-2.5 py-1 text-[11px] font-medium text-primary">
            CLAIMED
          </span>
        ) : (
          <button
            onClick={handleClaim}
            disabled={isPending || isConfirming}
            className="cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-all duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-wait"
          >
            {(isPending || isConfirming) && (
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            CLAIM
          </button>
        )}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [claimableMarkets, setClaimableMarkets] = useState<ClaimableMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = getValidProfileTab(searchParams.get('tab'));
  const tabRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!tabRef.current) return;
    const activeBtn = tabRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeBtn) {
      const newLeft = activeBtn.offsetLeft;
      const newWidth = activeBtn.offsetWidth;
      setIndicatorStyle((prev) => {
        if (prev.left === newLeft && prev.width === newWidth) return prev;
        return { left: newLeft, width: newWidth };
      });
    }
  }, [activeTab, loading]);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      const [statsRes, historyRes, claimsRes, marketStatsRes] = await Promise.all([
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_address', address!.toLowerCase())
          .single(),
        supabase
          .from('tickets')
          .select('market_id, outcome_label, outcome_index, quantity, total_paid, created_at, markets(title, status, winning_outcome, is_refund, ticket_price, fee, total_pool)')
          .eq('user_address', address!.toLowerCase())
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('claims')
          .select('market_id')
          .eq('user_address', address!.toLowerCase()),
        supabase
          .from('market_stats')
          .select('market_id, outcome_index, total_tickets'),
      ]);

      setStats(statsRes.data);
      const tickets = (historyRes.data as unknown as TicketHistory[]) || [];
      setHistory(tickets);

      const claimedIds = new Set((claimsRes.data || []).map((c: any) => c.market_id));
      const allStats = (marketStatsRes.data || []) as any[];

      const claimable: ClaimableMarket[] = [];
      const seenMarkets = new Set<number>();

      for (const t of tickets) {
        if (seenMarkets.has(t.market_id)) continue;
        seenMarkets.add(t.market_id);

        const mkt = t.markets as any;
        const status = mkt?.status;
        if (status !== 'RESOLVED' && status !== 'CANCELLED') continue;

        const alreadyClaimed = claimedIds.has(t.market_id);
        const isRefund = mkt.is_refund || status === 'CANCELLED';

        const marketTickets = tickets.filter((x) => x.market_id === t.market_id);
        const totalQty = marketTickets.reduce((sum, x) => sum + x.quantity, 0);

        let outcomeLabel = 'N/A';
        let claimQty = totalQty;
        if (!isRefund && mkt.winning_outcome !== null) {
          const winTickets = marketTickets.filter((x) => x.outcome_index === mkt.winning_outcome);
          outcomeLabel = winTickets.length > 0 ? winTickets[0].outcome_label : 'N/A';
          claimQty = winTickets.reduce((sum, x) => sum + x.quantity, 0);
        }

        let amount = '0';
        const ticketPrice = BigInt(mkt.ticket_price || '0');
        const totalPool = BigInt(mkt.total_pool || '0');

        if (status === 'CANCELLED') {
          amount = ((ticketPrice + BigInt(mkt.fee || '0')) * BigInt(totalQty)).toString();
        } else if (mkt.is_refund) {
          amount = (ticketPrice * BigInt(totalQty)).toString();
        } else {
          const winningOutcome = mkt.winning_outcome;
          const winTickets = marketTickets.filter((x) => x.outcome_index === winningOutcome);
          const userWinQty = winTickets.reduce((sum, x) => sum + x.quantity, 0);
          if (userWinQty > 0) {
            const mStats = allStats.filter((s) => s.market_id === t.market_id);
            const totalWinningTickets = mStats.find((s: any) => s.outcome_index === winningOutcome)?.total_tickets || 0;
            if (totalWinningTickets > 0) {
              const loserPool = totalPool - (ticketPrice * BigInt(totalWinningTickets));
              const profitPerTicket = loserPool / BigInt(totalWinningTickets);
              amount = ((ticketPrice + profitPerTicket) * BigInt(userWinQty)).toString();
            }
          }
        }

        if (amount !== '0' || alreadyClaimed) {
          claimable.push({
            market_id: t.market_id,
            title: mkt.title,
            is_refund: mkt.is_refund,
            status: status,
            outcome_label: outcomeLabel,
            quantity: claimQty,
            amount: amount,
            already_claimed: alreadyClaimed,
          });
        }
      }

      setClaimableMarkets(claimable);
      setLoading(false);
    }

    fetchData();

    // Realtime: user_stats updates
    const statsChannel = supabase
      .channel(`profile-stats-${address}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_stats',
        filter: `user_address=eq.${address.toLowerCase()}`,
      }, (payload) => {
        setStats(payload.new as UserStats);
      })
      .subscribe();

    // Realtime: new tickets
    const ticketsChannel = supabase
      .channel(`profile-tickets-${address}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'tickets',
        filter: `user_address=eq.${address.toLowerCase()}`,
      }, () => {
        fetchData();
      })
      .subscribe();

    // Realtime: claims
    const claimsChannel = supabase
      .channel(`profile-claims-${address}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'claims',
        filter: `user_address=eq.${address.toLowerCase()}`,
      }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(claimsChannel);
    };
  }, [address]);

  function updateActiveTab(tab: ProfileTab) {
    const params = new URLSearchParams(searchParams);
    if (tab === 'TICKET HISTORY') params.delete('tab');
    else params.set('tab', getProfileTabParam(tab));
    setSearchParams(params);
    setPage(0);
  }

  function handlePageChange(dir: 'prev' | 'next') {
    setAnimating(true);
    setTimeout(() => {
      setPage((p) => dir === 'next' ? p + 1 : p - 1);
      setAnimating(false);
    }, 150);
  }

  if (!address) {
    return (
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground mb-4">Connect your wallet to view profile</p>
        <button
          onClick={() => openConnectModal?.()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-background transition-all duration-150 ease-[var(--ease-out)] hover:bg-primary/90 active:scale-[0.97] glare-hover cursor-pointer"
        >
          <Wallet size={16} weight="bold" />
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const pnl = BigInt(stats?.total_pnl || '0');
  const isPositive = pnl > 0n;
  const isNegative = pnl < 0n;

  const totalPages = Math.ceil(history.length / PAGE_SIZE);
  const pagedHistory = history.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const claimTotalPages = Math.ceil(claimableMarkets.length / PAGE_SIZE);
  const pagedClaimable = claimableMarkets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
            <User size={18} className="text-muted-foreground" weight="bold" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        </div>
        <button
          disabled
          className="inline-flex items-center justify-center text-muted-foreground opacity-50 cursor-not-allowed"
        >
          <GearSix size={22} />
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Markets</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">{stats?.total_markets || 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Win Rate</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">{stats?.winrate?.toFixed(0) || 0}%</p>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-foreground">{stats?.total_wins || 0}W</span>
            <span>/</span>
            <span className="text-danger">{stats?.total_losses || 0}L</span>
          </div>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Volume</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">{formatEth(stats?.total_volume || '0')}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">zkLTC</p>
        </Card>
        <Card className="p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">P&L</p>
          <div className="mt-1.5 flex items-center gap-2">
            {isPositive && <TrendUp size={18} className="text-foreground" weight="bold" />}
            {isNegative && <TrendDown size={18} className="text-danger" weight="bold" />}
            <p className={cn(
              'font-mono text-2xl font-semibold',
              isPositive && 'text-foreground',
              isNegative && 'text-danger',
              !isPositive && !isNegative && 'text-foreground'
            )}>
              {isPositive && '+'}{formatEth(stats?.total_pnl || '0')}
            </p>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">zkLTC</p>
        </Card>
      </div>

      <div className="mt-8">
        <div ref={tabRef} className="relative flex items-center gap-0.5 rounded-md bg-card border border-border p-1 w-fit">
          <div
            className="absolute rounded-sm bg-primary shadow-sm shadow-primary/20 transition-all duration-300 ease-[var(--ease-out)]"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width, top: 4, bottom: 4 }}
          />
          {tabs.map((tab) => (
            <button
              key={tab}
              data-active={activeTab === tab}
              onClick={() => updateActiveTab(tab)}
              className={cn(
                'relative z-10 rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 ease-[var(--ease-out)]',
                activeTab === tab
                  ? 'text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'TICKET HISTORY' && (
          <>
            <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4 font-medium">Market</th>
                    <th className="py-3 px-4 font-medium">Outcome</th>
                    <th className="py-3 px-4 font-medium text-right">Qty</th>
                    <th className="py-3 px-4 font-medium text-right">Paid</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className={cn(
                  'transition-opacity duration-150 ease-[var(--ease-out)]',
                  animating ? 'opacity-0' : 'opacity-100'
                )}>
                  {pagedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                        No tickets yet
                      </td>
                    </tr>
                  ) : (
                    pagedHistory.map((ticket, i) => (
                      <TicketRow key={i} ticket={ticket} activeTab={activeTab} />
                    ))
                  )}
                </tbody>
              </table>
              </div>

              {/* Mobile Cards */}
              <div className={cn(
                'sm:hidden transition-opacity duration-150 ease-[var(--ease-out)]',
                animating ? 'opacity-0' : 'opacity-100'
              )}>
                {pagedHistory.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No tickets yet
                  </div>
                ) : (
                  pagedHistory.map((ticket, i) => (
                    <TicketCard key={i} ticket={ticket} activeTab={activeTab} />
                  ))
                )}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange('prev')}
                    disabled={page === 0}
                    className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <CaretLeft size={12} weight="bold" />
                    Prev
                  </button>
                  <button
                    onClick={() => handlePageChange('next')}
                    disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Next
                    <CaretRight size={12} weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'CLAIM AVAILABLE' && (
          <>
            <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4 font-medium">Market</th>
                    <th className="py-3 px-4 font-medium">Outcome</th>
                    <th className="py-3 px-4 font-medium text-right">Qty</th>
                    <th className="py-3 px-4 font-medium">Type</th>
                    <th className="py-3 px-4 font-medium text-right">Amount</th>
                    <th className="py-3 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={cn(
                  'transition-opacity duration-150 ease-[var(--ease-out)]',
                  animating ? 'opacity-0' : 'opacity-100'
                )}>
                  {pagedClaimable.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                        No claimable markets
                      </td>
                    </tr>
                  ) : (
                    pagedClaimable.map((market) => (
                      <ClaimRow key={market.market_id} market={market} activeTab={activeTab} />
                    ))
                  )}
                </tbody>
              </table>
              </div>

              {/* Mobile Cards */}
              <div className={cn(
                'sm:hidden transition-opacity duration-150 ease-[var(--ease-out)]',
                animating ? 'opacity-0' : 'opacity-100'
              )}>
                {pagedClaimable.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No claimable markets
                  </div>
                ) : (
                  pagedClaimable.map((market) => (
                    <ClaimCard key={market.market_id} market={market} activeTab={activeTab} />
                  ))
                )}
              </div>
            </div>

            {claimTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {claimTotalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange('prev')}
                    disabled={page === 0}
                    className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <CaretLeft size={12} weight="bold" />
                    Prev
                  </button>
                  <button
                    onClick={() => handlePageChange('next')}
                    disabled={page >= claimTotalPages - 1}
                    className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/60 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Next
                    <CaretRight size={12} weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
