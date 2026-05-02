# LitVM Bridge - Supabase Implementation Guide

## Overview

Integrasi Supabase sebagai indexer/database untuk menyimpan data transaksi bridge. Relayer menyimpan setiap transaksi ke Supabase, frontend membaca dari Supabase (bukan dari blockchain langsung).

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Blockchain │         │   Relayer    │         │   Supabase   │
│  (on-chain) │────────►│   (Node.js)  │────────►│  (PostgreSQL)│
│             │  events │              │  insert │              │
└─────────────┘         └──────────────┘         └──────┬───────┘
                                                         │
                                                         │ query
                                                         ▼
                                                  ┌──────────────┐
                                                  │   Frontend   │
                                                  │   (React)    │
                                                  └──────────────┘
```

## Data Flow

### Sebelum (tanpa Supabase)

```
1. User buka History/Explorer page
2. Frontend call getLogs() ke RPC (scan 50000+ blocks)
3. Tunggu 3-10 detik
4. Parse events, correlate Lock↔Mint
5. Tampilkan data
6. Setiap 30 detik, ulangi dari step 2
```

### Sesudah (dengan Supabase)

```
1. Relayer detect event → INSERT ke Supabase (status: pending)
2. Relayer execute relay → UPDATE status ke completed
3. User buka History/Explorer page
4. Frontend query Supabase API (instant, <100ms)
5. Tampilkan data
6. Supabase Realtime push update ke frontend (instant)
```

---

## Database Schema

### Table: `bridge_transactions`

```sql
CREATE TABLE bridge_transactions (
  id SERIAL PRIMARY KEY,
  
  -- Direction: which way the bridge goes
  direction TEXT NOT NULL CHECK (direction IN ('liteforge_to_sepolia', 'sepolia_to_liteforge')),
  
  -- Source chain (where user initiated)
  source_tx_hash TEXT NOT NULL,
  source_chain_id INTEGER NOT NULL,
  source_block INTEGER NOT NULL,
  source_nonce INTEGER NOT NULL,
  
  -- Destination chain (where relay executes)
  dest_tx_hash TEXT,
  dest_chain_id INTEGER NOT NULL,
  
  -- Addresses
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  
  -- Amounts (stored as TEXT for precision, in wei)
  amount TEXT NOT NULL,
  fee TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Prevent duplicate entries
  UNIQUE(source_tx_hash, source_nonce)
);

-- Performance indexes
CREATE INDEX idx_bt_sender ON bridge_transactions(LOWER(sender));
CREATE INDEX idx_bt_recipient ON bridge_transactions(LOWER(recipient));
CREATE INDEX idx_bt_status ON bridge_transactions(status);
CREATE INDEX idx_bt_direction ON bridge_transactions(direction);
CREATE INDEX idx_bt_created ON bridge_transactions(created_at DESC);
CREATE INDEX idx_bt_source_hash ON bridge_transactions(source_tx_hash);
```

### View: `bridge_stats`

```sql
CREATE OR REPLACE VIEW bridge_stats AS
SELECT
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE direction = 'liteforge_to_sepolia') as total_locks,
  COUNT(*) FILTER (WHERE direction = 'sepolia_to_liteforge') as total_burns,
  COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
  COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
  COALESCE(SUM(CAST(amount AS NUMERIC)) FILTER (WHERE direction = 'liteforge_to_sepolia' AND status = 'completed'), 0) as total_locked_wei,
  COALESCE(SUM(CAST(amount AS NUMERIC)) FILTER (WHERE direction = 'sepolia_to_liteforge' AND status = 'completed'), 0) as total_burned_wei
FROM bridge_transactions;
```

### Row Level Security

```sql
-- Enable RLS
ALTER TABLE bridge_transactions ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can view explorer)
CREATE POLICY "Anyone can read transactions"
  ON bridge_transactions FOR SELECT
  USING (true);

-- Only authenticated service role can write (relayer uses service key)
CREATE POLICY "Service role can insert"
  ON bridge_transactions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update"
  ON bridge_transactions FOR UPDATE
  TO service_role
  USING (true);
```

---

## Relayer Implementation

### Install

```bash
cd relayer
npm install @supabase/supabase-js
```

### Environment Variables

Tambah di `relayer/.env`:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **PENTING**: Gunakan **Service Role Key** (bukan anon key) karena relayer perlu INSERT/UPDATE.

### File: `relayer/src/utils/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger.js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

let supabase = null

export function getSupabase() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase not configured - transactions will not be indexed')
      return null
    }
    supabase = createClient(supabaseUrl, supabaseKey)
    logger.info('Supabase client initialized')
  }
  return supabase
}

/**
 * Save a bridge transaction (insert or update)
 */
export async function saveBridgeTransaction(data) {
  const client = getSupabase()
  if (!client) return

  try {
    const { error } = await client
      .from('bridge_transactions')
      .upsert(data, { onConflict: 'source_tx_hash,source_nonce' })

    if (error) {
      logger.error(`Supabase upsert error: ${error.message}`)
    }
  } catch (err) {
    logger.error(`Supabase save error: ${err.message}`)
  }
}

