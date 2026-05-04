# LitVM Bridge - Fee Management

## Overview

Setiap transaksi bridge dikenakan fee **0.3%** (30 basis points). Fee ini masuk ke **owner contract** — wallet yang deploy BridgeVault dan WrappedZkLTC.

## Cara Kerja Fee

### Lock (LiteForge → Sepolia)

```
User lock 1 zkLTC ke BridgeVault
│
▼
BridgeVault.lock():
├── Hitung fee: 1 × 30 / 10000 = 0.003 zkLTC
├── Hitung net: 1 - 0.003 = 0.997 zkLTC
├── accumulatedFees += 0.003    ← fee disimpan di contract
├── Net amount terkunci di vault
└── emit Locked(sender, recipient, 0.997, 0.003, nonce)

Relayer mint 0.997 wzkLTC ke user di Sepolia
```

Fee **tetap di dalam BridgeVault contract** sebagai `accumulatedFees`. Owner harus panggil `withdrawFees()` untuk mengambilnya.

### Burn (Sepolia → LiteForge)

```
User burn 0.997 wzkLTC di WrappedZkLTC
│
▼
WrappedZkLTC.burn():
├── Hitung fee: 0.997 × 30 / 10000 = 0.002991 wzkLTC
├── Hitung net: 0.997 - 0.002991 = 0.994009 wzkLTC
├── _burn(user, 0.997)          ← semua di-burn
├── _mint(owner, 0.002991)      ← fee langsung di-mint ke owner
└── emit Burned(sender, recipient, 0.994009, 0.002991, nonce)

Relayer unlock 0.994009 zkLTC ke user di LiteForge
```

Fee **langsung di-mint sebagai wzkLTC ke wallet owner**. Tidak perlu withdraw — otomatis masuk ke wallet.

## Ringkasan Fee

| Arah | Fee | Disimpan di | Cara Ambil |
|------|-----|------------|-----------|
| Lock (LF → Sep) | 0.3% dari zkLTC | BridgeVault (`accumulatedFees`) | `withdrawFees()` |
| Burn (Sep → LF) | 0.3% dari wzkLTC | Langsung ke wallet owner | Otomatis |

## Fee Calculator

| Amount | Fee (0.3%) | User Terima |
|--------|-----------|-------------|
| 0.01 | 0.00003 | 0.00997 |
| 0.1 | 0.0003 | 0.0997 |
| 1.0 | 0.003 | 0.997 |
| 10.0 | 0.03 | 9.97 |
| 100.0 | 0.3 | 99.7 |
| 1,000.0 | 3.0 | 997.0 |

### Round Trip Fee

Jika user bridge zkLTC → wzkLTC → zkLTC (bolak-balik):

```
Lock 1 zkLTC:
  Fee: 0.003 zkLTC
  Terima: 0.997 wzkLTC di Sepolia

Burn 0.997 wzkLTC:
  Fee: 0.002991 wzkLTC
  Terima: 0.994009 zkLTC di LiteForge

Total fee round trip: ~0.6%
```

## Withdraw Fee

> Semua perintah dijalankan dari folder `contracts`:
> - CMD: `cd C:\Users\User\OneDrive\Desktop\all-folder\litvm\contracts`
> - Foundry cast path: `C:\Users\User\.foundry\bin\cast.exe`

### Set Private Key

**CMD (Command Prompt):**
```cmd
set PRIVATE_KEY=0xYOUR_PRIVATE_KEY
```

**PowerShell:**
```powershell
$env:PRIVATE_KEY = "0xYOUR_PRIVATE_KEY"
```

### Cek Accumulated Fees

**CMD:**
```cmd
C:\Users\User\.foundry\bin\cast.exe call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "accumulatedFees()(uint256)" --rpc-url https://liteforge.rpc.caldera.xyz/http
```

**PowerShell:**
```powershell
C:\Users\User\.foundry\bin\cast.exe call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "accumulatedFees()(uint256)" --rpc-url https://liteforge.rpc.caldera.xyz/http
```

Output dalam wei. Contoh: `5103000000000000` = 0.005103 zkLTC.

### Withdraw Fees dari BridgeVault (zkLTC)

**CMD:**
```cmd
C:\Users\User\.foundry\bin\cast.exe send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "withdrawFees()" --rpc-url https://liteforge.rpc.caldera.xyz/http --private-key %PRIVATE_KEY% --legacy
```

**PowerShell:**
```powershell
C:\Users\User\.foundry\bin\cast.exe send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "withdrawFees()" --rpc-url https://liteforge.rpc.caldera.xyz/http --private-key $env:PRIVATE_KEY --legacy
```

