import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { WalletButton } from './WalletButton'

export default function Header() {
  const location = useLocation()
  const navItems = [
    { path: '/', label: 'Bridge', soon: false },
    { path: '#', label: 'Swap', soon: true },
    { path: '/history', label: 'History', soon: false },
    { path: '/explorer', label: 'Explorer', soon: false },
    { path: '#', label: 'Docs', soon: true },
  ]

  return (
    <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4 md:gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/litvm.png" alt="LitVM" className="w-6 h-6 rounded-full" />
            <span className="text-sm font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              LitVM
            </span>
          </Link>

          <nav className="flex items-center gap-0.5">
            {navItems.map(item => (
              item.soon ? (
                <span
                  key={item.label}
                  className="relative px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                >
                  {item.label}
                  <span className="absolute -top-1 -right-1 px-1 py-0.5 rounded text-[8px] font-bold leading-none bg-primary/20 text-primary">
                    soon
                  </span>
                </span>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'px-2.5 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors',
                    location.pathname === item.path
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>
        </div>

        <WalletButton />
      </div>
    </header>
  )
}
