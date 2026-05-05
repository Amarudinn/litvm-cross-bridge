export function Overview() {
  return (
    <div className="prose-docs">
      <h1>Multyra Bridge</h1>
      <p>
        Multyra Bridge is a cross-chain bridge connecting <strong>LiteForge</strong> and <strong>Sepolia</strong> (Ethereum Testnet) using a secure <strong>Lock & Mint</strong> mechanism with an automated Relayer service.
      </p>

      <div className="callout">
        <div className="callout-title">
          How it works
        </div>
        <div className="callout-content">
          Lock your zkLTC on LiteForge to receive wzkLTC (Wrapped zkLTC) on Sepolia, or burn wzkLTC on Sepolia to unlock your original zkLTC on LiteForge. Every wzkLTC is always backed 1:1 by locked zkLTC.
        </div>
      </div>

      <h2>Supported Chains</h2>

      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>LiteForge</th>
            <th>Sepolia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Chain ID</td>
            <td><code>4441</code></td>
            <td><code>11155111</code></td>
          </tr>
          <tr>
            <td>Type</td>
            <td>Layer 1</td>
            <td>Ethereum Testnet</td>
          </tr>
          <tr>
            <td>Native Token</td>
            <td>zkLTC</td>
            <td>ETH</td>
          </tr>
          <tr>
            <td>Bridge Token</td>
            <td>zkLTC (native)</td>
            <td>wzkLTC (ERC-20)</td>
          </tr>
          <tr>
            <td>Block Explorer</td>
            <td><a href="https://liteforge.explorer.caldera.xyz" target="_blank" rel="noopener noreferrer">LiteForge Explorer</a></td>
            <td><a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer">Sepolia Etherscan</a></td>
          </tr>
        </tbody>
      </table>

      <h2>Key Features</h2>

      <ul>
        <li><strong>1:1 Backing</strong> &mdash; Every wzkLTC in circulation is backed by an equal amount of zkLTC locked in the BridgeVault</li>
        <li><strong>Low Fee</strong> &mdash; Only 0.3% per transaction</li>
        <li><strong>Fast Bridging</strong> &mdash; LiteForge to Sepolia in ~20 seconds, Sepolia to LiteForge in ~45 seconds</li>
        <li><strong>Automated Relayer</strong> &mdash; Transactions are processed automatically with retry logic and error recovery</li>
        <li><strong>Replay Protection</strong> &mdash; Double-layer protection (on-chain + database) prevents duplicate processing</li>
        <li><strong>Emergency Controls</strong> &mdash; Contracts can be paused instantly by the owner in case of emergency</li>
      </ul>

      <h2>Bridge Flow</h2>

      <h3>LiteForge to Sepolia (Lock)</h3>
      <ol>
        <li>User sends zkLTC to the BridgeVault contract on LiteForge</li>
        <li>A 0.3% fee is deducted, the rest is locked in the vault</li>
        <li>The Relayer detects the lock event and waits for 3 block confirmations</li>
        <li>The Relayer mints the equivalent wzkLTC to the user on Sepolia</li>
      </ol>

      <h3>Sepolia to LiteForge (Burn)</h3>
      <ol>
        <li>User burns their wzkLTC on the Sepolia contract</li>
        <li>A 0.3% fee is deducted (minted to the owner as wzkLTC)</li>
        <li>The Relayer detects the burn event and waits for 3 block confirmations</li>
        <li>The Relayer unlocks the equivalent zkLTC from the vault to the user on LiteForge</li>
      </ol>

      <h2>Fee Structure</h2>

      <table>
        <thead>
          <tr>
            <th>Amount</th>
            <th>Fee (0.3%)</th>
            <th>You Receive</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0.1 zkLTC</td>
            <td>0.0003</td>
            <td>0.0997</td>
          </tr>
          <tr>
            <td>1.0 zkLTC</td>
            <td>0.003</td>
            <td>0.997</td>
          </tr>
          <tr>
            <td>10.0 zkLTC</td>
            <td>0.03</td>
            <td>9.97</td>
          </tr>
          <tr>
            <td>100.0 zkLTC</td>
            <td>0.3</td>
            <td>99.7</td>
          </tr>
        </tbody>
      </table>

      <p>
        A full round trip (LiteForge &rarr; Sepolia &rarr; LiteForge) costs approximately <strong>0.6%</strong> in total fees.
      </p>

      <h2>Technology Stack</h2>

      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Technology</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Smart Contracts</td>
            <td>Solidity 0.8.24, Foundry, OpenZeppelin v5</td>
          </tr>
          <tr>
            <td>Relayer</td>
            <td>Node.js, ethers.js v6, SQLite, Express</td>
          </tr>
          <tr>
            <td>Frontend</td>
            <td>React 19, TypeScript, Vite, TailwindCSS</td>
          </tr>
          <tr>
            <td>Wallet Integration</td>
            <td>RainbowKit, wagmi, viem</td>
          </tr>
          <tr>
            <td>Database</td>
            <td>Supabase (PostgreSQL)</td>
          </tr>
          <tr>
            <td>State Management</td>
            <td>Zustand, TanStack Query</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
