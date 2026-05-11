import { useState } from 'react'
import { ArrowRight, ExternalLink, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatAmount, shortenTxHash, getExplorerUrl, timeAgo } from '@/lib/format'
import type { BridgeTransaction } from '@/hooks/useBridgeEvents'

interface HistoryTableProps {
  transactions: BridgeTransaction[]
}

const PAGE_SIZE = 10

function DirectionLabel({ direction }: { direction: BridgeTransaction['direction'] }) {
  const dirMap: Record<string, { from: string; fromColor: string; to: string; toColor: string }> = {
    liteforge_to_sepolia: { from: 'LiteForge', fromColor: 'text-blue-400', to: 'Sepolia', toColor: 'text-purple-400' },
    sepolia_to_liteforge: { from: 'Sepolia', fromColor: 'text-purple-400', to: 'LiteForge', toColor: 'text-blue-400' },
    liteforge_to_basesepolia: { from: 'LiteForge', fromColor: 'text-blue-400', to: 'Base', toColor: 'text-sky-400' },
    basesepolia_to_liteforge: { from: 'Base', fromColor: 'text-sky-400', to: 'LiteForge', toColor: 'text-blue-400' },
  }
  const d = dirMap[direction] || dirMap['liteforge_to_sepolia']
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className={cn('font-medium', d.fromColor)}>{d.from}</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span className={cn('font-medium', d.toColor)}>{d.to}</span>
    </span>
  )
}

function StatusBadge({ status }: { status: BridgeTransaction['status'] }) {
  if (status === 'completed') {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Completed
      </Badge>
    )
  }
  if (status === 'failed') {
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    )
  }
  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  )
}

function TransactionCard({ tx }: { tx: BridgeTransaction }) {
  return (
    <div className="rounded-xl bg-muted/20 border border-border/30 p-3.5 space-y-3">
      {/* Row 1: Direction + Status */}
      <div className="flex items-center justify-between">
        <DirectionLabel direction={tx.direction} />
        <StatusBadge status={tx.status} />
      </div>
      {/* Row 2: Amount + Fee */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
          <span className="font-mono text-sm font-medium">
            {formatAmount(tx.amount)}{' '}
            <span className="text-muted-foreground text-xs">
              {tx.direction.startsWith('liteforge_to_') ? 'zkLTC' : 'wzkLTC'}
            </span>
          </span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">Fee</p>
          <span className="font-mono text-sm text-muted-foreground">
            {formatAmount(tx.fee)}
          </span>
        </div>
      </div>
      {/* Row 3: Tx Hash + Time */}
      <div className="flex items-center justify-between pt-1 border-t border-border/20">
        <a
          href={getExplorerUrl(tx.sourceChainId, 'tx', tx.sourceTxHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300 transition-colors"
        >
          {shortenTxHash(tx.sourceTxHash)}
          <ExternalLink className="h-3 w-3" />
        </a>
        <span className="text-xs text-muted-foreground">{timeAgo(tx.createdAt)}</span>
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (fn: (p: number) => number) => void }) {
  return (
    <div className="flex justify-center pt-2">
      <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap inline-flex items-center',
            page === 0
              ? 'text-muted-foreground/40 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground cursor-pointer'
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5 mr-1" />
          Prev
        </button>
        <span className="px-3 py-1.5 text-xs md:text-sm font-medium text-primary bg-primary/15 rounded-lg shadow-sm">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap inline-flex items-center',
            page >= totalPages - 1
              ? 'text-muted-foreground/40 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground cursor-pointer'
          )}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </button>
      </div>
    </div>
  )
}

export function HistoryTable({ transactions }: HistoryTableProps) {
  const [page, setPage] = useState(0)

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No transactions yet</h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Your bridge transactions will appear here
        </p>
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const paginatedTxs = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-3">
      {/* Mobile: Card layout */}
      <div className="md:hidden space-y-3">
        {paginatedTxs.map((tx) => (
          <TransactionCard key={tx.id} tx={tx} />
        ))}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Direction
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Fee
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Source Tx
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {paginatedTxs.map((tx) => (
              <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 px-4">
                  <DirectionLabel direction={tx.direction} />
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-sm">
                    {formatAmount(tx.amount)}{' '}
                    <span className="text-muted-foreground text-xs">
                      {tx.direction.startsWith('liteforge_to_') ? 'zkLTC' : 'wzkLTC'}
                    </span>
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-sm text-muted-foreground">
                    {formatAmount(tx.fee)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={tx.status} />
                </td>
                <td className="py-3 px-4">
                  <a
                    href={getExplorerUrl(tx.sourceChainId, 'tx', tx.sourceTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-mono text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {shortenTxHash(tx.sourceTxHash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-muted-foreground">{timeAgo(tx.createdAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {transactions.length > PAGE_SIZE && (
        <Pagination page={page} totalPages={totalPages} setPage={setPage} />
      )}
    </div>
  )
}
