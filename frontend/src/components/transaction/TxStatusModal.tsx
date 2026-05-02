import { ExternalLink } from 'lucide-react'
import { useBridgeStore } from '@/stores/bridgeStore'
import { useTransactionStatus } from '@/hooks/useTransactionStatus'
import { getExplorerUrl, shortenTxHash } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TxProgressSteps } from './TxProgressSteps'

export function TxStatusModal() {
  const activeTx = useBridgeStore((s) => s.activeTx)
  const resetActiveTx = useBridgeStore((s) => s.resetActiveTx)
  const resetForm = useBridgeStore((s) => s.resetForm)

  const { sourceChainId } = useTransactionStatus()

  const isOpen =
    activeTx.status !== 'idle'

  const handleClose = () => {
    if (activeTx.status === 'completed' || activeTx.status === 'failed') {
      resetForm()
    } else {
      resetActiveTx()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {activeTx.status === 'failed' ? 'Transaction Failed' : 'Bridge Transaction'}
          </DialogTitle>
          <DialogDescription>
            {activeTx.status === 'failed'
              ? 'Something went wrong with your transaction.'
              : 'Track the progress of your bridge transaction.'}
          </DialogDescription>
        </DialogHeader>

        {activeTx.status === 'failed' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">
                {activeTx.error || 'An unknown error occurred.'}
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <TxProgressSteps />

            {activeTx.hash && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Source Tx</span>
                  <a
                    href={getExplorerUrl(sourceChainId, 'tx', activeTx.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {shortenTxHash(activeTx.hash)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}

            {activeTx.status === 'completed' && (
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
