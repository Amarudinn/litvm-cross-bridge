# LitVM Bridge - Frontend

## Overview

Frontend web app untuk LitVM Bridge yang memungkinkan user bridge zkLTC antara LiteForge dan Sepolia melalui browser dengan MetaMask.

**URL**: http://localhost:5173/

## Tech Stack

| Technology | Fungsi |
|-----------|--------|
| React 19 + TypeScript | UI framework |
| Vite | Build tool & dev server |
| TailwindCSS v3 | Styling (dark theme) |
| shadcn/ui | UI components (Button, Card, Input, Badge, Dialog, Skeleton) |
| Framer Motion | Animasi (page transitions, swap button, progress steps) |
| RainbowKit | Wallet connection (MetaMask, injected wallets) |
| wagmi + viem | Blockchain interaction (read/write contracts) |
| Zustand | State management (bridge form, active tx) |
| TanStack Query | Data fetching & caching |
| Sonner | Toast notifications |
| Lucide React | Icons |

## Halaman

### 1. Bridge Page (`/`)

Halaman utama untuk bridge token.

```
┌─────────────────────────────────────────────────────────┐
│  LitVM Bridge    [Bridge] [History] [Explorer]  [Connect]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│              LitVM Bridge                                │
│    Bridge zkLTC between LiteForge and Sepolia            │
│                                                          │
│         ┌──────────────────────────┐                     │
│         │  From: 🔷 LiteForge      │                     │
│         │  Balance: 5.09 zkLTC     │                     │
│         │  Amount: [_______] [MAX] │                     │
│         │                          │                     │
│         │        [ ⇅ Swap ]        │                     │
│         │                          │                     │
│         │  To: 🟣 Sepolia          │                     │
│         │  You receive: ~0.997     │                     │
│         │                          │                     │
│         │  Fee: 0.3% (0.003)       │                     │
│         │  Min: 0.001 zkLTC        │                     │
│         │                          │                     │
│         │  [ 🔗 Bridge 1.0 zkLTC ] │                     │
│         └──────────────────────────┘                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Fitur:**
- Chain selector dengan animated swap button (rotasi 180°)
- Input amount dengan tombol MAX (isi balance - gas buffer)
- Real-time fee calculation (0.3%)
- Smart button: Connect → Switch Chain → Bridge
- Transaction status modal (tracking progress sampai relay selesai)

### 2. History Page (`/history`)

Riwayat bridge transaksi user (memerlukan wallet connection).

```
┌─────────────────────────────────────────────────────────┐
│  Your Bridge History                                     │
│                                                          │
│  [All] [LiteForge→Sepolia] [Sepolia→LiteForge]         │
│                                                          │
│  Direction          │ Amount    │ Fee     │ Status       │
│  ─────────────────────────────────────────────────────  │
│  LiteForge → Sepolia│ 1.0 zkLTC │ 0.003  │ ✅ Completed │
│  Sepolia → LiteForge│ 0.997     │ 0.00299│ ✅ Completed │
│  LiteForge → Sepolia│ 0.5 zkLTC │ 0.0015 │ ⏳ Relaying  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Fitur:**
- Filter tabs: All / LiteForge→Sepolia / Sepolia→LiteForge
- Status badges (completed = hijau, pending = kuning)
- Link ke explorer untuk setiap tx hash
- Empty state jika belum ada transaksi
- Auto-refresh setiap 30 detik

### 3. Explorer Page (`/explorer`)

Public explorer semua transaksi bridge (tidak perlu wallet).

```
┌─────────────────────────────────────────────────────────┐
│  Bridge Explorer                                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐          │
│  │Total Lock│  │Total Burn│  │Total Tx Count│          │
│  │ 125.4    │  │ 120.1    │  │     203      │          │
│  │ zkLTC    │  │ wzkLTC   │  │              │          │
│  └──────────┘  └──────────┘  └──────────────┘          │
│                                                          │
│  Filter: [All ▼]  Search: [0x_____________]             │
│                                                          │
│  Sender   │ Direction       │ Amount │ Status           │
│  ─────────────────────────────────────────────────────  │
│  0xab..cd │ LF → Sepolia   │ 2.5    │ ✅ Completed     │
│  0xef..12 │ Sepolia → LF   │ 1.0    │ ✅ Completed     │
│  0xab..cd │ LF → Sepolia   │ 0.5    │ ⏳ Relaying      │
│                                                          │
│  [← Prev]  Page 1 of 5  [Next →]                       │
└─────────────────────────────────────────────────────────┘
```

**Fitur:**
- Stats cards: Total Locked, Total Burned, Total Transactions
- Filter by direction
- Search by address
- Pagination (10 per halaman)
- Tidak perlu connect wallet

---

## Arsitektur

### Component Tree

