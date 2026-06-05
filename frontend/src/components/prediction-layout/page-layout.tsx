import { Header, BottomNav } from './header';
import { Outlet } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

function formatLtcPrice(value: number) {
  if (value === 0) return '0';
  if (value < 0.01) {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6,
    });
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function useLtcPrice() {
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd');
        const data = await res.json();
        const value = data?.litecoin?.usd;
        if (typeof value === 'number') {
          setPrice(formatLtcPrice(value));
        }
      } catch {
        // silently fail
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return price;
}

export function PredictionLayout() {
  const ltcPrice = useLtcPrice();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const switchedOnEnterRef = useRef(false);

  useEffect(() => {
    if (!isConnected || switchedOnEnterRef.current) return;
    switchedOnEnterRef.current = true;

    if (chainId !== 4441) {
      switchChain({ chainId: 4441 });
    }
  }, [isConnected, chainId, switchChain]);

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-7xl px-5 pt-[4.5rem] pb-20 md:pt-[5.5rem] md:pb-8">
        <Outlet />
      </main>
      <footer className="hidden md:block border-t border-border py-5">
        <div className="mx-auto max-w-7xl px-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Litecoin</span>
            <span className="font-mono text-xs font-medium text-foreground">LTC</span>
            {ltcPrice && <span className="font-mono text-xs text-primary">${ltcPrice}</span>}
            {!ltcPrice && <span className="font-mono text-xs text-muted-foreground/50">--</span>}
          </div>
          <span className="font-mono text-[11px] text-muted-foreground/60">LiteForge 4441</span>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
