import { Link, useLocation } from 'react-router-dom';
import { WalletButton } from '@/components/layout/WalletButton';
import { cn } from '@/lib/utils';
import { ChartBar, Trophy, User, Gift, BookOpen } from '@phosphor-icons/react';

const navItems = [
  { path: '/predict', label: 'Markets', icon: ChartBar },
  { path: '/predict/leaderboard', label: 'Leaderboard', icon: Trophy },
  { path: '/predict/profile', label: 'Profile', icon: User },
  { path: '/predict/docs', label: 'Docs', icon: BookOpen },
];

const bottomNavItems = navItems.filter((item) => item.path !== '/predict/docs');

const soonItems = [
  { label: 'Rewards', icon: Gift },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border glass">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Link to="/predict" className="flex items-center gap-2">
            <img
              src="/multyra.png"
              alt="Multyra"
              className="h-6 w-6 object-contain"
            />
            <span className="text-sm font-bold text-foreground">
              Multyra
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-150 ease-[var(--ease-out)]',
                  location.pathname === path
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon size={15} weight={location.pathname === path ? 'fill' : 'bold'} />
                {label}
              </Link>
            ))}
            {soonItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                disabled
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground/50 cursor-not-allowed"
                title="Soon"
              >
                <Icon size={15} weight="bold" />
                {label}
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">Soon</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 md:hidden">
            {soonItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                disabled
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground/50 cursor-not-allowed"
                title={`${label} Soon`}
                aria-label={`${label} Soon`}
              >
                <Icon size={16} weight="bold" />
              </button>
            ))}
            <Link
              to="/predict/docs"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card transition-colors',
                location.pathname === '/predict/docs'
                  ? 'text-primary border-border/60'
                  : 'text-muted-foreground hover:text-foreground hover:border-border/60'
              )}
              title="Docs"
              aria-label="Docs"
            >
              <BookOpen size={16} weight={location.pathname === '/predict/docs' ? 'fill' : 'bold'} />
            </Link>
          </div>
          <WalletButton lockToLiteforge />
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex items-center justify-around h-14">
        {bottomNavItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors',
              location.pathname === path
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <Icon size={20} weight={location.pathname === path ? 'fill' : 'regular'} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
