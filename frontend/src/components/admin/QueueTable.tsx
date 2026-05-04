import { useState } from 'react'
import { ExternalLink, Clock, CheckCircle2, XCircle, AlertTriangle, RotateCcw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { shortenTxHash, shortenAddress, getExplorerUrl, formatAmount } from '@/lib/format'
import { useAdminQueue, useAdminRetry } from '@/hooks/useAdminApi'
import type { QueueTransaction } from '@/hooks/useAdminApi'

type StatusFilter = '' | 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'DEAD'

const PAGE_SIZE = 10

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'EXECUTING', label: 'Executing' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'DEAD', label: 'Dead' },
]

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />Completed
        </Badge>
      )
    case 'FAILED':
    case 'DEAD':
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />{status === 'DEAD' ? 'Dead' : 'Failed'}
        </Badge>
      )
    case 'EXECUTING':
    case 'RETRYING':
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />{status === 'EXECUTING' ? 'Executing' : 'Retrying'}
        </Badge>
      )
    default:
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Clock className="h-3 w-3 mr-1" />Pending
        </Badge>
      )
  }
}

function RetryButton({ tx }: { tx: QueueTransaction }) {
  const retry = useAdminRetry()
  if (tx.status === 'COMPLETED') return null

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={() => retry.mutate(tx.id)}
      disabled={retry.isPending}
    >
      {retry.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
      <span className="ml-1">Retry</span>
    </Button>
  )
}

function TxCard({ tx }: { tx: QueueTransaction }) {
  const chainId = tx.source_chain === 'liteforge' ? 4441 : 11155111
  return (
    <div className="rounded-xl bg-muted/20 border border-border/30 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">#{tx.id}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{tx.type}</Badge>
        </div>
        <StatusBadge status={tx.status} />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Amount</span>
        <span className="font-mono text-sm">{formatAmount(BigInt(tx.amount))}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Recipient</span>
        <span className="font-mono text-xs text-blue-400">{shortenAddress(tx.recipient)}</span>
      </div>
      {tx.error && (
        <div className="flex items-start gap-1.5 bg-red-500/10 rounded-lg p-2">
          <AlertTriangle className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-400 break-all">{tx.error}</p>
        </div>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-border/20">
        <a
          href={getExplorerUrl(chainId, 'tx', tx.source_tx_hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300"
        >
          {shortenTxHash(tx.source_tx_hash)}
          <ExternalLink className="h-3 w-3" />
        </a>
        <RetryButton tx={tx} />
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

export function QueueTable() {
  const [filter, setFilter] = useState<StatusFilter>('')
  const [page, setPage] = useState(0)
  const { data, isLoading, isError } = useAdminQueue(filter || undefined)

  const transactions = data?.transactions ?? []
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE))
  const paginatedTxs = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset page when filter changes
  const handleFilterChange = (f: StatusFilter) => {
    setFilter(f)
    setPage(0)
  }

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 bg-muted/30 rounded-xl p-1 w-fit">
          {statusFilters.map(f => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
                filter === f.key
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm text-center py-6">Failed to load queue</p>
      ) : transactions.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-6">No transactions{filter ? ` with status ${filter}` : ''}</p>
      ) : (
        <>
          {/* Mobile: Cards */}
          <div className="md:hidden space-y-3">
            {paginatedTxs.map(tx => <TxCard key={tx.id} tx={tx} />)}
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">ID</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Amount</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Retries</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Source Tx</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {paginatedTxs.map(tx => {
                  const chainId = tx.source_chain === 'liteforge' ? 4441 : 11155111
                  return (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 text-sm">#{tx.id}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="text-xs">{tx.type}</Badge>
                      </td>
                      <td className="py-2 px-3 font-mono text-sm">{formatAmount(BigInt(tx.amount))}</td>
                      <td className="py-2 px-3"><StatusBadge status={tx.status} /></td>
                      <td className="py-2 px-3 text-sm text-muted-foreground">{tx.retries}</td>
                      <td className="py-2 px-3">
                        <a
                          href={getExplorerUrl(chainId, 'tx', tx.source_tx_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300"
                        >
                          {shortenTxHash(tx.source_tx_hash)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="py-2 px-3"><RetryButton tx={tx} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {transactions.length > PAGE_SIZE && (
            <Pagination page={page} totalPages={totalPages} setPage={setPage} />
          )}
        </>
      )}
    </div>
  )
}