```
App.tsx
├── WagmiProvider (blockchain config)
│   └── QueryClientProvider (data caching)
│       └── RainbowKitProvider (wallet UI)
│           └── BrowserRouter
│               ├── Header (nav + ConnectButton)
│               ├── Routes
│               │   ├── BridgePage
│               │   │   ├── BridgeCard
│               │   │   │   ├── ChainSelector
│               │   │   │   ├── AmountInput
│               │   │   │   ├── FeeBreakdown
│               │   │   │   └── BridgeButton
│               │   │   └── TxStatusModal
│               │   │       └── TxProgressSteps
│               │   ├── HistoryPage
│               │   │   └── HistoryTable
│               │   └── ExplorerPage
│               │       ├── ExplorerStats
│               │       └── ExplorerTable
│               └── Footer
```

### Hooks

| Hook | Fungsi |
|------|--------|
| `useBridgeVault` | Read: feePercent, minLockAmount, availableBalance, nonce dari BridgeVault (LiteForge) |
| `useWrappedZkLTC` | Read: balanceOf, feePercent, minBurnAmount, totalSupply, nonce dari WrappedZkLTC (Sepolia) |
| `useLock` | Write: call lock() di BridgeVault, kirim native zkLTC |
| `useBurn` | Write: call burn() di WrappedZkLTC |
| `useTransactionStatus` | Track tx lifecycle: signing → confirming → relaying → completed |
| `useBridgeEvents` | Fetch Locked/Minted/Burned/Unlocked events dari kedua chain |

### State Management (Zustand)

```typescript
bridgeStore = {
  direction: 'lock' | 'burn',     // lock = LF→Sep, burn = Sep→LF
  amount: string,                  // input amount
  recipient: string,               // destination address
  activeTx: {
    hash: '0x...' | null,
    status: 'idle' | 'signing' | 'confirming' | 'relaying' | 'completed' | 'failed',
    error?: string,
  },
  // Actions
  toggleDirection(),
  setAmount(),
  setActiveTx(),
  resetForm(),
}
```

### Data Flow

```
User Input → Zustand Store → Bridge Components
                                    │
                                    ▼
                            wagmi writeContract
                                    │
                                    ▼
                         Blockchain (LiteForge/Sepolia)
                                    │
                                    ▼
                    useWaitForTransactionReceipt (source chain)
                                    │
                                    ▼
                    useTransactionStatus (poll destination chain)
                                    │
                                    ▼
                         isProcessed() = true → COMPLETED
```

---

## Bridge Button Logic

```
┌─────────────────────────────────────────────┐
│ Wallet NOT connected?                        │
│   → Show "Connect Wallet"                    │
│   → Click opens RainbowKit modal             │
│                                              │
│ Connected but WRONG chain?                   │
│   → Show "Switch to LiteForge/Sepolia"       │
│   → Click triggers chain switch              │
│                                              │
│ No amount entered?                           │
│   → Show "Enter Amount" (disabled)           │
│                                              │
│ Amount < minimum (0.001)?                    │
│   → Show "Below Minimum" (disabled)          │
│                                              │
│ Amount > balance?                            │
│   → Show "Insufficient Balance" (disabled)   │
│                                              │
│ All valid?                                   │
│   → Show "Bridge {amount} {token}"           │
│   → Click submits transaction                │
│                                              │
│ Transaction in progress?                     │
│   → Show "Confirm in Wallet..." (loading)    │
│   → Show "Confirming..." (loading)           │
└─────────────────────────────────────────────┘
```

---

## Transaction Status Modal

Setelah user submit bridge transaction, modal muncul dengan 4 step:

```
Step 1: ✅ Signing
        Transaction confirmed in wallet

Step 2: ✅ Confirming on LiteForge
        Waiting for block confirmation

Step 3: ⏳ Relaying to Sepolia        ← pulsing animation
        Relayer is processing...

Step 4: ○ Complete
        Waiting...
```

**Cara tracking relay completion:**
1. Setelah source tx confirmed, extract nonce dari event log
2. Compute processId = keccak256(sourceTxHash, sourceNonce)
3. Poll `isProcessed(sourceTxHash, sourceNonce)` di destination contract setiap 5 detik
4. Ketika return `true` → relay selesai, tampilkan ✅ Complete

---

## Custom Chain: LiteForge

LiteForge bukan chain standar, jadi didefinisikan manual:

```typescript
// src/config/chains.ts
import { defineChain } from 'viem'

export const liteforge = defineChain({
  id: 4441,
  name: 'LiteForge',
  nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://liteforge.rpc.caldera.xyz/http'] }
  },
  blockExplorers: {
    default: {
      name: 'LiteForge Explorer',
      url: 'https://liteforge.explorer.caldera.xyz'
    }
  },
})
```

---

## RainbowKit Setup (Tanpa WalletConnect)

Menggunakan RainbowKit dengan injected wallets saja (MetaMask, Coinbase Wallet):

```typescript
// src/config/wagmi.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
  appName: 'LitVM Bridge',
  projectId: '0'.repeat(32),  // placeholder, WalletConnect tidak digunakan
  chains: [liteforge, sepolia],
  transports: {
    [liteforge.id]: http('https://liteforge.rpc.caldera.xyz/http'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
})
```

