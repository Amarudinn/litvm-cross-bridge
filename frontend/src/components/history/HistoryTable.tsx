import { ArrowRight, ExternalLink, Clock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatAmount, shortenTxHash, getExplorerUrl } from '@/lib/format'
import type { BridgeTransaction } from '@/hooks/useBridgeEvents'

interface HistoryTableProps {
  transactions: BridgeTransaction[]
}

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

export function HistoryTable({ transactions }: HistoryTableProps) {
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

  return (
    <div className="overflow-x-auto">
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
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
