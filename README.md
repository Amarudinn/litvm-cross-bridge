# Multyra Bridge

Cross-chain bridge connecting **LiteForge** (L2) with **Sepolia** and **Base Sepolia** using a Lock & Mint mechanism. Users lock zkLTC on LiteForge to receive wzkLTC (Wrapped zkLTC, ERC20) on the destination chain, and vice versa.

Built with Solidity smart contracts, a Node.js relayer service, React frontend, Next.js landing page, and an automated testing bot.

## Architecture

```
┌─────────────┐       ┌─────────────┐       ┌──────────────┐
│  LiteForge  │       │   Relayer   │       │   Sepolia /  │
│  (Chain 4441)│◄─────►│  (Node.js)  │◄─────►│ Base Sepolia │
│  BridgeVault │       │  SQLite +   │       │ WrappedZkLTC │
│             │       │  Supabase   │       │              │
└─────────────┘       └─────────────┘       └──────────────┘
```

**Flow:**
1. User locks zkLTC on LiteForge → Relayer detects `Locked` event → Mints wzkLTC on destination
2. User burns wzkLTC on destination → Relayer detects `Burned` event → Unlocks zkLTC on LiteForge

**Fee:** 0.3% per transaction (~0.6% round trip)

## Project Structure

```
├── contracts/       # Solidity smart contracts (Foundry)
├── relayer/         # Node.js relayer service
├── frontend/        # React app (Vite)
├── landing/         # Marketing site (Next.js)
├── bot/             # Automated bridge testing bot
├── supabase/        # Database schema & migrations
├── docs/            # Technical documentation (17 files)
└── images/          # Project images
```

## Deployed Contracts

| Contract | Chain | Address |
|----------|-------|---------|
| BridgeVault | LiteForge (4441) | `0x6Bb77c1f465a18Bd16686330173B32821E59FD12` |
| BridgeVault V2 | LiteForge (4441) | `0x9929ED0EdA9ecF57BDAB6423B4b12cDe3317196d` |
| WrappedZkLTC | Sepolia (11155111) | `0x4320BB234A76f94F9eeDD0E81968668C6d29c39f` |
| WrappedZkLTC | Base Sepolia (84532) | `0xB378f0359815ECEC5Ae3c5aC4c49c12b70931688` |

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
| Relayer | Node.js, ethers.js v6, Express v5, better-sqlite3, Winston |
| Frontend | React 19, Vite 8, TailwindCSS, wagmi v2, RainbowKit, Zustand |
| Landing | Next.js 16, TailwindCSS, Framer Motion, Lenis, Radix UI |
| Bot | Node.js, ethers.js v6, 3 parallel wallets |
| Database | Supabase (PostgreSQL), SQLite (local queue) |

## Getting Started

### Prerequisites

- Node.js >= 18
- Foundry (for contracts)
- Git

### Contracts

```bash
cd contracts
forge install
forge build
forge test
```

### Relayer

```bash
cd relayer
cp .env.example .env  # configure private key, RPCs, contract addresses
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
cp .env.example .env  # configure wallet keys
npm install
npm start
```

## Environment Variables

### Relayer

| Variable | Description |
|----------|-------------|
| `RELAYER_PRIVATE_KEY` | Wallet private key (needs funds on all chains) |
| `LITEFORGE_RPC_URLS` | Comma-separated RPC endpoints |
| `SEPOLIA_RPC_URLS` | Comma-separated RPC endpoints |
| `BRIDGE_VAULT_ADDRESS` | BridgeVault contract on LiteForge |
| `WRAPPED_ZKLTC_ADDRESS` | WrappedZkLTC contract on Sepolia |
| `POLL_INTERVAL_MS` | Event polling interval (default: 5000) |
| `CONFIRMATION_BLOCKS` | Block confirmations before relay (default: 3) |
| `MAX_RETRIES` | Retry count on failure (default: 5) |
| `MINT_CONCURRENCY` | Parallel mint workers (default: 3) |
| `UNLOCK_CONCURRENCY` | Parallel unlock workers (default: 3) |
| `SUPABASE_URL` | Supabase project URL (optional) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (optional) |
| `ADMIN_PORT` | Admin API port (default: 3001) |
| `ADMIN_API_KEY` | Secret key for admin endpoints |

### Bot

| Variable | Description |
|----------|-------------|
| `WALLET_1_PRIVATE_KEY` | First parallel wallet |
| `WALLET_2_PRIVATE_KEY` | Second parallel wallet |
| `WALLET_3_PRIVATE_KEY` | Third parallel wallet |
| `BRIDGE_AMOUNT_MIN` | Minimum bridge amount (ether) |
| `BRIDGE_AMOUNT_MAX` | Maximum bridge amount (ether) |
| `DELAY_BETWEEN_ROUTES_MS` | Delay between routes in a cycle |
| `DELAY_BETWEEN_LOOPS_MS` | Delay between full loop cycles |

## Key Features

- **Lock & Mint Bridge** — 1:1 backed, no AMM slippage
- **Multi-chain** — LiteForge ↔ Sepolia, LiteForge ↔ Base Sepolia
- **Parallel Execution** — 3-5x throughput with concurrent workers
- **RPC Fallback** — Automatic rotation on endpoint failure
- **Admin API** — REST endpoints for verify, retry, and inject transactions
- **Admin Dashboard** — Web UI at `/admin` for operational management
- **Supabase Integration** — Fast queries, server-side pagination, real-time stats
- **Double Replay Protection** — Database UNIQUE constraint + on-chain mapping
- **Exponential Backoff** — Auto-retry with 10s → 20s → 40s → 80s intervals
- **Fee Management** — Configurable 0.3% fee with owner withdrawal

## Testing

- 49/49 unit tests passing (BridgeVault: 24, WrappedZkLTC: 25)
- End-to-end testnet verification:
  - Lock → Mint: ~20s latency
  - Burn → Unlock: ~6s latency
  - Retry mechanism: auto-recovery after vault top-up

```bash
cd contracts
forge test -vvv
```

## Documentation

Full technical documentation available in `docs/`:

| Doc | Topic |
|-----|-------|
| [01-overview](docs/01-overview.md) | Project overview & mechanism |
| [02-architecture](docs/02-architecture.md) | System architecture |
| [03-smart-contracts](docs/03-smart-contracts.md) | Contract reference |
| [04-relayer](docs/04-relayer.md) | Relayer setup & config |
| [05-testing](docs/05-testing.md) | Test results |
| [06-security](docs/06-security.md) | Security & threat model |
| [07-usage-guide](docs/07-usage-guide.md) | User guide (CLI & SDK) |
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

## License

MIT
