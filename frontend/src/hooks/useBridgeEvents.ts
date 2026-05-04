import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export interface BridgeTransaction {
  id: string
  direction: 'liteforge_to_sepolia' | 'sepolia_to_liteforge'
  sender: string
  recipient: string
  amount: bigint
  fee: bigint
  nonce: bigint
  sourceTxHash: `0x${string}`
  destTxHash: `0x${string}` | null
  sourceChainId: number
  destChainId: number
  status: 'completed' | 'pending_relay'
  sourceBlockNumber: bigint
}

export interface BridgeStats {
  totalLocked: bigint
  totalBurned: bigint
  lockCount: number
  burnCount: number
  totalTxCount: number
}

interface SupabaseTransaction {
  id: number
  direction: 'liteforge_to_sepolia' | 'sepolia_to_liteforge'
  source_tx_hash: string
  source_chain_id: number
  source_block: number
  source_nonce: number
  dest_tx_hash: string | null
  dest_chain_id: number
  sender: string
  recipient: string
  amount: string
  fee: string
  status: 'pending' | 'completed' | 'failed'
  created_at: string
  completed_at: string | null
}

interface SupabaseStats {
  total_transactions: number
  total_locks: number
  total_burns: number
  total_completed: number
  total_pending: number
  total_locked_wei: number
  total_burned_wei: number
}

/**
 * Map Supabase row to BridgeTransaction interface
 * Keeps the same interface so HistoryTable/ExplorerTable don't need changes
 */
function mapTransaction(row: SupabaseTransaction): BridgeTransaction {
  return {
    id: `${row.direction === 'liteforge_to_sepolia' ? 'lock' : 'burn'}-${row.source_nonce}`,
    direction: row.direction,
    sender: row.sender,
    recipient: row.recipient,
    amount: BigInt(row.amount),
    fee: BigInt(row.fee || '0'),
    nonce: BigInt(row.source_nonce),
    sourceTxHash: row.source_tx_hash as `0x${string}`,
    destTxHash: row.dest_tx_hash ? (row.dest_tx_hash as `0x${string}`) : null,
    sourceChainId: row.source_chain_id,
    destChainId: row.dest_chain_id,
    status: row.status === 'completed' ? 'completed' : 'pending_relay',
    sourceBlockNumber: BigInt(row.source_block),
  }
}

export function useBridgeEvents(filterAddress?: `0x${string}`) {
  return useQuery({
    queryKey: ['bridge-events', filterAddress],
    queryFn: async (): Promise<{ transactions: BridgeTransaction[]; stats: BridgeStats }> => {
      // Build query
      let query = supabase
        .from('bridge_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      // Filter by address (sender OR recipient)
      if (filterAddress) {
        query = query.or(`sender.ilike.${filterAddress},recipient.ilike.${filterAddress}`)
      }

      const { data: rows, error } = await query

      if (error) throw error

      // Get stats from view
      const { data: statsData } = await supabase
        .from('bridge_stats')
        .select('*')
        .single()

      const stats: SupabaseStats = statsData || {
        total_transactions: 0,
        total_locks: 0,
        total_burns: 0,
        total_completed: 0,
        total_pending: 0,
        total_locked_wei: 0,
        total_burned_wei: 0,
      }

      const transactions = (rows || []).map((row: SupabaseTransaction) => mapTransaction(row))

      return {
        transactions,
        stats: {
          totalLocked: BigInt(Math.floor(stats.total_locked_wei || 0)),
          totalBurned: BigInt(Math.floor(stats.total_burned_wei || 0)),
          lockCount: stats.total_locks,
          burnCount: stats.total_burns,
          totalTxCount: stats.total_transactions,
        },
      }
    },
    refetchInterval: 10000, // Refresh every 10s (faster than before since Supabase is instant)
    staleTime: 5000,
  })
}
