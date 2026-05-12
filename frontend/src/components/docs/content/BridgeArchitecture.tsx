export function BridgeArchitecture() {
  return (
    <div className="prose-docs">
      <h1>Bridge Architecture</h1>
      <p>
        Multyra Bridge V2 uses a <strong>Lock & Mint / Burn & Unlock</strong> architecture with a centralized Relayer service that orchestrates cross-chain operations between LiteForge and multiple destination chains (Ethereum Sepolia, Base Sepolia).
      </p>

      <h2>Why Lock & Mint?</h2>
      <p>
        Among the various cross-chain bridge approaches (AMM pools, intent-based, hash time-locks), we chose Lock & Mint because:
      </p>
      <ul>
        <li><strong>Simple & Reliable</strong> &mdash; No complex liquidity pool management needed</li>
        <li><strong>1:1 Backing</strong> &mdash; Every wrapped token is always fully collateralized</li>
        <li><strong>No Slippage</strong> &mdash; Exchange rate is always 1:1 (minus the flat fee)</li>
        <li><strong>Predictable</strong> &mdash; Users know exactly what they'll receive before bridging</li>
        <li><strong>Multi-Chain Scalable</strong> &mdash; New destination chains can be added dynamically without redeployment</li>
      </ul>

      <h2>System Components</h2>

      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Chain</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>BridgeVaultV2</strong></td>
            <td>LiteForge (4441)</td>
            <td>Locks and unlocks native zkLTC, routes to destination chains</td>
          </tr>
          <tr>
            <td><strong>WrappedZkLTC</strong></td>
            <td>Ethereum Sepolia (11155111)</td>
            <td>ERC-20 token &mdash; mints and burns wzkLTC</td>
          </tr>
          <tr>
            <td><strong>WrappedZkLTC</strong></td>
            <td>Base Sepolia (84532)</td>
            <td>ERC-20 token &mdash; mints and burns wzkLTC</td>
          </tr>
          <tr>
            <td><strong>Relayer</strong></td>
            <td>Off-chain (Node.js)</td>
            <td>Listens for events, routes to correct destination chain</td>
          </tr>
          <tr>
            <td><strong>Frontend</strong></td>
            <td>Browser</td>
            <td>User interface for bridging and tracking</td>
          </tr>
          <tr>
            <td><strong>Supabase</strong></td>
            <td>Cloud</td>
            <td>Transaction indexer for fast queries</td>
          </tr>
        </tbody>
      </table>

      <h2>High-Level Architecture</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">LiteForge (L2)</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/70" />
              <code className="text-xs">BridgeVaultV2</code>
            </div>
            <div className="text-xs text-muted-foreground pl-4 space-y-1">
              <p className="mb-0">&rarr; <code>lock(recipient, destChainId)</code> &mdash; User locks zkLTC</p>
              <p className="mb-0">&larr; <code>unlock()</code> &mdash; Relayer releases zkLTC</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Ethereum Sepolia</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/70" />
              <code className="text-xs">WrappedZkLTC (ERC-20)</code>
            </div>
            <div className="text-xs text-muted-foreground pl-4 space-y-1">
              <p className="mb-0">&larr; <code>mint()</code> &mdash; Relayer mints wzkLTC</p>
              <p className="mb-0">&rarr; <code>burn()</code> &mdash; User burns wzkLTC</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">Base Sepolia</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/70" />
              <code className="text-xs">WrappedZkLTC (ERC-20)</code>
            </div>
            <div className="text-xs text-muted-foreground pl-4 space-y-1">
              <p className="mb-0">&larr; <code>mint()</code> &mdash; Relayer mints wzkLTC</p>
              <p className="mb-0">&rarr; <code>burn()</code> &mdash; User burns wzkLTC</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3 text-center">Relayer Service (Off-chain)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-border/30 bg-muted/30 p-3">
            <div className="text-xs font-semibold text-foreground mb-1">Listeners</div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="mb-0">LiteForge &rarr; detects <code>Locked</code> events (with <code>destChainId</code>)</p>
              <p className="mb-0">Sepolia &rarr; detects <code>Burned</code> events</p>
              <p className="mb-0">Base Sepolia &rarr; detects <code>Burned</code> events</p>
            </div>
          </div>
          <div className="rounded-md border border-border/30 bg-muted/30 p-3">
            <div className="text-xs font-semibold text-foreground mb-1">Executors</div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="mb-0">Mint Executor &rarr; mints wzkLTC on destination chain</p>
              <p className="mb-0">Unlock Executor &rarr; unlocks zkLTC on LiteForge</p>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-md border border-border/30 bg-muted/30 p-3 text-center">
          <div className="text-xs font-semibold text-foreground mb-0.5">Transaction Queue</div>
          <div className="text-xs text-muted-foreground">SQLite &mdash; PENDING &rarr; EXECUTING &rarr; COMPLETED (with <code>dest_chain</code> routing)</div>
        </div>
      </div>

      <div className="callout">
        <div className="callout-title">Flow Summary</div>
        <div className="callout-content space-y-1">
          <p className="mb-0"><strong>Lock:</strong> User &rarr; BridgeVaultV2.lock(recipient, destChainId) &rarr; Relayer detects &rarr; WrappedZkLTC.mint() on destination chain &rarr; User gets wzkLTC</p>
          <p className="mb-0"><strong>Burn:</strong> User &rarr; WrappedZkLTC.burn() on any chain &rarr; Relayer detects &rarr; BridgeVaultV2.unlock() &rarr; User gets zkLTC</p>
        </div>
      </div>

      <h2>Lock Flow (LiteForge &rarr; Destination Chain)</h2>

      <ol>
        <li>User calls <code>BridgeVaultV2.lock(recipient, destChainId)</code> with zkLTC value</li>
        <li>Contract validates <code>destChainId</code> is in <code>supportedChains</code>, deducts 0.3% fee, increments nonce, emits <code>Locked</code> event with <code>destChainId</code></li>
        <li>LiteForge Listener detects the event via block polling (every 5 seconds)</li>
        <li>Transaction is queued in SQLite as a <code>MINT</code> operation with <code>dest_chain</code> field</li>
        <li>After 3 block confirmations, Mint Executor performs pre-flight checks</li>
        <li>Executor calls <code>WrappedZkLTC.mint(recipient, amount, processId, nonce)</code> on the correct destination chain</li>
        <li>User receives wzkLTC on their chosen destination chain</li>
      </ol>

      <h2>Burn Flow (Destination Chain &rarr; LiteForge)</h2>

      <ol>
        <li>User calls <code>WrappedZkLTC.burn(amount, recipient)</code> on Sepolia or Base Sepolia</li>
        <li>Contract burns the full amount, mints 0.3% fee to owner, emits <code>Burned</code> event</li>
        <li>Destination chain Listener detects the event via block polling</li>
        <li>Transaction is queued in SQLite as an <code>UNLOCK</code> operation</li>
        <li>After 3 block confirmations, Unlock Executor performs pre-flight checks</li>
        <li>Executor calls <code>BridgeVaultV2.unlock(recipient, amount, txHash, nonce)</code></li>
        <li>User receives zkLTC on LiteForge</li>
      </ol>

      <h2>Relayer Design</h2>

      <h3>Parallel Workers</h3>
      <p>
        The Relayer runs two independent worker loops &mdash; one for MINT operations and one for UNLOCK operations. Each worker supports configurable concurrency (default: 3 transactions in parallel) with batch nonce management.
      </p>

      <h3>Transaction Queue States</h3>
      <table>
        <thead>
          <tr>
            <th>State</th>
            <th>Description</th>
            <th>Next State</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>PENDING</code></td>
            <td>Event detected, ready to execute</td>
            <td>EXECUTING</td>
          </tr>
          <tr>
            <td><code>EXECUTING</code></td>
            <td>Transaction submitted to destination chain</td>
            <td>COMPLETED / FAILED</td>
          </tr>
          <tr>
            <td><code>COMPLETED</code></td>
            <td>Successfully confirmed on-chain</td>
            <td>(terminal)</td>
          </tr>
          <tr>
            <td><code>FAILED</code></td>
            <td>Execution failed, will retry after backoff</td>
            <td>RETRYING</td>
          </tr>
          <tr>
            <td><code>RETRYING</code></td>
            <td>Moved back to execution queue</td>
            <td>EXECUTING</td>
          </tr>
          <tr>
            <td><code>DEAD</code></td>
            <td>Max retries (5) exceeded</td>
            <td>(terminal, needs manual intervention)</td>
          </tr>
        </tbody>
      </table>

      <h3>Retry Strategy</h3>
      <p>
        Failed transactions use exponential backoff: <code>10s &times; 2^retries</code>. After 5 failed attempts, the transaction is marked as DEAD and requires manual intervention via the Admin API.
      </p>

      <h3>RPC Fallback</h3>
      <p>
        The Relayer supports multiple RPC endpoints per chain with automatic fallback rotation. If the active RPC encounters a network error (socket hang up, timeout, connection refused), it automatically switches to the next available endpoint without downtime.
      </p>

      <h2>Security Model</h2>

      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Implementation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Replay Protection</td>
            <td>On-chain <code>processId</code> mapping + SQLite UNIQUE constraint (double layer)</td>
          </tr>
          <tr>
            <td>Access Control</td>
            <td><code>onlyRelayer</code> for mint/unlock, <code>onlyOwner</code> for admin functions</td>
          </tr>
          <tr>
            <td>Reentrancy Guard</td>
            <td>OpenZeppelin ReentrancyGuard on all state-changing functions</td>
          </tr>
          <tr>
            <td>Emergency Stop</td>
            <td>Pausable &mdash; owner can pause/unpause both contracts</td>
          </tr>
          <tr>
            <td>Fee Cap</td>
            <td>Maximum 5% (500 basis points) hard cap, currently set to 0.3% (30 basis points)</td>
          </tr>
          <tr>
            <td>Chain Validation</td>
            <td><code>supportedChains</code> mapping &mdash; only registered chains can be used as destinations</td>
          </tr>
          <tr>
            <td>Dust Prevention</td>
            <td>Minimum lock/burn amount of 0.001 ether</td>
          </tr>
          <tr>
            <td>Balance Verification</td>
            <td>Vault checks available balance before every unlock</td>
          </tr>
        </tbody>
      </table>

      <h2>Timing</h2>

      <table>
        <thead>
          <tr>
            <th>Direction</th>
            <th>Estimated Time</th>
            <th>Breakdown</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>LiteForge &rarr; Ethereum Sepolia</td>
            <td>~20 seconds</td>
            <td>Detection (5s) + Confirmations (6s) + Mint tx (9s)</td>
          </tr>
          <tr>
            <td>LiteForge &rarr; Base Sepolia</td>
            <td>~15 seconds</td>
            <td>Detection (5s) + Confirmations (6s) + Mint tx (4s)</td>
          </tr>
          <tr>
            <td>Ethereum Sepolia &rarr; LiteForge</td>
            <td>~45 seconds</td>
            <td>Detection (5s) + Confirmations (36s) + Unlock tx (4s)</td>
          </tr>
          <tr>
            <td>Base Sepolia &rarr; LiteForge</td>
            <td>~20 seconds</td>
            <td>Detection (5s) + Confirmations (6s) + Unlock tx (4s)</td>
          </tr>
        </tbody>
      </table>
      <p>
        Ethereum Sepolia has a longer block time (~12 seconds) compared to LiteForge (~2 seconds) and Base Sepolia (~2 seconds), which is why the burn direction from Sepolia takes longer.
      </p>
    </div>
  )
}
