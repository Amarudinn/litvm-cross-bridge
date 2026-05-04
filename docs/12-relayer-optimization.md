# LitVM Bridge - Relayer Optimization

## Overview

Relayer dioptimasi dari **sequential execution** menjadi **parallel batch execution** dengan 2 teknik:

1. **Separate Queue** — MINT dan UNLOCK punya worker terpisah, jalan paralel
2. **Concurrency Limit** — Tiap worker bisa proses N transaksi sekaligus (default: 3)

## Perbandingan

### Sebelum (Sequential)

```
1 Queue (campur MINT + UNLOCK)
    │
    ▼
1 Worker (sequential)
    │
    ├── MINT #1  (15 detik)
    ├── UNLOCK #1 (10 detik)
    ├── MINT #2  (15 detik)
    └── UNLOCK #2 (10 detik)

Total: 50 detik untuk 4 transaksi
```

### Sesudah (Parallel Batch)

```
MINT Queue ──► MINT Worker (concurrency 3) ──► Sepolia
UNLOCK Queue ──► UNLOCK Worker (concurrency 3) ──► LiteForge

Waktu 0s:
  MINT Worker:   [MINT #1, MINT #2] → kirim bersamaan
  UNLOCK Worker: [UNLOCK #1, UNLOCK #2] → kirim bersamaan

Waktu 15s: Semua selesai

Total: ~15 detik untuk 4 transaksi (3x lebih cepat)
```

## Cara Kerja

### Separate Queue

Menggunakan **1 tabel SQLite yang sama**, hanya filter berdasarkan kolom `type`:

```sql
-- MINT queue
SELECT * FROM transactions WHERE type = 'MINT' AND status IN ('PENDING', 'RETRYING') LIMIT 3;

-- UNLOCK queue
SELECT * FROM transactions WHERE type = 'UNLOCK' AND status IN ('PENDING', 'RETRYING') LIMIT 3;
```

Tidak ada perubahan schema SQLite.

### Parallel Workers

2 worker loop yang jalan **independen** di `index.js`:

```
mintWorkerLoop()    → ambil MINT pending → executeBatch → sleep → ulangi
unlockWorkerLoop()  → ambil UNLOCK pending → executeBatch → sleep → ulangi
```

Error di satu worker **tidak mematikan** worker lain (masing-masing punya try/catch).

### Batch Execution dengan Nonce Management

Karena beberapa tx dikirim bersamaan ke 1 wallet, nonce harus di-assign manual:

```
1. Ambil base nonce dari wallet: getNonce('pending')
2. Assign nonce per tx:
   tx[0] → nonce + 0
   tx[1] → nonce + 1
   tx[2] → nonce + 2
3. Kirim semua bersamaan: Promise.allSettled([tx0, tx1, tx2])
4. Handle tiap result: markCompleted atau markFailed
```

### Retry Logic

Tidak berubah dari sebelumnya:
- Transaksi gagal → `markFailed()` → retry counter naik
- Setiap 30 detik, retry processor cek transaksi FAILED
- Exponential backoff: 10s → 20s → 40s → 80s → 160s
- Max 5 retries → status DEAD

Jika 1 dari 3 batch gagal, 2 lainnya tetap sukses. Yang gagal masuk retry queue.

## Konfigurasi

### Environment Variables

| Variable | Default | Keterangan |
|----------|---------|------------|
| `MINT_CONCURRENCY` | 3 | Max MINT tx paralel per batch |
| `UNLOCK_CONCURRENCY` | 3 | Max UNLOCK tx paralel per batch |

### Rollback

Jika ada masalah, set concurrency ke 1 → perilaku kembali sequential:

```env
MINT_CONCURRENCY=1
UNLOCK_CONCURRENCY=1
```

Restart relayer. Tidak perlu rollback kode.

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/config.js` | Tambah `mintConcurrency`, `unlockConcurrency` |
| `src/queue/txQueue.js` | Tambah `getPendingMint(limit)`, `getPendingUnlock(limit)` |
| `src/executors/mintExecutor.js` | Tambah `executeBatch()` dengan nonce management |
| `src/executors/unlockExecutor.js` | Tambah `executeBatch()` dengan nonce management |
| `src/index.js` | Ganti 1 `processQueue()` → 2 worker loop paralel |
| `.env.example` | Tambah `MINT_CONCURRENCY`, `UNLOCK_CONCURRENCY` |

## Log Output

Saat relayer start:
```
[info] [MINT Worker] Started (concurrency: 3)
[info] [UNLOCK Worker] Started (concurrency: 3)
[info] MINT concurrency: 3
[info] UNLOCK concurrency: 3
```

Saat batch diproses:
```
[info] [MINT Worker] Processing batch of 3 transactions (baseNonce: 141)
[info] Executing MINT {"id":11,"nonce":141}
[info] Executing MINT {"id":12,"nonce":142}
[info] Executing MINT {"id":13,"nonce":143}
[info] Mint CONFIRMED {"id":11}
[info] Mint CONFIRMED {"id":12}
[info] Mint CONFIRMED {"id":13}
```

## Throughput

| Skenario | Sebelum | Sesudah |
|----------|---------|---------|
| 1 MINT | ~15 detik | ~15 detik |
| 3 MINT | ~45 detik | ~15 detik |
| 3 MINT + 3 UNLOCK | ~75 detik | ~15 detik |
| 10 transaksi campur | ~130 detik | ~30 detik |
