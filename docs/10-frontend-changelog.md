# LitVM Bridge - Frontend Changelog

Dokumentasi perubahan yang dilakukan pada frontend setelah implementasi awal.

---

## Perubahan 1: Perbaikan Layout & Icon

### Masalah
- Chain selector layout horizontal (side-by-side) terlalu sempit dan berantakan
- Masih menggunakan emoji (🔷🟣) sebagai icon chain
- Spacing antar komponen tidak konsisten
- Card tidak memiliki efek visual yang menarik

### Solusi

**ChainSelector** - Diubah dari horizontal ke vertical (stacked):
```
Sebelum:                          Sesudah:
┌──────┐  [⇅]  ┌──────┐         ┌──────────────────┐
│ From │       │  To  │         │ From: LiteForge  │
└──────┘       └──────┘         ├──────────────────┤
                                 │      [ ⇅ ]       │
                                 ├──────────────────┤
                                 │ To: Sepolia      │
                                 └──────────────────┘
```

**Icon** - Menggunakan file gambar dari `/public/`:
- `litvm.png` → icon untuk LiteForge chain dan token zkLTC/wzkLTC
- `eth.png` → icon untuk Sepolia chain

**Logika icon**:
| Komponen | Chain Icon | Token Icon |
|----------|-----------|-----------|
| From: LiteForge | litvm.png | litvm.png (zkLTC) |
| From: Sepolia | eth.png | litvm.png (wzkLTC) |
| To: Sepolia | eth.png | litvm.png (wzkLTC) |
| To: LiteForge | litvm.png | litvm.png (zkLTC) |
| Amount input badge | - | litvm.png (selalu) |

> wzkLTC menggunakan litvm.png karena itu wrapped representation dari zkLTC

**AmountInput** - Dirapihkan:
- Label "Amount" di atas dengan wallet balance di kanan
- Token badge berbentuk pill (rounded) dengan icon + nama
- MAX button lebih compact

**FeeBreakdown** - Dirapihkan:
- Fee rows lebih clean (label kiri, value kanan)
- "You will receive" di-highlight dengan border primary

**BridgeCard** - Rounded corners lebih besar, padding konsisten

### File yang diubah
- `src/components/bridge/ChainSelector.tsx`
- `src/components/bridge/AmountInput.tsx`
- `src/components/bridge/FeeBreakdown.tsx`
- `src/components/bridge/BridgeCard.tsx`
- `src/pages/BridgePage.tsx`
- `src/components/layout/Header.tsx`

---

## Perubahan 2: Custom Wallet Button & UI Polish

### Masalah
- Swap button memiliki border hitam yang mengganggu
- Button Connect Wallet dan Switch Network menggunakan default RainbowKit (tidak sesuai tema)
- Title "LitVM Bridge" di tengah page, seharusnya di header kiri
- Card tidak memiliki efek border yang menarik

### Solusi

**1. Swap button** - Border hitam dihapus:
```
Sebelum: border-4 border-background (border hitam tebal)
Sesudah: bg-muted/80 backdrop-blur-sm (tanpa border)
```

**2. Custom WalletButton** - Komponen baru menggantikan RainbowKit ConnectButton:

File: `src/components/layout/WalletButton.tsx`

State button:
- **Belum connect** → Gradient button biru-ungu "Connect Wallet" dengan icon wallet
- **Sudah connect** → Pill button dengan chain icon + shortened address + dropdown
- **Dropdown menu**:
  - Switch Network (LiteForge / Sepolia) dengan indicator "Connected"
  - Disconnect (warna merah)

```
Belum connect:     [ 🔗 Connect Wallet ]  (gradient biru-ungu)
Sudah connect:     [ 🔷 0x484E...Cb4c ▼ ] (pill abu-abu)
                   ┌─────────────────────┐
                   │ Switch Network       │
                   │ 🔷 LiteForge  Connected│
                   │ 🟣 Sepolia           │
                   │─────────────────────│
                   │ 🚪 Disconnect        │
                   └─────────────────────┘
```

**3. BridgeButton** - Custom styling untuk semua state:
- Connect Wallet → gradient biru-ungu + icon wallet
- Switch to {chain} → outline button + icon arrows
- Enter Amount → abu-abu disabled
- Bridge {amount} → gradient biru-ungu
- Loading states → spinner animation

