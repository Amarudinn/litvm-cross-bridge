# LitVM Bridge - Architecture

## Project Structure

```
litvm/
├── contracts/                          # Smart Contracts (Foundry)
│   ├── foundry.toml                    # Foundry configuration
│   ├── remappings.txt                  # Import remappings
│   ├── .env                            # Environment variables (private)
│   ├── .env.example                    # Environment template
│   ├── .gitignore
│   ├── src/
│   │   ├── BridgeVault.sol             # Lock/Unlock zkLTC (LiteForge)
│   │   └── WrappedZkLTC.sol            # Mint/Burn wzkLTC ERC20 (Sepolia)
│   ├── script/
│   │   ├── DeployBridgeVault.s.sol     # Deploy script untuk LiteForge
│   │   └── DeployWrappedZkLTC.s.sol    # Deploy script untuk Sepolia
│   ├── test/
│   │   ├── BridgeVault.t.sol           # 24 unit tests
│   │   └── WrappedZkLTC.t.sol          # 25 unit tests
│   └── lib/
│       ├── forge-std/                  # Foundry standard library
│       └── openzeppelin-contracts/     # OpenZeppelin v5.6.1
│
├── relayer/                            # Relayer Service (Node.js)
│   ├── package.json
│   ├── .env                            # Environment variables (private)
│   ├── .env.example                    # Environment template
│   ├── .gitignore
│   ├── src/
│   │   ├── index.js                    # Main entry point / orchestrator
│   │   ├── config.js                   # Configuration & validation
│   │   ├── listeners/
│   │   │   ├── liteforgeListener.js    # Poll Locked events di LiteForge
│   │   │   └── sepoliaListener.js      # Poll Burned events di Sepolia
│   │   ├── executors/
│   │   │   ├── mintExecutor.js         # Execute mint() di Sepolia
│   │   │   └── unlockExecutor.js       # Execute unlock() di LiteForge
│   │   ├── queue/
│   │   │   └── txQueue.js              # SQLite transaction queue
│   │   ├── utils/
│   │   │   ├── provider.js             # Ethers.js providers & wallets
│   │   │   └── logger.js               # Winston logger
│   │   └── abi/
│   │       ├── BridgeVault.json        # BridgeVault ABI
│   │       └── WrappedZkLTC.json       # WrappedZkLTC ABI
│   └── data/
│       ├── relayer.db                  # SQLite database (auto-created)
│       └── relayer.log                 # Log file (auto-created)
│
└── docs/                               # Documentation
```

## Smart Contract Architecture

### BridgeVault.sol (LiteForge)

```
BridgeVault
├── Inherits: Ownable, ReentrancyGuard, Pausable
├── State Variables:
│   ├── relayer (address)               # Authorized relayer
│   ├── feePercent (uint256)            # Fee in basis points (30 = 0.3%)
│   ├── nonce (uint256)                 # Incrementing lock counter
│   ├── accumulatedFees (uint256)       # Fees available for withdrawal
│   ├── minLockAmount (uint256)         # Minimum lock (0.001 ether)
│   └── processedUnlocks (mapping)      # Replay protection
├── Core Functions:
│   ├── lock(recipient) payable         # User locks zkLTC
│   └── unlock(recipient, amount, burnTxHash, sourceNonce)  # Relayer unlocks
├── Admin Functions:
│   ├── setRelayer(address)
│   ├── setFeePercent(uint256)
│   ├── setMinLockAmount(uint256)
│   ├── withdrawFees()
│   ├── pause() / unpause()
│   └── receive() payable               # Accept liquidity top-ups
├── View Functions:
│   ├── availableBalance()
│   └── isProcessed(burnTxHash, sourceNonce)
└── Events:
    ├── Locked(sender, recipient, amount, fee, nonce)
    ├── Unlocked(recipient, amount, processId)
    ├── RelayerUpdated(old, new)
    ├── FeePercentUpdated(old, new)
    ├── FeesWithdrawn(to, amount)
    └── MinLockAmountUpdated(old, new)
```

### WrappedZkLTC.sol (Sepolia)

```
WrappedZkLTC
├── Inherits: ERC20("Wrapped zkLTC", "wzkLTC"), Ownable, ReentrancyGuard, Pausable
├── State Variables:
│   ├── relayer (address)               # Authorized relayer
│   ├── feePercent (uint256)            # Fee in basis points (30 = 0.3%)
│   ├── nonce (uint256)                 # Incrementing burn counter
│   ├── minBurnAmount (uint256)         # Minimum burn (0.001 ether)
│   └── processedMints (mapping)        # Replay protection
├── Core Functions:
│   ├── mint(recipient, amount, lockTxHash, sourceNonce)  # Relayer mints
│   └── burn(amount, recipient)         # User burns wzkLTC
├── Admin Functions:
│   ├── setRelayer(address)
│   ├── setFeePercent(uint256)
│   ├── setMinBurnAmount(uint256)
│   └── pause() / unpause()
├── View Functions:
│   ├── isProcessed(lockTxHash, sourceNonce)
│   └── decimals() → 18
└── Events:
    ├── Minted(recipient, amount, processId)
    ├── Burned(sender, recipient, amount, fee, nonce)
    ├── RelayerUpdated(old, new)
    ├── FeePercentUpdated(old, new)
    └── MinBurnAmountUpdated(old, new)
```

