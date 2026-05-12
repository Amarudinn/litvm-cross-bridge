export function Overview() {
  return (
    <div className="prose-docs">
      <h1>Multyra Bridge</h1>
      <p>
        Multyra Bridge is a multi-chain cross-chain bridge connecting <strong>LiteForge</strong>, <strong>Ethereum Sepolia</strong>, and <strong>Base Sepolia</strong> using a secure <strong>Lock & Mint / Burn & Unlock</strong> mechanism with an automated Relayer service.
      </p>

      <div className="callout">
        <div className="callout-title">
          How it works
        </div>
        <div className="callout-content">
          Lock your zkLTC on LiteForge and choose your destination chain (Sepolia or Base Sepolia) to receive wzkLTC (Wrapped zkLTC). Or burn wzkLTC on any supported chain to unlock your original zkLTC on LiteForge. Every wzkLTC is always backed 1:1 by locked zkLTC.
        </div>
      </div>

      <h2>Supported Chains</h2>

      <table>
        <thead>
          <tr>
            <th>Property</th>
            <th>LiteForge</th>
            <th>Ethereum Sepolia</th>
            <th>Base Sepolia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Chain ID</td>
            <td><code>4441</code></td>
            <td><code>11155111</code></td>
            <td><code>84532</code></td>
          </tr>
          <tr>
            <td>Type</td>
            <td>Layer 2</td>
            <td>Ethereum Testnet</td>
            <td>Base Testnet (L2)</td>
          </tr>
          <tr>
            <td>Native Token</td>
            <td>zkLTC</td>
            <td>ETH</td>
            <td>ETH</td>
          </tr>
          <tr>
            <td>Bridge Token</td>
            <td>zkLTC (native)</td>
            <td>wzkLTC (ERC-20)</td>
            <td>wzkLTC (ERC-20)</td>
          </tr>
          <tr>
            <td>Block Explorer</td>
            <td><a href="https://liteforge.explorer.caldera.xyz" target="_blank" rel="noopener noreferrer">LiteForge Explorer</a></td>
            <td><a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer">Sepolia Etherscan</a></td>
            <td><a href="https://sepolia.basescan.org" target="_blank" rel="noopener noreferrer">Base Sepolia Basescan</a></td>
          </tr>
        </tbody>
      </table>

      <h2>Key Features</h2>

      <ul>
        <li><strong>Multi-Chain Support</strong> &mdash; Bridge to Ethereum Sepolia or Base Sepolia from a single vault on LiteForge</li>
        <li><strong>1:1 Backing</strong> &mdash; Every wzkLTC in circulation is backed by an equal amount of zkLTC locked in the BridgeVaultV2</li>
        <li><strong>Low Fee</strong> &mdash; Only 0.3% per transaction</li>
        <li><strong>Fast Bridging</strong> &mdash; LiteForge to destination in ~20-45 seconds depending on the chain</li>
        <li><strong>Automated Relayer</strong> &mdash; Transactions are processed automatically with retry logic and error recovery</li>
        <li><strong>Replay Protection</strong> &mdash; Double-layer protection (on-chain + database) prevents duplicate processing</li>
      </ul>

      <h2>Bridge Flow</h2>

      <h3>LiteForge &rarr; Sepolia / Base Sepolia (Lock)</h3>
      <ol>
        <li>User calls <code>BridgeVaultV2.lock(recipient, destChainId)</code> with zkLTC value</li>
        <li>Contract validates the destination chain is supported</li>
        <li>A 0.3% fee is deducted, the rest is locked in the vault</li>
        <li>The Relayer detects the <code>Locked</code> event (includes <code>destChainId</code>) and waits for 3 block confirmations</li>
        <li>The Relayer mints the equivalent wzkLTC to the user on the chosen destination chain</li>
      </ol>

      <h3>Sepolia / Base Sepolia &rarr; LiteForge (Burn)</h3>
      <ol>
        <li>User burns their wzkLTC on the destination chain contract</li>
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
        A full round trip (LiteForge &rarr; Destination &rarr; LiteForge) costs approximately <strong>0.6%</strong> in total fees.
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
