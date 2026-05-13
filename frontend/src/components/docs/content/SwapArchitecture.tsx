export function SwapArchitecture() {
  return (
    <div className="prose-docs">
      <h1>Swap Architecture</h1>
      <p>
        Multyra Swap is a cross-chain DEX aggregator built on top of UniswapV3 deployments across LiteForge, Ethereum Sepolia, and Base Sepolia. It supports same-chain swaps, cross-chain swaps (bridge + swap), wrap/unwrap, and liquidity management.
      </p>

      <h2>System Overview</h2>

      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>UniswapV3 (per chain)</strong></td>
            <td>Liquidity pools &mdash; Factory, SwapRouter, NonfungiblePositionManager, QuoterV2</td>
          </tr>
          <tr>
            <td><strong>MultyraRouter</strong></td>
            <td>Aggregator contract &mdash; routes swaps with native token support, collects 0.1% fee</td>
          </tr>
          <tr>
            <td><strong>BridgeVaultV2</strong></td>
            <td>Cross-chain bridge &mdash; lock/unlock zkLTC for cross-chain transfers</td>
          </tr>
          <tr>
            <td><strong>WrappedZkLTC</strong></td>
            <td>ERC-20 representation of zkLTC on destination chains (mint/burn by relayer)</td>
          </tr>
          <tr>
            <td><strong>Relayer</strong></td>
            <td>Off-chain service that watches events and completes cross-chain transfers</td>
          </tr>
          <tr>
            <td><strong>WETH Contract</strong></td>
            <td>Wrapped native token (zkLTC on LiteForge, ETH on Sepolia/Base) for pool compatibility</td>
          </tr>
        </tbody>
      </table>

      <h2>Supported Chains &amp; Tokens</h2>

      <table>
        <thead>
          <tr>
            <th>Chain</th>
            <th>Chain ID</th>
            <th>Native</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>LiteForge</td>
            <td><code>4441</code></td>
            <td>zkLTC</td>
            <td>zkLTC, WETH, MULTY</td>
          </tr>
          <tr>
            <td>Ethereum Sepolia</td>
            <td><code>11155111</code></td>
            <td>ETH</td>
            <td>ETH, wzkLTC, WETH, MULTY</td>
          </tr>
          <tr>
            <td>Base Sepolia</td>
            <td><code>84532</code></td>
            <td>ETH</td>
            <td>ETH, wzkLTC, WETH, MULTY</td>
          </tr>
        </tbody>
      </table>

      <h2>Swap Types</h2>

      <h3>1. Wrap / Unwrap</h3>
      <p>Direct 1:1 conversion between native token and its wrapped version. No pool or fee required.</p>
      <ul>
        <li><strong>LiteForge:</strong> zkLTC &harr; WETH (wrap/unwrap via WETH contract)</li>
        <li><strong>Sepolia/Base:</strong> ETH &harr; WETH (wrap/unwrap via WETH contract)</li>
      </ul>
      <p>The system automatically detects wrap/unwrap pairs and executes a simple <code>deposit()</code> or <code>withdraw()</code> call &mdash; no router, no fees, no slippage.</p>

      <h3>2. Same-chain Swap</h3>
      <p>When source and destination are on the same chain, tokens are swapped through UniswapV3 pools via MultyraRouter:</p>
      <ol>
        <li>Frontend queries QuoterV2 across all fee tiers (0.05%, 0.3%, 1%) in parallel</li>
        <li>Selects the pool with the best output (most tokens received)</li>
        <li>Checks token allowance &mdash; approves if needed (only first time)</li>
        <li>Executes swap via MultyraRouter (deducts 0.1% aggregator fee)</li>
        <li>User receives output token</li>
      </ol>
      <p>Router functions used:</p>
      <ul>
        <li><code>swapExactInputSingle</code> &mdash; ERC-20 &rarr; ERC-20</li>
        <li><code>swapExactNativeForToken</code> &mdash; Native (zkLTC/ETH) &rarr; ERC-20</li>
        <li><code>swapExactInputSingleAndUnwrap</code> &mdash; ERC-20 &rarr; Native (swap + unwrap)</li>
      </ul>

      <h3>3. Cross-chain Swap (LiteForge &rarr; Destination)</h3>
      <p>Combines bridge + optional swap on destination chain:</p>
      <ol>
        <li>User locks zkLTC via BridgeVaultV2 (0.3% bridge fee deducted)</li>
        <li>Relayer detects <code>Locked</code> event and mints wzkLTC on destination chain</li>
        <li>Frontend polls destination chain for wzkLTC balance increase (up to 2 min)</li>
        <li>If target token is wzkLTC &rarr; done (bridge only)</li>
        <li>If target token is different &rarr; auto-switch wallet to destination chain, approve wzkLTC (if needed), swap wzkLTC &rarr; target token</li>
      </ol>

      <h3>4. Cross-chain Swap (Destination &rarr; LiteForge)</h3>
      <p>Combines optional swap + bridge back:</p>
      <ol>
        <li>If input token is not wzkLTC &rarr; swap input &rarr; wzkLTC on source chain</li>
        <li>Burn wzkLTC on source chain (0.3% bridge fee)</li>
        <li>Relayer detects <code>Burned</code> event and unlocks zkLTC on LiteForge</li>
        <li>User receives zkLTC on LiteForge</li>
      </ol>

      <h2>Quoting &amp; Routing</h2>
      <p>The frontend uses an intelligent quoting system:</p>
      <ol>
        <li>User enters amount &rarr; 600ms debounce</li>
        <li>Queries QuoterV2 on-chain (<code>quoteExactInputSingle</code>) for all 3 fee tiers in parallel</li>
        <li>Selects the tier with highest output (best liquidity for the trade size)</li>
        <li>Calculates price impact by comparing execution price vs. mid-price (tiny reference quote)</li>
        <li>Displays route preview with fees breakdown</li>
      </ol>

      <div className="callout">
        <div className="callout-title">Smart Fee Tier Selection</div>
        <div className="callout-content">
          <p className="mb-0">Unlike traditional DEXes that require users to pick a fee tier, Multyra automatically finds the best pool. If a 0.05% pool has more liquidity than a 1% pool for your trade size, it will route through the 0.05% pool for better output.</p>
        </div>
      </div>

      <h2>Fee Structure</h2>

      <table>
        <thead>
          <tr>
            <th>Fee Type</th>
            <th>Amount</th>
            <th>When Applied</th>
            <th>Recipient</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pool Fee</td>
            <td>0.05% / 0.3% / 1%</td>
            <td>Every pool swap</td>
            <td>Liquidity Providers</td>
          </tr>
          <tr>
            <td>Aggregator Fee</td>
            <td>0.1%</td>
            <td>Every pool swap</td>
            <td>Multyra Treasury</td>
          </tr>
          <tr>
            <td>Bridge Fee</td>
            <td>0.3%</td>
            <td>Cross-chain only</td>
            <td>BridgeVaultV2 Owner</td>
          </tr>
          <tr>
            <td>Wrap/Unwrap</td>
            <td>0%</td>
            <td>Native &harr; Wrapped</td>
            <td>N/A</td>
          </tr>
        </tbody>
      </table>

      <div className="callout">
        <div className="callout-title">Total Fee Examples</div>
        <div className="callout-content">
          <p className="mb-0"><strong>Wrap/Unwrap:</strong> 0% (free, 1:1)</p>
          <p className="mb-0"><strong>Same-chain swap:</strong> 0.1% aggregator + pool fee (0.05-1%) = ~0.15-1.1%</p>
          <p className="mb-0"><strong>Cross-chain (bridge only):</strong> 0.3% bridge fee</p>
          <p className="mb-0"><strong>Cross-chain (bridge + swap):</strong> 0.3% bridge + 0.1% aggregator + pool fee = ~0.45-1.4%</p>
        </div>
      </div>

      <h2>Liquidity Pool Management</h2>

      <h3>Adding Liquidity</h3>
      <p>Users can provide liquidity to any token pair with any fee tier:</p>
      <ol>
        <li>Select token pair and fee tier</li>
        <li>System checks if pool exists via <code>Factory.getPool()</code></li>
        <li>If pool doesn't exist &rarr; automatically creates pool (<code>createPool</code>) and initializes with price based on deposit ratio</li>
        <li>Checks allowance for both tokens &mdash; approves only if needed</li>
        <li>Mints LP position via NonfungiblePositionManager</li>
      </ol>

      <h3>Auto-calculated Deposits</h3>
      <p>When a pool already exists, the frontend reads the current pool price from <code>slot0</code> and auto-calculates the second token amount based on the first input. This ensures deposits match the pool's current price ratio.</p>

      <h3>Removing Liquidity</h3>
      <ol>
        <li>Calls <code>decreaseLiquidity</code> to reduce position size</li>
        <li>Calls <code>collect</code> to withdraw tokens to wallet</li>
        <li>Preview shows exact amounts via on-chain simulation (<code>eth_call</code>)</li>
      </ol>

      <h2>Price Impact Protection</h2>
      <ul>
        <li><strong>10%+ impact:</strong> Yellow warning displayed</li>
        <li><strong>20%+ impact:</strong> Red warning + user must type "confirm" to proceed</li>
        <li><strong>Slippage protection:</strong> Configurable tolerance (default 0.5%), minimum 50% for testnet pools</li>
      </ul>

      <h2>Auto-refresh System</h2>
      <p>Token balances and pool positions automatically refresh after any transaction (swap, bridge, add/remove liquidity) without requiring a page reload. This is achieved via a shared invalidation counter that triggers re-fetches across all balance-dependent components.</p>
    </div>
  )
}
