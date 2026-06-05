# Plan: Integrasikan Prediction Market ke Frontend Litvm

## Masalah
File prediction pages dari nexus-mainnet menggunakan import path `@/hooks/use-markets`, `@/config/contract`, dll. 
Supaya tidak mengubah file dari nexus-mainnet, kita perlu menyesuaikan file litvm agar path-path ini resolve dengan benar.

## Steps

### 1. Install dependency yang belum ada
- `@phosphor-icons/react` (icon library yang dipakai prediction pages)

### 2. Pindah hooks ke lokasi yang sesuai import path
- `hooks/prediction/use-markets.ts` → `hooks/use-markets.ts`
- `hooks/prediction/use-market.ts` → `hooks/use-market.ts`
- `hooks/prediction/use-buy-ticket.ts` → `hooks/use-buy-ticket.ts`
- `hooks/prediction/use-categories.ts` → `hooks/use-categories.ts`
- `hooks/prediction/use-leaderboard.ts` → `hooks/use-leaderboard.ts`
- `hooks/prediction/use-comments.ts` → `hooks/use-comments.ts`

### 3. Buat `config/contract.ts`
- Re-export prediction contract ABI & address dari `config/prediction/contract.ts`
- Atau langsung buat di `config/contract.ts`

### 4. Buat `components/market/market-card.tsx`
- Pindah dari `components/prediction/market-card.tsx`

### 5. Buat `components/market/buy-ticket-modal.tsx`
- Pindah dari `components/prediction/buy-ticket-modal.tsx`

### 6. Buat `components/ui/toast.tsx`
- Copy dari `components/prediction-ui/toast.tsx` (litvm pakai sonner, prediction pakai custom toast)

### 7. Update `lib/utils.ts`
- Tambah fungsi: `formatEth`, `formatTimeLeft`, `shortenAddress`, `getStatusColor`
- Keep existing `cn` function (sudah ada, compatible)

### 8. Buat `lib/category-icons.ts`
- Copy dari `lib/prediction/category-icons.ts`

### 9. Tambah routes di `App.tsx`
- `/predict` → MarketsPage (list markets)
- `/predict/market/:id` → MarketDetailPage
- `/predict/leaderboard` → LeaderboardPage  
- `/predict/profile` → ProfilePage
- `/predict/admin` → PredictionAdminPage

### 10. Update `.env.local`
- Pastikan `VITE_RELAYER_URL=http://localhost:3002` (untuk prediction admin)
- Pastikan `VITE_ADMIN_PASSPHRASE=VIUSsHLuz1x0g7iKBEWp`

## Catatan
- File dari nexus-mainnet TIDAK diubah
- File litvm yang di-edit: `App.tsx`, `lib/utils.ts`, `.env.local`
- File litvm yang dibuat baru: beberapa re-export/wrapper files
- UI components yang sudah ada di litvm (`Card`, `Button`, `Badge`, `Skeleton`) compatible langsung
