import { useLeaderboard } from '@/hooks/use-leaderboard';
import { Skeleton } from '@/components/ui/skeleton';
import { shortenAddress, formatEth, cn } from '@/lib/utils';
import { useState, useRef, useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Trophy, Medal, Crown, CaretLeft, CaretRight, Wallet } from '@phosphor-icons/react';

const sortOptions = [
  { key: 'pnl' as const, label: 'P&L' },
  { key: 'winrate' as const, label: 'WIN RATE' },
  { key: 'volume' as const, label: 'VOLUME' },
];
type LeaderboardSort = typeof sortOptions[number]['key'];

function getValidSort(value: string | null): LeaderboardSort {
  return sortOptions.some((opt) => opt.key === value) ? (value as LeaderboardSort) : 'pnl';
}

const PAGE_SIZE = 10;

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={16} weight="fill" className="text-amber-400" />;
  if (rank === 2) return <Medal size={16} weight="fill" className="text-zinc-300" />;
  if (rank === 3) return <Medal size={16} weight="fill" className="text-amber-600" />;
  return <span className="font-mono text-xs text-muted-foreground w-4 text-center">{rank}</span>;
}

function getSortValue(entry: { total_pnl: string; winrate: number; total_volume: string }, sort: LeaderboardSort) {
  if (sort === 'pnl') {
    const pnl = BigInt(entry.total_pnl);
    const isPositive = pnl > 0n;
    const isNegative = pnl < 0n;
    return (
      <span className={cn('font-mono text-sm font-semibold', isPositive && 'text-accent', isNegative && 'text-danger', !isPositive && !isNegative && 'text-muted-foreground')}>
        {isPositive && '+'}{formatEth(entry.total_pnl)} zkLTC
      </span>
    );
  }
  if (sort === 'winrate') {
    return <span className="font-mono text-sm font-semibold text-foreground">{entry.winrate.toFixed(0)}%</span>;
  }
  return <span className="font-mono text-sm font-semibold text-foreground">{formatEth(entry.total_volume)} zkLTC</span>;
}

export function LeaderboardPage() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = getValidSort(searchParams.get('sort'));
  const [page, setPage] = useState(0);
  const [animating, setAnimating] = useState(false);
  const { entries, loading } = useLeaderboard(sort, 100);
  const filterRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Update indicator position
  useLayoutEffect(() => {
    if (!filterRef.current) return;
    const activeBtn = filterRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeBtn) {
      setIndicatorStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [sort]);

  function updateSort(nextSort: LeaderboardSort) {
    const params = new URLSearchParams(searchParams);
    if (nextSort === 'pnl') params.delete('sort');
    else params.set('sort', nextSort);
    setSearchParams(params);
    setPage(0);
  }

  function handlePageChange(dir: 'prev' | 'next') {
    setAnimating(true);
    setTimeout(() => {
      setPage((p) => dir === 'next' ? Math.min(totalPages - 1, p + 1) : Math.max(0, p - 1));
      setAnimating(false);
    }, 150);
  }

  const totalPages = Math.ceil(entries.length / PAGE_SIZE);
  const pagedEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (!address) {
    return (
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center text-center">
        <p className="text-sm text-muted-foreground mb-4">Connect your wallet to view leaderboard</p>
        <button
          onClick={() => openConnectModal?.()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 ease-[var(--ease-out)] hover:bg-blue-500 active:scale-[0.97] glare-hover cursor-pointer"
        >
          <Wallet size={16} weight="bold" />
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
          <Trophy size={18} className="text-muted-foreground" weight="bold" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      </div>

      <div ref={filterRef} className="mt-5 relative flex items-center gap-0.5 rounded-md bg-card border border-border p-1 w-fit">
        <div
          className="absolute rounded-sm bg-primary shadow-sm shadow-primary/20 transition-all duration-300 ease-[var(--ease-out)]"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width, top: 4, bottom: 4 }}
        />
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            data-active={sort === opt.key}
            onClick={() => updateSort(opt.key)}
            className={cn(
              'relative z-10 rounded-sm px-3 py-1.5 text-[12px] font-medium transition-colors duration-200 ease-[var(--ease-out)]',
              sort === opt.key
                  ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">

        {/* Desktop Table (hidden on mobile) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="py-3 px-4 font-medium w-12">#</th>
              <th className="py-3 px-4 font-medium">Address</th>
              <th className="py-3 px-4 font-medium text-right">Markets</th>
              <th className="py-3 px-4 font-medium text-right">W/L</th>
              <th className="py-3 px-4 font-medium text-right">Win Rate</th>
              <th className="py-3 px-4 font-medium text-right">Volume (zkLTC)</th>
              <th className="py-3 px-4 font-medium text-right">P&L</th>
            </tr>
          </thead>
          <tbody className={cn(
            'transition-opacity duration-150 ease-[var(--ease-out)]',
            animating ? 'opacity-0' : 'opacity-100'
          )}>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={7} className="py-3 px-4">
                    <Skeleton className="h-5 w-full rounded" />
                  </td>
                </tr>
              ))
            ) : pagedEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                  No data yet
                </td>
              </tr>
            ) : (
              pagedEntries.map((entry, i) => {
                const pnl = BigInt(entry.total_pnl);
                const isPositive = pnl > 0n;
                const isNegative = pnl < 0n;
                const globalRank = page * PAGE_SIZE + i + 1;

                return (
                  <tr
                    key={entry.user_address}
                    className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <RankBadge rank={globalRank} />
                    </td>
                    <td className="py-3 px-4 font-mono text-[13px] text-foreground">
                      {shortenAddress(entry.user_address)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                      {entry.total_markets}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                      <span className="text-accent">{entry.total_wins}</span>
                      /
                      <span className="text-danger">{entry.total_losses}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                      {entry.winrate.toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-muted-foreground">
                      {formatEth(entry.total_volume)}
                    </td>
                    <td className={cn(
                      'py-3 px-4 text-right font-mono text-[13px] font-medium',
                      isPositive && 'text-accent',
                      isNegative && 'text-danger',
                      !isPositive && !isNegative && 'text-muted-foreground'
                    )}>
                      {isPositive && '+'}{formatEth(entry.total_pnl)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Mobile Card List (hidden on desktop) */}
        <div className={cn(
          'sm:hidden divide-y divide-border transition-opacity duration-150 ease-[var(--ease-out)]',
          animating ? 'opacity-0' : 'opacity-100'
        )}>
          {loading ? (
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-10 w-full rounded" />
              </div>
            ))
          ) : pagedEntries.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              No data yet
            </div>
          ) : (
            pagedEntries.map((entry, i) => {
              const globalRank = page * PAGE_SIZE + i + 1;
              return (
                <div key={entry.user_address} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <RankBadge rank={globalRank} />
                    <div>
                      <p className="font-mono text-[13px] text-foreground">{shortenAddress(entry.user_address)}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.total_wins}W / {entry.total_losses}L</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getSortValue(entry, sort)}
                  </div>
                </div>
              );
            })
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
    </div>
  );
}
