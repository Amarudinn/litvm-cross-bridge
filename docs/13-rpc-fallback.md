# LitVM Bridge - RPC Fallback Rotation

## Overview

Relayer sekarang mendukung **multiple RPC endpoints** per chain dengan mekanisme **fallback rotation**. Jika RPC utama error (timeout, disconnect, socket hang up), relayer otomatis switch ke RPC berikutnya tanpa downtime.

## Masalah Sebelumnya

```
Sebelum (1 RPC per chain):

  Relayer → publicnode.com ── socket hang up ── STUCK
                                                 │
                                                 ▼
                                          tx.wait() hang selamanya
                                          status: EXECUTING (stuck)
                                          worker blocked
```

Dengan hanya 1 RPC:
- Jika RPC down → listener berhenti polling
- Jika RPC disconnect saat `tx.wait()` → transaksi stuck di status EXECUTING selamanya
- Worker blocked, tidak bisa proses transaksi baru

## Solusi: Fallback Rotation

```
Sesudah (Multi RPC dengan fallback):

  Relayer → publicnode.com ── ERROR
            ↓ rotate
          → rpc.sepolia.org ── ERROR
            ↓ rotate
          → sepolia.drpc.org ── SUCCESS ✅
            (tetap pakai drpc.org untuk request berikutnya)
```

### Strategi: Fallback (bukan Round-Robin)

| Strategi | Cara Kerja |
|----------|-----------|
| **Fallback** (yang dipakai) | Selalu pakai RPC aktif, rotate hanya saat error |
| Round-robin | Giliran setiap request — lebih complex, tidak perlu untuk traffic rendah |

Fallback dipilih karena:
- Simple dan predictable
- Hemat rate limit (tidak spam semua RPC)
- Cocok untuk relayer dengan traffic rendah-menengah

## Konfigurasi

### `.env`

```env
# Multi RPC (comma-separated, urutan = prioritas)
LITEFORGE_RPC_URLS=https://liteforge.rpc.caldera.xyz/http
SEPOLIA_RPC_URLS=https://ethereum-sepolia-rpc.publicnode.com,https://rpc.sepolia.org,https://sepolia.drpc.org,https://1rpc.io/sepolia
```

- Pisahkan URL dengan koma (tanpa spasi)
- Urutan = prioritas (RPC pertama selalu dicoba duluan)
- LiteForge hanya punya 1 RPC (Caldera), Sepolia punya banyak public RPC

### Backward Compatibility

Variabel lama (`LITEFORGE_RPC_URL`, `SEPOLIA_RPC_URL`) masih didukung sebagai fallback jika variabel baru tidak diset.

## Arsitektur

### FallbackRpcProvider Class

```
FallbackRpcProvider
├── chainName: string          # "LiteForge" / "Sepolia"
├── chainId: number            # 4441 / 11155111
├── rpcUrls: string[]          # List of RPC URLs
├── currentIndex: number       # Index RPC yang aktif
├── providers: Provider[]      # Ethers.js provider per URL
│
├── getProvider()              # Return provider aktif
├── getCurrentUrl()            # Return URL aktif
├── rotate()                   # Switch ke RPC berikutnya
└── withFallback(operation)    # Execute dengan auto-rotation on error
```

### withFallback() Flow

```
withFallback(operation):
│
├── Coba operation dengan provider aktif
│   ├── SUCCESS → return result
│   └── ERROR
│       ├── RPC error? (socket hang up, timeout, dll)
│       │   ├── Ya → rotate() → coba provider berikutnya
│       │   └── Tidak (revert, insufficient funds) → throw langsung
│       │
│       └── Sudah coba semua RPC?
│           ├── Belum → loop ke provider berikutnya
│           └── Sudah → throw last error
```

### Error yang Trigger Rotation

| Error | Rotate? |
|-------|---------|
| `socket hang up` | Ya |
| `ECONNREFUSED` | Ya |
| `ETIMEDOUT` | Ya |
| `ENOTFOUND` | Ya |
| `network error` | Ya |
| `missing response` | Ya |
| `connection error` | Ya |
| `server error` | Ya |
| `bad response` | Ya |
| `timeout` | Ya |
| `NETWORK_ERROR` (code) | Ya |
| `SERVER_ERROR` (code) | Ya |
| `TIMEOUT` (code) | Ya |
| `insufficient funds` | Tidak (contract error) |
| `execution reverted` | Tidak (contract error) |
| `nonce too low` | Tidak (logic error) |

## Integrasi dengan Komponen Relayer

### Listeners (Polling)

```
Sebelum:
  constructor() {
    this.provider = getSepoliaProvider();  // cached sekali
  }
  _poll() {
    await this.provider.getBlockNumber();  // stuck jika RPC mati
  }

Sesudah:
  constructor() {
    this.rpc = getSepoliaRpc();  // FallbackRpcProvider instance
  }
  _poll() {
    await this.rpc.withFallback(p => p.getBlockNumber());  // auto-rotate
  }
```

