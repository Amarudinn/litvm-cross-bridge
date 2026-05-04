# LitVM Bridge - Admin API

## Overview

Admin API adalah REST API yang berjalan di dalam relayer untuk menangani masalah operasional, terutama saat user melaporkan transaksi bridge yang tidak dikreditkan. Admin bisa memverifikasi, retry, dan inject transaksi yang terlewat — semua dari terminal atau Postman.

## Kenapa Dibutuhkan?

| Skenario | Tanpa Admin API | Dengan Admin API |
|----------|----------------|-----------------|
| User lock zkLTC tapi tidak dapat wzkLTC | SSH ke VPS, manual query SQLite, manual cek blockchain | `POST /admin/verify` → langsung tahu status |
| Transaksi stuck di FAILED/DEAD | SSH, manual UPDATE SQLite | `POST /admin/retry/:id` |
| Event terlewat (relayer restart/bug) | Tidak terdeteksi, user rugi | `POST /admin/inject` → inject ke queue |
| Cek health relayer | SSH, baca log file | `GET /admin/health` |

## Konfigurasi

### `.env`

```env
# Admin API
ADMIN_PORT=3001
ADMIN_API_KEY=your-random-secret-key
```

Generate API key yang aman:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Jika `ADMIN_API_KEY` tidak diset, admin API **tidak akan jalan** (disabled otomatis).

### Port

Default: `3001`. Pastikan port ini dibuka di firewall VPS:

```bash
# Ubuntu/ufw
sudo ufw allow 3001

# Atau di cloud provider: buka port 3001 di Security Group / Firewall rules
```

## Autentikasi

Semua endpoint `/admin/*` membutuhkan API key. Kirim via:

**Header (recommended):**
```
x-api-key: your-random-secret-key
```

**Atau query parameter:**
```
?key=your-random-secret-key
```

Response jika key salah/tidak ada:
```json
{ "error": "Unauthorized — invalid API key" }
```

## Endpoints

### 1. `GET /admin/health` — Cek Health Relayer

Menampilkan status lengkap relayer: balance, RPC aktif, queue stats, config.

**Request:**
```bash
curl http://VPS_IP:3001/admin/health \
  -H "x-api-key: YOUR_KEY"
```

**Response:**
```json
{
  "status": "running",
  "uptime": 3600,
  "balances": {
    "liteforge": "3.957 zkLTC",
    "sepolia": "0.0015 ETH"
  },
  "rpc": {
    "liteforge": { "active": "https://liteforge.rpc.caldera.xyz/http", "total": 1 },
    "sepolia": { "active": "https://ethereum-sepolia-rpc.publicnode.com", "total": 4 }
  },
  "queue": {
    "COMPLETED": 17,
    "PENDING": 0,
    "FAILED": 0,
    "DEAD": 0
  },
  "config": {
    "pollIntervalMs": 5000,
    "confirmationBlocks": 3,
    "maxRetries": 5,
    "mintConcurrency": 3,
    "unlockConcurrency": 3
  }
}
```

**Kapan pakai:** Cek rutin apakah relayer sehat — balance cukup, tidak ada FAILED/DEAD, RPC aktif.

---

### 2. `GET /admin/queue` — Lihat Semua Transaksi

**Request:**
```bash
# Semua transaksi (default limit 50)
curl http://VPS_IP:3001/admin/queue \
  -H "x-api-key: YOUR_KEY"

# Filter by status
curl "http://VPS_IP:3001/admin/queue?status=FAILED" \
  -H "x-api-key: YOUR_KEY"

# Custom limit
curl "http://VPS_IP:3001/admin/queue?status=DEAD&limit=10" \
  -H "x-api-key: YOUR_KEY"
```

**Response:**
```json
{
  "count": 2,
  "transactions": [
    {
      "id": 10,
      "type": "MINT",
      "status": "FAILED",
      "source_tx_hash": "0x7638...",
      "source_chain": "liteforge",
      "source_block": 4980000,
      "source_nonce": 8,
      "recipient": "0x484E...",
      "amount": "9970000000000000",
      "dest_tx_hash": null,
      "retries": 3,
      "error": "socket hang up",
      "created_at": "2026-05-04 15:30:00",
      "updated_at": "2026-05-04 15:35:00"
    }
  ]
}
```

**Filter values:** `PENDING`, `EXECUTING`, `COMPLETED`, `FAILED`, `RETRYING`, `DEAD`

---

### 3. `GET /admin/queue/:id` — Detail 1 Transaksi

**Request:**
```bash
curl http://VPS_IP:3001/admin/queue/10 \
  -H "x-api-key: YOUR_KEY"
```

**Response:** Object transaksi tunggal (sama seperti item di array `/admin/queue`).

---

### 4. `POST /admin/verify` — Verifikasi Tx User

Endpoint paling penting. User kasih tx hash, admin cek status di kedua chain.

**Request:**
```bash
# Verify lock transaction di LiteForge
curl -X POST http://VPS_IP:3001/admin/verify \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"txHash":"0xabc123...","chain":"liteforge"}'

# Verify burn transaction di Sepolia
curl -X POST http://VPS_IP:3001/admin/verify \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"txHash":"0xdef456...","chain":"sepolia"}'
```

**Response (contoh lock di LiteForge):**
```json
{
  "txHash": "0xabc123...",
  "chain": "liteforge",
  "steps": {
    "inQueue": true,
    "queueEntries": [{ "id": 10, "status": "FAILED", "..." }],
    "sourceReceipt": {
      "status": "success",
      "blockNumber": 4980000,
      "gasUsed": "78149"
    },
    "lockedEvent": {
      "sender": "0x484E...",
      "recipient": "0x484E...",
      "amount": "0.997",
      "fee": "0.003",
      "nonce": "8"
    },
    "mintedOnSepolia": false
  },
  "summary": "IN QUEUE — status: FAILED"
}
```

