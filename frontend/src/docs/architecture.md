# Architecture

Multyra uses a hybrid architecture. The smart contract is the source of truth for funds and settlement. The relayer indexes on-chain events into Supabase. The frontend reads Supabase for speed and sends wallet transactions to the contract for actions that move funds.

## 1. System overview

| Layer | Role | Responsibility |
|---|---|---|
| Frontend | User interface | Shows markets, tickets, leaderboard, profile, comments, and claim information. |
| Smart contract | Source of truth | Holds funds, tickets, market state, resolution, claims, and fee accounting. |
| Relayer | Event indexer | Reads contract events and syncs them into Supabase. |
| Supabase | Read layer | Stores query-friendly market, ticket, claim, category, and leaderboard data. |
| Backend verifier | Result verification | Scrapes event results and validates them with 4 AI validators before settlement. |

The architecture separates **settlement** from **display**. Settlement happens on-chain. Display data is indexed into Supabase so the frontend can load quickly.

## 2. Frontend

The frontend is built with React, Vite, wagmi, RainbowKit, and Supabase Realtime.

It is responsible for:

| Feature | Description |
|---|---|
| Market browsing | Users can browse, filter, and search markets. |
| Market detail | Users can inspect outcomes, rules, pool distribution, ticket price, fee, and close time. |
| Ticket purchase | Users choose outcome and quantity, then send a contract transaction. |
| Profile | Users can view ticket history and claimable markets. |
| Leaderboard | Users can view ranking by P&L, win rate, and volume. |
| Comments | Users can read and participate in market discussion. |

The frontend does **not** decide final settlement. It only displays indexed data and sends contract transactions.

## 3. Smart contract

The `MultyraMarket` contract handles the core protocol logic.

| Function area | Description |
|---|---|
| Market records | Stores market title, outcomes, ticket price, fee, close time, and result state. |
| Ticket purchase | Users buy tickets before close time using native zkLTC. |
| Close enforcement | Contract blocks purchases after close time. |
| Settlement state | Stores the final winning outcome or refund state after settlement. |
| Claims | Users claim winnings or refunds after settlement. |
| Fee accounting | Protocol fees are tracked separately from the market pool. |

All token amounts use 18-decimal native token units. For example, `1 zkLTC` is sent to the contract as its full wei value.

## 4. Relayer

The relayer is a Node.js service. It watches zkLTC Testnet for contract events and writes them to Supabase.

It handles events such as:

| Event | Indexed result |
|---|---|
| `MarketCreated` | Inserts market and outcome stats into Supabase. |
| `TicketPurchased` | Inserts ticket history and updates pool stats. |
| `MarketResolved` | Updates market result and recalculates leaderboard. |
| `MarketCancelled` | Updates market status when a market cannot continue normally. |
| `MarketPaused` / `MarketUnpaused` | Updates market availability state. |
| `Claimed` / `RefundClaimed` | Inserts claim history. |
| Fee / close-time updates | Updates market metadata and fee state. |

The relayer also runs auto-close checks. This updates Supabase display status to `CLOSED` after close time passes, while the smart contract itself still enforces close time on-chain.

## 5. Supabase

Supabase is the fast read layer.

It stores:

| Table area | Purpose |
|---|---|
| Markets | Main market metadata and status. |
| Market stats | Outcome ticket counts and pool values. |
| Tickets | User ticket purchase history. |
| Claims | Claim and refund history. |
| Comments | Market discussion data. |
| Categories | Market category metadata. |
| User stats | Leaderboard and profile summary data. |
| Relayer state | Indexing checkpoint and sync state. |

This makes the user interface responsive without requiring every page to query the blockchain directly.

## 6. Backend result verification

Multyra can use a backend verification layer for market settlement. This layer is designed to reduce result mistakes while still keeping a safety fallback for rare unclear cases.

The backend flow uses web scraping and four independent AI validators:

| Step | Description |
|---|---|
| 1. Web scraping | Backend scrapes trusted public sources for event results. |
| 2. Result extraction | The scraper extracts winner, event time, date, and supporting information. |
| 3. AI validation | Four different AI validators review the scraped result independently. |
| 4. Consensus check | If all four validators agree, the result can be treated as verified. |
| 5. Automatic settlement path | If consensus is complete, the market can be settled according to the verified result. |
| 6. Safety fallback | If even one AI validator rejects or disagrees, the market is flagged for manual review. |

Example consensus:

```txt
Scraped result:
Winner: Player A
Event date: 2026-06-05
Event time: 20:00
Source: trusted result page

AI validator 1: approve Player A
AI validator 2: approve Player A
AI validator 3: approve Player A
AI validator 4: approve Player A

Result: consensus reached → market can be settled
```

Example no consensus:

```txt
AI validator 1: approve Player A
AI validator 2: approve Player A
AI validator 3: approve Player A
AI validator 4: reject / uncertain

Result: no full consensus → market is flagged for manual review
```

This disagreement case is expected to be rare. It exists as a protection mechanism for unusual situations such as ambiguous results, delayed official data, source mismatch, event cancellation, incorrect scraped data, or disputes.

## 7. Data flow

User activity flow:

```txt
User buys ticket
  ↓
Smart contract emits TicketPurchased
  ↓
Relayer indexes event
  ↓
Supabase row is inserted/updated
  ↓
Frontend updates from Supabase
```

Resolution verification flow:

```txt
Event ends
  ↓
Backend scraper collects result from trusted sources
  ↓
4 AI validators review scraped result independently
  ↓
All 4 approve?
  ├─ Yes → market can be settled with verified outcome
  └─ No  → market is flagged for manual review
```

This pattern keeps funds on-chain, keeps the UI fast, and adds an additional verification layer before settlement.
