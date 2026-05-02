# LitVM Bridge - Supabase Integration Tasks

## Kenapa Supabase?

Frontend saat ini mengambil data transaksi langsung dari blockchain via `getLogs()` RPC call. Ini lambat karena:
- RPC punya limit block range (50000 blocks per request)
- Harus scan chunks berulang-ulang setiap page load
- Makin banyak transaksi = makin lambat
- Tidak bisa pagination server-side

Dengan Supabase:
- Relayer simpan setiap transaksi ke database setelah selesai
- Frontend query dari Supabase API (instant, <100ms)
- Pagination, search, filter semua server-side
- Bisa pakai Supabase Realtime untuk live updates

## Tasks

### Task 1: Setup Supabase Schema

Buat table `bridge_transactions` di Supabase:

```sql
CREATE TABLE bridge_transactions (
  id SERIAL PRIMARY KEY,
  
  -- Direction
  direction TEXT NOT NULL CHECK (direction IN ('liteforge_to_sepolia', 'sepolia_to_liteforge')),
  
  -- Source chain info
  source_tx_hash TEXT NOT NULL,
  source_chain_id INTEGER NOT NULL,
  source_block INTEGER NOT NULL,
  source_nonce INTEGER NOT NULL,
  
  -- Destination chain info
  dest_tx_hash TEXT,
  dest_chain_id INTEGER NOT NULL,
  
  -- Addresses
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  
  -- Amounts (stored as TEXT to preserve precision)
  amount TEXT NOT NULL,
  fee TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Unique constraint
  UNIQUE(source_tx_hash, source_nonce)
);

-- Indexes for fast queries
CREATE INDEX idx_bt_sender ON bridge_transactions(sender);
CREATE INDEX idx_bt_recipient ON bridge_transactions(recipient);
CREATE INDEX idx_bt_status ON bridge_transactions(status);
CREATE INDEX idx_bt_direction ON bridge_transactions(direction);
CREATE INDEX idx_bt_created ON bridge_transactions(created_at DESC);
```

Buat table `bridge_stats` untuk aggregate stats (optional, bisa pakai view):

```sql
CREATE VIEW bridge_stats AS
SELECT
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE direction = 'liteforge_to_sepolia') as total_locks,
  COUNT(*) FILTER (WHERE direction = 'sepolia_to_liteforge') as total_burns,
  COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
  COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
  COALESCE(SUM(CAST(amount AS NUMERIC)) FILTER (WHERE direction = 'liteforge_to_sepolia'), 0) as total_locked_amount,
  COALESCE(SUM(CAST(amount AS NUMERIC)) FILTER (WHERE direction = 'sepolia_to_liteforge'), 0) as total_burned_amount
FROM bridge_transactions;
```

### Task 2: Setup Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE bridge_transactions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public explorer)
CREATE POLICY "Public read access"
  ON bridge_transactions FOR SELECT
  USING (true);

-- Only service role can insert/update (relayer)
CREATE POLICY "Service role insert"
  ON bridge_transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role update"
  ON bridge_transactions FOR UPDATE
  USING (true);
