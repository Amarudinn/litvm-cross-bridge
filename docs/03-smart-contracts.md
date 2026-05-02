# LitVM Bridge - Smart Contracts

## BridgeVault.sol

**Chain**: LiteForge (Chain ID: 4441)
**Address**: `0x6Bb77c1f465a18Bd16686330173B32821E59FD12`
**Explorer**: https://liteforge.explorer.caldera.xyz/address/0x6Bb77c1f465a18Bd16686330173B32821E59FD12

### Fungsi Utama

#### `lock(address _recipient) payable`

Mengunci native zkLTC untuk di-bridge ke Sepolia.

- **Parameter**: `_recipient` - alamat yang akan menerima wzkLTC di Sepolia
- **Value**: Jumlah zkLTC yang ingin di-bridge (dikirim sebagai msg.value)
- **Fee**: 0.3% dipotong dari amount
- **Event**: `Locked(sender, recipient, netAmount, fee, nonce)`

```solidity
// Contoh: Lock 1 zkLTC
bridgeVault.lock{value: 1 ether}(0xRecipientAddress);
// Net amount: 0.997 zkLTC (setelah 0.3% fee)
```

#### `unlock(address _recipient, uint256 _amount, bytes32 _burnTxHash, uint256 _sourceNonce)`

Membuka kunci zkLTC ke user (dipanggil oleh relayer setelah burn di Sepolia).

- **Access**: Hanya relayer
- **Replay Protection**: processId = keccak256(burnTxHash, sourceNonce)
- **Event**: `Unlocked(recipient, amount, processId)`

### Fungsi Admin

| Function | Description |
|----------|-------------|
| `setRelayer(address)` | Ganti relayer address |
| `setFeePercent(uint256)` | Ganti fee (max 500 = 5%) |
| `setMinLockAmount(uint256)` | Ganti minimum lock amount |
| `withdrawFees()` | Withdraw accumulated fees ke owner |
| `pause()` / `unpause()` | Emergency pause/unpause |

### View Functions

| Function | Returns |
|----------|---------|
| `availableBalance()` | Balance yang tersedia untuk unlock (total - fees) |
| `isProcessed(bytes32, uint256)` | Cek apakah unlock sudah diproses |
| `relayer()` | Relayer address |
| `feePercent()` | Fee dalam basis points |
| `nonce()` | Current lock nonce |
| `accumulatedFees()` | Total fees yang bisa di-withdraw |

---

## WrappedZkLTC.sol

**Chain**: Sepolia (Chain ID: 11155111)
**Address**: `0x4320BB234A76f94F9eeDD0E81968668C6d29c39f`
**Explorer**: https://sepolia.etherscan.io/address/0x4320BB234A76f94F9eeDD0E81968668C6d29c39f

### Token Info

| Property | Value |
|----------|-------|
| Name | Wrapped zkLTC |
| Symbol | wzkLTC |
| Decimals | 18 |
| Standard | ERC20 |

### Fungsi Utama

#### `mint(address _recipient, uint256 _amount, bytes32 _lockTxHash, uint256 _sourceNonce)`

Mint wzkLTC ke user (dipanggil oleh relayer setelah lock di LiteForge).

- **Access**: Hanya relayer
- **Replay Protection**: processId = keccak256(lockTxHash, sourceNonce)
- **Event**: `Minted(recipient, amount, processId)`

#### `burn(uint256 _amount, address _recipient)`

Burn wzkLTC untuk unlock zkLTC di LiteForge.

- **Parameter**: `_amount` - jumlah wzkLTC yang ingin di-burn
- **Parameter**: `_recipient` - alamat yang akan menerima zkLTC di LiteForge
- **Fee**: 0.3% dipotong dari amount, di-mint sebagai wzkLTC ke owner
- **Event**: `Burned(sender, recipient, netAmount, fee, nonce)`

```solidity
// Contoh: Burn 1 wzkLTC
wrappedZkLTC.burn(1 ether, 0xRecipientOnLiteForge);
// Net amount: 0.997 wzkLTC (setelah 0.3% fee)
// User akan menerima 0.997 zkLTC di LiteForge
```

### Fungsi Admin

| Function | Description |
|----------|-------------|
| `setRelayer(address)` | Ganti relayer address |
| `setFeePercent(uint256)` | Ganti fee (max 500 = 5%) |
| `setMinBurnAmount(uint256)` | Ganti minimum burn amount |
| `pause()` / `unpause()` | Emergency pause/unpause |

### View Functions

| Function | Returns |
|----------|---------|
| `isProcessed(bytes32, uint256)` | Cek apakah mint sudah diproses |
| `relayer()` | Relayer address |
| `feePercent()` | Fee dalam basis points |
| `nonce()` | Current burn nonce |
| `totalSupply()` | Total wzkLTC yang beredar |
| `balanceOf(address)` | Balance wzkLTC user |

---

## Deployment

### Prerequisites

- Foundry (forge) terinstall
- Private key dengan balance di kedua chain
- Relayer address yang akan digunakan

### Deploy BridgeVault ke LiteForge

```bash
cd contracts

# Set environment
export PRIVATE_KEY=0x...
export RELAYER_ADDRESS=0x...

# Deploy
forge script script/DeployBridgeVault.s.sol:DeployBridgeVault \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy
```

> **Note**: LiteForge tidak support EIP-1559, harus pakai `--legacy` flag.

### Deploy WrappedZkLTC ke Sepolia

```bash
# Deploy
forge script script/DeployWrappedZkLTC.s.sol:DeployWrappedZkLTC \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY \
  --broadcast

# Optional: Verify on Etherscan
forge script script/DeployWrappedZkLTC.s.sol:DeployWrappedZkLTC \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify --etherscan-api-key $ETHERSCAN_API_KEY
```

### Post-Deployment: Top-up Vault Liquidity

BridgeVault perlu memiliki zkLTC untuk bisa melakukan unlock. Kirim zkLTC ke contract:

```bash
cast send $BRIDGE_VAULT_ADDRESS \
  --value 10ether \
  --rpc-url https://liteforge.rpc.caldera.xyz/http \
  --private-key $PRIVATE_KEY \
  --legacy
```

---

## Compile & Test

```bash
cd contracts

# Compile
forge build

# Run all tests
forge test

# Run tests with verbosity
forge test -vvv

# Run specific test file
forge test --match-path test/BridgeVault.t.sol

# Run specific test function
forge test --match-test test_lock_success
```