**4. Animated gradient border** pada BridgeCard:
- Gradient: blue → purple → pink
- Animasi: `gradient-shift` bergerak dari kiri ke kanan (4 detik loop)
- Hover: opacity meningkat (lebih terang)
- Blur glow di belakang border

CSS animation ditambahkan di:
- `tailwind.config.ts` → keyframes `gradient-shift` + animation `border-spin`
- `src/index.css` → utility class `.animate-border-spin`

### File yang dibuat
- `src/components/layout/WalletButton.tsx` (baru)

### File yang diubah
- `src/components/bridge/ChainSelector.tsx` (hapus border swap button)
- `src/components/bridge/BridgeButton.tsx` (custom styling semua state)
- `src/components/bridge/BridgeCard.tsx` (animated gradient border)
- `src/components/layout/Header.tsx` (custom WalletButton, title di kiri)
- `src/pages/BridgePage.tsx` (hapus title dari tengah page)
- `tailwind.config.ts` (tambah keyframes + animation)
- `src/index.css` (tambah animate-border-spin utility)

---

## Perubahan 3: Title, Centering, Responsive, Tema Konsisten

### Masalah
- Title "LitVM Bridge" + subtitle perlu dikembalikan di atas card
- Card terlalu ke atas di desktop, perlu di-center vertikal
- Belum responsive untuk mobile
- History dan Explorer page tidak menggunakan tema yang sama seperti Bridge

### Solusi

**1. Title dikembalikan** - "LitVM Bridge" + logo + subtitle kembali di atas card (centered)

**2. Card di-center vertikal** - Bridge page menggunakan `flex-1 flex items-center justify-center` sehingga card benar-benar di tengah layar di desktop. Di mobile, card ada di atas dengan padding lebih kecil.

**3. Responsive mobile**:

| Komponen | Mobile | Desktop |
|----------|--------|---------|
| Header height | h-14 | h-14 |
| Nav text | text-xs | text-sm |
| Card padding | p-4 | p-5 |
| WalletButton | "Connect" | "Connect Wallet" |
| Title | text-xl | text-2xl |
| Page padding | py-6 | py-10 |

**4. History & Explorer tema sama seperti Bridge**:
- Card menggunakan animated gradient border yang sama (blue → purple → pink)
- `rounded-2xl border-0 bg-card shadow-xl`
- Filter tabs menggunakan pill style (`bg-muted/30 rounded-xl p-1`)
- Layout konsisten: max-w-3xl centered

### File yang diubah
- `src/pages/BridgePage.tsx` (title kembali, centering)
- `src/pages/HistoryPage.tsx` (tema baru, responsive, gradient border)
- `src/pages/ExplorerPage.tsx` (tema baru, responsive, gradient border)
- `src/components/bridge/BridgeCard.tsx` (responsive padding)
- `src/components/layout/Header.tsx` (responsive sizing)
- `src/components/layout/WalletButton.tsx` (responsive text)
- `src/App.tsx` (main flex-col untuk centering)

---

## Perubahan 4: Hapus Title & Tambah Menu Swap

### Masalah
- Title "LitVM Bridge" + subtitle di atas card tidak diperlukan (sudah ada di header)
- Belum ada menu Swap di navigasi

### Solusi

**1. Title dihapus** - Bridge page langsung menampilkan card tanpa text di atas

**2. Menu Swap ditambahkan** - Di header antara Bridge dan History:

```
[LitVM]  Bridge  Swap   History  Explorer     [Connect Wallet]
                 soon
```

Implementasi menu Swap:
- Posisi: setelah Bridge, sebelum History
- Label "soon" kecil di pojok kanan atas (badge)
- Disabled: `cursor-not-allowed`, warna redup (`text-muted-foreground/50`)
- Tidak bisa diklik (menggunakan `<span>` bukan `<Link>`)
- Badge styling: `bg-primary/20 text-primary text-[8px] font-bold`

```tsx
// Header nav items
const navItems = [
  { path: '/', label: 'Bridge', soon: false },
  { path: '#', label: 'Swap', soon: true },
  { path: '/history', label: 'History', soon: false },
  { path: '/explorer', label: 'Explorer', soon: false },
]
```

### File yang diubah
- `src/pages/BridgePage.tsx` (hapus title + subtitle)
- `src/components/layout/Header.tsx` (tambah menu Swap dengan label soon)
