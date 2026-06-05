import { useLocation, useNavigate } from 'react-router-dom';
import { formatEth, formatTimeLeft, cn } from '@/lib/utils';
import type { Market, MarketStats } from '@/hooks/use-markets';
import type { Category } from '@/hooks/use-categories';
import { ArrowSquareOut, Clock, Ticket } from '@phosphor-icons/react';
import { getCategoryIcon } from '@/lib/category-icons';

interface MarketCardProps {
  market: Market;
  stats?: MarketStats[];
  categories?: Category[];
}

const MAX_OUTCOMES = 3;

const statusConfig: Record<string, { dot: string; text: string; border: string; bar: string }> = {
  OPEN: { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/30', bar: 'bg-emerald-400' },
  CLOSED: { dot: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-500/30', bar: 'bg-amber-400' },
  RESOLVED: { dot: 'bg-blue-400', text: 'text-blue-400', border: 'border-blue-500/30', bar: 'bg-blue-400' },
  CANCELLED: { dot: 'bg-red-400', text: 'text-red-400', border: 'border-red-500/30', bar: 'bg-red-400' },
  PAUSED: { dot: 'bg-violet-400', text: 'text-violet-400', border: 'border-violet-500/30', bar: 'bg-violet-400' },
};

function StatusLabel({ status }: { status: string }) {
  const colors = statusConfig[status] || statusConfig.OPEN;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide ${colors.text}`}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${colors.dot}`} />
        <span className={`relative h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      </span>
      {status}
    </span>
  );
}

export function MarketCard({ market, stats = [], categories = [] }: MarketCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const detailPath = `/predict/market/${market.id}${location.search ? `${location.search}&from=markets` : '?from=markets'}`;

  const totalTickets = stats.reduce((sum, s) => sum + s.total_tickets, 0);

  const displayedOutcomes = market.outcomes.slice(0, MAX_OUTCOMES);

  const category = categories.find(c => c.id === market.category_id);
  const CategoryIcon = category ? getCategoryIcon(category.icon) : null;
  const status = statusConfig[market.status] || statusConfig.OPEN;

  return (
    <div
      onClick={() => navigate(detailPath)}
      className={cn(
        'market-card group relative rounded-2xl border-2 bg-card cursor-pointer overflow-hidden',
        'transition-all duration-300 ease-[var(--ease-out)]',
        'border-border hover:border-border/60'
      )}
    >
      <div className="px-4 pt-3 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {CategoryIcon && category && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground truncate">
                <CategoryIcon size={13} className="text-primary shrink-0" />
                {category.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (market.match_url) window.open(market.match_url, '_blank', 'noopener,noreferrer');
              }}
              disabled={!market.match_url}
              className="inline-flex cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground disabled:cursor-not-allowed"
              title={market.match_url ? 'Open match detail' : 'Match detail unavailable'}
              aria-label={market.match_url ? 'Open match detail' : 'Match detail unavailable'}
            >
              <ArrowSquareOut size={14} weight="bold" />
            </button>
            <StatusLabel status={market.status} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2 mb-4 group-hover:underline">
          {market.title}
        </h3>

        {/* Outcomes with full-card percentage fill */}
        <div className="space-y-2">
          {displayedOutcomes.map((outcome, i) => {
            const stat = stats.find((s) => s.outcome_index === i);
            const pct = totalTickets > 0 && stat ? ((stat.total_tickets / totalTickets) * 100) : 0;

            return (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); navigate(detailPath); }}
                className="market-card relative cursor-pointer overflow-hidden rounded-xl border-2 border-border bg-card px-3 py-2.5 transition-all duration-300 ease-[var(--ease-out)] hover:border-border/60"
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-y-0 left-0 opacity-60 transition-all duration-700 ease-[var(--ease-out)]',
                    status.bar
                  )}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                    {outcome}
                  </span>
                  <span className={cn(
                    'shrink-0 text-right font-mono text-[12px] font-semibold',
                    status.text
                  )}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Stats */}
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center">
          <div className="flex items-center gap-1.5">
            <img src="/coin.svg" alt="Pool" className="block h-[17px] w-[17px] shrink-0 object-contain" />
            <span className="font-mono text-[13px] font-semibold text-foreground">{formatEth(market.total_pool)}</span>
          </div>
          <div className="mx-3 h-3 w-px bg-border/50" />
          <div className="flex items-center gap-1.5">
            <Ticket size={16} className="text-muted-foreground" />
            <span className="font-mono text-[13px] text-foreground">{market.total_tickets}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Clock size={16} className="text-muted-foreground" />
            <span className="font-mono text-[13px] text-muted-foreground">{formatTimeLeft(market.close_time)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
