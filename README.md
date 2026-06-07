# Multyra

**Multi-product DeFi platform on LiteForge** — Cross-chain Bridge, DEX Aggregator, and Prediction Market.

Built with Solidity smart contracts, Node.js relayer services, a React DApp, and a Next.js landing page.

## Overview

Multyra is a DeFi ecosystem connecting **LiteForge** (L2, Chain 4441) with **Sepolia** and **Base Sepolia**. It consists of three core products:

| Product | Description |
|---------|-------------|
| **Bridge** | Lock & Mint cross-chain bridge for zkLTC ↔ wzkLTC |
| **Swap** | DEX aggregator powered by Uniswap V3 and Wolfdex V2 |
| **Predict** | Ticket-based prediction market (Rivalis) |

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
├── frontend/              # React DApp — Bridge, Swap, Predict (Vite + TypeScript)
├── landing/               # Marketing landing page (Next.js)
├── bot/                   # Automated bridge testing bot (3 parallel wallets)
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

### DEX — Multyra V3

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
| Bot | Node.js, ethers.js v6, Chalk (3 parallel wallets) |
| Database | Supabase (PostgreSQL), SQLite (local queues) |
| Deployment | Vercel (frontend & landing) |

## Getting Started

### Prerequisites

- Node.js >= 18
- Foundry (for smart contracts)
- Git

### Contracts

```bash
cd contracts
cp .env.example .env    # configure private key & RPC endpoints
forge install
forge build
forge test -vvv
```

### Bridge Relayer

```bash
cd relayer
cp .env.example .env    # configure private key, RPCs, contract addresses
npm install
npm start
```

### Prediction Relayer

```bash
cd prediction-relayer
cp .env.example .env    # configure RPC, contract address, Supabase
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Landing Page

```bash
cd landing
npm install
npm run dev
```

### Bot (Automated Testing)

```bash
cd bot
cp .env.example .env    # configure 3 wallet private keys
npm install
npm start
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
| `/admin` | Bridge Admin | Bridge operational dashboard |
| `/predict/admin` | Predict Admin | Prediction market management |
| `/docs` | Docs | Documentation viewer |

## Environment Variables

### Bridge Relayer

| Variable | Description | Default |
|----------|-------------|---------|
| `RELAYER_PRIVATE_KEY` | Wallet private key (needs funds on all chains) | — |
| `LITEFORGE_RPC_URLS` | Comma-separated RPC endpoints | — |
| `SEPOLIA_RPC_URLS` | Comma-separated RPC endpoints | — |
| `BASE_SEPOLIA_RPC_URLS` | Comma-separated RPC endpoints | — |
| `BRIDGE_VAULT_ADDRESS` | BridgeVaultV2 contract on LiteForge | — |
| `WRAPPED_ZKLTC_ADDRESS` | WrappedZkLTC on Sepolia | — |
| `WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS` | WrappedZkLTC on Base Sepolia | — |
| `POLL_INTERVAL_MS` | Event polling interval | `2000` |
| `CONFIRMATION_BLOCKS` | Block confirmations before relay | `3` |
| `MAX_RETRIES` | Retry count on failure | `7` |
| `MINT_CONCURRENCY` | Parallel mint workers (Sepolia) | `8` |
| `MINT_BASE_SEPOLIA_CONCURRENCY` | Parallel mint workers (Base Sepolia) | `8` |
| `UNLOCK_CONCURRENCY` | Parallel unlock workers | `8` |
| `SUPABASE_URL` | Supabase project URL | — |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | — |
| `ADMIN_PORT` | Admin API port | `3001` |
| `ADMIN_API_KEY` | Secret key for admin endpoints | — |

