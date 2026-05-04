import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { WalletButton } from './WalletButton'

export default function Header() {
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
        {/* Logo - Left */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/multyra.png" alt="Multyra" className="w-6 h-6" />
          <span className="text-sm font-bold text-foreground">
            Multyra
          </span>
        </Link>

        {/* Navigation - Center (Desktop only) */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-0.5">
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

        {/* Right side - Mobile menu button + Wallet Button */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu Button (Mobile only) */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <WalletButton />
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 border-t border-border/40 bg-background/95 backdrop-blur-sm shadow-lg">
          <nav className="container mx-auto px-4 py-2 flex flex-col gap-1">
            {navItems.map(item => (
              item.soon ? (
                <span
                  key={item.label}
                  className="relative px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                >
                  {item.label}
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none bg-primary/20 text-primary">
                    soon
                  </span>
                </span>
              ) : (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
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
      )}
    </header>
  )
}