## Relayer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      RELAYER SERVICE                         │
│                                                              │
│  ┌────────────────┐              ┌────────────────┐         │
│  │   LiteForge    │              │    Sepolia     │         │
│  │   Listener     │              │    Listener    │         │
│  │                │              │                │         │
│  │ Poll blocks    │              │ Poll blocks    │         │
│  │ every 5s       │              │ every 5s       │         │
│  │                │              │                │         │
│  │ Filter:        │              │ Filter:        │         │
│  │ Locked events  │              │ Burned events  │         │
│  └───────┬────────┘              └───────┬────────┘         │
│          │                               │                   │
│          ▼                               ▼                   │
│  ┌──────────────────────────────────────────────┐           │
│  │              Transaction Queue                │           │
│  │              (SQLite Database)                 │           │
│  │                                               │           │
│  │  ┌─────────┐   ┌───────────┐   ┌──────────┐ │           │
│  │  │ PENDING │──►│ EXECUTING │──►│COMPLETED │ │           │
│  │  └─────────┘   └─────┬─────┘   └──────────┘ │           │
│  │                       │                       │           │
│  │                       ▼                       │           │
│  │                 ┌──────────┐   ┌──────────┐  │           │
│  │                 │  FAILED  │──►│ RETRYING │  │           │
│  │                 └──────────┘   └────┬─────┘  │           │
│  │                       ▲             │        │           │
│  │                       └─────────────┘        │           │
│  │                                               │           │
│  │                 ┌──────────┐                  │           │
│  │                 │   DEAD   │ (max retries)    │           │
│  │                 └──────────┘                  │           │
│  └──────────────────────┬───────────────────────┘           │
│                         │                                    │
│            ┌────────────┴────────────┐                      │
│            ▼                         ▼                      │
│  ┌─────────────────┐      ┌─────────────────┐              │
│  │  Mint Executor  │      │ Unlock Executor │              │
│  │                 │      │                 │              │
│  │ Pre-flight:     │      │ Pre-flight:     │              │
│  │ - Check replay  │      │ - Check replay  │              │
│  │                 │      │ - Check balance │              │
│  │ Execute:        │      │                 │              │
│  │ mint() on       │      │ Execute:        │              │
│  │ Sepolia         │      │ unlock() on     │              │
│  │                 │      │ LiteForge       │              │
│  └─────────────────┘      └─────────────���───┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Event Detection | Polling (bukan WebSocket) | Lebih resilient terhadap disconnect, dengan block checkpoint di SQLite |
| Queue Storage | SQLite | Persistent, ACID compliant, zero-config, cocok untuk single relayer |
| Confirmation Blocks | 3 blocks | Balance antara speed dan safety terhadap reorg |
| Retry Strategy | Exponential backoff | 10s → 20s → 40s → 80s → 160s, max 5 retries |
| Replay Protection | Double layer | DB-level dedup (UNIQUE constraint) + on-chain mapping (processId) |
| Block Scanning | Chunks of 1000 blocks | Avoid RPC rate limits saat catching up |

### Transaction Queue States

| State | Description | Next State |
|-------|-------------|------------|
| PENDING | Event detected, ready to execute | EXECUTING |
| EXECUTING | Transaction submitted to destination chain | COMPLETED / FAILED |
| COMPLETED | Successfully confirmed on-chain | (terminal) |
| FAILED | Execution failed, will retry after backoff | RETRYING |
| RETRYING | Moved back to execution queue | EXECUTING |
| DEAD | Max retries (5) exceeded, needs manual intervention | (terminal) |

## Security Model

### On-Chain Security

| Feature | Implementation |
|---------|---------------|
| Replay Protection | `processedUnlocks` / `processedMints` mapping dengan `processId = keccak256(txHash, nonce)` |
| Access Control | `onlyRelayer` modifier untuk mint/unlock, `onlyOwner` untuk admin |
| Reentrancy Guard | OpenZeppelin `ReentrancyGuard` pada semua state-changing functions |
| Emergency Stop | OpenZeppelin `Pausable` - owner bisa pause/unpause |
| Fee Cap | Maximum 5% (500 basis points) |
| Dust Prevention | Minimum lock/burn amount (0.001 ether) |
| Balance Check | `unlock()` verifikasi available balance sebelum transfer |

### Off-Chain Security

| Feature | Implementation |
|---------|---------------|
| DB Dedup | UNIQUE constraint pada `(source_tx_hash, source_nonce)` |
| Pre-flight Check | Verify on-chain `isProcessed()` sebelum execute |
| Balance Check | Verify vault `availableBalance()` sebelum unlock |
| Error Recovery | Exponential backoff retry dengan max 5 attempts |
| Block Checkpoint | Persistent di SQLite, resume dari last processed block |
| Graceful Shutdown | SIGINT/SIGTERM handlers, clean database close |
