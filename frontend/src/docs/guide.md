# Guide

This guide explains the normal public user flow in Multyra, from connecting a wallet to claiming after settlement.

## 1. User journey overview

| Step | Action | What happens |
|---|---|---|
| 1 | Connect wallet | User connects a zkLTC Testnet wallet. |
| 2 | Choose a market | User reviews outcomes, rules, pool, ticket price, fee, and close time. |
| 3 | Buy tickets | User selects outcome and quantity, then confirms the transaction. |
| 4 | Wait for close | Market closes 30-60 minutes before the event starts. |
| 5 | Wait for settlement | Market is settled after the official result is verified. |
| 6 | Claim | Eligible users claim winnings or refunds from the contract. |

The basic flow is:

```txt
connect wallet -> choose market -> buy ticket -> wait for result -> claim if eligible
```

## 2. Connect wallet

Users connect a wallet that supports zkLTC Testnet. The connected address is used as the identity for ticket purchases, claims, profile history, and leaderboard records.

The wallet needs enough zkLTC to pay the total ticket cost:

```txt
total cost = (ticket price + protocol fee) × quantity
```

With the default example values:

```txt
ticket price = 1 zkLTC
protocol fee = 0.03 zkLTC
cost per ticket = 1.03 zkLTC
```

## 3. Choose a market

Before buying, users should review the market detail page.

| Field | Why it matters |
|---|---|
| Title | Describes the event being predicted. |
| Outcomes | Shows all possible results users can choose. |
| Ticket price | Amount that enters the parimutuel pool per ticket. |
| Protocol fee | Fee paid per ticket, separated from the pool. |
| Close time | Time after which new purchases are blocked. |
| Rules | Defines how the result is interpreted. |
| Current pool | Shows total ticket value already placed. |
| Outcome distribution | Shows how tickets are distributed across outcomes. |

Users should read the market rules before buying. The rules explain what counts as a valid result, what happens if an event is cancelled, and when refund logic may apply.

## 4. Buy tickets

Users select an outcome and quantity.

Example purchase:

| Item | Value |
|---|---:|
| Ticket price | 1 zkLTC |
| Protocol fee | 0.03 zkLTC |
| Quantity | 2 |
| Total cost | 2.06 zkLTC |

Calculation:

```txt
cost per ticket = 1 + 0.03 = 1.03 zkLTC
total cost = 1.03 × 2 = 2.06 zkLTC
pool receives = 1 × 2 = 2 zkLTC
protocol fee receives = 0.03 × 2 = 0.06 zkLTC
```

The ticket price portion enters the pool. The protocol fee portion is tracked separately as protocol revenue.

## 5. Wait for market close

Markets are normally closed around **30-60 minutes before the event starts**.

After close time:

| State | Meaning |
|---|---|
| Market display | The UI shows the market as closed after sync. |
| Contract protection | Direct ticket purchases are blocked. |
| User action | Users can no longer buy more tickets. |

The contract protection remains active even if someone bypasses the frontend.

## 6. Wait for settlement

After the event ends, the market is settled based on the verified official result.

| Settlement timing | Meaning |
|---|---|
| Normal | Around 1 hour after the event ends. |
| Delayed | Up to 24-48 hours if official result needs verification. |

Possible settlement types:

| Type | Meaning |
|---|---|
| Winner selected | One outcome is selected as the winner. |
| Refund settlement | Market is settled as refund based on rules. |
| Unable to continue normally | Market cannot be settled through the standard winner flow. |

## 7. Claim

After settlement, eligible users can claim.

If the user picked the winning outcome:

```txt
claim amount = ticket principal + proportional profit from losing pool
```

If the market is refunded or cannot continue normally, refund logic is applied according to the contract.

Claim flow:

```txt
market settled
  ↓
user checks claimable amount
  ↓
user submits claim transaction
  ↓
contract pays claim
  ↓
relayer indexes claim history
```

Claims are paid from the smart contract and then indexed by the relayer into Supabase.


