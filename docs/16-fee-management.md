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

### Cek Accumulated Fees

```bash
cast call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "accumulatedFees()(uint256)" \
  --rpc-url https://liteforge.rpc.caldera.xyz/http
```

Output dalam wei. Konversi ke ether:

```bash
cast call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "accumulatedFees()(uint256)" \
  --rpc-url https://liteforge.rpc.caldera.xyz/http | xargs cast from-wei
```

### Withdraw Fees dari BridgeVault (zkLTC)

```bash
cast send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "withdrawFees()" \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --private-key $PRIVATE_KEY \
  --legacy
```

- Hanya **owner** yang bisa panggil
- Semua `accumulatedFees` dikirim ke wallet owner
- `accumulatedFees` di-reset ke 0
- Jika fees = 0, transaksi akan revert

### Cek wzkLTC Fee Balance (Sepolia)

Fee dari burn otomatis masuk ke wallet owner sebagai wzkLTC:

```bash
cast call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "balanceOf(address)(uint256)" 0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
```

Owner bisa:
- **Hold** wzkLTC
- **Burn** wzkLTC untuk unlock zkLTC di LiteForge (bridge balik)
- **Transfer** wzkLTC ke wallet lain

## Ubah Fee Percentage

Owner bisa ubah fee (max 5%):

```bash
# Set fee ke 0.5% (50 basis points)
cast send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "setFeePercent(uint256)" 50 \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --private-key $PRIVATE_KEY \
  --legacy

# Set fee di Sepolia juga (harus sama)
cast send 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "setFeePercent(uint256)" 50 \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
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

```bash
cast call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "availableBalance()(uint256)" \
  --rpc-url https://liteforge.rpc.caldera.xyz/http | xargs cast from-wei
```

Ini adalah jumlah zkLTC yang tersedia untuk unlock. Jika 0, unlock akan gagal.

## Owner & Contract Addresses

| Role | Address |
|------|---------|
| Owner / Relayer | `0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c` |
| BridgeVault (LiteForge) | `0x6Bb77c1f465a18Bd16686330173B32821E59FD12` |
| WrappedZkLTC (Sepolia) | `0x4320BB234A76f94F9eeDD0E81968668C6d29c39f` |

## Monitoring Fee

### Cek semua fee info sekaligus

```bash
echo "=== BridgeVault (LiteForge) ==="
echo -n "Accumulated Fees: "
cast call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "accumulatedFees()(uint256)" \
  --rpc-url https://liteforge.rpc.caldera.xyz/http | xargs cast from-wei
echo " zkLTC"

echo -n "Available Balance: "
cast call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "availableBalance()(uint256)" \
  --rpc-url https://liteforge.rpc.caldera.xyz/http | xargs cast from-wei
echo " zkLTC"

echo -n "Fee Percent: "
cast call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "feePercent()(uint256)" \
  --rpc-url https://liteforge.rpc.caldera.xyz/http
echo " basis points"

echo ""
echo "=== WrappedZkLTC (Sepolia) ==="
echo -n "Owner wzkLTC Balance: "
cast call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "balanceOf(address)(uint256)" 0x484E0cAA0e211309771d1Be3A59EbC5F4cD0Cb4c \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com | xargs cast from-wei
echo " wzkLTC"

echo -n "Fee Percent: "
cast call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "feePercent()(uint256)" \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com
echo " basis points"
```
