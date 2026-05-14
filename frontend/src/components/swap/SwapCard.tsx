import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeftRight, Droplets } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { useSwapStore } from '@/stores/swapStore'
import { usePoolStore } from '@/stores/poolStore'
import { SwapTab } from './SwapTab'
import { PoolTab } from './PoolTab'
import { RoutePreview } from './RoutePreview'

type Tab = 'swap' | 'pool'

export function SwapCard() {
  const [activeTab, setActiveTab] = useState<Tab>('swap')
  const { route, tokenIn, tokenOut, amountIn } = useSwapStore()
  const { setView } = usePoolStore()

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    // Reset pool view to list when switching tabs
    if (tab === 'pool') {
      setView('list')
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'swap', label: 'Swap', icon: <ArrowLeftRight className="h-4 w-4" /> },
    { key: 'pool', label: 'Pool', icon: <Droplets className="h-4 w-4" /> },
  ]

  const showRoute = activeTab === 'swap' && route && tokenIn && tokenOut && amountIn && parseFloat(amountIn) > 0

  return (
    <div className="relative w-full max-w-[420px] mx-auto space-y-3">
      {/* Card */}
      <div className="relative">
        {/* Animated gradient border - same as BridgeCard */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-border-spin" />
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10 blur-md group-hover:opacity-25 transition-opacity duration-500 animate-border-spin" />

        <Card className="relative rounded-2xl border-0 bg-card shadow-2xl group">
          <CardContent className="p-4 md:p-5">
            {/* Tab Header inside card */}
            <div className="relative flex items-center p-1 rounded-xl bg-muted/30 border border-border/20 mb-4">
              {/* Sliding indicator */}
              <motion.div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-primary rounded-lg"
                animate={{ x: activeTab === 'swap' ? 4 : 'calc(100% + 4px)' }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              />
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={cn(
                    'relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200',
                    activeTab === tab.key
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground/70'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'swap' ? <SwapTab /> : <PoolTab />}
          </CardContent>
        </Card>
      </div>

      {/* Route Preview - outside card */}
      <AnimatePresence>
        {showRoute && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative">
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 transition-opacity duration-500 animate-border-spin" />
              <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10 blur-md transition-opacity duration-500 animate-border-spin" />
              <RoutePreview route={route} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
