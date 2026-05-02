# LitVM Bridge - Cara Kerja Lengkap (Dari Nol Sampai Berhasil)

## TAHAP 1: Persiapan (Setup)

### 1.1 Siapkan Wallet

Kamu butuh 1 wallet yang akan berperan sebagai:

```
Wallet: 0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c
├── Owner    → yang deploy & kontrol contract
└── Relayer  → yang execute cross-chain operations
```

Wallet ini harus punya:
- **zkLTC di LiteForge** → untuk gas deploy + liquidity vault
- **ETH di Sepolia** → untuk gas deploy + gas mint wzkLTC

### 1.2 Deploy Smart Contracts

**Deploy BridgeVault ke LiteForge:**

```bash
cd contracts

forge script script/DeployBridgeVault.s.sol:DeployBridgeVault \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy
```

> **Note**: LiteForge tidak support EIP-1559, wajib pakai `--legacy`

Hasil:
```
BridgeVault deployed at: 0x6Bb77c1f465a18Bd16686330173B32821E59FD12
├── owner:   0x484E0cAA...
├── relayer: 0x484E0cAA...
└── fee:     30 basis points (0.3%)
```

**Deploy WrappedZkLTC ke Sepolia:**

```bash
forge script script/DeployWrappedZkLTC.s.sol:DeployWrappedZkLTC \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY \
  --broadcast
```

Hasil:
```
WrappedZkLTC deployed at: 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f
├── name:    Wrapped zkLTC
├── symbol:  wzkLTC
├── owner:   0x484E0cAA...
├── relayer: 0x484E0cAA...
└── fee:     30 basis points (0.3%)
```

### 1.3 Top-up Vault Liquidity

BridgeVault **HARUS** punya zkLTC agar bisa unlock nanti saat user bridge balik dari Sepolia:

```bash
cast send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  --value 1ether \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --private-key $PRIVATE_KEY \
  --legacy
```

```
BridgeVault:
└── balance: 1 zkLTC (siap untuk unlock)
```

### 1.4 Setup & Jalankan Relayer

#### Install Dependencies

```bash
cd relayer
npm install
```

#### Konfigurasi .env

Copy `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Isi `.env`:

```env
# Private key relayer (harus punya gas di kedua chain)
RELAYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# RPC URLs
LITEFORGE_RPC_URL=https://liteforge.rpc.caldera.xyz/http
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Contract addresses (dari hasil deploy di atas)
BRIDGE_VAULT_ADDRESS=0x6Bb77c1f465a18Bd16686330173B32821E59FD12
WRAPPED_ZKLTC_ADDRESS=0x4320BB234A76f94F9eeDD0E81968668C6d29c39f

# Chain configs
LITEFORGE_CHAIN_ID=4441
SEPOLIA_CHAIN_ID=11155111

# Relayer settings
POLL_INTERVAL_MS=5000
CONFIRMATION_BLOCKS=3
MAX_RETRIES=5
```

#### Jalankan Relayer

```bash
# Production
npm start

# Development (auto-restart saat file berubah)
npm run dev
```

Output saat startup:

```
╔═══════════════════════════════════════════╗
║         LitVM Bridge Relayer              ║
║   LiteForge (zkLTC) ↔ Sepolia (wzkLTC)   ║
╚═══════════════════════════════════════════╝

[info] Configuration validated
[info] Provider connected: LiteForge (chainId: 4441)
[info] Relayer wallet (LiteForge): 0x484E0cAA...
[info] Provider connected: Sepolia (chainId: 11155111)
[info] Relayer wallet (Sepolia): 0x484E0cAA...
[info] Relayer balance - LiteForge: 5.097 zkLTC, Sepolia: 0.00176 ETH
[info] Database initialized
[info] Starting event listeners...
[info] LiteForge listener starting from current block: 4395591
[info] Sepolia listener starting from current block: 10775531
[info] Relayer is running!
[info] Poll interval: 5000ms
[info] Confirmation blocks: 3
[info] Max retries: 5
```

**Relayer sekarang aktif dan mendengarkan event di kedua chain.**

#### Stop Relayer

Tekan `Ctrl+C` untuk graceful shutdown:

```
[info] SIGINT received, shutting down gracefully...
[info] LiteForge listener stopped
[info] Sepolia listener stopped
[info] Database connection closed
[info] Relayer shutdown complete
```

#### Jalankan di Background (Linux/Mac)

```bash
# Jalankan di background dengan nohup
nohup npm start > relayer.out 2>&1 &