**Cara baca summary:**

| Summary | Artinya | Aksi |
|---------|---------|------|
| `COMPLETED — mint sudah diproses di Sepolia` | Sudah OK, user mungkin belum cek balance | Minta user cek balance wzkLTC di Sepolia |
| `IN QUEUE — status: PENDING` | Sedang diproses | Tunggu, relayer akan proses |
| `IN QUEUE — status: FAILED` | Gagal, akan auto-retry | Atau force retry: `POST /admin/retry/:id` |
| `IN QUEUE — status: DEAD` | Max retry tercapai | Force retry: `POST /admin/retry/:id` |
| `MISSED — lock valid tapi tidak ada di queue` | Event terlewat! | Inject: `POST /admin/inject` |

---

### 5. `POST /admin/retry/:id` — Force Retry Transaksi

Reset transaksi yang stuck/failed/dead ke RETRYING. Worker akan otomatis proses ulang.

**Request:**
```bash
curl -X POST http://VPS_IP:3001/admin/retry/10 \
  -H "x-api-key: YOUR_KEY"
```

**Response:**
```json
{
  "message": "Transaction #10 set to RETRYING",
  "tx": {
    "id": 10,
    "type": "MINT",
    "status": "RETRYING",
    "retries": 0,
    "..."
  }
}
```

**Catatan:** Replay protection on-chain mencegah double-processing. Jika mint/unlock ternyata sudah berhasil, worker akan detect via `isProcessed()` dan mark COMPLETED.

---

### 6. `POST /admin/inject` — Inject Transaksi yang Terlewat

Untuk transaksi yang valid di blockchain tapi tidak ada di queue relayer (event terlewat).

**Request:**
```bash
# Inject missed lock (LiteForge → Sepolia)
curl -X POST http://VPS_IP:3001/admin/inject \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"txHash":"0xabc123...","chain":"liteforge"}'

# Inject missed burn (Sepolia → LiteForge)
curl -X POST http://VPS_IP:3001/admin/inject \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"txHash":"0xdef456...","chain":"sepolia"}'
```

**Response:**
```json
{
  "message": "MINT transaction injected into queue",
  "event": {
    "sender": "0x484E...",
    "recipient": "0x484E...",
    "amount": "0.997",
    "fee": "0.003",
    "nonce": 8
  }
}
```

**Safety checks yang dilakukan sebelum inject:**

| Check | Gagal → |
|-------|---------|
| Tx receipt valid di source chain? | `400: Transaction not found or reverted` |
| Ada Locked/Burned event di logs? | `400: No Locked/Burned event found` |
| Sudah ada di queue? | `409: Transaction already in queue` |
| Sudah diproses on-chain? | `400: Already minted/unlocked — no action needed` |

Setelah inject berhasil:
1. Transaksi masuk ke SQLite queue (status: PENDING)
2. Transaksi masuk ke Supabase (status: pending)
3. Worker otomatis pick up dan execute mint/unlock

---

## Flow Penanganan Komplain User

```
User: "Saya lock 1 zkLTC, tx hash 0xabc..., belum dapat wzkLTC"
│
▼
Admin: POST /admin/verify { txHash: "0xabc...", chain: "liteforge" }
│
├── Summary: "COMPLETED" ──────────► Minta user cek balance di Sepolia
│                                     (mungkin belum import token wzkLTC di MetaMask)
│
├── Summary: "IN QUEUE — FAILED" ──► POST /admin/retry/:id
│                                     (worker akan proses ulang)
│
├── Summary: "IN QUEUE — DEAD" ────► POST /admin/retry/:id
│                                     (reset retries ke 0, coba lagi)
│
└── Summary: "MISSED" ─────────────► POST /admin/inject { txHash: "0xabc...", chain: "liteforge" }
                                      (inject ke queue, worker proses otomatis)
```

## Keamanan

### Yang Dilindungi

| Layer | Proteksi |
|-------|----------|
| API Key | Semua endpoint butuh `x-api-key` header |
| On-chain replay | `isProcessed()` check sebelum inject — tidak bisa double-mint |
| DB dedup | `UNIQUE(source_tx_hash, source_nonce)` — tidak bisa inject duplikat |
| Inject validation | Cek tx receipt + parse event — tidak bisa inject tx palsu |

### Rekomendasi Production

1. **Ganti API key** ke random string panjang (32+ karakter)
2. **Jangan expose port 3001 ke public** — gunakan VPN atau whitelist IP admin saja
3. **Atau** taruh di belakang reverse proxy (nginx) dengan HTTPS
4. **Log monitoring** — setiap aksi admin di-log oleh relayer

## File yang Terkait

| File | Fungsi |
|------|--------|
| `src/admin/adminApi.js` | Express server + semua endpoint |
| `src/config.js` | `adminPort`, `adminApiKey` |
| `src/index.js` | Start admin API saat relayer boot |
| `src/queue/txQueue.js` | Helper methods: `getTransactionByHash()`, `getAllTransactions()`, `forceRetry()` |
| `.env` | `ADMIN_PORT`, `ADMIN_API_KEY` |

## Log Output

### Startup
```
[info] [Admin API] Running on port 3001
```

### Jika API key tidak diset
```
[warn] [Admin API] ADMIN_API_KEY not set — admin API disabled
```

### Saat admin melakukan aksi
```
[info] [Admin] Force retry transaction {"id":10}
[info] [Admin] Injected MINT transaction {"txHash":"0xabc...","nonce":8}
```