Listener sekarang:
- Ambil fresh provider setiap poll cycle
- `queryFilter()` juga dibungkus `withFallback()`
- Jika semua RPC gagal, retry setelah `pollIntervalMs * 3`

### Executors (Mint/Unlock)

```
Sebelum:
  constructor() {
    this.wallet = getSepoliaWallet();    // cached sekali
    this.contract = new Contract(...);   // pakai provider lama selamanya
  }

Sesudah:
  _getWalletAndContract() {
    const wallet = getSepoliaWallet();   // fresh setiap call
    const contract = new Contract(...);  // pakai provider aktif
    return { wallet, contract };
  }
```

Executor sekarang:
- Ambil fresh wallet + contract setiap execution
- Jika RPC rotate di antara batch, execution berikutnya otomatis pakai RPC baru
- `getSepoliaWallet()` detect jika provider berubah → buat wallet baru

## Sepolia Public RPCs

| RPC URL | Provider | Rate Limit |
|---------|----------|-----------|
| `https://ethereum-sepolia-rpc.publicnode.com` | PublicNode | Generous |
| `https://rpc.sepolia.org` | Ethereum Foundation | Moderate |
| `https://sepolia.drpc.org` | dRPC | Generous |
| `https://1rpc.io/sepolia` | 1RPC | Moderate |

## Log Output

### Startup

```
[info] [LiteForge] RPC fallback initialized with 1 endpoint(s): https://liteforge.rpc.caldera.xyz/http
[info] [Sepolia] RPC fallback initialized with 4 endpoint(s): https://ethereum-sepolia-rpc.publicnode.com, https://rpc.sepolia.org, https://sepolia.drpc.org, https://1rpc.io/sepolia
```

### Saat Rotation Terjadi

```
[warn] [Sepolia] RPC error on https://ethereum-sepolia-rpc.publicnode.com: socket hang up
[warn] [Sepolia] Rotated RPC to: https://rpc.sepolia.org
```

### Jika Semua RPC Gagal

```
[warn] [Sepolia] RPC error on https://ethereum-sepolia-rpc.publicnode.com: socket hang up
[warn] [Sepolia] Rotated RPC to: https://rpc.sepolia.org
[warn] [Sepolia] RPC error on https://rpc.sepolia.org: ETIMEDOUT
[warn] [Sepolia] Rotated RPC to: https://sepolia.drpc.org
[warn] [Sepolia] RPC error on https://sepolia.drpc.org: ECONNREFUSED
[warn] [Sepolia] Rotated RPC to: https://1rpc.io/sepolia
[warn] [Sepolia] RPC error on https://1rpc.io/sepolia: timeout
[error] [Sepolia] All 4 RPCs failed
[error] Sepolia listener error: timeout
```

Listener akan retry setelah `pollIntervalMs * 3` (15 detik default).

## File yang Terkait

| File | Perubahan |
|------|-----------|
| `relayer/.env` | `SEPOLIA_RPC_URLS` (comma-separated) |
| `relayer/.env.example` | Template multi RPC |
| `relayer/src/config.js` | `parseRpcUrls()` — parse comma-separated, backward-compatible |
| `relayer/src/utils/provider.js` | `FallbackRpcProvider` class + `withFallback()` |
| `relayer/src/listeners/liteforgeListener.js` | Pakai `rpc.withFallback()` |
| `relayer/src/listeners/sepoliaListener.js` | Pakai `rpc.withFallback()` |
| `relayer/src/executors/mintExecutor.js` | Fresh wallet/contract per execution |
| `relayer/src/executors/unlockExecutor.js` | Fresh wallet/contract per execution |

## Troubleshooting

### Semua RPC gagal terus-menerus

1. Cek koneksi internet
2. Cek apakah RPC URL masih valid (bisa berubah/deprecated)
3. Tambah RPC baru di `.env`
4. Restart relayer

### Transaksi stuck di EXECUTING (dari sebelum upgrade)

Reset manual via Node.js:

```bash
cd relayer
node -e "
const Database = require('better-sqlite3');
const db = new Database('./data/relayer.db');
const result = db.prepare(\"UPDATE transactions SET status = 'RETRYING', retries = 0 WHERE status = 'EXECUTING'\").run();
console.log('Rows reset:', result.changes);
db.close();
"
```

Replay protection on-chain mencegah double-processing.

### Menambah RPC baru

Edit `.env`, tambah URL di akhir (pisah koma):

```env
SEPOLIA_RPC_URLS=https://existing1.com,https://existing2.com,https://new-rpc.com
```

Restart relayer. Tidak perlu ubah kode.
