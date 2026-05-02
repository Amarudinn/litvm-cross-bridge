# LitVM Bridge - Session Recap

> File ini untuk konteks di sesi berikutnya. Baca file ini terlebih dahulu.

## Apa Proyek Ini

LitVM Bridge adalah **cross-chain bridge** antara LiteForge (L2, Chain ID 4441) dan Sepolia (Ethereum Testnet, Chain ID 11155111). Mekanisme: **Lock & Mint** dengan Relayer.

- User lock zkLTC di LiteForge → dapat wzkLTC (ERC20) di Sepolia
- User burn wzkLTC di Sepolia → dapat zkLTC kembali di LiteForge
- Fee: 0.3% per transaksi

## Status Saat Ini

| Komponen | Status | Catatan |
|----------|--------|---------|
| Smart Contracts | ✅ Deployed & Tested | 49/49 unit tests pass |
| Relayer | ✅ Working | 6+ transaksi berhasil diproses |
| Frontend | ✅ Working | Bridge, History, Explorer pages |
| Supabase | 📋 Planned | Belum diimplementasi, docs sudah siap |

## Deployed Contracts

| Contract | Chain | Address |
|----------|-------|---------|
| BridgeVault | LiteForge (4441) | `0x6Bb77c1f465a18Bd16686330173B32821E59FD12` |
| WrappedZkLTC | Sepolia (11155111) | `0x4320BB234A76f94F9eeDD0E81968668C6d29c39f` |

## Wallet / Relayer

- Address: `0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c`
- Private Key: di `relayer/.env` dan `contracts/.env`
- Berperan sebagai: Owner + Relayer (sama)

## Cara Menjalankan

### Relayer
```bash
cd C:\Users\User\OneDrive\Desktop\all-folder\litvm\relayer
node src/index.js
```
Harus selalu running agar bridge bisa memproses transaksi.

### Frontend
```bash
cd C:\Users\User\OneDrive\Desktop\all-folder\litvm\frontend
npm run dev
```
Buka http://localhost:5173/

### Compile & Test Contracts
```bash
cd C:\Users\User\OneDrive\Desktop\all-folder\litvm\contracts
C:\Users\User\.foundry\bin\forge.exe test
```

## Project Structure

```
C:\Users\User\OneDrive\Desktop\all-folder\litvm\
├── contracts/          # Solidity (Foundry) - BridgeVault + WrappedZkLTC
├── relayer/            # Node.js - Event listener + executor
├── frontend/           # React + Vite + wagmi + RainbowKit
├── docs/               # Dokumentasi lengkap (12 files + recap)
└── images/             # Screenshots
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.24, Foundry, OpenZeppelin v5.6.1 |
| Relayer | Node.js (ESM), ethers.js v6, SQLite, Winston |
| Frontend | React 19, Vite, TypeScript, TailwindCSS v3, shadcn/ui |
| Wallet | RainbowKit (injected only, no WalletConnect) |
| Blockchain | wagmi v2, viem |
| State | Zustand |
| Animation | Framer Motion |

## Known Issues / Bugs yang Sudah Difix

1. **Relayer: LiteForge tidak support EIP-1559** → Harus pakai `--legacy` flag saat deploy
2. **Relayer: Sepolia RPC "socket hang up"** → Normal untuk public RPC, auto-recover
3. **Frontend: "Relaying to Sepolia" stuck** → Fixed: `isProcessed()` sekarang dipanggil dengan `(txHash, nonce)` bukan `(processId, nonce)`
4. **Frontend: History selalu "pending"** → Fixed: Sepolia RPC punya limit 50000 blocks, sekarang pakai `getLogsChunked()` 
5. **Frontend: BridgeVault unlock gagal pertama kali** → Vault perlu di-top-up dengan zkLTC untuk likuiditas

## Yang Belum Dikerjakan (Next Session)

### 1. Integrasi Supabase (Prioritas Tinggi)
- Docs sudah siap: `docs/11-supabase-tasks.md` dan `docs/12-supabase-implementation.md`
- User sudah punya Supabase project
- Perlu: API URL + Keys dari user
- Tasks: Buat table, update relayer (save ke Supabase), update frontend (query dari Supabase)

### 2. Menu Swap (Label "soon" di header)
- Belum ada implementasi
- Kemungkinan: DEX/AMM untuk swap token di dalam chain yang sama

### 3. Improvements (Nice to have)
- Custom recipient address (saat ini selalu bridge ke diri sendiri)
- Transaction history persistent (localStorage atau Supabase)
- Better error messages di frontend
- Mobile hamburger menu
- Loading states yang lebih smooth

## File Penting untuk Dibaca

| File | Kenapa Penting |
|------|---------------|
| `relayer/src/index.js` | Entry point relayer, orchestrator |
| `relayer/src/config.js` | Semua config (RPC, addresses, settings) |
| `relayer/.env` | Private key, contract addresses, RPC URLs |
| `frontend/src/App.tsx` | Provider setup (wagmi, RainbowKit, router) |
| `frontend/src/config/wagmi.ts` | Chain + transport config |
| `frontend/src/config/contracts.ts` | Contract addresses |
| `frontend/src/hooks/useBridgeEvents.ts` | Fetch events dari blockchain (akan diganti Supabase) |
| `frontend/src/hooks/useTransactionStatus.ts` | Track relay completion |
| `frontend/src/stores/bridgeStore.ts` | Zustand state (direction, amount, activeTx) |
| `frontend/src/components/bridge/BridgeCard.tsx` | Main bridge UI |
| `docs/12-supabase-implementation.md` | Full implementation guide untuk Supabase |

## Chain Details

| | LiteForge | Sepolia |
|---|---|---|
| Chain ID | 4441 | 11155111 |
| RPC | https://liteforge.rpc.caldera.xyz/http | https://ethereum-sepolia-rpc.publicnode.com |
| Explorer | https://liteforge.explorer.caldera.xyz | https://sepolia.etherscan.io |
| Native Token | zkLTC | ETH |
| Bridge Contract | BridgeVault (lock/unlock) | WrappedZkLTC (mint/burn) |
| Catatan | Tidak support EIP-1559 (pakai legacy tx) | Public RPC kadang disconnect |

## Dokumentasi Lengkap

```
docs/
├── 01-overview.md              # Penjelasan umum
├── 02-architecture.md          # Arsitektur teknis
├── 03-smart-contracts.md       # Detail contracts + deploy guide
├── 04-relayer.md               # Detail relayer + troubleshooting
├── 05-testing.md               # Unit tests + E2E test results
├── 06-security.md              # Threat model + security features
├── 07-usage-guide.md           # Cara pakai bridge (CLI + ethers.js)
├── 08-cara-kerja-lengkap.md    # Step-by-step dari nol
├── 09-frontend.md              # Frontend architecture + user flow
├── 10-frontend-changelog.md    # Perubahan UI yang dilakukan
├── 11-supabase-tasks.md        # Task list untuk Supabase integration
├── 12-supabase-implementation.md # Implementation guide Supabase
└── recap.md                    # FILE INI - konteks untuk sesi berikutnya
```
