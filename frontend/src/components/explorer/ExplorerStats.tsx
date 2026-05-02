import { motion } from 'framer-motion'
import { Lock, Flame, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatAmount } from '@/lib/format'
import type { BridgeStats } from '@/hooks/useBridgeEvents'

interface ExplorerStatsProps {
  stats: BridgeStats | undefined
  isLoading: boolean
}

interface StatCardProps {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  delay: number
}

function StatCard({ title, value, subtitle, icon, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function ExplorerStats({ stats, isLoading }: ExplorerStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-32 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatCard
        title="Total Locked"
        value={`${formatAmount(stats.totalLocked)} zkLTC`}
        subtitle={`${stats.lockCount} transaction${stats.lockCount !== 1 ? 's' : ''}`}
        icon={<Lock className="h-5 w-5 text-blue-400" />}
        delay={0}
      />
      <StatCard
        title="Total Burned"
        value={`${formatAmount(stats.totalBurned)} wzkLTC`}
        subtitle={`${stats.burnCount} transaction${stats.burnCount !== 1 ? 's' : ''}`}
        icon={<Flame className="h-5 w-5 text-orange-400" />}
        delay={0.1}
      />
      <StatCard
        title="Total Transactions"
        value={stats.totalTxCount.toString()}
        subtitle="All bridge operations"
        icon={<Activity className="h-5 w-5 text-purple-400" />}
        delay={0.2}
      />
    </div>
  )
}
