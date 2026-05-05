import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircleQuestion, X, ChevronDown, ChevronRight, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'
import { cn } from '@/lib/utils'

interface FaqItem {
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    question: 'Bridge transaction not arriving?',
    answer: 'Lock (LiteForge → Sepolia) takes ~20 seconds. Burn (Sepolia → LiteForge) takes ~45 seconds. If it\'s been more than 2 minutes, check the History page for status. The Relayer may be processing a queue.',
  },
  {
    question: 'How to import wzkLTC to MetaMask?',
    answer: 'Switch to Sepolia network in MetaMask → Click "Import tokens" → Paste contract address: 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f → Symbol: wzkLTC, Decimals: 18.',
  },
  {
    question: 'What\'s the minimum amount?',
    answer: 'Minimum lock: 0.001 zkLTC. Minimum burn: 0.001 wzkLTC. A 0.3% fee is deducted from each transaction.',
  },
  {
    question: 'How long does bridging take?',
    answer: 'LiteForge → Sepolia (Lock): ~20 seconds. Sepolia → LiteForge (Burn): ~45 seconds. Sepolia has longer block times (~12s vs ~2s on LiteForge).',
  },
]

const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastSubmitTime, setLastSubmitTime] = useState<number | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const { address } = useAccount()

  // Cooldown timer
  useEffect(() => {
    if (!lastSubmitTime) return

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSubmitTime
      const remaining = Math.max(0, COOLDOWN_MS - elapsed)
      setCooldownRemaining(remaining)

      if (remaining === 0) {
        clearInterval(interval)
        setSubmitStatus('idle')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [lastSubmitTime])

  const handleSubmit = async () => {
    if (!txHash || !address) return

    // Frontend rate limit check
    if (lastSubmitTime && Date.now() - lastSubmitTime < COOLDOWN_MS) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: txHash.trim(),
          message: message.trim() || undefined,
          walletAddress: address,
          network: 'Multyra Bridge',
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSubmitStatus('success')
        setLastSubmitTime(Date.now())
        setCooldownRemaining(COOLDOWN_MS)
        setTxHash('')
        setMessage('')
      } else {
        setSubmitStatus('error')
        setErrorMessage(data.error || 'Failed to submit report')
      }
    } catch {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCooldown = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Extract tx hash from explorer URL or raw hash
  const parseTxInput = (input: string): string => {
    const trimmed = input.trim()
    // Match explorer URL pattern: .../tx/0x...
    const urlMatch = trimmed.match(/\/tx\/(0x[a-fA-F0-9]{64})/)
    if (urlMatch) return urlMatch[1]
    return trimmed
  }

  const handleTxHashChange = (value: string) => {
    setTxHash(parseTxInput(value))
  }

  const isValidTxHash = /^0x[a-fA-F0-9]{64}$/.test(txHash.trim())
  const canSubmit = isValidTxHash && address && !isSubmitting && cooldownRemaining === 0

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors',
          isOpen
            ? 'bg-muted hover:bg-muted/80'
            : 'bg-primary hover:bg-primary/90'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <X className="h-5 w-5 text-foreground" />
        ) : (
          <MessageCircleQuestion className="h-5 w-5 text-primary-foreground" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-20 right-6 z-40 w-80 max-w-[calc(100vw-3rem)] max-h-[70vh] overflow-hidden rounded-xl border border-border/50 bg-background shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-foreground">Need Help?</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {/* FAQ Section */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FAQ</span>
                {faqItems.map((item, index) => (
                  <div key={index} className="rounded-lg border border-border/30 overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-muted-foreground shrink-0">
                        {expandedFaq === index ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </span>
                      <span className="text-xs font-medium text-foreground">{item.question}</span>
                    </button>
                    <AnimatePresence>
                      {expandedFaq === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="px-3 pb-2.5 text-xs text-muted-foreground leading-relaxed">
                            {item.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div className="border-t border-border/30" />

              {/* Report Section */}
              <div className="space-y-2">
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="w-full flex items-center gap-2 text-left"
                >
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Report Transaction</span>
                  <span className="text-muted-foreground">
                    {showForm ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </span>
                </button>

                <AnimatePresence>
                  {showForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-2.5"
                    >
                      {/* Success State */}
                      {submitStatus === 'success' && cooldownRemaining > 0 && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-green-500">Report submitted!</p>
                            <p className="text-xs text-muted-foreground">Next report in {formatCooldown(cooldownRemaining)}</p>
                          </div>
                        </div>
                      )}

                      {/* Error State */}
                      {submitStatus === 'error' && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                          <p className="text-xs text-destructive">{errorMessage}</p>
                        </div>
                      )}

                      {/* Form */}
                      {(submitStatus === 'idle' || submitStatus === 'error' || cooldownRemaining === 0) && (
                        <>
                          {!address && (
                            <p className="text-xs text-muted-foreground/70 italic">
                              Connect your wallet to submit a report.
                            </p>
                          )}

                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">TX Hash or Explorer Link *</label>
                            <input
                              type="text"
                              value={txHash}
                              onChange={(e) => handleTxHashChange(e.target.value)}
                              placeholder="0x... or paste explorer link"
                              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-muted/50 transition-colors font-mono"
                            />
                            {txHash && !isValidTxHash && (
                              <p className="text-[10px] text-destructive mt-1">Invalid TX hash format (0x + 64 hex chars)</p>
                            )}
                          </div>

                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Message (optional)</label>
                            <textarea
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              placeholder="Describe the issue..."
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-muted/50 transition-colors resize-none"
                            />
                          </div>

                          {address && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">Wallet:</span>
                              <span className="text-[10px] text-foreground font-mono">
                                {address.slice(0, 6)}...{address.slice(-4)}
                              </span>
                            </div>
                          )}

                          <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={cn(
                              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                              canSubmit
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                            )}
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                Submit Report
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
