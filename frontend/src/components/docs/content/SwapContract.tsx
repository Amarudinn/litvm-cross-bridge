export function SwapContract() {
  return (
    <div className="prose-docs">
      <h1>Swap Contracts</h1>
      <p>
        Multyra Swap uses a custom-deployed UniswapV3 stack on each supported chain, plus a <strong>MultyraRouter</strong> aggregator contract that handles fee collection and routing.
      </p>

      <h2>Deployed Contracts</h2>

      <div className="callout">
        <div className="callout-title">Deployed &amp; Live</div>
        <div className="callout-content">
          All contracts are deployed and operational on LiteForge, Ethereum Sepolia, and Base Sepolia testnets.
        </div>
      </div>

      <h3>Contract Addresses</h3>

      <h4>LiteForge (Chain ID: 4441)</h4>
      <table>
        <thead><tr><th>Contract</th><th>Address</th></tr></thead>
        <tbody>
          <tr><td>UniswapV3Factory</td><td><code>0x2305fd1Ebc0f5F3b59bdD06cda6090a4EBe7714D</code></td></tr>
          <tr><td>NonfungiblePositionManager</td><td><code>0x660b3ad887486F30cc43f7e57280C96590637077</code></td></tr>
          <tr><td>SwapRouter</td><td><code>0x97A0A49BF8B5EF5033F18855bE7ff6F0dA34a913</code></td></tr>
          <tr><td>QuoterV2</td><td><code>0x344bBD93f45f906c44A426C396C9E64F0f686c44</code></td></tr>
          <tr><td>MultyraRouter</td><td><code>0x9D2aD458a789723b8848AeD51c05F4D1fBdB1111</code></td></tr>
          <tr><td>WETH</td><td><code>0xBD0d30231F3DFaaFF0DbE4ce5f68Ba976E934042</code></td></tr>
          <tr><td>MULTY</td><td><code>0x4630632194D44BC7205BA41CBB0a2014AD36A4Fc</code></td></tr>
        </tbody>
      </table>

      <h4>Ethereum Sepolia (Chain ID: 11155111)</h4>
      <table>
        <thead><tr><th>Contract</th><th>Address</th></tr></thead>
        <tbody>
          <tr><td>UniswapV3Factory</td><td><code>0x38aE7cDAA138Df4da2b228CAB81bd3b0ea8923E6</code></td></tr>
          <tr><td>NonfungiblePositionManager</td><td><code>0x805BfFBa7dfCAf725Fcc8Bb56630333aA8241449</code></td></tr>
          <tr><td>SwapRouter</td><td><code>0xb585F4f0ac1537D3e5fb69e7FB8726b4AAe1B2f9</code></td></tr>
          <tr><td>QuoterV2</td><td><code>0xe168E339fd38bfEd7653a251879180A176312a2C</code></td></tr>
          <tr><td>MultyraRouter</td><td><code>0x4A16218cb6b39cE2a0Cb2c596C33e4B6957265E0</code></td></tr>
          <tr><td>WETH</td><td><code>0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14</code></td></tr>
          <tr><td>wzkLTC</td><td><code>0x4320BB234A76f94F9eeDD0E81968668C6d29c39f</code></td></tr>
          <tr><td>MULTY</td><td><code>0x12472B2115849f146c10Cc435bc329423A08FC19</code></td></tr>
        </tbody>
      </table>

      <h4>Base Sepolia (Chain ID: 84532)</h4>
      <table>
        <thead><tr><th>Contract</th><th>Address</th></tr></thead>
        <tbody>
          <tr><td>UniswapV3Factory</td><td><code>0x622C7B14fF74bFeC9B82459F3dab954f82b47d7a</code></td></tr>
          <tr><td>NonfungiblePositionManager</td><td><code>0x5e04Ca8bD75daf0418bb1abd95c6C35F6e46D814</code></td></tr>
          <tr><td>SwapRouter</td><td><code>0x42fF1a3dD7C9384E6955394e297b2Aaa4399535f</code></td></tr>
          <tr><td>QuoterV2</td><td><code>0xCAbe1099fC87Ca2E2e9126c0Da1A592ab9a5D0Bc</code></td></tr>
          <tr><td>MultyraRouter</td><td><code>0xDfAb13959371EFF8fdd71aecD1403FD78b743eE0</code></td></tr>
          <tr><td>WETH</td><td><code>0x4200000000000000000000000000000000000006</code></td></tr>
          <tr><td>wzkLTC</td><td><code>0xB378f0359815ECEC5Ae3c5aC4c49c12b70931688</code></td></tr>
          <tr><td>MULTY</td><td><code>0x1cBbf0AC851414A95c82CAa9032778203398dCd7</code></td></tr>
        </tbody>
      </table>

      <h3>Per-Chain Deployment</h3>
      <table>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>UniswapV3Factory</strong></td>
            <td>Creates and manages liquidity pools</td>
          </tr>
          <tr>
            <td><strong>SwapRouter</strong></td>
            <td>Executes single-hop and multi-hop swaps</td>
          </tr>
          <tr>
            <td><strong>NonfungiblePositionManager</strong></td>
            <td>Manages LP positions as ERC-721 NFTs</td>
          </tr>
          <tr>
            <td><strong>QuoterV2</strong></td>
            <td>Off-chain price quotes (view functions)</td>
          </tr>
          <tr>
            <td><strong>TickLens</strong></td>
            <td>Batch read tick data for UI</td>
          </tr>
          <tr>
            <td><strong>MultyraRouter</strong></td>
            <td>Aggregator &mdash; routes swaps + collects 0.1% fee</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2>MultyraRouter</h2>
      <p>
        The MultyraRouter is the main entry point for all swaps. It wraps UniswapV3's SwapRouter with an additional aggregator fee layer and native token support.
      </p>

      <h3>Core Functions</h3>

      <h4><code>swapExactInputSingle(address tokenIn, address tokenOut, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum)</code></h4>
      <p>Executes a single-hop ERC-20 to ERC-20 swap through a UniswapV3 pool.</p>
      <ul>
        <li><strong>Fee:</strong> 0.1% deducted from <code>amountIn</code> before swap</li>
        <li><strong>Slippage:</strong> Reverts if output &lt; <code>amountOutMinimum</code></li>
        <li><strong>Returns:</strong> Actual amount of <code>tokenOut</code> received</li>
      </ul>

      <h4><code>swapExactNativeForToken(address tokenOut, uint24 poolFee, uint256 amountOutMinimum)</code></h4>
      <p>Swaps native token (zkLTC on LiteForge, ETH on Sepolia/Base) for an ERC-20 token.</p>
      <ul>
        <li><strong>Payable:</strong> Send native token as <code>msg.value</code></li>
        <li><strong>Fee:</strong> 0.1% deducted from <code>msg.value</code></li>
        <li><strong>Wraps:</strong> Native token to WETH internally before swap</li>
      </ul>

      <h4><code>swapExactInputSingleAndUnwrap(address tokenIn, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum)</code></h4>
      <p>Swaps an ERC-20 token to native token (swap + unwrap WETH in one transaction).</p>
      <ul>
        <li><strong>Use case:</strong> When user wants to receive native token (zkLTC/ETH) as output</li>
        <li><strong>Unwraps:</strong> WETH to native token after swap</li>
      </ul>

      <h3>Admin Functions</h3>

      <h4><code>setFeeRecipient(address _recipient)</code></h4>
      <p>Updates the address that receives aggregator fees. Owner only.</p>

      <h4><code>setAggregatorFee(uint256 _feeBps)</code></h4>
      <p>Updates the aggregator fee (in basis points). Capped at 100 (1%). Owner only.</p>

      <h4><code>withdrawFees(address token)</code></h4>
      <p>Withdraws accumulated fees for a specific token. Owner only.</p>

      <hr />

      <h2>Token: MULTY</h2>

      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td>Multyra</td>
          </tr>
          <tr>
            <td>Symbol</td>
            <td>MULTY</td>
          </tr>
          <tr>
            <td>Total Supply</td>
            <td>1,000,000,000 (1 Billion)</td>
          </tr>
          <tr>
            <td>Decimals</td>
            <td>18</td>
          </tr>
          <tr>
            <td>Standard</td>
            <td>ERC-20</td>
          </tr>
          <tr>
            <td>Deployed On</td>
            <td>LiteForge, Sepolia, Base Sepolia</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2>UniswapV3 Pool Mechanics</h2>

      <h3>Concentrated Liquidity</h3>
      <p>
        Unlike UniswapV2 (full-range liquidity), V3 allows LPs to concentrate their liquidity within specific price ranges. This means:
      </p>
      <ul>
        <li>Higher capital efficiency (up to 4000x vs V2)</li>
        <li>LPs earn more fees per dollar of liquidity</li>
        <li>Positions are represented as NFTs (ERC-721)</li>
      </ul>

      <h3>Fee Tiers</h3>
      <table>
        <thead>
          <tr>
            <th>Tier</th>
            <th>Fee</th>
            <th>Best For</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>500</td>
            <td>0.05%</td>
            <td>Stable pairs (e.g., stablecoin/stablecoin)</td>
          </tr>
          <tr>
            <td>3000</td>
            <td>0.3%</td>
            <td>Most pairs (default)</td>
          </tr>
          <tr>
            <td>10000</td>
            <td>1%</td>
            <td>Exotic/volatile pairs</td>
          </tr>
        </tbody>
      </table>

      <h3>Position Management</h3>
      <ul>
        <li><strong>Mint:</strong> Create a new LP position with a price range</li>
        <li><strong>Increase Liquidity:</strong> Add more tokens to an existing position</li>
        <li><strong>Decrease Liquidity:</strong> Remove tokens from a position</li>
        <li><strong>Collect:</strong> Claim accumulated swap fees</li>
        <li><strong>Burn:</strong> Remove the position NFT (must have 0 liquidity)</li>
      </ul>
    </div>
  )
}
