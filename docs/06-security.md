# LitVM Bridge - Security

## Threat Model

### Smart Contract Threats

| # | Threat | Severity | Mitigation | Status |
|---|--------|----------|------------|--------|
| 1 | **Replay Attack** - Relayer submit mint/unlock yang sama berkali-kali | Critical | `processedMints` / `processedUnlocks` mapping dengan unique `processId = keccak256(txHash, nonce)` | Mitigated |
| 2 | **Unauthorized Mint** - Attacker mint wzkLTC tanpa lock | Critical | `onlyRelayer` modifier, hanya relayer address yang bisa call `mint()` | Mitigated |
| 3 | **Unauthorized Unlock** - Attacker unlock zkLTC tanpa burn | Critical | `onlyRelayer` modifier, hanya relayer address yang bisa call `unlock()` | Mitigated |
| 4 | **Reentrancy** - Attacker exploit callback saat transfer | High | OpenZeppelin `ReentrancyGuard` pada semua state-changing functions | Mitigated |
| 5 | **Vault Drain** - Unlock lebih dari yang tersedia | High | `availableBalance()` check sebelum transfer, fees dilindungi | Mitigated |
| 6 | **Fee Manipulation** - Owner set fee terlalu tinggi | Medium | `MAX_FEE = 500` (5%) cap, tidak bisa lebih | Mitigated |
| 7 | **Dust Attack** - Spam lock/burn dengan amount sangat kecil | Low | `minLockAmount` / `minBurnAmount` = 0.001 ether | Mitigated |

### Relayer Threats

| # | Threat | Severity | Mitigation | Status |
|---|--------|----------|------------|--------|
| 1 | **Relayer Key Compromise** - Private key bocor | Critical | Owner bisa `pause()` kedua contract + `setRelayer()` ke address baru | Mitigated |
| 2 | **Double Processing** - Event diproses dua kali | High | DB UNIQUE constraint + on-chain `processId` mapping (double layer) | Mitigated |
| 3 | **Chain Reorg** - Block yang sudah diproses di-reorg | Medium | Wait 3 confirmation blocks sebelum execute | Mitigated |
| 4 | **RPC Failure** - RPC endpoint down | Medium | Auto-retry dengan 3x delay, polling-based (bukan WebSocket) | Mitigated |
| 5 | **Gas Exhaustion** - Relayer kehabisan gas | Medium | Balance check saat startup, logging balance | Partially Mitigated |

## Security Features Detail

### 1. Replay Protection (Double Layer)

**Layer 1: Database (Off-chain)**
```sql
UNIQUE(source_tx_hash, source_nonce)
```
Jika event yang sama terdeteksi dua kali (misal karena reorg), INSERT akan gagal dengan UNIQUE constraint violation → event di-skip.

**Layer 2: On-chain Mapping**
```solidity
mapping(bytes32 => bool) public processedUnlocks;

bytes32 processId = keccak256(abi.encodePacked(_burnTxHash, _sourceNonce));
if (processedUnlocks[processId]) revert AlreadyProcessed(processId);
processedUnlocks[processId] = true;
```
Bahkan jika database di-reset, on-chain mapping tetap mencegah replay.

### 2. Access Control

```
Owner (Deployer)
├── setRelayer()          # Ganti relayer
├── setFeePercent()       # Ganti fee
├── withdrawFees()        # Withdraw fees (BridgeVault only)
├── pause() / unpause()   # Emergency stop
└── setMinLockAmount()    # Ganti minimum

Relayer
├── mint()                # Mint wzkLTC (WrappedZkLTC only)
└── unlock()              # Unlock zkLTC (BridgeVault only)

User (Anyone)
├── lock()                # Lock zkLTC (BridgeVault)
└── burn()                # Burn wzkLTC (WrappedZkLTC)
```

### 3. Emergency Procedures

**Jika relayer key compromised:**
1. Owner call `pause()` di kedua contract → semua operasi berhenti
2. Owner call `setRelayer(newAddress)` di kedua contract
3. Setup relayer baru dengan key baru
4. Owner call `unpause()` di kedua contract

**Jika ada bug ditemukan:**
1. Owner call `pause()` di kedua contract
2. Investigate dan fix
3. Deploy contract baru jika perlu
4. Migrate state jika perlu
5. Owner call `unpause()`

### 4. Pre-flight Checks (Relayer)

Sebelum setiap eksekusi, relayer melakukan:

```
Mint Executor:
1. ✅ Check isProcessed() on-chain → skip jika sudah
2. ✅ Submit mint transaction
3. ✅ Wait for confirmation

Unlock Executor:
1. ✅ Check isProcessed() on-chain → skip jika sudah
2. ✅ Check availableBalance() → fail jika kurang
3. ✅ Submit unlock transaction
4. ✅ Wait for confirmation
```

## Known Limitations & Risks

### Centralization Risk

| Risk | Description | Mitigation |
|------|-------------|------------|
| Single Relayer | Jika relayer down, bridge berhenti | Bisa ditambah multiple relayers di masa depan |
| Owner Control | Owner bisa pause, ganti relayer, ganti fee | Bisa ditambah timelock/multisig di masa depan |
| Relayer Trust | User harus trust relayer untuk execute | On-chain verification mencegah fraud |

### Operational Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| Vault Liquidity | Jika vault kosong, unlock gagal | Monitor balance, auto-retry saat vault di-top-up |
| Gas Price Spike | Relayer mungkin kehabisan gas | Monitor balance, set gas limit |
| RPC Downtime | Jika RPC down, relayer tidak bisa poll | Auto-retry, bisa ganti RPC |

### What Relayer CANNOT Do

- ❌ Mint wzkLTC tanpa ada lock event (on-chain verification)
- ❌ Unlock zkLTC tanpa ada burn event (on-chain verification)
- ❌ Process event yang sama dua kali (replay protection)
- ❌ Withdraw user funds dari vault (hanya bisa unlock ke recipient dari event)
- ❌ Change fee atau pause contract (hanya owner)

## Recommendations untuk Production

1. **Multi-sig Owner** - Gunakan Gnosis Safe sebagai owner
2. **Multiple Relayers** - Tambah redundancy
3. **Timelock** - Tambah delay untuk admin operations
4. **Monitoring** - Setup alerts untuk balance rendah, failed transactions
5. **Rate Limiting** - Limit jumlah bridge per waktu
6. **Audit** - Professional security audit sebelum mainnet
7. **Insurance** - Consider bridge insurance protocol
