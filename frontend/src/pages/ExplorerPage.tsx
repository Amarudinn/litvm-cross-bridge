import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ExplorerStats } from '@/components/explorer/ExplorerStats'
import { ExplorerTable } from '@/components/explorer/ExplorerTable'
import { useBridgeEvents } from '@/hooks/useBridgeEvents'

export default function ExplorerPage() {
  const { data, isLoading, isError } = useBridgeEvents()

  return (
    <div className="flex-1 flex flex-col px-4 py-6 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-1">
          <Globe className="h-5 w-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Bridge Explorer</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mb-5">
          All bridge transactions across LiteForge and Sepolia
        </p>

        {/* Stats */}
        <div className="mb-6">
          <ExplorerStats stats={data?.stats} isLoading={isLoading} />
        </div>

        {/* Transactions Table */}
        <div className="relative">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-border-spin" />
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-10 blur-md group-hover:opacity-25 transition-opacity duration-500 animate-border-spin" />
          <Card className="relative rounded-2xl border-0 bg-card shadow-2xl group">
            <CardContent className="p-4 md:p-5">
              {isLoading ? (
                <div className="space-y-3">
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-9 flex-1 rounded-lg" />
                    <Skeleton className="h-9 w-20 rounded-lg" />
                    <Skeleton className="h-9 w-20 rounded-lg" />
                  </div>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
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
                <ExplorerTable transactions={data?.transactions ?? []} />
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