### Prediction Relayer

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL_PRIMARY` | Primary RPC endpoint | — |
| `RPC_URL_FALLBACK` | Fallback RPC endpoint | — |
| `CONTRACT_ADDRESS` | MultyraMarketV2 contract address | — |
| `CONTRACT_DEPLOY_BLOCK` | Block number to start indexing from | — |
| `SUPABASE_URL` | Supabase project URL | — |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | — |
| `POLL_INTERVAL_MS` | Event polling interval | `5000` |
| `BLOCK_CHUNK_SIZE` | Blocks per query batch | `5000` |
| `AUTO_CLOSE_CHECK_INTERVAL_MS` | Auto-close check interval | `30000` |
| `ADMIN_PORT` | Admin API port | `3001` |
| `ADMIN_PRIVATE_KEY` | Admin wallet private key | — |
| `ADMIN_PASSPHRASE` | Admin authentication passphrase | — |

### Bot

| Variable | Description | Default |
|----------|-------------|---------|
| `WALLET_1_PRIVATE_KEY` | First parallel wallet | — |
| `WALLET_2_PRIVATE_KEY` | Second parallel wallet | — |
| `WALLET_3_PRIVATE_KEY` | Third parallel wallet | — |
| `BRIDGE_AMOUNT_MIN` | Minimum bridge amount (ether) | `0.011` |
| `BRIDGE_AMOUNT_MAX` | Maximum bridge amount (ether) | `0.1` |
| `DELAY_BETWEEN_ROUTES_MS` | Delay between routes in a cycle | `5000` |
| `DELAY_BETWEEN_LOOPS_MS` | Delay between full loop cycles | `10000` |

## Key Features

### Bridge
- **Lock & Mint** — 1:1 backed, no AMM slippage
- **Multi-chain** — LiteForge ↔ Sepolia, LiteForge ↔ Base Sepolia
- **Parallel Execution** — Up to 8x concurrent workers per direction
- **RPC Fallback** — Automatic rotation on endpoint failure
- **Double Replay Protection** — Database UNIQUE constraint + on-chain mapping
- **Exponential Backoff** — Auto-retry with escalating intervals
- **Fee Management** — Configurable 0.3% fee with owner withdrawal

### DEX Aggregator
- **Multi-DEX Routing** — Multyra V3 (Uniswap V3 fork) + Wolfdex V2
- **Cross-chain Swaps** — Bridge + swap in a single flow
- **Liquidity Pools** — 7 deployed pools across 3 chains
- **Pool Management** — Create pools, add/remove liquidity, manage positions

### Prediction Market (Rivalis)
- **Ticket-based** — Buy tickets on market outcomes
- **Auto-close** — Markets automatically close at expiry
- **Leaderboard** — Global ranking of top predictors
- **Admin Controls** — Create, resolve, cancel, pause markets
- **Event Indexing** — Real-time blockchain event processing

### Infrastructure
- **Admin APIs** — REST endpoints for both bridge and prediction relayers
- **Admin Dashboards** — Web UI for operational management
- **Supabase Integration** — Real-time stats, server-side pagination
- **Support Widget** — Telegram-integrated user support

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

The bot runs 3 parallel wallets cycling through 4 routes (LF→Sep, Sep→LF, LF→BS, BS→LF) for continuous integration testing.

## Documentation

Full technical documentation available in [`docs/`](docs/):

| Doc | Topic |
|-----|-------|
| [01-overview](docs/01-overview.md) | Project overview & mechanism |
| [02-architecture](docs/02-architecture.md) | System architecture |
| [03-smart-contracts](docs/03-smart-contracts.md) | Contract reference |
| [04-relayer](docs/04-relayer.md) | Relayer setup & config |
| [05-testing](docs/05-testing.md) | Test results |
| [06-security](docs/06-security.md) | Security & threat model |
| [07-usage-guide](docs/07-usage-guide.md) | User guide |
| [08-cara-kerja-lengkap](docs/08-cara-kerja-lengkap.md) | Complete walkthrough (ID) |
| [09-frontend](docs/09-frontend.md) | Frontend architecture |
| [10-frontend-changelog](docs/10-frontend-changelog.md) | UI/UX changelog |
| [11-supabase-integration](docs/11-supabase-integration.md) | Database integration |
| [12-relayer-optimization](docs/12-relayer-optimization.md) | Parallel execution |
| [13-rpc-fallback](docs/13-rpc-fallback.md) | RPC fallback rotation |
| [14-admin-api](docs/14-admin-api.md) | Admin REST API |
| [15-admin-dashboard](docs/15-admin-dashboard.md) | Admin web dashboard |
| [16-fee-management](docs/16-fee-management.md) | Fee mechanics |

## Security

- Replay protection (on-chain + database)
- Access control (Owner / Relayer / User roles)
- Emergency pause mechanism
- 3-block confirmation before relay
- Input validation & sanitization on admin API
- RLS on Supabase (read-only public access)

For production deployment, see [security docs](docs/06-security.md) for recommendations on multi-sig, timelocks, and auditing.

## Database Schema

The Supabase database includes:

- **`bridge_transactions`** — Tracks all bridge transactions (direction, source/dest hashes, sender, recipient, amount, fee, status)
- **`bridge_stats`** — Aggregated bridge statistics (materialized view)
- **`prediction_markets`** — Cached prediction market data (address, pair, prices, status, pool, volume, outcomes)

Supported bridge routes: `liteforge_to_sepolia`, `sepolia_to_liteforge`, `liteforge_to_basesepolia`, `basesepolia_to_liteforge`

## License

MIT