---

## Cara Menjalankan

### Development

```bash
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173/

### Build Production

```bash
npm run build
```

Output di folder `dist/`.

### Preview Production Build

```bash
npm run preview
```

---

## File Structure

```
frontend/
├── index.html                         # Entry HTML (dark class)
├── package.json                       # Dependencies
├── vite.config.ts                     # Vite config + path alias
├── tailwind.config.ts                 # Tailwind dark theme
├── postcss.config.js                  # PostCSS plugins
├── tsconfig.json                      # TypeScript config
│
└── src/
    ├── main.tsx                       # React entry point
    ├── App.tsx                        # Providers + Router
    ├── index.css                      # Tailwind + CSS variables
    │
    ├── abi/
    │   ├── BridgeVault.ts             # Full ABI BridgeVault
    │   └── WrappedZkLTC.ts            # Full ABI WrappedZkLTC
    │
    ├── config/
    │   ├── chains.ts                  # LiteForge + Sepolia chain definitions
    │   ├── contracts.ts               # Contract addresses
    │   └── wagmi.ts                   # wagmi + RainbowKit config
    │
    ├── hooks/
    │   ├── useBridgeVault.ts          # Read BridgeVault state
    │   ├── useWrappedZkLTC.ts         # Read WrappedZkLTC state
    │   ├── useLock.ts                 # Write: lock zkLTC
    │   ├── useBurn.ts                 # Write: burn wzkLTC
    │   ├── useTransactionStatus.ts    # Track relay completion
    │   └── useBridgeEvents.ts         # Fetch all bridge events
    │
    ├── stores/
    │   └── bridgeStore.ts             # Zustand store
    │
    ├── lib/
    │   ├── utils.ts                   # cn() helper
    │   └── format.ts                  # formatAmount, shortenAddress, etc.
    │
    ├── components/
    │   ├── ui/                        # shadcn/ui primitives
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── input.tsx
    │   │   ├── badge.tsx
    │   │   ├── dialog.tsx
    │   │   └── skeleton.tsx
    │   │
    │   ├── layout/
    │   │   ├── Header.tsx             # Nav + ConnectButton
    │   │   └── Footer.tsx             # Footer links
    │   │
    │   ├── bridge/
    │   │   ├── BridgeCard.tsx         # Main bridge form
    │   │   ├── ChainSelector.tsx      # From/To chain + swap
    │   │   ├── AmountInput.tsx        # Amount + MAX + balance
    │   │   ├── FeeBreakdown.tsx       # Fee calculation
    │   │   └── BridgeButton.tsx       # Smart connect/switch/bridge
    │   │
    │   ├── transaction/
    │   │   ├── TxStatusModal.tsx      # Progress modal
    │   │   └── TxProgressSteps.tsx    # 4-step indicator
    │   │
    │   ├── history/
    │   │   └── HistoryTable.tsx       # User tx history table
    │   │
    │   └── explorer/
    │       ├── ExplorerStats.tsx       # Stats cards
    │       └── ExplorerTable.tsx       # All txs + pagination
    │
    └── pages/
        ├── BridgePage.tsx             # "/"
        ├── HistoryPage.tsx            # "/history"
        └── ExplorerPage.tsx           # "/explorer"
```

---

## Cara Menggunakan (User Flow)

### Bridge zkLTC → wzkLTC

1. Buka http://localhost:5173/
2. Klik "Connect Wallet" → pilih MetaMask
3. Pastikan direction: **LiteForge → Sepolia**
4. Masukkan jumlah zkLTC (atau klik MAX)
5. Lihat fee breakdown (0.3%)
6. Klik "Bridge X.XX zkLTC"
7. Confirm di MetaMask
8. Tunggu modal progress:
   - ✅ Signing
   - ✅ Confirming on LiteForge
   - ⏳ Relaying to Sepolia (~20 detik)
   - ✅ Complete!
9. wzkLTC muncul di wallet Sepolia

### Bridge wzkLTC → zkLTC

1. Klik tombol swap (⇅) untuk ganti direction
2. Pastikan direction: **Sepolia → LiteForge**
3. Jika diminta, switch chain ke Sepolia
4. Masukkan jumlah wzkLTC
5. Klik "Bridge X.XX wzkLTC"
6. Confirm di MetaMask
7. Tunggu relay (~45 detik karena Sepolia block time lebih lama)
8. zkLTC muncul di wallet LiteForge

### Cek History

1. Klik tab "History" di navigation
2. Lihat semua transaksi bridge Anda
3. Filter by direction jika perlu
4. Klik tx hash untuk buka di explorer

### Cek Explorer

1. Klik tab "Explorer" di navigation
2. Lihat stats: total locked, total burned, total tx
3. Browse semua transaksi bridge (semua user)
4. Search by address atau filter by direction
