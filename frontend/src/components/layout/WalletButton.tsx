import { useAccount, useDisconnect, useChainId, useSwitchChain, useBalance } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Wallet, LogOut, ChevronDown, Globe, Check, Copy, ExternalLink } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { shortenAddress } from '@/lib/format'
import { formatUnits } from 'viem'

const CHAINS = [
  { id: 4441, name: 'LiteForge', icon: '/litvm.png', color: 'from-blue-500 to-cyan-400', symbol: 'zkLTC' },
  { id: 11155111, name: 'Sepolia', icon: '/eth.png', color: 'from-indigo-500 to-purple-500', symbol: 'ETH' },
  { id: 84532, name: 'Base Sepolia', icon: '/base.jpeg', color: 'from-blue-600 to-blue-400', symbol: 'ETH' },
]

function formatSmartBalance(value: bigint, decimals: number = 18): string {
  const formatted = parseFloat(formatUnits(value, decimals))
  if (formatted === 0) return '0'
  if (formatted >= 1) {
    // Show up to 4 decimals, remove trailing zeros
    return formatted.toFixed(4).replace(/\.?0+$/, '')
  }
  // For small numbers, show up to 4 decimal places max
  const str = formatted.toFixed(4)
  return str.replace(/\.?0+$/, '')
}

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: nativeBalance } = useBalance({
    address,
    chainId,
    query: { enabled: !!address, refetchInterval: 15000 },
  })

  const currentChain = CHAINS.find(c => c.id === chainId)
  const nativeSymbol = currentChain?.symbol ?? 'ETH'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleCopy = async () => {
    if (!address) return
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isConnected) {
    return (
      <motion.button
        onClick={openConnectModal}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold',
          'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
          'hover:shadow-lg hover:shadow-primary/25 transition-all duration-200',
          'cursor-pointer'
        )}
      >
        <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect Wallet</span>
      </motion.button>
    )
  }

  const chainName = currentChain?.name ?? `Chain ${chainId}`
  const chainIcon = currentChain?.icon ?? '/eth.png'

  const balanceDisplay = nativeBalance
    ? `${formatSmartBalance(nativeBalance.value)} ${nativeSymbol}`
    : '...'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
          'bg-muted/60 border border-border/50',
          'hover:bg-muted transition-all duration-200 cursor-pointer',
          'hover:border-border/80 hover:shadow-sm',
          open && 'bg-muted border-border/80 shadow-sm'
        )}
      >
        <img src={chainIcon} alt={chainName} className="w-5 h-5 rounded-full" />
        <span className="hidden sm:inline text-foreground">{shortenAddress(address!)}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 hidden md:block', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 z-50 overflow-hidden"
          >
            {/* Wallet info */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-3 mb-3">
                <img src={chainIcon} alt={chainName} className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {balanceDisplay}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {shortenAddress(address!)}
                  </p>
                </div>
              </div>

              {/* Action buttons row */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy Address'}
                </button>
                <a
                  href={chainId === 4441 ? `https://explorer.liteforge.org/address/${address}` : chainId === 84532 ? `https://sepolia.basescan.org/address/${address}` : `https://sepolia.etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  Explorer
                </a>
              </div>
            </div>

            <div className="border-t border-border/40" />

            {/* Network switcher */}
            <div className="p-3">
              <div className="flex items-center gap-1.5 px-1 mb-2">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Switch Network</p>
              </div>

              <div className="space-y-1">
                {CHAINS.map((chain) => {
                  const isActive = chainId === chain.id
                  return (
                    <button
                      key={chain.id}
                      onClick={() => { if (!isActive) { switchChain({ chainId: chain.id }); setOpen(false) } }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer group',
                        isActive
                          ? 'bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-foreground shadow-sm'
                          : 'hover:bg-muted/80 text-foreground/80 hover:text-foreground border border-transparent'
                      )}
                    >
                      <img src={chain.icon} alt={chain.name} className="w-7 h-7 rounded-full" />
                      <div className="flex-1 text-left">
                        <p className={cn('text-sm font-medium', isActive && 'text-foreground')}>
                          {chain.name}
                        </p>
                      </div>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          Active
                        </span>
                      )}
                      {!isActive && (
                        <span className="text-xs text-muted-foreground/0 group-hover:text-muted-foreground transition-colors">
                          Switch
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t border-border/40" />

            {/* Disconnect */}
            <div className="p-3">
              <button
                onClick={() => { disconnect(); setOpen(false) }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer group"
              >
                <LogOut className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                Disconnect Wallet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