# Atau gunakan PM2
npm install -g pm2
pm2 start src/index.js --name litvm-relayer
pm2 logs litvm-relayer
pm2 stop litvm-relayer
```

#### Jalankan di Background (Windows)

```powershell
# Menggunakan PowerShell
Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/index.js" -RedirectStandardOutput "relayer.out"

# Atau buka terminal baru dan jalankan
node src/index.js
```

---

## TAHAP 2: Bridge zkLTC → wzkLTC (LiteForge → Sepolia)

### Step 1: User Lock zkLTC

```bash
cast send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "lock(address)" 0xRECIPIENT_DI_SEPOLIA \
  --value 1ether \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --private-key $PRIVATE_KEY \
  --legacy
```

Apa yang terjadi di dalam contract:

```
User kirim 1 zkLTC
│
▼
BridgeVault.lock(recipient):
├── Cek: msg.value > 0 ✅
├── Cek: msg.value >= 0.001 ether ✅
├── Cek: recipient != address(0) ✅
├── Hitung fee: 1 × 30 / 10000 = 0.003 zkLTC
├── Hitung net: 1 - 0.003 = 0.997 zkLTC
├── accumulatedFees += 0.003
├── nonce++ → nonce = 1
└── emit Locked(user, recipient, 0.997, 0.003, 1)
```

### Step 2: Relayer Detect & Process

```
Relayer polling setiap 5 detik
│
├── Scan LiteForge blocks...
│   └── Ditemukan! Locked event di block 4396015
│       ├── txHash: 0x66f0e3fa...
│       ├── sender: user
│       ├── recipient: user
│       ├── amount: 0.997 zkLTC
│       └── nonce: 1
│
├── Simpan ke SQLite queue:
│   ├── type: MINT
│   ├── status: PENDING
│   └── sourceTxHash: 0x66f0e3fa...
│
├── Tunggu 3 block confirmations (~6 detik di LiteForge)
│   ├── Block +1 ✓
│   ├── Block +2 ✓
│   └── Block +3 ✓ Confirmed!
│
├── Pre-flight check:
│   └── isProcessed() on Sepolia → false ✅ (belum pernah diproses)
│
├── Execute mint() di Sepolia:
│   │
│   ▼
│   WrappedZkLTC.mint(recipient, 0.997, txHash, 1):
│   ├── Cek: msg.sender == relayer ✅
│   ├── Cek: processId belum diproses ✅
│   ├── processedMints[processId] = true
│   ├── _mint(recipient, 0.997 wzkLTC)  ← TOKEN DIBUAT!
│   └── emit Minted(recipient, 0.997, processId)
│
└── Update queue: status = COMPLETED ✅
```

### Step 3: Verifikasi

```bash
# Cek balance wzkLTC di Sepolia
cast call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "balanceOf(address)(uint256)" 0xRECIPIENT \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# Result: 997000000000000000 (0.997 wzkLTC) ✅
```

**State setelah bridge:**
```
User:
├── LiteForge: -1 zkLTC (terkunci di vault)
└── Sepolia:   +0.997 wzkLTC (baru di-mint)

BridgeVault (LiteForge):
├── balance: +1 zkLTC (dari user)
└── fees: +0.003 zkLTC

WrappedZkLTC (Sepolia):
└── totalSupply: +0.997 wzkLTC
```

---

## TAHAP 3: Bridge wzkLTC → zkLTC (Sepolia → LiteForge)

### Step 1: User Burn wzkLTC

```bash
# amount dalam wei: 0.997 ether = 997000000000000000
cast send 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "burn(uint256,address)" 997000000000000000 0xRECIPIENT_DI_LITEFORGE \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

Apa yang terjadi di dalam contract:

```
User burn 0.997 wzkLTC
│
▼
WrappedZkLTC.burn(0.997, recipient):
├── Cek: amount > 0 ✅
├── Cek: amount >= 0.001 ether ✅
├── Cek: recipient != address(0) ✅
├── Cek: balanceOf(user) >= 0.997 ✅
├── Hitung fee: 0.997 × 30 / 10000 = 0.002991 wzkLTC
├── Hitung net: 0.997 - 0.002991 = 0.994009 wzkLTC
├── _burn(user, 0.997)          ← SEMUA DIBAKAR
├── _mint(owner, 0.002991)      ← FEE KE OWNER
├── nonce++ → nonce = 1
└── emit Burned(user, recipient, 0.994009, 0.002991, 1)
```

### Step 2: Relayer Detect & Process

