import { motion } from 'framer-motion'
import { Activity, Wallet, Radio, Settings } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { HealthData } from '@/hooks/useAdminApi'

interface HealthPanelProps {
  data: HealthData | undefined
  isLoading: boolean
  isError: boolean
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function HealthPanel({ data, isLoading, isError }: HealthPanelProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <Skeleton className="h-3 w-16 mb-3" />
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (isError || !data) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 text-center">
          <p className="text-destructive text-sm">Failed to connect to Admin API</p>
          <p className="text-xs text-muted-foreground mt-1">Check VITE_ADMIN_API_URL and VITE_ADMIN_API_KEY</p>
        </CardContent>
      </Card>
    )
  }

  const balances = 'error' in data.balances
    ? { liteforge: 'Error', sepolia: 'Error' }
    : data.balances

  const queueTotal = Object.values(data.queue).reduce((a, b) => a + b, 0)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center">
                <Activity className="h-3 w-3 text-green-400" />
              </div>
            </div>
            <p className="text-xl font-bold mt-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/20">
                {data.status}
              </Badge>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Uptime: {formatUptime(data.uptime)}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Balances */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Balances</p>
              <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Wallet className="h-3 w-3 text-blue-400" />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <p className="text-xs font-medium truncate">{balances.liteforge}</p>
              <p className="text-xs font-medium truncate">{balances.sepolia}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* RPC */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">RPC Endpoints</p>
              <div className="h-6 w-6 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Radio className="h-3 w-3 text-purple-400" />
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <p className="text-xs">LiteForge: <span className="font-medium">{data.rpc.liteforge.total}</span></p>
              <p className="text-xs">Sepolia: <span className="font-medium">{data.rpc.sepolia.total}</span></p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Queue */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Queue Total</p>
              <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Settings className="h-3 w-3 text-orange-400" />
              </div>
            </div>
            <p className="text-xl font-bold mt-2">{queueTotal}</p>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
              {Object.entries(data.queue).map(([status, count]) => (
                <span key={status} className="text-[10px] text-muted-foreground">
                  {status}: <span className="text-foreground">{count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
