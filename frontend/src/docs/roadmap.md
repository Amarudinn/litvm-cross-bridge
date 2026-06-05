# Roadmap

The Multyra roadmap focuses on expanding the protocol beyond the core prediction market experience. These items are planned directions and may be shipped gradually based on technical readiness, ecosystem needs, and user demand.

## 1. Roadmap overview

| Item | Goal | Status |
|---|---|---|
| Revenue Sharing | Share a portion of protocol revenue with eligible participants or stakeholders. | Planned |
| API | Provide public data access for developers, analytics, and integrations. | Planned |
| Agent | Add intelligent assistance for discovery, summaries, and user guidance. | Planned |
| Support Multi-Chain Deposit | Let users fund their Multyra experience from multiple chains. | Planned |

The roadmap is designed to improve three areas:

```txt
user access → protocol utility → ecosystem integration
```

## 2. Revenue Sharing

Revenue sharing is planned as a future mechanism to distribute a portion of protocol revenue to eligible participants or stakeholders.

| Focus area | Description |
|---|---|
| Eligibility | Define who can receive revenue sharing. |
| Revenue source | Define what protocol revenue can be shared. |
| Distribution logic | Define how rewards are calculated and distributed. |
| Transparency | Make the distribution process easy to inspect. |
| Simplicity | Keep the system understandable and auditable. |

Possible distribution flow:

```txt
protocol collects fees
  ↓
revenue pool is calculated
  ↓
eligible participants are identified
  ↓
rewards are distributed or claimed
```

## 3. API

A public API is planned for developers, analytics tools, and ecosystem integrations.

| Endpoint category | Possible use |
|---|---|
| Market data | Read active, closed, and settled markets. |
| Market detail | Read a single market with outcomes and pool data. |
| Leaderboard | Read user rankings and performance metrics. |
| User statistics | Read public user profile statistics. |
| Historical activity | Read ticket, claim, and market activity history. |

The API section will be expanded as the public API surface becomes stable.

## 4. Agent

Agent support is planned to help users and the protocol interact with markets more intelligently.

| Use case | Description |
|---|---|
| Market discovery | Help users find relevant markets. |
| Result monitoring | Track event outcomes and public result sources. |
| Market summaries | Generate simple explanations of markets and rules. |
| Payout education | Explain parimutuel payout mechanics in plain language. |
| User assistance | Help users navigate Multyra without needing technical knowledge. |

Possible agent flow:

```txt
user asks a question
  ↓
agent reads public market context
  ↓
agent explains rules, timing, or payout mechanics
  ↓
user makes their own decision
```

Agents should assist users, not make final financial decisions for them.

## 5. Support Multi-Chain Deposit

Multi-chain deposit support is planned so users can fund their Multyra experience from multiple chains more easily.

| Focus area | Description |
|---|---|
| Chain support | Select which source chains are supported. |
| Deposit flow | Let users move funds toward the Multyra ecosystem. |
| Onboarding | Reduce friction for users who do not already hold zkLTC. |
| Accounting | Keep deposits clear, traceable, and reliable. |
| UX | Make the process simple for non-technical users. |

High-level flow:

```txt
user chooses source chain
  ↓
user deposits supported asset
  ↓
funds are routed toward Multyra-compatible value
  ↓
user can participate in markets
```

