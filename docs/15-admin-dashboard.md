# LitVM Bridge - Admin Dashboard (Frontend)

## Overview

Admin Dashboard adalah halaman web di frontend (`/admin`) yang terhubung ke Admin API di relayer. Memungkinkan admin mengelola bridge tanpa perlu akses terminal/SSH.

**URL**: `http://localhost:5173/admin` (development) atau domain production

## Arsitektur

```
┌──────────────────────────────────────────────────────┐
│                  Admin Dashboard                      │
│                  (React Frontend)                     │
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │Health Panel│  │Verify Form │  │Inject Form │    │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │
│        │                │                │           │
│  ┌─────┴────────────────┴────────────────┴─────┐    │
│  │              useAdminApi.ts                   │    │
│  │         (TanStack Query hooks)               │    │
│  └─────────────────────┬───────────────────────┘    │
│                        │                             │
│  ┌─────────────────────┴───────────────────────┐    │
│  │              admin.ts (config)               │    │
│  │    fetch + x-api-key header + extractTxHash  │    │
│  └─────────────────────┬───────────────────────┘    │
└────────────────────────┼─────────────────────────────┘
                         │ HTTP (port 3001)
                         ▼
┌──────────────────────────────────────────────────────┐
│                  Admin API                            │
│              (Express di Relayer VPS)                 │
│                                                      │
│  GET /admin/health    POST /admin/verify             │
│  GET /admin/queue     POST /admin/retry/:id          │
│  GET /admin/queue/:id POST /admin/inject             │
└──────────────────────────────────────────────────────┘
```

## Konfigurasi

### Frontend `.env.local`

```env
VITE_ADMIN_API_URL=http://217.216.59.121:3001
VITE_ADMIN_API_KEY=your-secret-api-key
```

### Relayer `.env`

```env
ADMIN_PORT=3001
ADMIN_API_KEY=your-secret-api-key
```

Kedua key harus sama. Jika key salah, semua request akan return `401 Unauthorized`.

## Komponen Dashboard

### 1. Health Panel

**Lokasi**: Bagian atas halaman
**Auto-refresh**: Setiap 10 detik
**Endpoint**: `GET /admin/health`

Menampilkan 4 card:

| Card | Informasi | Warna Icon |
|------|-----------|-----------|
| Status | Running/stopped + uptime | Hijau |
| Balances | zkLTC di LiteForge + ETH di Sepolia | Biru |
| RPC Endpoints | Jumlah RPC per chain | Ungu |
| Queue Total | Total transaksi + breakdown per status | Orange |

**Cara baca:**
- Status `running` + badge hijau = relayer aktif
- Balance rendah = perlu top-up (gas bisa habis)
- Queue ada FAILED/DEAD = ada masalah yang perlu ditangani

---

### 2. Verify Transaction

**Lokasi**: Kiri (desktop) / atas (mobile)
**Endpoint**: `POST /admin/verify`
**Fungsi**: Cek status transaksi user di kedua chain

**Cara pakai:**
1. Pilih chain asal (LiteForge untuk lock, Sepolia untuk burn)
2. Paste tx hash atau full explorer URL
3. Klik "Verify"

**Input yang diterima:**
- Raw tx hash: `0x3b17e3b8d428e6bb656cfe31160e817282b97cb491d0773ee410a5d416630bea`
- Explorer URL: `https://liteforge.explorer.caldera.xyz/tx/0x3b17e3...` (otomatis extract hash)
- Etherscan URL: `https://sepolia.etherscan.io/tx/0xabc...` (otomatis extract hash)

**Hasil yang ditampilkan:**

| Field | Keterangan |
|-------|-----------|
| Summary | Status ringkas: COMPLETED / IN QUEUE / MISSED |
| Source Tx | Apakah tx valid di source chain (success/reverted/not found) |
| Locked/Burned Event | Detail event: amount, fee, nonce |
| In Queue | Apakah ada di relayer queue + status-nya |
| Minted/Unlocked | Apakah sudah diproses di destination chain |

**Warna summary:**
- Hijau (COMPLETED): Sudah selesai, user mungkin belum cek balance
- Kuning (IN QUEUE): Sedang diproses atau menunggu retry
- Merah (MISSED): Event terlewat, perlu inject manual

---

### 3. Inject Transaction

**Lokasi**: Kanan (desktop) / bawah verify (mobile)
**Endpoint**: `POST /admin/inject`
**Fungsi**: Masukkan transaksi yang terlewat ke queue relayer

**Kapan dipakai:**
- Setelah verify menunjukkan status "MISSED"
- Transaksi valid di blockchain tapi tidak ada di queue relayer

**Cara pakai:**
1. Pilih chain asal (sama seperti verify)
2. Paste tx hash atau explorer URL
3. Klik "Inject" (tombol merah — destructive action)

**Safety checks otomatis:**
- Cek tx receipt valid di source chain
- Cek ada Locked/Burned event di logs
- Cek belum ada di queue (tolak jika duplikat)
- Cek belum diproses on-chain (tolak jika sudah mint/unlock)

**Setelah inject berhasil:**
1. Transaksi masuk ke SQLite queue (status: PENDING)
2. Transaksi masuk ke Supabase (status: pending)
3. Worker otomatis pick up dan execute mint/unlock
4. Biasanya selesai dalam 15-30 detik

