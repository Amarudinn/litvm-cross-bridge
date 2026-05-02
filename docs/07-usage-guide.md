# LitVM Bridge - Usage Guide

## Cara Menggunakan Bridge

### Bridge zkLTC → wzkLTC (LiteForge → Sepolia)

#### Menggunakan Cast (CLI)

```bash
# Lock 0.1 zkLTC, terima wzkLTC di address yang sama
cast send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "lock(address)" YOUR_SEPOLIA_ADDRESS \
  --value 0.1ether \
  --rpc-url "https://liteforge.rpc.caldera.xyz/http" \
  --private-key YOUR_PRIVATE_KEY \
  --legacy

# Lock 1 zkLTC, terima wzkLTC di address berbeda
cast send 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "lock(address)" 0xRecipientOnSepolia \
  --value 1ether \
  --rpc-url "https://liteforge.rpc.caldera.xyz/http" \
  --private-key YOUR_PRIVATE_KEY \
  --legacy
```

#### Menggunakan ethers.js

```javascript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://liteforge.rpc.caldera.xyz/http', { chainId: 4441 });
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

const bridgeVault = new ethers.Contract(
  '0x6Bb77c1f465a18Bd16686330173B32821E59FD12',
  ['function lock(address _recipient) external payable'],
  wallet
);

// Lock 0.5 zkLTC
const tx = await bridgeVault.lock(
  '0xYourSepoliaAddress',
  { value: ethers.parseEther('0.5') }
);

console.log('Lock TX:', tx.hash);
const receipt = await tx.wait();
console.log('Confirmed! Block:', receipt.blockNumber);
// wzkLTC akan muncul di Sepolia dalam ~20 detik
```

#### Apa yang terjadi:
1. Anda kirim zkLTC ke BridgeVault
2. Fee 0.3% dipotong (misal: 0.1 zkLTC → fee 0.0003, net 0.0997)
3. Relayer detect event dalam ~5 detik
4. Relayer tunggu 3 block confirmations (~6 detik)
5. Relayer mint wzkLTC di Sepolia
6. Anda terima 0.0997 wzkLTC di Sepolia

---

### Bridge wzkLTC → zkLTC (Sepolia → LiteForge)

#### Menggunakan Cast (CLI)

```bash
# Burn 0.05 wzkLTC, terima zkLTC di address yang sama
cast send 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "burn(uint256,address)" 50000000000000000 YOUR_LITEFORGE_ADDRESS \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com" \
  --private-key YOUR_PRIVATE_KEY

# Note: amount dalam wei (0.05 ether = 50000000000000000)
```

#### Menggunakan ethers.js

```javascript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com', { chainId: 11155111 });
const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

const wrappedZkLTC = new ethers.Contract(
  '0x4320BB234A76f94F9eeDD0E81968668C6d29c39f',
  ['function burn(uint256 _amount, address _recipient) external'],
  wallet
);

// Burn 0.05 wzkLTC
const tx = await wrappedZkLTC.burn(
  ethers.parseEther('0.05'),
  '0xYourLiteForgeAddress'
);

console.log('Burn TX:', tx.hash);
const receipt = await tx.wait();
console.log('Confirmed! Block:', receipt.blockNumber);
// zkLTC akan muncul di LiteForge dalam ~45 detik
```

#### Apa yang terjadi:
1. Anda burn wzkLTC di Sepolia
2. Fee 0.3% dipotong (misal: 0.05 wzkLTC → fee 0.00015, net 0.04985)
3. Relayer detect event dalam ~5 detik
4. Relayer tunggu 3 block confirmations (~36 detik di Sepolia)
5. Relayer unlock zkLTC di LiteForge
6. Anda terima 0.04985 zkLTC di LiteForge

---

## Check Balance & Status

### Check wzkLTC Balance

```bash
cast call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "balanceOf(address)(uint256)" YOUR_ADDRESS \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

### Check BridgeVault Available Balance

```bash
cast call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "availableBalance()(uint256)" \
  --rpc-url "https://liteforge.rpc.caldera.xyz/http"
```

### Check wzkLTC Total Supply

```bash
cast call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "totalSupply()(uint256)" \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"
```

### Check if Transaction was Processed

```bash
# Check if a lock was already minted
cast call 0x4320BB234A76f94F9eeDD0E81968668C6d29c39f \
  "isProcessed(bytes32,uint256)(bool)" LOCK_TX_HASH LOCK_NONCE \
  --rpc-url "https://ethereum-sepolia-rpc.publicnode.com"

# Check if a burn was already unlocked
cast call 0x6Bb77c1f465a18Bd16686330173B32821E59FD12 \
  "isProcessed(bytes32,uint256)(bool)" BURN_TX_HASH BURN_NONCE \
  --rpc-url "https://liteforge.rpc.caldera.xyz/http"
```

---

## Fee Calculator

| Amount | Fee (0.3%) | You Receive |
|--------|-----------|-------------|
| 0.01 | 0.00003 | 0.00997 |
| 0.1 | 0.0003 | 0.0997 |
| 1.0 | 0.003 | 0.997 |
| 10.0 | 0.03 | 9.97 |
| 100.0 | 0.3 | 99.7 |

**Note**: Fee dikenakan di source chain saat lock/burn. Amount yang diterima di destination chain sudah net (setelah fee).

---

## Add wzkLTC to MetaMask

Untuk melihat wzkLTC di MetaMask (Sepolia network):

1. Buka MetaMask → Switch ke Sepolia network
2. Click "Import tokens"
3. Masukkan:
   - **Token Contract Address**: `0x4320BB234A76f94F9eeDD0E81968668C6d29c39f`
   - **Token Symbol**: `wzkLTC`
   - **Token Decimal**: `18`
4. Click "Add Custom Token"

---

## Add LiteForge Network to MetaMask

1. Buka MetaMask → Settings → Networks → Add Network
2. Masukkan:
   - **Network Name**: LiteForge
   - **RPC URL**: `https://liteforge.rpc.caldera.xyz/http`
   - **Chain ID**: `4441`
   - **Currency Symbol**: `zkLTC`
   - **Block Explorer URL**: `https://liteforge.explorer.caldera.xyz`
3. Click "Save"

---

## Troubleshooting

### "Transaction belum muncul di destination chain"

1. Tunggu minimal 30-60 detik (3 block confirmations + execution time)
2. Check relayer masih running
3. Check relayer punya gas di destination chain
4. Check BridgeVault punya liquidity (untuk unlock)

### "Minimum amount error"

- Minimum lock: 0.001 zkLTC
- Minimum burn: 0.001 wzkLTC

### "Contract paused"

- Bridge sedang di-maintenance
- Hubungi admin/owner

### "Insufficient balance" saat burn

- Pastikan Anda punya cukup wzkLTC
- Check balance: `balanceOf(yourAddress)`
