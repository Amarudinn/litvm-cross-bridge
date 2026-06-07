# Multyra

Bridge, swap, and predict all in one platform. Multyra connects LiteForge with Ethereum testnets through a high-performance cross-chain bridge, multi-DEX aggregator, and on-chain prediction market

## Overview

Multyra is a DeFi ecosystem connecting **LiteForge** (L2, Chain 4441) with **Sepolia** and **Base Sepolia**. It consists of three core products:

| Product | Description |
|---------|-------------|
| **Bridge** | Lock & Mint cross-chain bridge for zkLTC ↔ wzkLTC |
| **Swap** | DEX aggregator powered by Uniswap V3 |
| **Predict** | Ticket-based prediction market |

## Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│   LiteForge     │       │    Relayers     │       │  Sepolia /       │
│   (Chain 4441)  │◄─────►│    (Node.js)    │◄─────►│  Base Sepolia    │
│                 │       │                 │       │                  │
│  BridgeVaultV2  │       │  Bridge Relayer │       │  WrappedZkLTC    │
│  MultyraRouter  │       │  Pred. Relayer  │       │  MultyraRouter   │
│  MultyraMarketV2│       │  SQLite + Supa  │       │                  │
│  MULTYToken     │       │  Express API    │       │  MULTYToken      │
└─────────────────┘       └─────────────────┘       └──────────────────┘
```

### Bridge Flow

1. **Lock → Mint:** User locks zkLTC on LiteForge → Relayer detects `Locked` event → Mints wzkLTC on destination chain
2. **Burn → Unlock:** User burns wzkLTC on destination → Relayer detects `Burned` event → Unlocks zkLTC on LiteForge

### Fees

- **Bridge:** 0.3% per transaction (~0.6% round trip)
- **Swap Aggregator:** 0.1% (10 bps) per swap

## Project Structure

```
├── contracts/             # Solidity smart contracts (Foundry)
├── relayer/               # Bridge relayer service (Node.js)
├── prediction-relayer/    # Prediction market event indexer (Node.js)
├── frontend/              # React DApp Bridge, Swap, Predict (Vite + TypeScript)
├── landing/               # Marketing landing page (Next.js)
├── supabase/              # Database schema & migrations
├── docs/                  # Technical documentation (18 files)
└── images/                # Project images
```

## Deployed Contracts

### Bridge

| Contract | Chain | Address |
|----------|-------|---------|
| BridgeVaultV2 | LiteForge (4441) | `0x9929ED0EdA9ecF57BDAB6423B4b12cDe3317196d` |
| WrappedZkLTC | Sepolia (11155111) | `0x4320BB234A76f94F9eeDD0E81968668C6d29c39f` |
| WrappedZkLTC | Base Sepolia (84532) | `0xB378f0359815ECEC5Ae3c5aC4c49c12b70931688` |

### Prediction Market

| Contract | Chain | Address |
|----------|-------|---------|
| MultyraMarketV2 | LiteForge (4441) | `0x6F1Cde75e2EB91b858cfEd2E9CbD7a19EbDeeFBa` |

### Tokens

| Token | Chain | Address |
|-------|-------|---------|
| MULTY | LiteForge | `0x4630632194D44BC7205BA41CBB0a2014AD36A4Fc` |
| MULTY | Sepolia | `0x12472B2115849f146c10Cc435bc329423A08FC19` |
| MULTY | Base Sepolia | `0x1cBbf0AC851414A95c82CAa9032778203398dCd7` |

### DEX Multyra V3

| Component | LiteForge | Sepolia | Base Sepolia |
|-----------|-----------|---------|--------------|
| Factory | `0x2305fd1E...714D` | `0x38aE7cDA...23E6` | `0x622C7B14...d7a` |
| SwapRouter | `0x97A0A49B...4913` | `0xb585F4f0...2f9` | `0x42fF1a3d...35f` |
| Quoter | `0x344bBD93...fC44` | `0xe168E339...a2C` | `0xCAbe1099...0Bc` |
| PositionManager | `0x660b3ad8...7077` | `0x805BfFBa...449` | `0x5e04Ca8b...814` |

## Supported Chains

| Chain | ID | Native Token | RPC | Explorer |
|-------|----|--------------|-----|----------|
| LiteForge | 4441 | zkLTC | `https://liteforge.rpc.caldera.xyz/http` | [Explorer](https://liteforge.explorer.caldera.xyz) |
| Sepolia | 11155111 | ETH | `https://ethereum-sepolia-rpc.publicnode.com` | [Etherscan](https://sepolia.etherscan.io) |
| Base Sepolia | 84532 | ETH | `https://sepolia.base.org` | [BaseScan](https://sepolia.basescan.org) |

## Tech Stack

| Component | Stack |
|-----------|-------|
| Contracts | Solidity 0.8.24, Foundry, OpenZeppelin v5, Uniswap V3 |
| Bridge Relayer | Node.js, ethers.js v6, Express v5, better-sqlite3, Winston |
| Prediction Relayer | Node.js, ethers.js v6, Express v5, better-sqlite3, Supabase |
| Frontend | React 19, Vite 8, TypeScript, TailwindCSS, wagmi v2, RainbowKit, Zustand, Framer Motion, GSAP |
| Landing | Next.js 16, TailwindCSS, Framer Motion, Lenis, Radix UI |
| Database | Supabase (PostgreSQL), SQLite (local queues) |

## Getting Started

### Prerequisites

- Node.js >= 18
- Foundry (for smart contracts)
- Git

### Contracts

```bash
cd contracts
cp .env.example .env # configure private key & RPC endpoints
forge install
forge build
forge test -vvv
```

### Bridge Relayer

```bash
cd relayer
cp .env.example .env # configure private key, RPCs, contract addresses
npm install
npm start
```

### Prediction Relayer

```bash
cd prediction-relayer
cp .env.example .env # configure RPC, contract address, Supabase
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### Landing Page

```bash
cd landing
npm install
npm run dev
```

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Bridge | Cross-chain bridge interface |
| `/swap` | Swap | DEX aggregator with multi-pool routing |
| `/history` | History | Bridge transaction history |
| `/explorer` | Explorer | Bridge transaction explorer |
| `/predict` | Markets | Prediction market listing |
| `/predict/market/:id` | Market Detail | Buy tickets, view outcomes |
| `/predict/leaderboard` | Leaderboard | Top predictors ranking |
| `/predict/profile` | Profile | User prediction profile |
| `/docs` | Docs | Documentation viewer |

## Environment Variables

### Bridge Relayer

| Variable | Description | Default |
|----------|-------------|---------|
| `RELAYER_PRIVATE_KEY` | Wallet private key (needs funds on all chains) | - |
| `LITEFORGE_RPC_URLS` | Comma-separated RPC endpoints | - |
| `SEPOLIA_RPC_URLS` | Comma-separated RPC endpoints | - |
| `BASE_SEPOLIA_RPC_URLS` | Comma-separated RPC endpoints | - |
| `BRIDGE_VAULT_ADDRESS` | BridgeVaultV2 contract on LiteForge | - |
| `WRAPPED_ZKLTC_ADDRESS` | WrappedZkLTC on Sepolia | — |
| `WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS` | WrappedZkLTC on Base Sepolia | - |
| `POLL_INTERVAL_MS` | Event polling interval | `2000` |
| `CONFIRMATION_BLOCKS` | Block confirmations before relay | `3` |
| `MAX_RETRIES` | Retry count on failure | `7` |
| `MINT_CONCURRENCY` | Parallel mint workers (Sepolia) | `8` |
| `MINT_BASE_SEPOLIA_CONCURRENCY` | Parallel mint workers (Base Sepolia) | `8` |
| `UNLOCK_CONCURRENCY` | Parallel unlock workers | `8` |
| `SUPABASE_URL` | Supabase project URL | - |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | - |
| `ADMIN_PORT` | Admin API port | `3001` |
| `ADMIN_API_KEY` | Secret key for admin endpoints | - |

### Prediction Relayer

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL_PRIMARY` | Primary RPC endpoint | - |
| `RPC_URL_FALLBACK` | Fallback RPC endpoint | - |
| `CONTRACT_ADDRESS` | MultyraMarketV2 contract address | - |
| `CONTRACT_DEPLOY_BLOCK` | Block number to start indexing from | - |
| `SUPABASE_URL` | Supabase project URL | - |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | - |
| `POLL_INTERVAL_MS` | Event polling interval | `5000` |
| `BLOCK_CHUNK_SIZE` | Blocks per query batch | `5000` |
| `AUTO_CLOSE_CHECK_INTERVAL_MS` | Auto-close check interval | `30000` |
| `ADMIN_PORT` | Admin API port | `3001` |
| `ADMIN_PRIVATE_KEY` | Admin wallet private key | - |
| `ADMIN_PASSPHRASE` | Admin authentication passphrase | - |

## Key Features

### Bridge
- **Lock & Mint** : 1:1 backed, no AMM slippage
- **Multi-chain** : LiteForge ↔ Sepolia, LiteForge ↔ Base Sepolia
- **Parallel Execution** : Up to 8x concurrent workers per direction
- **RPC Fallback** : Automatic rotation on endpoint failure
- **Double Replay Protection** : Database UNIQUE constraint + on-chain mapping
- **Exponential Backoff** : Auto-retry with escalating intervals
- **Fee Management** : Configurable 0.3% fee with owner withdrawal

### DEX Aggregator
- **Multi-DEX Routing** : Multyra V3 (Uniswap V3 fork)
- **Cross-chain Swaps** : Bridge + swap in a single flow
- **Liquidity Pools** : 7 deployed pools across 3 chains
- **Pool Management** : Create pools, add/remove liquidity, manage positions

### Prediction Market
- **Ticket-based** : Buy tickets on market outcomes
- **Auto-close** : Markets automatically close at expiry
- **Leaderboard** : Global ranking of top predictors
- **Event Indexing** : Real-time blockchain event processing

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `BridgeVaultV2.sol` | Multi-chain bridge vault with fee support (lock/unlock) |
| `WrappedZkLTC.sol` | ERC20 wrapped token on destination chains (mint/burn) |
| `MultyraMarketV2.sol` | Ticket-based prediction market |
| `MultyraRouter.sol` | DEX aggregator/router |
| `MULTYToken.sol` | MULTY governance token (ERC20) |
| `WETH9.sol` | Wrapped ETH |

## Testing

```bash
cd contracts
forge test -vvv
```

End-to-end testnet verification:
- **Lock → Mint:** ~20s latency
- **Burn → Unlock:** ~6s latency
- **Auto-retry:** Recovery after vault top-up

## Security

- Replay protection (on-chain + database)
- Emergency pause mechanism
- 3-block confirmation before relay
- Input validation & sanitization on admin API
- RLS on Supabase (read-only public access)

## Database Schema

The Supabase database includes:

- **`bridge_transactions`** — Tracks all bridge transactions (direction, source/dest hashes, sender, recipient, amount, fee, status)
- **`bridge_stats`** — Aggregated bridge statistics (materialized view)
- **`prediction_markets`** — Cached prediction market data (address, pair, prices, status, pool, volume, outcomes)

Supported bridge routes: `liteforge_to_sepolia`, `sepolia_to_liteforge`, `liteforge_to_basesepolia`, `basesepolia_to_liteforge`

## License

MIT
