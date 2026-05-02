# LitVM Bridge - Relayer Service

## Overview

Relayer adalah Node.js service yang menjembatani kedua chain. Tugasnya:
1. **Listen** event di kedua chain (Locked di LiteForge, Burned di Sepolia)
2. **Queue** transaksi yang perlu dieksekusi
3. **Execute** operasi cross-chain (mint di Sepolia, unlock di LiteForge)
4. **Retry** transaksi yang gagal dengan exponential backoff

## Setup & Running

### Prerequisites

- Node.js >= 18.0.0
- npm
- Contracts sudah di-deploy
- Relayer wallet punya balance di kedua chain (untuk gas)

### Installation

```bash
cd relayer
npm install
```

### Configuration

Copy `.env.example` ke `.env` dan isi:

```env
# Relayer private key (harus punya ETH di kedua chain untuk gas)
RELAYER_PRIVATE_KEY=0x...

# RPC URLs
LITEFORGE_RPC_URL=https://liteforge.rpc.caldera.xyz/http
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Contract addresses
BRIDGE_VAULT_ADDRESS=0x6Bb77c1f465a18Bd16686330173B32821E59FD12
WRAPPED_ZKLTC_ADDRESS=0x4320BB234A76f94F9eeDD0E81968668C6d29c39f

# Chain configs
LITEFORGE_CHAIN_ID=4441
SEPOLIA_CHAIN_ID=11155111

# Relayer settings
POLL_INTERVAL_MS=5000        # Poll setiap 5 detik
CONFIRMATION_BLOCKS=3        # Tunggu 3 block sebelum execute
MAX_RETRIES=5                # Max retry sebelum DEAD
```

### Running

```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

### Output saat startup

```
╔═══════════════════════════════════════════╗
║         LitVM Bridge Relayer              ║
║   LiteForge (zkLTC) ↔ Sepolia (wzkLTC)   ║
╚═══════════════════════════════════════════╝

2026-05-02 20:41:01 [info] Configuration validated
2026-05-02 20:41:01 [info] Provider connected: LiteForge (chainId: 4441)
2026-05-02 20:41:01 [info] Relayer wallet (LiteForge): 0x484E0cAA...
2026-05-02 20:41:01 [info] Provider connected: Sepolia (chainId: 11155111)
2026-05-02 20:41:01 [info] Relayer wallet (Sepolia): 0x484E0cAA...
2026-05-02 20:41:02 [info] Relayer balance - LiteForge: 5.097 zkLTC, Sepolia: 0.00176 ETH
2026-05-02 20:41:02 [info] Database initialized
2026-05-02 20:41:02 [info] Starting event listeners...
2026-05-02 20:41:02 [info] LiteForge listener starting from current block: 4395591
2026-05-02 20:41:02 [info] Sepolia listener starting from current block: 10775531
2026-05-02 20:41:02 [info] Relayer is running!
```

## Component Details

### Listeners

**LiteForge Listener** (`src/listeners/liteforgeListener.js`)
- Polls BridgeVault contract untuk `Locked` events
- Scans blocks in chunks of 1000 (untuk catching up)
- Saves block checkpoint ke SQLite (resume setelah restart)
- Queues `MINT` transactions

**Sepolia Listener** (`src/listeners/sepoliaListener.js`)
- Polls WrappedZkLTC contract untuk `Burned` events
- Same polling mechanism as LiteForge listener
- Queues `UNLOCK` transactions

### Transaction Queue

**SQLite Database** (`src/queue/txQueue.js`)

Schema:
```sql
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,              -- 'MINT' or 'UNLOCK'
  status TEXT NOT NULL,            -- PENDING/EXECUTING/COMPLETED/FAILED/RETRYING/DEAD
  source_tx_hash TEXT NOT NULL,    -- TX hash dari source chain
  source_chain TEXT NOT NULL,      -- 'liteforge' or 'sepolia'
  source_block INTEGER NOT NULL,   -- Block number di source chain
  source_nonce INTEGER NOT NULL,   -- Nonce dari event
  recipient TEXT NOT NULL,         -- Destination address
  amount TEXT NOT NULL,            -- Amount (in wei string)
  dest_tx_hash TEXT,               -- TX hash di destination chain
  retries INTEGER DEFAULT 0,       -- Retry counter
  error TEXT,                      -- Last error message
  created_at TEXT,
  updated_at TEXT,
  UNIQUE(source_tx_hash, source_nonce)  -- Dedup
);

CREATE TABLE checkpoints (
  chain TEXT PRIMARY KEY,          -- 'liteforge' or 'sepolia'
  block_number INTEGER NOT NULL,   -- Last processed block
  updated_at TEXT
);
```

### Executors

**Mint Executor** (`src/executors/mintExecutor.js`)
- Pre-flight: Check `isProcessed()` on-chain (avoid wasted gas)
- Execute: Call `mint()` on WrappedZkLTC (Sepolia)
- Wait for 1 confirmation
- Mark completed or failed in queue

**Unlock Executor** (`src/executors/unlockExecutor.js`)
- Pre-flight: Check `isProcessed()` on-chain
- Pre-flight: Check `availableBalance()` (vault has enough zkLTC)
- Execute: Call `unlock()` on BridgeVault (LiteForge)
- Wait for 1 confirmation
- Mark completed or failed in queue

### Retry Logic

```
Attempt 1: Immediate
Attempt 2: Wait 10 seconds
Attempt 3: Wait 20 seconds
Attempt 4: Wait 40 seconds
Attempt 5: Wait 80 seconds
Attempt 6: DEAD (manual intervention needed)
```

Retry processor runs every 30 seconds, checks `updated_at` timestamp against backoff duration.

## Monitoring

### Log Files

- Console output: colored, real-time
- File: `data/relayer.log` (max 10MB, 5 rotated files)

### Queue Stats

Logged every 60 seconds:
```
2026-05-02 20:45:02 [info] Queue stats {"COMPLETED":2}
```

### Health Indicators

| Indicator | Healthy | Unhealthy |
|-----------|---------|-----------|
| Listeners | Polling without errors | Repeated "socket hang up" errors |
| Queue | COMPLETED growing, no DEAD | DEAD transactions accumulating |
| Balance | Sufficient for gas | Near zero on either chain |
| Vault | Available balance > 0 | Available balance = 0 (can't unlock) |

## Troubleshooting

### Common Issues

**"insufficient funds for intrinsic transaction cost"**
- Relayer wallet doesn't have enough gas on destination chain
- Solution: Send ETH/zkLTC to relayer address

**"Insufficient vault balance"**
- BridgeVault doesn't have enough zkLTC to unlock
- Solution: Send zkLTC to BridgeVault contract address

**"socket hang up" / "connection error"**
- RPC endpoint temporarily unavailable
- Relayer auto-retries with 3x poll interval delay
- Usually resolves itself

**Transaction stuck in DEAD state**
- Max retries exceeded
- Check error message in database
- Fix the issue, then manually update status to RETRYING:
  ```sql
  UPDATE transactions SET status = 'RETRYING', retries = 0 WHERE id = ?;
  ```

### Database Inspection

```bash
# Open SQLite database
sqlite3 data/relayer.db

# Check all transactions
SELECT * FROM transactions;

# Check pending/failed
SELECT * FROM transactions WHERE status IN ('PENDING', 'FAILED', 'DEAD');

# Check checkpoints
SELECT * FROM checkpoints;

# Reset a dead transaction for retry
UPDATE transactions SET status = 'RETRYING', retries = 0 WHERE id = 1;
```
