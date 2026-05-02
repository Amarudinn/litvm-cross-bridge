import { useQuery } from '@tanstack/react-query'
import { getPublicClient } from 'wagmi/actions'
import { parseAbiItem, keccak256, encodePacked } from 'viem'
import { config } from '@/config/wagmi'
import { BRIDGE_VAULT_ADDRESS, WRAPPED_ZKLTC_ADDRESS } from '@/config/contracts'

// Event signatures
const lockedEvent = parseAbiItem(
  'event Locked(address indexed sender, address indexed recipient, uint256 amount, uint256 fee, uint256 nonce)'
)
const unlockedEvent = parseAbiItem(
  'event Unlocked(address indexed recipient, uint256 amount, bytes32 indexed processId)'
)
const mintedEvent = parseAbiItem(
  'event Minted(address indexed recipient, uint256 amount, bytes32 indexed processId)'
)
const burnedEvent = parseAbiItem(
  'event Burned(address indexed sender, address indexed recipient, uint256 amount, uint256 fee, uint256 nonce)'
)

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

/**
 * Fetch logs in chunks to avoid RPC block range limits.
 * Most public RPCs limit to 50000 blocks per request.
 */
async function getLogsChunked(
  client: any,
  params: { address: `0x${string}`; event: any; fromBlock: bigint; toBlock: bigint; args?: any }
) {
  const MAX_RANGE = 49000n
  const { fromBlock, toBlock, ...rest } = params
  const allLogs: any[] = []

  let current = fromBlock
  while (current <= toBlock) {
    const end = current + MAX_RANGE > toBlock ? toBlock : current + MAX_RANGE
    try {
      const logs = await client.getLogs({ ...rest, fromBlock: current, toBlock: end })
      allLogs.push(...logs)
    } catch {
      // If chunk fails, skip it
    }
    current = end + 1n
  }

  return allLogs
}

export function useBridgeEvents(filterAddress?: `0x${string}`) {
  return useQuery({
    queryKey: ['bridge-events', filterAddress],
    queryFn: async (): Promise<{ transactions: BridgeTransaction[]; stats: BridgeStats }> => {
      const lfClient = getPublicClient(config, { chainId: 4441 })
      const sepClient = getPublicClient(config, { chainId: 11155111 })

      if (!lfClient || !sepClient) throw new Error('Clients not available')

      // Get current block numbers
      const [lfBlock, sepBlock] = await Promise.all([
        lfClient.getBlockNumber(),
        sepClient.getBlockNumber(),
      ])

      // Scan last 100000 blocks on LiteForge (fast chain, blocks are cheap)
      // Scan last 50000 blocks on Sepolia (limited by RPC)
      const lfFromBlock = lfBlock > 100000n ? lfBlock - 100000n : 0n
      const sepFromBlock = sepBlock > 45000n ? sepBlock - 45000n : 0n

      // Fetch all 4 event types in parallel
      const [lockedLogs, unlockedLogs, mintedLogs, burnedLogs] = await Promise.all([
        getLogsChunked(lfClient, {
          address: BRIDGE_VAULT_ADDRESS,
          event: lockedEvent,
          fromBlock: lfFromBlock,
          toBlock: lfBlock,
          ...(filterAddress ? { args: { sender: filterAddress } } : {}),
        }),
        getLogsChunked(lfClient, {
          address: BRIDGE_VAULT_ADDRESS,
          event: unlockedEvent,
          fromBlock: lfFromBlock,
          toBlock: lfBlock,
          ...(filterAddress ? { args: { recipient: filterAddress } } : {}),
        }),
        getLogsChunked(sepClient, {
          address: WRAPPED_ZKLTC_ADDRESS,
          event: mintedEvent,
          fromBlock: sepFromBlock,
          toBlock: sepBlock,
          ...(filterAddress ? { args: { recipient: filterAddress } } : {}),
        }),
        getLogsChunked(sepClient, {
          address: WRAPPED_ZKLTC_ADDRESS,
          event: burnedEvent,
          fromBlock: sepFromBlock,
          toBlock: sepBlock,
          ...(filterAddress ? { args: { sender: filterAddress } } : {}),
        }),
      ])

      // Build processId → mint tx hash map
      const mintByProcessId = new Map<string, `0x${string}`>()
      for (const m of mintedLogs) {
        const pid = (m.args.processId as string)?.toLowerCase()
        if (pid) mintByProcessId.set(pid, m.transactionHash)
      }

      // Build processId → unlock tx hash map
      const unlockByProcessId = new Map<string, `0x${string}`>()
      for (const u of unlockedLogs) {
        const pid = (u.args.processId as string)?.toLowerCase()
        if (pid) unlockByProcessId.set(pid, u.transactionHash)
      }

      const transactions: BridgeTransaction[] = []

      // Process Lock → Mint pairs
      for (const lock of lockedLogs) {
        const sender = lock.args.sender as `0x${string}`
        const recipient = lock.args.recipient as `0x${string}`
        const amount = lock.args.amount as bigint
        const fee = lock.args.fee as bigint
        const nonce = lock.args.nonce as bigint

        // Compute processId same as contract: keccak256(abi.encodePacked(txHash, nonce))
        const processId = keccak256(
          encodePacked(['bytes32', 'uint256'], [lock.transactionHash, nonce])
        ).toLowerCase()

        const destTxHash = mintByProcessId.get(processId) ?? null

        transactions.push({
          id: `lock-${nonce}`,
          direction: 'liteforge_to_sepolia',
          sender,
          recipient,
          amount,
          fee,
          nonce,
          sourceTxHash: lock.transactionHash,
          destTxHash,
          sourceChainId: 4441,
          destChainId: 11155111,
          status: destTxHash ? 'completed' : 'pending_relay',
          sourceBlockNumber: lock.blockNumber,
        })
      }

      // Process Burn → Unlock pairs
      for (const burn of burnedLogs) {
        const sender = burn.args.sender as `0x${string}`
        const recipient = burn.args.recipient as `0x${string}`
        const amount = burn.args.amount as bigint
        const fee = burn.args.fee as bigint
        const nonce = burn.args.nonce as bigint

        // processId = keccak256(abi.encodePacked(burnTxHash, burnNonce))
        const processId = keccak256(
          encodePacked(['bytes32', 'uint256'], [burn.transactionHash, nonce])
        ).toLowerCase()

        const destTxHash = unlockByProcessId.get(processId) ?? null

        transactions.push({
          id: `burn-${nonce}`,
          direction: 'sepolia_to_liteforge',
          sender,
          recipient,
          amount,
          fee,
          nonce,
          sourceTxHash: burn.transactionHash,
          destTxHash,
          sourceChainId: 11155111,
          destChainId: 4441,
          status: destTxHash ? 'completed' : 'pending_relay',
          sourceBlockNumber: burn.blockNumber,
        })
      }

      // Sort newest first
      transactions.sort((a, b) => Number(b.sourceBlockNumber - a.sourceBlockNumber))

      return {
        transactions,
        stats: {
          totalLocked: lockedLogs.reduce((sum, l) => sum + ((l.args.amount as bigint) ?? 0n), 0n),
          totalBurned: burnedLogs.reduce((sum, b) => sum + ((b.args.amount as bigint) ?? 0n), 0n),
          lockCount: lockedLogs.length,
          burnCount: burnedLogs.length,
          totalTxCount: lockedLogs.length + burnedLogs.length,
        },
      }
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}