---

### 4. Transaction Queue

**Lokasi**: Full-width di bawah
**Auto-refresh**: Setiap 10 detik
**Endpoint**: `GET /admin/queue`
**Fungsi**: Lihat semua transaksi di queue + retry yang gagal

**Filter tabs:**
- All — semua transaksi
- Pending — menunggu diproses
- Executing — sedang dieksekusi
- Completed — berhasil
- Failed — gagal (akan auto-retry)
- Dead — max retry tercapai (perlu manual)

**Informasi per transaksi:**

| Field | Keterangan |
|-------|-----------|
| ID | Nomor urut di database |
| Type | MINT atau UNLOCK |
| Amount | Jumlah token |
| Status | Badge warna sesuai status |
| Retries | Berapa kali sudah retry |
| Source Tx | Link ke explorer |
| Action | Tombol Retry |

**Tombol Retry:**
- Muncul di semua status kecuali COMPLETED
- Reset retries ke 0, set status ke RETRYING
- Worker otomatis proses ulang
- Aman dari double-processing (replay protection on-chain)

**Tampilan:**
- Desktop: Table dengan 7 kolom
- Mobile: Card per transaksi (responsive)

---

## Flow Penanganan Komplain User

```
┌─────────────────────────────────────────────────────────┐
│ User: "Saya lock 1 zkLTC, belum dapat wzkLTC"          │
│ Bukti: tx hash 0xabc... di LiteForge                   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Admin: Buka /admin → Verify Transaction                 │
│ Chain: LiteForge                                        │
│ Input: 0xabc... (atau paste explorer URL)               │
│ Klik: Verify                                            │
└─────────────────���──────┬────────────────────────────────┘
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         COMPLETED    IN QUEUE    MISSED
              │          │          │
              ▼          ▼          ▼
         "Sudah OK,   Cek status:  Buka Inject
          minta user  - FAILED →   Transaction
          cek balance   klik Retry  Paste hash
          wzkLTC di   - DEAD →     Klik Inject
          Sepolia"      klik Retry  → Worker proses
                      - PENDING →    otomatis
                        tunggu
```

## File yang Terkait

### Frontend

| File | Fungsi |
|------|--------|
| `src/config/admin.ts` | Config (URL, key) + `adminFetch()` + `extractTxHash()` |
| `src/hooks/useAdminApi.ts` | TanStack Query hooks: health, queue, verify, retry, inject |
| `src/pages/AdminPage.tsx` | Halaman utama `/admin` |
| `src/components/admin/HealthPanel.tsx` | 4 health cards |
| `src/components/admin/QueueTable.tsx` | Table + filter + retry button |
| `src/components/admin/VerifyForm.tsx` | Form verify + result display |
| `src/components/admin/InjectForm.tsx` | Form inject |
| `.env.local` | `VITE_ADMIN_API_URL`, `VITE_ADMIN_API_KEY` |

### Relayer (Backend)

| File | Fungsi |
|------|--------|
| `src/admin/adminApi.js` | Express server + 6 endpoints + CORS |
| `src/config.js` | `adminPort`, `adminApiKey` |
| `src/index.js` | Start admin API |
| `src/queue/txQueue.js` | Helper: `getTransactionByHash()`, `getAllTransactions()`, `forceRetry()` |
| `.env` | `ADMIN_PORT`, `ADMIN_API_KEY` |

## Keamanan

| Layer | Proteksi |
|-------|----------|
| API Key | Header `x-api-key` wajib di setiap request |
| CORS | `Access-Control-Allow-Origin: *` (bisa di-restrict ke domain tertentu) |
| On-chain replay | `isProcessed()` mencegah double mint/unlock |
| DB dedup | `UNIQUE(source_tx_hash, source_nonce)` mencegah inject duplikat |
| Input sanitasi | `extractTxHash()` handle URL dan raw hash |

### Rekomendasi Production

1. Ganti `Access-Control-Allow-Origin: *` ke domain frontend spesifik
2. Gunakan HTTPS (reverse proxy nginx + SSL)
3. Whitelist IP admin di firewall
4. Ganti API key secara berkala
5. Jangan expose halaman `/admin` ke user biasa (bisa hide dari nav untuk production)

## Troubleshooting

### "Failed to connect to Admin API"

- Cek relayer berjalan di VPS
- Cek port 3001 terbuka di firewall
- Cek `VITE_ADMIN_API_URL` benar (termasuk `http://`)
- Cek `VITE_ADMIN_API_KEY` sama dengan `ADMIN_API_KEY` di relayer

### CORS error di browser console

- Pastikan `adminApi.js` di VPS sudah versi terbaru (dengan CORS middleware)
- Restart relayer setelah update

### Verify menunjukkan "Not found"

- Pastikan chain yang dipilih benar (LiteForge untuk lock, Sepolia untuk burn)
- Pastikan tx hash valid (66 karakter, dimulai `0x`)
- Cek apakah RPC endpoint aktif (lihat Health Panel → RPC)

### Inject gagal "Already in queue"

- Transaksi sudah ada di queue — gunakan Retry di Queue Table
- Cek status di Queue Table, filter by hash

### Inject gagal "Already minted/unlocked"

- Transaksi sudah berhasil diproses on-chain
- User mungkin belum cek balance — minta refresh wallet
