import { useState } from 'react'
import { Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAdminInject } from '@/hooks/useAdminApi'
import { extractTxHash } from '@/config/admin'

export function InjectForm() {
  const [txHash, setTxHash] = useState('')
  const [chain, setChain] = useState<'liteforge' | 'sepolia' | 'basesepolia'>('liteforge')
  const inject = useAdminInject()

  const handleInject = () => {
    if (!txHash.trim()) return
    inject.mutate({ txHash: extractTxHash(txHash), chain })
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
        <button
          onClick={() => setChain('basesepolia')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap',
            chain === 'basesepolia' ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Base Sepolia
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
        <Button size="sm" onClick={handleInject} disabled={inject.isPending || !txHash.trim()} variant="destructive" className="shrink-0">
          {inject.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          <span className="ml-1.5 hidden sm:inline">Inject</span>
        </Button>
      </div>

      {/* Error */}
      {inject.isError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{inject.error.message}</p>
        </div>
      )}

      {/* Success */}
      {inject.data && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
            <p className="text-xs text-green-400">{inject.data.message}</p>
          </div>
          <div className="bg-muted/20 rounded-lg p-2 text-xs">
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-mono">{inject.data.event.amount}</span>
              <span className="text-muted-foreground">Fee:</span>
              <span className="font-mono">{inject.data.event.fee}</span>
              <span className="text-muted-foreground">Nonce:</span>
              <span className="font-mono">{inject.data.event.nonce}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
