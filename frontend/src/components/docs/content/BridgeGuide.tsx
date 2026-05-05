export function BridgeGuide() {
  return (
    <div className="prose-docs">
      <h1>Bridge Guide</h1>
      <p>
        This guide walks you through how to use Multyra Bridge to transfer tokens between LiteForge and Sepolia.
      </p>

      <h2>Prerequisites</h2>
      <ul>
        <li>MetaMask or any injected wallet installed in your browser</li>
        <li>zkLTC on LiteForge (for bridging to Sepolia) or wzkLTC on Sepolia (for bridging back)</li>
        <li>A small amount of ETH on Sepolia for gas (if burning wzkLTC)</li>
      </ul>

      <h2>Add LiteForge Network to MetaMask</h2>
      <p>If LiteForge is not already in your wallet, add it manually:</p>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Network Name</td>
            <td>LiteForge</td>
          </tr>
          <tr>
            <td>RPC URL</td>
            <td><code>https://liteforge.rpc.caldera.xyz/http</code></td>
          </tr>
          <tr>
            <td>Chain ID</td>
            <td><code>4441</code></td>
          </tr>
          <tr>
            <td>Currency Symbol</td>
            <td><code>zkLTC</code></td>
          </tr>
          <tr>
            <td>Block Explorer</td>
            <td><code>https://liteforge.explorer.caldera.xyz</code></td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2>Bridge zkLTC to Sepolia (Lock)</h2>
      <p>Convert your native zkLTC on LiteForge into wzkLTC on Sepolia.</p>

      <h3>Step 1: Connect Wallet</h3>
      <ol>
        <li>Open the Multyra Bridge app</li>
        <li>Click <strong>"Connect Wallet"</strong> in the top right</li>
        <li>Select MetaMask and approve the connection</li>
      </ol>

      <h3>Step 2: Select Direction</h3>
      <ol>
        <li>Make sure the direction shows <strong>LiteForge &rarr; Sepolia</strong></li>
        <li>If it shows the opposite, click the swap button (arrows icon) to toggle</li>
      </ol>

      <h3>Step 3: Enter Amount</h3>
      <ol>
        <li>Enter the amount of zkLTC you want to bridge</li>
        <li>Or click <strong>MAX</strong> to bridge your entire balance</li>
        <li>Review the fee breakdown below the input (0.3% fee)</li>
        <li>The "You will receive" field shows the exact amount of wzkLTC you'll get</li>
      </ol>

      <h3>Step 4: Bridge</h3>
      <ol>
        <li>If you're on the wrong network, the button will say "Switch to LiteForge" &mdash; click it</li>
        <li>Click <strong>"Bridge X.XX zkLTC"</strong></li>
        <li>Confirm the transaction in MetaMask</li>
      </ol>

      <h3>Step 5: Wait for Completion</h3>
      <p>A progress modal will appear showing 4 steps:</p>
      <ol>
        <li><strong>Signing</strong> &mdash; Transaction confirmed in your wallet</li>
        <li><strong>Confirming on LiteForge</strong> &mdash; Waiting for block confirmation (~6 seconds)</li>
        <li><strong>Relaying to Sepolia</strong> &mdash; Relayer is minting wzkLTC (~10-15 seconds)</li>
        <li><strong>Complete</strong> &mdash; wzkLTC has been minted to your wallet on Sepolia</li>
      </ol>

      <div className="callout">
        <div className="callout-title">
          Total time: ~20 seconds
        </div>
        <div className="callout-content">
          The entire process from lock to receiving wzkLTC typically takes about 20 seconds. A live timer shows elapsed time during the process.
        </div>
      </div>

      <hr />

      <h2>Bridge wzkLTC back to LiteForge (Burn)</h2>
      <p>Convert your wzkLTC on Sepolia back into native zkLTC on LiteForge.</p>

      <h3>Step 1: Switch Direction</h3>
      <ol>
        <li>Click the swap button to set direction to <strong>Sepolia &rarr; LiteForge</strong></li>
        <li>If prompted, switch your wallet to the Sepolia network</li>
      </ol>

      <h3>Step 2: Enter Amount</h3>
      <ol>
        <li>Enter the amount of wzkLTC you want to burn</li>
        <li>Review the fee (0.3%) and the amount of zkLTC you'll receive</li>
      </ol>

      <h3>Step 3: Bridge</h3>
      <ol>
        <li>Click <strong>"Bridge X.XX wzkLTC"</strong></li>
        <li>Confirm the transaction in MetaMask</li>
        <li>Wait for the progress modal to show "Complete"</li>
      </ol>

      <div className="callout">
        <div className="callout-title">
          Total time: ~45 seconds
        </div>
        <div className="callout-content">
          Burning takes longer because Sepolia has a ~12 second block time (vs ~2 seconds on LiteForge). The 3 block confirmations alone take ~36 seconds.
        </div>
      </div>

      <hr />

      <h2>Check Transaction History</h2>
      <ol>
        <li>Click <strong>"History"</strong> in the navigation bar</li>
        <li>Connect your wallet if not already connected</li>
        <li>View all your bridge transactions with status indicators</li>
        <li>Use the filter tabs to show only Lock or Burn transactions</li>
        <li>Click any transaction hash to view it on the block explorer</li>
      </ol>

      <h2>Check Bridge Explorer</h2>
      <ol>
        <li>Click <strong>"Explorer"</strong> in the navigation bar</li>
        <li>View aggregate stats: total locked, total burned, total transactions</li>
        <li>Browse all bridge transactions from all users</li>
        <li>Search by address or filter by direction</li>
      </ol>

      <hr />

      <h2>Troubleshooting</h2>

      <h3>Transaction not appearing on destination chain</h3>
      <ul>
        <li>Wait at least 60 seconds &mdash; the Relayer needs time to detect, confirm, and execute</li>
        <li>Check the History page to see if your transaction shows "Relaying" status</li>
        <li>Ensure the Relayer service is running (check with admin if needed)</li>
      </ul>

      <h3>"Below Minimum" error</h3>
      <ul>
        <li>Minimum lock amount: 0.001 zkLTC</li>
        <li>Minimum burn amount: 0.001 wzkLTC</li>
      </ul>

      <h3>"Insufficient Balance" error</h3>
      <ul>
        <li>Make sure you have enough tokens on the source chain</li>
        <li>For lock: check your zkLTC balance on LiteForge</li>
        <li>For burn: check your wzkLTC balance on Sepolia</li>
      </ul>

      <h3>wzkLTC not showing in MetaMask</h3>
      <ul>
        <li>You need to manually import the token in MetaMask</li>
        <li>Switch to Sepolia network in MetaMask</li>
        <li>Click "Import tokens" and enter: <code>0x4320BB234A76f94F9eeDD0E81968668C6d29c39f</code></li>
      </ul>

      <h3>"Switch to LiteForge/Sepolia" button</h3>
      <ul>
        <li>Your wallet is on the wrong network for the selected bridge direction</li>
        <li>Click the button to automatically switch networks</li>
        <li>If it doesn't work, manually switch in MetaMask</li>
      </ul>
    </div>
  )
}
