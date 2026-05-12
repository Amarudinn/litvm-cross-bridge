'use client'

import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '@/config/supabase'

interface BridgeStats {
  totalTransactions: number
  totalVolume: number
  totalLocks: number
  totalBurns: number
  isLoading: boolean
}

export function useStats(): BridgeStats {
  const [stats, setStats] = useState<BridgeStats>({
    totalTransactions: 0,
    totalVolume: 0,
    totalLocks: 0,
    totalBurns: 0,
    isLoading: true,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStats((prev) => ({ ...prev, isLoading: false }))
      return
    }

    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.from('bridge_stats').select('*').single()

        if (error) throw error

        if (data) {
          const totalLockedWei = BigInt(data.total_locked_wei || '0')
          const totalBurnedWei = BigInt(data.total_burned_wei || '0')
          const totalVolumeWei = totalLockedWei + totalBurnedWei
          const totalVolume = Number(totalVolumeWei) / 1e18

          setStats({
            totalTransactions: Number(data.total_transactions || 0),
            totalVolume,
            totalLocks: Number(data.total_locks || 0),
            totalBurns: Number(data.total_burns || 0),
            isLoading: false,
          })
        }
      } catch (err) {
        console.error('Failed to fetch bridge stats:', err)
        setStats((prev) => ({ ...prev, isLoading: false }))
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  return stats
}