```
Relayer polling setiap 5 detik
│
├── Scan Sepolia blocks...
│   └── Ditemukan! Burned event di block 10775545
│       ├── txHash: 0xef66d9f6...
│       ├── sender: user
│       ├── recipient: user (di LiteForge)
│       ├── amount: 0.994009 wzkLTC
│       └── nonce: 1
│
├── Simpan ke SQLite queue:
│   ├── type: UNLOCK
│   ├── status: PENDING
│   └── sourceTxHash: 0xef66d9f6...
│
├── Tunggu 3 block confirmations (~36 detik di Sepolia)
│   ├── Block +1 ✓ (~12 detik)
│   ├── Block +2 ✓ (~12 detik)
│   └── Block +3 ✓ (~12 detik) Confirmed!
│
├── Pre-flight checks:
│   ├── isProcessed() on LiteForge → false ✅
│   └── availableBalance() → 1.997 zkLTC > 0.994009 ✅
│
├── Execute unlock() di LiteForge:
│   │
│   ▼
│   BridgeVault.unlock(recipient, 0.994009, txHash, 1):
│   ├── Cek: msg.sender == relayer ✅
│   ├── Cek: processId belum diproses ✅
│   ├── Cek: available balance >= amount ✅
│   ├── processedUnlocks[processId] = true
│   ├── Transfer 0.994009 zkLTC ke recipient  ← TOKEN DIKIRIM!
│   └── emit Unlocked(recipient, 0.994009, processId)
│
└── Update queue: status = COMPLETED ✅
```

### Step 3: Verifikasi

User sekarang punya zkLTC kembali di LiteForge.

**State akhir:**
```
User:
├── LiteForge: +0.994009 zkLTC (di-unlock dari vault)
└── Sepolia:   0 wzkLTC (sudah di-burn)

Total fee yang dibayar user (round trip):
├── Lock fee:  0.003 zkLTC (0.3% dari 1)
├── Burn fee:  0.002991 wzkLTC (0.3% dari 0.997)
└── Total:     ~0.6% untuk round trip
```

---

## TAHAP 4: Error Handling & Retry

### Skenario: Vault Kosong Saat Unlock

```
Relayer detect Burned event
│
├── Pre-flight: availableBalance() = 0 zkLTC ❌
│
├── Execute unlock → GAGAL
│   └── Error: "Insufficient vault balance"
│
├── Queue update:
│   ├── status: FAILED
│   ├── retries: 1
│   └── error: "Insufficient vault balance"
│
├── [30 detik kemudian] Retry processor check...
│   └── Backoff: 10s × 2^1 = 20s → sudah lewat
│   └── Status: FAILED → RETRYING
│
├── [Owner top-up vault]
│   cast send $VAULT --value 5ether --legacy
│
├── [Queue processor] Execute unlock (attempt 2)
│   ├── Pre-flight: availableBalance() = 5 zkLTC ✅
│   ├── Execute unlock ✅
│   └── Status: COMPLETED ✅
```

### Retry Schedule (Exponential Backoff)

```
Attempt 1: Langsung
Attempt 2: Tunggu 10 detik    (10s × 2^0)
Attempt 3: Tunggu 20 detik    (10s × 2^1)
Attempt 4: Tunggu 40 detik    (10s × 2^2)
Attempt 5: Tunggu 80 detik    (10s × 2^3)
Attempt 6: DEAD → perlu manual intervention
```

### Manual Fix untuk DEAD Transaction

```bash
# Buka SQLite database
sqlite3 data/relayer.db

# Lihat transaksi DEAD
SELECT * FROM transactions WHERE status = 'DEAD';

# Reset untuk retry ulang
UPDATE transactions SET status = 'RETRYING', retries = 0 WHERE id = 1;
```

---

## Ringkasan Timeline

```
SETUP (sekali saja):
  1. Deploy BridgeVault ke LiteForge        (~10 detik)
  2. Deploy WrappedZkLTC ke Sepolia          (~15 detik)
  3. Top-up vault dengan zkLTC               (~5 detik)
  4. npm install di folder relayer           (~10 detik)
  5. Isi .env dengan contract addresses
  6. npm start                               (~2 detik)

BRIDGE zkLTC → wzkLTC (~20 detik total):
  1. User lock zkLTC                         (~2 detik)
  2. Relayer detect event                    (~5 detik)
  3. Wait 3 confirmations                    (~6 detik)
  4. Relayer mint wzkLTC                     (~7 detik)

BRIDGE wzkLTC → zkLTC (~45 detik total):
  1. User burn wzkLTC                        (~3 detik)
  2. Relayer detect event                    (~5 detik)
  3. Wait 3 confirmations                    (~36 detik, Sepolia block time ~12s)
  4. Relayer unlock zkLTC                    (~2 detik)
```
