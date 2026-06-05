# Overview

Multyra is a fixed-ticket **parimutuel prediction market** on zkLTC Testnet. Users buy tickets on an outcome before a market closes. The ticket value enters a shared pool, while the protocol fee is separated from the pool and tracked independently.

Unlike fixed-odds betting, Multyra does not promise a fixed payout when a user buys a ticket. The final payout depends on how many tickets are placed on every outcome before the market closes. Winners split the losing side of the pool.

## 1. Core concept

| Item | Value | Meaning |
|---|---:|---|
| Ticket price | 1 zkLTC | The amount that enters the market pool per ticket. |
| Protocol fee | 0.03 zkLTC | Protocol revenue per ticket, separated from the pool. |
| Total cost per ticket | 1.03 zkLTC | Amount paid by the user for 1 ticket. |
| Outcome | - | A possible result users can choose. |
| Total pool | - | Sum of all ticket-price value across all outcomes. |
| Winner pool | - | Ticket-price value on the winning outcome. |
| Loser pool | - | Pool from every non-winning outcome. |

When a user buys a ticket:

```txt
user pays = (ticket price + protocol fee) × quantity
pool receives = ticket price × quantity
protocol fee receives = protocol fee × quantity
```

With Multyra default example values:

```txt
1 ticket total cost = 1 + 0.03 = 1.03 zkLTC
2 tickets total cost = 1.03 × 2 = 2.06 zkLTC
10 tickets total cost = 1.03 × 10 = 10.3 zkLTC
```

The protocol fee does **not** become part of the winner payout pool. The payout pool is based on ticket price only.

## 2. Comparison with AMM and Polymarket-style markets

Multyra uses a parimutuel model. This is different from AMM-based prediction markets and Polymarket-style orderbook/share markets.

| Model | How it works | Strength | Trade-off |
|---|---|---|---|
| Multyra parimutuel | Users buy fixed-price tickets. Winners split the losing pool after settlement. | Simple, no liquidity provider required, easy for casual users. | Final payout is not fixed until the market closes. |
| AMM prediction market | Users trade outcome shares against an automated liquidity pool. Prices move based on buying and selling pressure. | Users can enter and exit positions before settlement. | Requires liquidity, has slippage, and is more complex for new users. |
| Polymarket-style market | Users buy and sell outcome shares, often priced between 0 and 1. The final winning share settles to 1 and losing shares settle to 0. | Market price clearly represents implied probability and positions can be traded. | Requires active liquidity/order matching and feels more like trading than simple ticket participation. |

In Multyra, users do not trade positions after buying. A ticket is a commitment to an outcome until the market is settled.

```txt
choose outcome → buy ticket → wait for result → claim if eligible
```

## 3. Market timing

| Phase | Timing | What happens |
|---|---:|---|
| Market open | Before close time | Users can buy tickets. |
| Market close | 30-60 minutes before event starts | New purchases are blocked. |
| Event running | During the event | Users wait for the official result. |
| Normal resolution | Around 1 hour after event ends | Market is settled once the result is clear. |
| Delayed resolution | Up to 24-48 hours | Used if official data is delayed, corrected, or disputed. |

After close time, the smart contract blocks new ticket purchases even if someone tries to bypass the frontend.

## 4. Payout formula

```txt
totalPool = ticketPrice × allTickets
winnerPool = ticketPrice × winningTickets
loserPool = totalPool - winnerPool
profitPerTicket = loserPool / winningTickets
payoutPerTicket = ticketPrice + profitPerTicket
```

The contract uses integer division at wei precision, so tiny remainders can exist if the losing pool does not divide evenly.

## 5. Example: 2 outcomes

Market setup:

| Outcome | Tickets | Pool |
|---|---:|---:|
| Player A | 10 | 10 zkLTC |
| Player B | 5 | 5 zkLTC |
| Total | 15 | 15 zkLTC |

Ticket price: `1 zkLTC`  
Protocol fee: `0.03 zkLTC` per ticket  
User cost per ticket: `1.03 zkLTC`

If **Player A wins**:

```txt
winnerPool = 10 × 1 = 10 zkLTC
loserPool = 5 × 1 = 5 zkLTC
profitPerTicket = 5 / 10 = 0.5 zkLTC
payoutPerTicket = 1 + 0.5 = 1.5 zkLTC
```

Each Player A ticket receives **1.5 zkLTC**.

If **Player B wins**:

```txt
winnerPool = 5 × 1 = 5 zkLTC
loserPool = 10 × 1 = 10 zkLTC
profitPerTicket = 10 / 5 = 2 zkLTC
payoutPerTicket = 1 + 2 = 3 zkLTC
```

Each Player B ticket receives **3 zkLTC**.

Protocol fee example:

```txt
total tickets = 15
protocol fee collected = 15 × 0.03 = 0.45 zkLTC
```

## 6. Example: 3 outcomes

Market setup:

| Outcome | Tickets | Pool |
|---|---:|---:|
| Team A | 20 | 20 zkLTC |
| Draw | 10 | 10 zkLTC |
| Team B | 5 | 5 zkLTC |
| Total | 35 | 35 zkLTC |

If **Draw wins**:

```txt
winnerPool = 10 × 1 = 10 zkLTC
loserPool = Team A pool + Team B pool
loserPool = 20 + 5 = 25 zkLTC
profitPerTicket = 25 / 10 = 2.5 zkLTC
payoutPerTicket = 1 + 2.5 = 3.5 zkLTC
```

Each Draw ticket receives **3.5 zkLTC**.

## 7. Example: more than 5 outcomes

Market setup:

| Outcome | Tickets | Pool |
|---|---:|---:|
| Outcome A | 50 | 50 zkLTC |
| Outcome B | 30 | 30 zkLTC |
| Outcome C | 20 | 20 zkLTC |
| Outcome D | 10 | 10 zkLTC |
| Outcome E | 5 | 5 zkLTC |
| Outcome F | 5 | 5 zkLTC |
| Total | 120 | 120 zkLTC |

If **Outcome E wins**:

```txt
winnerPool = 5 × 1 = 5 zkLTC
loserPool = 120 - 5 = 115 zkLTC
profitPerTicket = 115 / 5 = 23 zkLTC
payoutPerTicket = 1 + 23 = 24 zkLTC
```

Each Outcome E ticket receives **24 zkLTC**.

This is why less-crowded outcomes can pay more, but only if they actually win.
