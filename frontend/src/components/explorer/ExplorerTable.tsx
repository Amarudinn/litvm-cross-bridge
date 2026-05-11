import { useState, useMemo } from 'react'
import { ArrowRight, ExternalLink, Clock, CheckCircle2, XCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RouteFilterDropdown, type RouteFilterValue } from '@/components/ui/RouteFilterDropdown'
import { formatAmount, shortenTxHash, shortenAddress, getExplorerUrl, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BridgeTransaction } from '@/hooks/useBridgeEvents'

interface ExplorerTableProps {
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

export function ExplorerTable({ transactions }: ExplorerTableProps) {
  const [directionFilter, setDirectionFilter] = useState<RouteFilterValue>('all')
  const [searchAddress, setSearchAddress] = useState('')
  const [page, setPage] = useState(0)

  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    if (directionFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.direction === directionFilter)
    }

    if (searchAddress.trim()) {
      const search = searchAddress.trim().toLowerCase()
      filtered = filtered.filter(
        (tx) =>
          tx.sender.toLowerCase().includes(search) ||
          tx.recipient.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [transactions, directionFilter, searchAddress])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const paginatedTransactions = filteredTransactions.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  )

  // Reset page when filters change
  const handleFilterChange = (filter: RouteFilterValue) => {
    setDirectionFilter(filter)
    setPage(0)
  }

  const handleSearchChange = (value: string) => {
    setSearchAddress(value)
    setPage(0)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address..."
            value={searchAddress}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <RouteFilterDropdown value={directionFilter} onChange={handleFilterChange} />
      </div>

      {/* Table / Cards */}
      {paginatedTransactions.length === 0 ? (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No transactions found</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            {searchAddress
              ? 'Try a different address'
              : 'Bridge transactions will appear here'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="md:hidden space-y-3">
            {paginatedTransactions.map((tx) => (
              <div key={tx.id} className="rounded-xl bg-muted/20 border border-border/30 p-3.5 space-y-3">
                {/* Row 1: Sender + Status */}
                <div className="flex items-center justify-between">
                  <a
                    href={getExplorerUrl(tx.sourceChainId, 'address', tx.sender)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {shortenAddress(tx.sender)}
                  </a>
                  <StatusBadge status={tx.status} />
                </div>
                {/* Row 2: Direction + Amount */}
                <div className="flex items-center justify-between">
                  <DirectionLabel direction={tx.direction} />
                  <span className="font-mono text-sm font-medium">
                    {formatAmount(tx.amount)}{' '}
                    <span className="text-muted-foreground text-xs">
                      {tx.direction.startsWith('liteforge_to_') ? 'zkLTC' : 'wzkLTC'}
                    </span>
                  </span>
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
            ))}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Sender
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
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
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <a
                        href={getExplorerUrl(tx.sourceChainId, 'address', tx.sender)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {shortenAddress(tx.sender)}
                      </a>
                    </td>
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
        </>
      )}

      {/* Pagination */}
      {filteredTransactions.length > PAGE_SIZE && (
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
      )}
    </div>
  )
}
