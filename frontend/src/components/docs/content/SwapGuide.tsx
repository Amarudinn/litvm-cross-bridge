export function SwapGuide() {
  return (
    <div className="prose-docs">
      <h1>Swap Guide</h1>
      <p>
        This guide walks you through how to use Multyra Swap to exchange tokens, wrap/unwrap native tokens, perform cross-chain swaps, and manage liquidity positions.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>MetaMask or any injected wallet</li>
        <li>Tokens on the source chain (zkLTC, ETH, wzkLTC, MULTY, or WETH)</li>
        <li>A small amount of native token for gas (zkLTC on LiteForge, ETH on Sepolia/Base Sepolia)</li>
      </ul>

      <hr />

      <h2>Wrap / Unwrap</h2>
      <p>Convert native tokens to their wrapped version (or vice versa) at 1:1 ratio with zero fees.</p>
      <ol>
        <li>Select the same chain for both "From" and "To"</li>
        <li>Select native token as input (zkLTC on LiteForge, ETH on Sepolia/Base)</li>
        <li>Select WETH as output (or vice versa)</li>
        <li>Enter amount &mdash; output will be exactly the same (1:1)</li>
        <li>Click <strong>"Swap"</strong> and confirm in MetaMask (1 confirmation)</li>
      </ol>

      <div className="callout">
        <div className="callout-title">When to Wrap?</div>
        <div className="callout-content">
          <p className="mb-0">Wrapping is useful when you need WETH for adding liquidity to pools. UniswapV3 pools require ERC-20 tokens, so native tokens must be wrapped first.</p>
        </div>
      </div>

      <hr />

      <h2>Same-chain Swap</h2>
      <p>Swap tokens directly on the same chain through liquidity pools.</p>

      <h3>Step 1: Select Chain</h3>
      <p>The chain selector automatically syncs with your wallet's active network. You can also manually select a chain &mdash; your wallet will switch automatically.</p>

      <h3>Step 2: Select Tokens</h3>
      <ol>
        <li>Click the token selector on the "From" input and choose your input token</li>
        <li>Click the token selector on the "To" input and choose your output token</li>
      </ol>

      <h3>Step 3: Enter Amount</h3>
      <ol>
        <li>Enter the amount you want to swap, or use the percentage buttons (25%, 50%, 75%, MAX)</li>
        <li>The system queries all available fee tiers (0.05%, 0.3%, 1%) and selects the best rate</li>
        <li>The estimated output appears in the "To" field</li>
        <li>A route detail card appears below showing path, fees, and price impact</li>
      </ol>

      <h3>Step 4: Adjust Settings (Optional)</h3>
      <ol>
        <li>Click the settings icon (gear) in the top right</li>
        <li>Set slippage tolerance (default: 0.5%)</li>
        <li>Set transaction deadline (default: 20 minutes)</li>
      </ol>

      <h3>Step 5: Swap</h3>
      <ol>
        <li>Click <strong>"Swap"</strong></li>
        <li>If this is your first time swapping this token, approve it first (one-time, subsequent swaps skip this)</li>
        <li>Confirm the swap transaction in MetaMask</li>
        <li>Track progress in the status modal (Signing &rarr; Confirming &rarr; Complete)</li>
      </ol>

      <div className="callout">
        <div className="callout-title">Price Impact Warning</div>
        <div className="callout-content">
          <p className="mb-0"><strong>10%+:</strong> Yellow warning &mdash; proceed with caution</p>
          <p className="mb-0"><strong>20%+:</strong> Red warning &mdash; you must type "confirm" to proceed. This protects you from large losses due to low liquidity.</p>
        </div>
      </div>

      <hr />

      <h2>Cross-chain Swap</h2>
      <p>Swap tokens across different chains. The system automatically bridges and swaps in one flow.</p>

      <h3>LiteForge &rarr; Sepolia / Base Sepolia</h3>
      <ol>
        <li>Set "From" chain to <strong>LiteForge</strong></li>
        <li>Set "To" chain to <strong>Sepolia</strong> or <strong>Base Sepolia</strong></li>
        <li>A badge will appear:
          <ul>
            <li><strong>"Bridge"</strong> &mdash; if target is wzkLTC (bridge only, no swap needed)</li>
            <li><strong>"Cross-chain"</strong> &mdash; if target is another token (bridge + swap)</li>
          </ul>
        </li>
        <li>Select input token (zkLTC) and output token</li>
        <li>Enter amount &mdash; route preview shows the full path</li>
        <li>Click <strong>"Bridge"</strong> or <strong>"Swap Cross-chain"</strong></li>
        <li>Progress modal shows: Signing &rarr; Confirming &rarr; Relaying &rarr; (Swap) &rarr; Complete</li>
      </ol>

      <h3>Sepolia / Base Sepolia &rarr; LiteForge</h3>
      <ol>
        <li>Set "From" chain to <strong>Sepolia</strong> or <strong>Base Sepolia</strong></li>
        <li>Set "To" chain to <strong>LiteForge</strong></li>
        <li>Select input token and output token (zkLTC)</li>
        <li>Click <strong>"Bridge"</strong> or <strong>"Swap Cross-chain"</strong></li>
        <li>The system will:
          <ul>
            <li>Swap input &rarr; wzkLTC (if input is not wzkLTC)</li>
            <li>Burn wzkLTC on source chain</li>
            <li>Relayer unlocks zkLTC on LiteForge</li>
          </ul>
        </li>
      </ol>

      <div className="callout">
        <div className="callout-title">Timing</div>
        <div className="callout-content">
          <p className="mb-0">Cross-chain swaps include bridge relay time:</p>
          <p className="mb-0">&bull; LiteForge &rarr; Sepolia/Base: ~20-30 seconds</p>
          <p className="mb-0">&bull; Sepolia/Base &rarr; LiteForge: ~45-60 seconds</p>
        </div>
      </div>

      <hr />

      <h2>Managing Liquidity (Pool Tab)</h2>

      <h3>Viewing Positions</h3>
      <ol>
        <li>Switch to the <strong>Pool</strong> tab</li>
        <li>Chain selector automatically matches your wallet's network</li>
        <li>Toggle between <strong>"Your Positions"</strong> and <strong>"Available Pools"</strong></li>
        <li>Click a position to expand and see token amounts</li>
      </ol>

      <h3>Adding Liquidity</h3>
      <ol>
        <li>Click <strong>"+ New Position"</strong> or click an Available Pool card</li>
        <li>Select token pair (custom dropdown with token logos)</li>
        <li>Select fee tier (0.05% Stable, 0.3% Standard, 1% Exotic)</li>
        <li>The system checks if the pool exists:
          <ul>
            <li><strong>Pool exists:</strong> Shows current price, auto-calculates second token amount based on pool ratio</li>
            <li><strong>New pool:</strong> You set the initial price via your deposit ratio. Pool is created automatically.</li>
          </ul>
        </li>
        <li>Set price range (or use "Full Range" for maximum flexibility)</li>
        <li>Enter deposit amounts (use 25%, 50%, 75%, MAX buttons)</li>
        <li>Click <strong>"Add Liquidity"</strong></li>
        <li>Progress: Approving Tokens &rarr; Signing &rarr; Adding Liquidity &rarr; Complete</li>
      </ol>

      <div className="callout">
        <div className="callout-title">Auto Pool Creation</div>
        <div className="callout-content">
          <p className="mb-0">If the pool doesn't exist for your chosen pair + fee tier, it will be created and initialized automatically. The initial price is calculated from your deposit ratio. This requires extra gas (~4.5M) for pool deployment.</p>
        </div>
      </div>

      <h3>Removing Liquidity</h3>
      <ol>
        <li>In "Your Positions", expand a position and click <strong>"Remove"</strong></li>
        <li>Use the slider or preset buttons (25%, 50%, 75%, 100%) to select removal amount</li>
        <li>"You will receive" shows exact token amounts (calculated via on-chain simulation)</li>
        <li>Click <strong>"Remove X%"</strong></li>
        <li>Progress: Signing &rarr; Removing Liquidity &rarr; Collecting Tokens &rarr; Complete</li>
        <li>After completion, automatically returns to pool list with updated balances</li>
      </ol>

      <h3>Adding More to Existing Position</h3>
      <ol>
        <li>In "Your Positions", expand a position and click <strong>"Add"</strong></li>
        <li>Token pair and fee tier are pre-filled</li>
        <li>Enter additional amounts and confirm</li>
      </ol>

      <hr />

      <h2>Troubleshooting</h2>

      <h3>"No route available"</h3>
      <ul>
        <li>No pool exists with liquidity for this token pair</li>
        <li>Try a different token pair, or add liquidity first</li>
      </ul>

      <h3>High price impact</h3>
      <ul>
        <li>Your trade size is large relative to pool liquidity</li>
        <li>Consider splitting into smaller trades</li>
        <li>Or add more liquidity to the pool first</li>
      </ul>

      <h3>"Add liquidity reverted"</h3>
      <ul>
        <li>Your deposit ratio may not match the pool's current price</li>
        <li>Check the "Pool exists" info card for the current price ratio</li>
        <li>Let the auto-calculate fill the second amount for you</li>
      </ul>

      <h3>Transaction reverted (slippage)</h3>
      <ul>
        <li>Price moved beyond your slippage tolerance during execution</li>
        <li>Increase slippage in settings (gear icon) and try again</li>
        <li>For volatile pairs or low-liquidity pools, 1% or higher may be needed</li>
      </ul>

      <h3>Bridge timeout</h3>
      <ul>
        <li>Relayer may be temporarily delayed</li>
        <li>Check the History page for transaction status</li>
        <li>Funds are safe &mdash; the relayer will complete the transfer once it catches up</li>
      </ul>
    </div>
  )
}
