# LitVM Bridge - Supabase Integration

## Overview

Supabase digunakan sebagai **indexer/database** untuk menyimpan riwayat transaksi bridge. Relayer menyimpan setiap transaksi ke Supabase, frontend membaca dari Supabase (bukan dari blockchain langsung).

### Kenapa Supabase?

| Sebelum (getLogs) | Sesudah (Supabase) |
|---|---|
| Scan 50.000+ blocks via RPC | Query PostgreSQL |
| 3-10 detik per load | < 100ms per load |
| Makin lambat seiring waktu | Tetap cepat |
| Client-side pagination | Server-side pagination |
| Tidak bisa search | Bisa search by address |

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│  Blockchain │         │   Relayer    │         │   Supabase   │
│  (on-chain) │────────►│   (Node.js)  │────────►│  (PostgreSQL)│
│             │  events │              │  upsert │              │
└─────────────┘         └──────────────┘         └──────┬───────┘
                                                         │
                                                         │ query
                                                         ▼
                                                  ┌──────────────┐
                                                  │   Frontend   │
                                                  │   (React)    │
                                                  └──────────────┘
```

## Supabase Project

| Property | Value |
|----------|-------|
| URL | `https://szajobxpxllpgaoepqfh.supabase.co` |
| Anon Key | Untuk frontend (read-only) |
| Service Role Key | Untuk relayer (read/write) |

## Database Schema

### Table: `bridge_transactions`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | SERIAL | Auto increment |
| direction | TEXT | `liteforge_to_sepolia` / `sepolia_to_liteforge` |
| source_tx_hash | TEXT | TX hash di chain asal |
| source_chain_id | INTEGER | 4441 / 11155111 |
| source_block | INTEGER | Block number |
| source_nonce | INTEGER | Nonce dari event |
| dest_tx_hash | TEXT | TX hash di chain tujuan (null saat pending) |
| dest_chain_id | INTEGER | 11155111 / 4441 |
| sender | TEXT | Alamat pengirim |
| recipient | TEXT | Alamat penerima |
| amount | TEXT | Jumlah dalam wei |
| fee | TEXT | Fee dalam wei |
| status | TEXT | `pending` / `completed` / `failed` |
| created_at | TIMESTAMPTZ | Waktu event terdeteksi |
| completed_at | TIMESTAMPTZ | Waktu relay selesai |

**Constraint:** `UNIQUE(source_tx_hash, source_nonce)` — mencegah duplikasi.

### View: `bridge_stats`

| Field | Keterangan |
|-------|------------|
| total_transactions | Total semua transaksi |
| total_locks | Total lock (LF → Sepolia) |
| total_burns | Total burn (Sepolia → LF) |
| total_completed | Yang sudah selesai |
| total_pending | Yang masih diproses |
| total_locked_wei | Total zkLTC yang pernah di-lock |
| total_burned_wei | Total wzkLTC yang pernah di-burn |

### Row Level Security (RLS)

| Role | SELECT | INSERT | UPDATE |
|------|--------|--------|--------|
| anon (frontend) | ✅ | ❌ | ❌ |
| service_role (relayer) | ✅ | ✅ | ✅ |

## Data Flow

```
1. User lock zkLTC di LiteForge
2. Relayer detect Locked event
   → INSERT ke Supabase (status: pending)
   → INSERT ke SQLite queue (untuk processing)
3. Relayer execute mint di Sepolia
   → UPDATE Supabase (status: completed, dest_tx_hash terisi)
4. Frontend query Supabase → data muncul instant
```

## File yang Terkait

### Relayer
| File | Fungsi |
|------|--------|
| `src/utils/supabase.js` | Supabase client + helper functions |
| `src/listeners/liteforgeListener.js` | Save pending saat Locked event |
| `src/listeners/sepoliaListener.js` | Save pending saat Burned event |
| `src/executors/mintExecutor.js` | Update completed setelah mint |
| `src/executors/unlockExecutor.js` | Update completed setelah unlock |
| `.env` | SUPABASE_URL + SUPABASE_SERVICE_KEY |

### Frontend
| File | Fungsi |
|------|--------|
| `src/config/supabase.ts` | Supabase client (anon key) |
| `src/hooks/useBridgeEvents.ts` | Query dari Supabase (bukan getLogs) |
| `.env.local` | VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY |

## SQL Schema

File: `supabase-schema.sql` (di root project)

Jalankan di Supabase Dashboard → SQL Editor jika perlu setup ulang.

## Graceful Degradation

Jika `SUPABASE_URL` tidak diset di relayer `.env`:
- Relayer tetap jalan normal (hanya SQLite)
- `getSupabase()` return null → semua save/update di-skip
- Tidak ada crash atau error
