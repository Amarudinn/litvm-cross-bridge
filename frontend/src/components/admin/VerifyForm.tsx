import { useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAdminVerify } from '@/hooks/useAdminApi'
import { extractTxHash } from '@/config/admin'

export function VerifyForm() {
  const [txHash, setTxHash] = useState('')
  const [chain, setChain] = useState<'liteforge' | 'sepolia'>('liteforge')
  const verify = useAdminVerify()

  const handleVerify = () => {
    if (!txHash.trim()) return
    verify.mutate({ txHash: extractTxHash(txHash), chain })
  }

  return (
    <div className="space-y-3">
      {/* Chain selector */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1 w-fit">
        <button
          onClick={() => setChain('liteforge')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
            chain === 'liteforge' ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          LiteForge
        </button>
        <button
          onClick={() => setChain('sepolia')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
            chain === 'sepolia' ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Sepolia
        </button>
      </div>

      {/* Input + button */}
      <div className="flex gap-2">
        <Input
          placeholder="Paste tx hash or explorer URL..."
          value={txHash}
          onChange={(e) => setTxHash(e.target.value)}
          className="flex-1 font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button size="sm" onClick={handleVerify} disabled={verify.isPending || !txHash.trim()} className="shrink-0">
          {verify.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          <span className="ml-1.5 hidden sm:inline">Verify</span>
        </Button>
      </div>

      {/* Error */}
      {verify.isError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{verify.error.message}</p>
        </div>
      )}

      {/* Result */}
      {verify.data && (
        <div className="space-y-2">
          {/* Summary */}
          <div className={cn(
            'flex items-center gap-2 rounded-lg p-2.5 border',
            verify.data.summary.startsWith('COMPLETED')
              ? 'bg-green-500/10 border-green-500/20'
              : verify.data.summary.startsWith('MISSED')
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-yellow-500/10 border-yellow-500/20'
          )}>
            {verify.data.summary.startsWith('COMPLETED') ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
            ) : verify.data.summary.startsWith('MISSED') ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            )}
            <p className="text-xs font-medium">{verify.data.summary}</p>
          </div>

          {/* Steps detail */}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-muted/20 rounded-lg p-2">
              <span className="text-muted-foreground">Source Tx</span>
              {verify.data.steps.sourceReceipt ? (
                <Badge className={cn('text-[10px]', verify.data.steps.sourceReceipt.status === 'success'
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
                )}>
                  {verify.data.steps.sourceReceipt.status} (block {verify.data.steps.sourceReceipt.blockNumber})
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">Not found</Badge>
              )}
            </div>

            {(verify.data.steps.lockedEvent || verify.data.steps.burnedEvent) && (
              <div className="bg-muted/20 rounded-lg p-2 space-y-1">
                <p className="text-muted-foreground font-medium text-[11px]">
                  {verify.data.steps.lockedEvent ? 'Locked Event' : 'Burned Event'}
                </p>
                {(() => {
                  const ev = verify.data.steps.lockedEvent || verify.data.steps.burnedEvent!
                  return (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-mono">{ev.amount}</span>
                      <span className="text-muted-foreground">Fee:</span>
                      <span className="font-mono">{ev.fee}</span>
                      <span className="text-muted-foreground">Nonce:</span>
                      <span className="font-mono">{ev.nonce}</span>
                    </div>
                  )
                })()}
              </div>
            )}

            <div className="flex items-center justify-between bg-muted/20 rounded-lg p-2">
              <span className="text-muted-foreground">In Queue</span>
              <Badge className={cn('text-[10px]', verify.data.steps.inQueue
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              )}>
                {verify.data.steps.inQueue ? `Yes (${verify.data.steps.queueEntries[0]?.status})` : 'No'}
              </Badge>
            </div>

            <div className="flex items-center justify-between bg-muted/20 rounded-lg p-2">
              <span className="text-muted-foreground">
                {verify.data.chain === 'liteforge' ? 'Minted' : 'Unlocked'}
              </span>
              <Badge className={cn('text-[10px]',
                (verify.data.steps.mintedOnSepolia || verify.data.steps.unlockedOnLiteforge)
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              )}>
                {(verify.data.steps.mintedOnSepolia || verify.data.steps.unlockedOnLiteforge) ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
