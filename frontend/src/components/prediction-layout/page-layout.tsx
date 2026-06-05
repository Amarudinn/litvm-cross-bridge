import { Header, BottomNav } from './header';
import { Outlet } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

export function PredictionLayout() {
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
            <span className="text-xs text-muted-foreground">LiteForge</span>
            <span className="font-mono text-xs font-medium text-foreground">Chain 4441</span>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground/60">Multyra Predict</span>
        </div>
      </footer>
      <BottomNav />
    </div>
  );
}
