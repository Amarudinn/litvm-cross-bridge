import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Wallet, History } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { HistoryTable } from '@/components/history/HistoryTable'
import { useBridgeEvents } from '@/hooks/useBridgeEvents'
import { cn } from '@/lib/utils'

type FilterTab = 'all' | 'liteforge_to_sepolia' | 'sepolia_to_liteforge'

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'liteforge_to_sepolia', label: 'LF → Sepolia' },
  { key: 'sepolia_to_liteforge', label: 'Sepolia → LF' },
]

export default function HistoryPage() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const { data, isLoading, isError } = useBridgeEvents(
    isConnected ? (address as `0x${string}`) : undefined
  )

  const filteredTransactions = data?.transactions.filter((tx) => {
    if (activeTab === 'all') return true
    return tx.direction === activeTab
  }) ?? []

  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Wallet className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Connect Your Wallet</h2>
          <p className="text-sm text-muted-foreground text-center max-w-xs mb-5">
            Connect your wallet to view your bridge transaction history
          </p>
          <button
            onClick={openConnectModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col px-4 py-6 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <History className="h-5 w-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Transaction History</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-5">
          Your bridge transactions across chains
        </p>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-4 bg-muted/30 rounded-xl p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all cursor-pointer',
                activeTab === tab.key
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table Card */}
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-15 animate-border-spin" />
          <Card className="relative rounded-2xl border-0 bg-card shadow-xl">
            <CardContent className="p-4 md:p-5">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <div className="text-center py-10">
                  <p className="text-destructive text-sm">Failed to load transactions</p>
                  <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                </div>
              ) : (
                <HistoryTable transactions={filteredTransactions} />
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