```

### Task 3: Update Relayer - Supabase Client

Install Supabase client di relayer:

```bash
cd relayer
npm install @supabase/supabase-js
```

Tambah env variables di `relayer/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Service role key (bukan anon key)
```

Buat file `relayer/src/utils/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js'
import { config } from '../config.js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
```

### Task 4: Update Relayer - Save Transactions

Update `mintExecutor.js` dan `unlockExecutor.js` untuk save ke Supabase setelah transaksi selesai.

**mintExecutor.js** - Setelah mint confirmed:
```javascript
// Save to Supabase
await supabase.from('bridge_transactions').upsert({
  direction: 'liteforge_to_sepolia',
  source_tx_hash: tx.source_tx_hash,
  source_chain_id: 4441,
  source_block: tx.source_block,
  source_nonce: tx.source_nonce,
  dest_tx_hash: mintTx.hash,
  dest_chain_id: 11155111,
  sender: tx.sender || tx.recipient,
  recipient: tx.recipient,
  amount: tx.amount,
  fee: tx.fee || '0',
  status: 'completed',
  completed_at: new Date().toISOString(),
}, { onConflict: 'source_tx_hash,source_nonce' })
```

**unlockExecutor.js** - Setelah unlock confirmed:
```javascript
// Save to Supabase
await supabase.from('bridge_transactions').upsert({
  direction: 'sepolia_to_liteforge',
  source_tx_hash: tx.source_tx_hash,
  source_chain_id: 11155111,
  source_block: tx.source_block,
  source_nonce: tx.source_nonce,
  dest_tx_hash: unlockTx.hash,
  dest_chain_id: 4441,
  sender: tx.sender || tx.recipient,
  recipient: tx.recipient,
  amount: tx.amount,
  fee: tx.fee || '0',
  status: 'completed',
  completed_at: new Date().toISOString(),
}, { onConflict: 'source_tx_hash,source_nonce' })
```

**Listeners** - Saat event detected, save sebagai pending:
```javascript
// liteforgeListener.js - saat Locked event detected
await supabase.from('bridge_transactions').upsert({
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
}, { onConflict: 'source_tx_hash,source_nonce' })
```

### Task 5: Update Frontend - Supabase Client

Install Supabase client di frontend:

```bash
cd frontend
npm install @supabase/supabase-js
```

Buat file `frontend/src/config/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY  // Anon key (bukan service key!)
)
```

Tambah env di `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Anon key (public, safe for frontend)
```

### Task 6: Update Frontend - Replace getLogs with Supabase

Replace `useBridgeEvents` hook:

```typescript
// hooks/useBridgeEvents.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export function useBridgeEvents(filterAddress?: string) {
  return useQuery({
    queryKey: ['bridge-events', filterAddress],
    queryFn: async () => {
      let query = supabase
        .from('bridge_transactions')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterAddress) {
        query = query.or(`sender.ilike.${filterAddress},recipient.ilike.${filterAddress}`)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error

      // Get stats
      const { data: stats } = await supabase
        .from('bridge_stats')
        .select('*')
        .single()

      return {
        transactions: data || [],
        stats: stats || {
          total_transactions: 0,
          total_locks: 0,
          total_burns: 0,
          total_locked_amount: 0,
          total_burned_amount: 0,
        },
      }
    },
    refetchInterval: 10000,  // Refresh setiap 10 detik
  })
}
```

### Task 7: Frontend - Paginated Explorer

Update ExplorerTable untuk server-side pagination:

```typescript
// Fetch page dari Supabase
const { data } = await supabase
  .from('bridge_transactions')
  .select('*', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(page * pageSize, (page + 1) * pageSize - 1)

// data.count = total rows (untuk pagination)
```

### Task 8: Frontend - Supabase Realtime (Optional)

Subscribe ke real-time updates:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('bridge-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bridge_transactions',
    }, (payload) => {
      // Refetch data saat ada perubahan
      queryClient.invalidateQueries({ queryKey: ['bridge-events'] })
    })
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [])
```

### Task 9: Migrate Existing Data

Script untuk migrate transaksi yang sudah ada dari on-chain ke Supabase:

```javascript
// scripts/migrate-to-supabase.js
// Scan semua events dari blockchain dan insert ke Supabase
// Jalankan sekali saja setelah setup
```

---

## Task Summary

| # | Task | Component | Estimasi |
|---|------|-----------|----------|
| 1 | Setup Supabase schema | Supabase Dashboard | 10 menit |
| 2 | Setup RLS policies | Supabase Dashboard | 5 menit |
| 3 | Relayer: Supabase client | relayer/ | 10 menit |
| 4 | Relayer: Save transactions | relayer/ | 30 menit |
| 5 | Frontend: Supabase client | frontend/ | 10 menit |
| 6 | Frontend: Replace getLogs | frontend/ | 30 menit |
| 7 | Frontend: Paginated explorer | frontend/ | 20 menit |
| 8 | Frontend: Realtime updates | frontend/ | 15 menit |
| 9 | Migrate existing data | scripts/ | 20 menit |

**Total estimasi: ~2.5 jam**