- Hanya **owner** yang bisa panggil
- Semua `accumulatedFees` dikirim ke wallet owner
- `accumulatedFees` di-reset ke 0
- Jika fees = 0, transaksi akan revert

### Cek wzkLTC Fee Balance (Sepolia)

Fee dari burn otomatis masuk ke wallet owner sebagai wzkLTC:

**CMD / PowerShell (sama):**
```cmd
C:\Users\User\.foundry\bin\cast.exe call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f "balanceOf(address)(uint256)" 0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

Owner bisa:
- **Hold** wzkLTC
- **Burn** wzkLTC untuk unlock zkLTC di LiteForge (bridge balik)
- **Transfer** wzkLTC ke wallet lain

## Ubah Fee Percentage

Owner bisa ubah fee (max 5%):

**CMD:**
```cmd
:: Set fee ke 0.5% (50 basis points) di LiteForge
C:\Users\User\.foundry\bin\cast.exe send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "setFeePercent(uint256)" 50 --rpc-url https://liteforge.rpc.caldera.xyz/http --private-key %PRIVATE_KEY% --legacy

:: Set fee di Sepolia juga (harus sama)
C:\Users\User\.foundry\bin\cast.exe send 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f "setFeePercent(uint256)" 50 --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key %PRIVATE_KEY%
```

**PowerShell:**
```powershell
# Set fee ke 0.5% (50 basis points) di LiteForge
C:\Users\User\.foundry\bin\cast.exe send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "setFeePercent(uint256)" 50 --rpc-url https://liteforge.rpc.caldera.xyz/http --private-key $env:PRIVATE_KEY --legacy

# Set fee di Sepolia juga (harus sama)
C:\Users\User\.foundry\bin\cast.exe send 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f "setFeePercent(uint256)" 50 --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $env:PRIVATE_KEY
```

| Basis Points | Percentage |
|-------------|-----------|
| 10 | 0.1% |
| 30 | 0.3% (default) |
| 50 | 0.5% |
| 100 | 1% |
| 500 | 5% (maximum) |

> Fee di BridgeVault dan WrappedZkLTC **independen** — bisa berbeda, tapi disarankan sama agar konsisten.

## Cek Available Balance (Vault Liquidity)

Available balance = total balance - accumulated fees:

**CMD / PowerShell (sama):**
```cmd
C:\Users\User\.foundry\bin\cast.exe call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "availableBalance()(uint256)" --rpc-url https://liteforge.rpc.caldera.xyz/http
```

Ini adalah jumlah zkLTC yang tersedia untuk unlock. Jika 0, unlock akan gagal.

## Perbedaan CMD vs PowerShell

| | CMD | PowerShell |
|---|---|---|
| Set variable | `set PRIVATE_KEY=0x...` | `$env:PRIVATE_KEY = "0x..."` |
| Pakai variable | `%PRIVATE_KEY%` | `$env:PRIVATE_KEY` |
| Comment | `:: komentar` | `# komentar` |
| Perintah cast | Sama | Sama |

## Owner & Contract Addresses

| Role | Address |
|------|---------|
| Owner / Relayer | `0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c` |
| BridgeVault (LiteForge) | `0x6Bb77c1f465a18Bd16686330173B32821E59FD12` |
| WrappedZkLTC (Sepolia) | `0x4320BB234A76f94F9eeDD0E81968668C6d29c39f` |

## Monitoring Fee

### Cek semua fee info

**CMD:**
```cmd
echo === BridgeVault (LiteForge) ===

echo Accumulated Fees:
C:\Users\User\.foundry\bin\cast.exe call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "accumulatedFees()(uint256)" --rpc-url https://liteforge.rpc.caldera.xyz/http

echo Available Balance:
C:\Users\User\.foundry\bin\cast.exe call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "availableBalance()(uint256)" --rpc-url https://liteforge.rpc.caldera.xyz/http

echo Fee Percent (basis points):
C:\Users\User\.foundry\bin\cast.exe call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 "feePercent()(uint256)" --rpc-url https://liteforge.rpc.caldera.xyz/http

echo === WrappedZkLTC (Sepolia) ===

echo Owner wzkLTC Balance:
C:\Users\User\.foundry\bin\cast.exe call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f "balanceOf(address)(uint256)" 0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c --rpc-url https://ethereum-sepolia-rpc.publicnode.com

echo Fee Percent (basis points):
C:\Users\User\.foundry\bin\cast.exe call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f "feePercent()(uint256)" --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

> Output dalam wei. Untuk konversi: bagi dengan 1000000000000000000 (10^18). Contoh: `5103000000000000` = 0.005103.
