import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminFetch } from '@/config/admin'

// ─── Types ────────────────────────────────────────────────────

export interface HealthData {
  status: string
  uptime: number
  balances: { liteforge: string; sepolia: string; baseSepolia: string } | { error: string }
  rpc: {
    liteforge: { active: string; total: number }
    sepolia: { active: string; total: number }
    baseSepolia: { active: string; total: number }
  }
  queue: Record<string, number>
  config: {
    pollIntervalMs: number
    confirmationBlocks: number
    maxRetries: number
    mintConcurrency: number
    unlockConcurrency: number
  }
}

export interface QueueTransaction {
  id: number
  type: 'MINT' | 'UNLOCK'
  status: string
  source_tx_hash: string
  source_chain: string
  source_block: number
  source_nonce: number
  recipient: string
  amount: string
  dest_tx_hash: string | null
  retries: number
  error: string | null
  created_at: string
  updated_at: string
}

export interface VerifyResult {
  txHash: string
  chain: string
  steps: {
    inQueue: boolean
    queueEntries: QueueTransaction[]
    sourceReceipt: { status: string; blockNumber: number; gasUsed: string } | null
    lockedEvent?: { sender: string; recipient: string; amount: string; fee: string; nonce: string }
    burnedEvent?: { sender: string; recipient: string; amount: string; fee: string; nonce: string }
    mintedOnSepolia?: boolean
    mintedOnDest?: boolean
    mintedOnBaseSepolia?: boolean
    unlockedOnLiteforge?: boolean
  }
  summary: string
}

export interface InjectResult {
  message: string
  event: { sender: string; recipient: string; amount: string; fee: string; nonce: number }
}

// ─── Hooks ────────────────────────────────────────────────────

export function useAdminHealth() {
  return useQuery<HealthData>({
    queryKey: ['admin-health'],
    queryFn: () => adminFetch('/admin/health'),
    refetchInterval: 10000,
    staleTime: 5000,
  })
}

export function useAdminQueue(status?: string) {
  return useQuery<{ count: number; transactions: QueueTransaction[] }>({
    queryKey: ['admin-queue', status],
    queryFn: () => adminFetch(`/admin/queue${status ? `?status=${status}` : ''}`),
    refetchInterval: 10000,
    staleTime: 5000,
  })
}

export function useAdminVerify() {
  return useMutation<VerifyResult, Error, { txHash: string; chain: string }>({
    mutationFn: ({ txHash, chain }) =>
      adminFetch('/admin/verify', {
        method: 'POST',
        body: JSON.stringify({ txHash, chain }),
      }),
  })
}

export function useAdminRetry() {
  const queryClient = useQueryClient()
  return useMutation<{ message: string; tx: QueueTransaction }, Error, number>({
    mutationFn: (id) => adminFetch(`/admin/retry/${id}`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-queue'] })
    },
  })
}

export function useAdminInject() {
  const queryClient = useQueryClient()
  return useMutation<InjectResult, Error, { txHash: string; chain: string }>({
    mutationFn: ({ txHash, chain }) =>
      adminFetch('/admin/inject', {
        method: 'POST',
        body: JSON.stringify({ txHash, chain }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-queue'] })
    },
  })
}