/**
 * Update transaction status to completed
 */
export async function completeBridgeTransaction(sourceTxHash, sourceNonce, destTxHash) {
  const client = getSupabase()
  if (!client) return

  try {
    const { error } = await client
      .from('bridge_transactions')
      .update({
        dest_tx_hash: destTxHash,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('source_tx_hash', sourceTxHash)
      .eq('source_nonce', sourceNonce)

    if (error) {
      logger.error(`Supabase update error: ${error.message}`)
    }
  } catch (err) {
    logger.error(`Supabase update error: ${err.message}`)
  }
}
```

### Update Listeners

**`relayer/src/listeners/liteforgeListener.js`** — di `_handleLockedEvent()`:

```javascript
import { saveBridgeTransaction } from '../utils/supabase.js'

async _handleLockedEvent(event) {
  // ... existing code ...

  // Save to Supabase as pending
  await saveBridgeTransaction({
    direction: 'liteforge_to_sepolia',
    source_tx_hash: txHash,
    source_chain_id: 4441,
    source_block: blockNumber,
    source_nonce: Number(nonce),
    dest_chain_id: 11155111,
    sender: sender,
    recipient: recipient,
    amount: amount.toString(),
    fee: fee.toString(),
    status: 'pending',
  })

  // Queue mint operation (existing)
  this.txQueue.addTransaction({ ... })
}
```

**`relayer/src/listeners/sepoliaListener.js`** — di `_handleBurnedEvent()`:

```javascript
import { saveBridgeTransaction } from '../utils/supabase.js'

async _handleBurnedEvent(event) {
  // ... existing code ...

  // Save to Supabase as pending
  await saveBridgeTransaction({
    direction: 'sepolia_to_liteforge',
    source_tx_hash: txHash,
    source_chain_id: 11155111,
    source_block: blockNumber,
    source_nonce: Number(nonce),
    dest_chain_id: 4441,
    sender: sender,
    recipient: recipient,
    amount: amount.toString(),
    fee: fee.toString(),
    status: 'pending',
  })

  // Queue unlock operation (existing)
  this.txQueue.addTransaction({ ... })
}
```

### Update Executors

**`relayer/src/executors/mintExecutor.js`** — setelah mint confirmed:

```javascript
import { completeBridgeTransaction } from '../utils/supabase.js'

// After: this.txQueue.markCompleted(id, mintTx.hash)
await completeBridgeTransaction(source_tx_hash, source_nonce, mintTx.hash)
```

**`relayer/src/executors/unlockExecutor.js`** — setelah unlock confirmed:

```javascript
import { completeBridgeTransaction } from '../utils/supabase.js'

// After: this.txQueue.markCompleted(id, unlockTx.hash)
await completeBridgeTransaction(source_tx_hash, source_nonce, unlockTx.hash)
```

---

## Frontend Implementation

### Install

```bash
cd frontend
npm install @supabase/supabase-js
```

### Environment Variables

Buat `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **PENTING**: Gunakan **Anon Key** (bukan service key) karena ini public di browser.

### File: `frontend/src/config/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Replace: `frontend/src/hooks/useBridgeEvents.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export interface BridgeTransaction {
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

export interface BridgeStats {
  total_transactions: number
  total_locks: number
  total_burns: number
  total_completed: number
  total_pending: number
  total_locked_wei: number
  total_burned_wei: number
}

interface UseBridgeEventsOptions {
  filterAddress?: string
  direction?: 'liteforge_to_sepolia' | 'sepolia_to_liteforge'
  page?: number
  pageSize?: number
}

export function useBridgeEvents(options: UseBridgeEventsOptions = {}) {
  const { filterAddress, direction, page = 0, pageSize = 20 } = options

  return useQuery({
    queryKey: ['bridge-events', filterAddress, direction, page, pageSize],
    queryFn: async () => {
      // Build query
      let query = supabase
        .from('bridge_transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      // Filter by address (sender OR recipient)
      if (filterAddress) {
        query = query.or(
          `sender.ilike.${filterAddress},recipient.ilike.${filterAddress}`
        )
      }

      // Filter by direction
      if (direction) {
        query = query.eq('direction', direction)
      }

      const { data: transactions, error, count } = await query

      if (error) throw error

      // Get stats
      const { data: stats } = await supabase
        .from('bridge_stats')
        .select('*')
        .single()

      return {
        transactions: (transactions || []) as BridgeTransaction[],
        stats: (stats || {
          total_transactions: 0,
          total_locks: 0,
          total_burns: 0,
          total_completed: 0,
          total_pending: 0,
          total_locked_wei: 0,
          total_burned_wei: 0,
        }) as BridgeStats,
        totalCount: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      }
    },
    refetchInterval: 10000,
    staleTime: 5000,
  })
}
```

### Optional: Realtime Updates

```typescript
// hooks/useBridgeRealtime.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export function useBridgeRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('bridge-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bridge_transactions',
        },
        () => {
          // Invalidate cache → triggers refetch
          queryClient.invalidateQueries({ queryKey: ['bridge-events'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
```

Panggil di `App.tsx`:
```typescript
function App() {
  useBridgeRealtime()  // Enable realtime updates
  return (...)
}
```

---

## Migration Script

Script untuk migrate data yang sudah ada dari on-chain ke Supabase:

### File: `relayer/scripts/migrate-to-supabase.js`

```javascript
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { ethers } from 'ethers'
import BridgeVaultABI from '../src/abi/BridgeVault.json' with { type: 'json' }
import WrappedZkLTCABI from '../src/abi/WrappedZkLTC.json' with { type: 'json' }

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const lfProvider = new ethers.JsonRpcProvider(process.env.LITEFORGE_RPC_URL, { chainId: 4441 })
const sepProvider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, { chainId: 11155111 })

const vault = new ethers.Contract(process.env.BRIDGE_VAULT_ADDRESS, BridgeVaultABI, lfProvider)
const wzkltc = new ethers.Contract(process.env.WRAPPED_ZKLTC_ADDRESS, WrappedZkLTCABI, sepProvider)

async function migrate() {
  console.log('Fetching Locked events...')
  const lockedEvents = await vault.queryFilter(vault.filters.Locked())
  
  console.log(`Found ${lockedEvents.length} Locked events`)
  
  for (const event of lockedEvents) {
    const { sender, recipient, amount, fee, nonce } = event.args
    await supabase.from('bridge_transactions').upsert({
      direction: 'liteforge_to_sepolia',
      source_tx_hash: event.transactionHash,
      source_chain_id: 4441,
      source_block: event.blockNumber,
      source_nonce: Number(nonce),
      dest_chain_id: 11155111,
      sender: sender,
      recipient: recipient,
      amount: amount.toString(),
      fee: fee.toString(),
      status: 'completed',  // Assume completed if event exists
      completed_at: new Date().toISOString(),
    }, { onConflict: 'source_tx_hash,source_nonce' })
  }

  console.log('Fetching Burned events...')
  const burnedEvents = await wzkltc.queryFilter(wzkltc.filters.Burned())
  
  console.log(`Found ${burnedEvents.length} Burned events`)
  
  for (const event of burnedEvents) {
    const { sender, recipient, amount, fee, nonce } = event.args
    await supabase.from('bridge_transactions').upsert({
      direction: 'sepolia_to_liteforge',
      source_tx_hash: event.transactionHash,
      source_chain_id: 11155111,
      source_block: event.blockNumber,
      source_nonce: Number(nonce),
      dest_chain_id: 4441,
      sender: sender,
      recipient: recipient,
      amount: amount.toString(),
      fee: fee.toString(),
      status: 'completed',
      completed_at: new Date().toISOString(),
    }, { onConflict: 'source_tx_hash,source_nonce' })
  }

  console.log('Migration complete!')
}

migrate().catch(console.error)
```

Jalankan:
```bash
cd relayer
node scripts/migrate-to-supabase.js
```

---

## Checklist Implementasi

```
[ ] 1. Buat table bridge_transactions di Supabase Dashboard
[ ] 2. Buat view bridge_stats
[ ] 3. Setup RLS policies
[ ] 4. Install @supabase/supabase-js di relayer
[ ] 5. Tambah SUPABASE_URL dan SUPABASE_SERVICE_KEY di relayer/.env
[ ] 6. Buat relayer/src/utils/supabase.js
[ ] 7. Update liteforgeListener.js (save pending saat event detected)
[ ] 8. Update sepoliaListener.js (save pending saat event detected)
[ ] 9. Update mintExecutor.js (update completed setelah mint)
[ ] 10. Update unlockExecutor.js (update completed setelah unlock)
[ ] 11. Install @supabase/supabase-js di frontend
[ ] 12. Tambah VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di frontend/.env.local
[ ] 13. Buat frontend/src/config/supabase.ts
[ ] 14. Replace frontend/src/hooks/useBridgeEvents.ts
[ ] 15. Update HistoryTable dan ExplorerTable untuk format data baru
[ ] 16. (Optional) Tambah Supabase Realtime
[ ] 17. Jalankan migration script untuk data existing
[ ] 18. Test end-to-end
```

---

## Environment Variables Summary

### Relayer (`relayer/.env`)
```env
# ... existing vars ...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Service Role Key
```

### Frontend (`frontend/.env.local`)
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Anon Key (public)
```

> **Security Note**: 
> - Relayer menggunakan **Service Role Key** (bisa INSERT/UPDATE, JANGAN expose ke frontend)
> - Frontend menggunakan **Anon Key** (hanya bisa SELECT karena RLS)
