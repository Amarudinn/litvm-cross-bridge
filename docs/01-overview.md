# LitVM Bridge - Project Overview

## Apa itu LitVM Bridge?

LitVM Bridge adalah cross-chain bridge yang menghubungkan **LiteForge** (Layer 2) dengan **Sepolia** (Ethereum Testnet) menggunakan mekanisme **Lock & Mint** dengan Relayer service.

User yang bridge zkLTC dari LiteForge akan menerima **wzkLTC** (Wrapped zkLTC) sebagai representasi token di chain Sepolia, dan sebaliknya bisa burn wzkLTC di Sepolia untuk mendapatkan kembali zkLTC asli di LiteForge.

## Chain Details

| Property | LiteForge | Sepolia |
|----------|-----------|---------|
| Chain ID | 4441 | 11155111 |
| Native Token | zkLTC | ETH |
| RPC URL | https://liteforge.rpc.caldera.xyz/http | https://ethereum-sepolia-rpc.publicnode.com |
| Explorer | https://liteforge.explorer.caldera.xyz | https://sepolia.etherscan.io |
| Tipe | Layer 2 (Caldera) | Ethereum Testnet |

## Deployed Contracts

| Contract | Chain | Address |
|----------|-------|---------|
| BridgeVault | LiteForge (4441) | `0x6Bb77c1f465a18Bd16686330173B32821E59FD12` |
| WrappedZkLTC (wzkLTC) | Sepolia (11155111) | `0x4320BB234A76f94F9eeDD0E81968668C6d29c39f` |

## Mekanisme: Lock & Mint

### Kenapa Lock & Mint?

Ada beberapa pendekatan untuk cross-chain bridge:

1. **Lock & Mint** (yang kita gunakan) - Lock token asli di chain asal, mint wrapped token di chain tujuan
2. **AMM Pool** - Liquidity pool di kedua chain, pricing otomatis
3. **Intent-based** - User submit intent, relayer compete untuk fulfill

Kita memilih **Lock & Mint** karena:
- **Simple & reliable** - Tidak perlu liquidity pool besar
- **1:1 backing** - Setiap wzkLTC selalu di-back oleh zkLTC yang terkunci
- **Predictable pricing** - Tidak ada slippage, rate selalu 1:1 (minus fee)
- **Cocok untuk testnet** - Mudah di-deploy dan di-test

### Flow: LiteForge → Sepolia

```
User                    BridgeVault (LiteForge)     Relayer              WrappedZkLTC (Sepolia)
  │                            │                       │                        │
  │── lock(recipient) ────────►│                       │                        │
  │   (kirim zkLTC)            │                       │                        │
  │                            │── emit Locked ───────►│                        │
  │                            │   (amount, nonce)     │                        │
  │                            │                       │── mint(recipient) ────►│
  │                            │                       │   (amount, proof)      │
  │                            │                       │                        │── wzkLTC ke user
  │                            │                       │                        │
```

1. User memanggil `lock(recipientAddress)` di BridgeVault dengan mengirim zkLTC
2. Contract menghitung fee (0.3%), lock net amount, emit event `Locked`
3. Relayer mendeteksi event `Locked` di LiteForge
4. Relayer menunggu 3 block confirmations
5. Relayer memanggil `mint()` di WrappedZkLTC contract di Sepolia
6. User menerima wzkLTC di Sepolia

### Flow: Sepolia → LiteForge

```
User                    WrappedZkLTC (Sepolia)      Relayer              BridgeVault (LiteForge)
  │                            │                       │                        │
  │── burn(amount, recipient)─►│                       │                        │
  │                            │── burn wzkLTC         │                        │
  │                            │── emit Burned ───────►│                        │
  │                            │   (amount, nonce)     │                        │
  │                            │                       │── unlock(recipient) ──►│
  │                            │                       │   (amount, proof)      │
  │                            │                       │                        │── zkLTC ke user
  │                            │                       │                        │
```

1. User memanggil `burn(amount, recipientAddress)` di WrappedZkLTC
2. Contract menghitung fee (0.3%), burn full amount, mint fee ke owner, emit event `Burned`
3. Relayer mendeteksi event `Burned` di Sepolia
4. Relayer menunggu 3 block confirmations
5. Relayer memanggil `unlock()` di BridgeVault contract di LiteForge
6. User menerima zkLTC di LiteForge

## Fee Structure

- **Fee**: 0.3% per transaksi (30 basis points)
- **Maximum fee**: 5% (500 basis points) - configurable oleh owner
- **Fee collection**:
  - Lock (LiteForge → Sepolia): Fee disimpan di BridgeVault, owner bisa withdraw
  - Burn (Sepolia → LiteForge): Fee di-mint sebagai wzkLTC ke owner

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Smart Contracts | Solidity 0.8.24, Foundry |
| Contract Libraries | OpenZeppelin v5.6.1 |
| Relayer Backend | Node.js (ES Modules) |
| Blockchain Interaction | ethers.js v6 |
| Transaction Queue | SQLite (better-sqlite3) |
| Logging | Winston |
| Configuration | dotenv |
