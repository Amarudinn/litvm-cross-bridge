# Contract

The active Multyra contract is deployed on zkLTC Testnet.

```txt
0x7cB05aB7b7396E944Be7F259765007aeB17aEe84
```

## 1. Contract overview

| Item | Value |
|---|---|
| Network | zkLTC Testnet |
| Chain ID | 4441 |
| Native token | zkLTC |
| Decimals | 18 |
| Contract role | Market settlement and fund custody |

The contract is the source of truth for ticket ownership, market state, claim eligibility, payout calculation, and native-token transfers.

## 2. Native token accounting

The contract uses native zkLTC with 18 decimals. All payments, pools, fees, claims, and refunds are handled in wei units.

Frontend formatting is only visual. For example, `1e18` represents `1 zkLTC` at the contract level.

The transaction still uses the full wei value.

## 3. Public user functions

These functions are relevant to public users.

| Function | Purpose | When used |
|---|---|---|
| `buyTicket` | Buy tickets for an outcome. | Before market close time. |
| `claim` | Claim winning payout. | After market is settled with a winner. |
| `claimRefund` | Claim refund. | After refund settlement or if the market cannot continue normally. |

### buyTicket

Allows users to buy tickets for an outcome before close time.

```solidity
function buyTicket(
    uint256 marketId,
    uint256 outcomeIndex,
    uint256 quantity
) external payable;
```

Required payment:

```txt
(ticketPrice + fee) × quantity
```

### claim

Pays winnings to users who selected the winning outcome after the market has been settled.

```solidity
function claim(uint256 marketId) external;
```

### claimRefund

Pays refund to eligible users when the market is settled as refund or cannot continue normally.

```solidity
function claimRefund(uint256 marketId) external;
```

## 4. Public read functions

The contract exposes read functions that can be used to inspect market and user state without sending a transaction.

| Function | Purpose |
|---|---|
| `getMarket` | Reads full market information. |
| `getMarketOutcomeStats` | Reads ticket totals for each outcome. |
| `getUserTickets` | Reads user ticket counts per outcome. |
| `getEstimatedPayout` | Reads estimated payout for an outcome. |
| `getClaimableAmount` | Reads claimable amount for a user. |
| `getMarketCount` | Reads total number of markets. |

### getMarket

Reads full market information.

```solidity
function getMarket(uint256 marketId)
    external
    view
    returns (Market memory);
```

Example use:

```txt
Read title, outcomes, ticket price, fee, close time, status, total pool, and result state.
```

### getMarketOutcomeStats

Reads ticket totals per outcome.

```solidity
function getMarketOutcomeStats(uint256 marketId)
    external
    view
    returns (uint256[] memory);
```

Example result:

```txt
[20, 10, 5]
```

This means outcome 0 has 20 tickets, outcome 1 has 10 tickets, and outcome 2 has 5 tickets.

### getUserTickets

Reads how many tickets a user has for each outcome.

```solidity
function getUserTickets(
    uint256 marketId,
    address user
) external view returns (uint256[] memory);
```

Example result:

```txt
[0, 2, 0]
```

This means the user owns 2 tickets on outcome 1.

### getEstimatedPayout

Reads the estimated payout per 1 ticket if a specific outcome wins.

```solidity
function getEstimatedPayout(
    uint256 marketId,
    uint256 outcomeIndex
) external view returns (uint256);
```

This value can change while the market is still open because more tickets can be bought before close time.

### getClaimableAmount

Reads how much a user can claim after settlement.

```solidity
function getClaimableAmount(
    uint256 marketId,
    address user
) external view returns (uint256);
```

Example use:

```txt
If the returned value is greater than 0, the user may be eligible to claim.
```

### getMarketCount

Reads the total number of markets created by the contract.

```solidity
function getMarketCount() external view returns (uint256);
```

## 5. Important behavior

| Behavior | Explanation |
|---|---|
| Buying closes on-chain | New purchases are blocked after close time. |
| No ticket selling | Users cannot sell tickets back. |
| No ticket transfer | Tickets are tied to the buyer address. |
| Dynamic payout | Payout depends on final ticket distribution. |
| Fee excluded from pool | Protocol fee is not part of the winner payout pool. |
| Claim after settlement | Claims are only available after settlement or refund state. |

## 6. User transaction flow

```txt
buyTicket
  ↓
contract records user tickets
  ↓
market pool increases
  ↓
market is settled later
  ↓
user calls claim or claimRefund if eligible
```
