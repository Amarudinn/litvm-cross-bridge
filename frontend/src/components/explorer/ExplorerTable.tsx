import { useState, useMemo } from 'react'
import { ArrowRight, ExternalLink, Clock, CheckCircle2, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatAmount, shortenTxHash, shortenAddress, getExplorerUrl } from '@/lib/format'
import type { BridgeTransaction } from '@/hooks/useBridgeEvents'

interface ExplorerTableProps {
  transactions: BridgeTransaction[]
}

type DirectionFilter = 'all' | 'liteforge_to_sepolia' | 'sepolia_to_liteforge'

const PAGE_SIZE = 10

function DirectionLabel({ direction }: { direction: BridgeTransaction['direction'] }) {
  if (direction === 'liteforge_to_sepolia') {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span className="font-medium text-blue-400">LiteForge</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium text-purple-400">Sepolia</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="font-medium text-purple-400">Sepolia</span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span className="font-medium text-blue-400">LiteForge</span>
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
  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  )
}

export function ExplorerTable({ transactions }: ExplorerTableProps) {
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')
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
  const handleFilterChange = (filter: DirectionFilter) => {
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
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={directionFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('all')}
          >
            All
          </Button>
          <Button
            variant={directionFilter === 'liteforge_to_sepolia' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('liteforge_to_sepolia')}
          >
            LF &rarr; Sep
          </Button>
          <Button
            variant={directionFilter === 'sepolia_to_liteforge' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('sepolia_to_liteforge')}
          >
            Sep &rarr; LF
          </Button>
        </div>
      </div>

      {/* Table */}
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
        <div className="overflow-x-auto">
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
                        {tx.direction === 'liteforge_to_sepolia' ? 'zkLTC' : 'wzkLTC'}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredTransactions.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}-
            {Math.min((page + 1) * PAGE_SIZE, filteredTransactions.length)} of{' '}
            {filteredTransactions.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
