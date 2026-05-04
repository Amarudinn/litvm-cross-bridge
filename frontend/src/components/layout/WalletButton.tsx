import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Wallet, LogOut, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { shortenAddress } from '@/lib/format'

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!isConnected) {
    return (
      <button
        onClick={openConnectModal}
        className={cn(
          'flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold',
          'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
          'hover:from-blue-600 hover:to-purple-700 transition-all',
          'shadow-lg shadow-blue-500/20 cursor-pointer'
        )}
      >
        <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </button>
    )
  }

  const chainName = chainId === 4441 ? 'LiteForge' : chainId === 11155111 ? 'Sepolia' : `Chain ${chainId}`
  const chainIcon = chainId === 4441 ? '/litvm.png' : '/eth.png'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium',
          'bg-muted/60 border border-border/50',
          'hover:bg-muted transition-colors cursor-pointer'
        )}
      >
        <img src={chainIcon} alt={chainName} className="w-5 h-5 rounded-full" />
        <span className="hidden sm:inline text-foreground">{shortenAddress(address!)}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform hidden md:block', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/60 bg-card shadow-xl p-2 z-50">
          {/* Chain switcher */}
          <p className="text-xs text-muted-foreground px-2 py-1">Switch Network</p>
          <button
            onClick={() => { switchChain({ chainId: 4441 }); setOpen(false) }}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors',
              chainId === 4441 ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
            )}
          >
            <img src="/litvm.png" alt="LiteForge" className="w-5 h-5 rounded-full" />
            LiteForge
            {chainId === 4441 && <span className="ml-auto text-xs text-primary">Connected</span>}
          </button>
          <button
            onClick={() => { switchChain({ chainId: 11155111 }); setOpen(false) }}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors',
              chainId === 11155111 ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
            )}
          >
            <img src="/eth.png" alt="Sepolia" className="w-5 h-5 rounded-full" />
            Sepolia
            {chainId === 11155111 && <span className="ml-auto text-xs text-primary">Connected</span>}
          </button>

          <div className="border-t border-border/40 my-1.5" />

          {/* Disconnect */}
          <button
            onClick={() => { disconnect(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}
