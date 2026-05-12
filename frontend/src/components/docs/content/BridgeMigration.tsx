export function BridgeMigration() {
  return (
    <div className="prose-docs">
      <h1>Migration: V1 &rarr; V2</h1>
      <p>
        BridgeVaultV2 is the upgraded version of the original BridgeVault contract. This page documents the key changes and what they mean for users and integrators.
      </p>

      <div className="callout">
        <div className="callout-title">Status</div>
        <div className="callout-content">
          The migration is complete. BridgeVaultV2 is now the active contract. The V1 contract is deprecated and no longer processes new transactions.
        </div>
      </div>

      <h2>Why V2?</h2>
      <p>
        The original BridgeVault (V1) only supported a single destination chain (Ethereum Sepolia). As Multyra expanded to support more chains, a new contract was needed that could dynamically route locks to multiple destinations without redeployment.
      </p>

      <h2>Contract Addresses</h2>

      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Address</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>BridgeVault V1</td>
            <td><code>0x6Bb77c1f465a18Bd16686330173B32821E59FD12</code></td>
            <td><span className="text-red-500 font-semibold">Deprecated</span></td>
          </tr>
          <tr>
            <td>BridgeVaultV2</td>
            <td><code>0x9929ED0EdA9ecF57BDAB6423B4b12cDe3317196d</code></td>
            <td><span className="text-green-500 font-semibold">Active</span></td>
          </tr>
        </tbody>
      </table>

      <h2>Key Changes</h2>

      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>V1 (BridgeVault)</th>
            <th>V2 (BridgeVaultV2)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Destination Chains</td>
            <td>Sepolia only (hardcoded)</td>
            <td>Multi-chain (dynamic <code>supportedChains</code> mapping)</td>
          </tr>
          <tr>
            <td><code>lock()</code> signature</td>
            <td><code>lock(address _recipient)</code></td>
            <td><code>lock(address _recipient, uint256 _destChainId)</code></td>
          </tr>
          <tr>
            <td><code>Locked</code> event</td>
            <td>5 fields (sender, recipient, amount, fee, nonce)</td>
            <td>6 fields (+ <code>destChainId</code>)</td>
          </tr>
          <tr>
            <td>Chain Management</td>
            <td>None</td>
            <td><code>addChain()</code>, <code>removeChain()</code>, <code>getSupportedChains()</code></td>
          </tr>
          <tr>
            <td>Error Handling</td>
            <td><code>require()</code> with string messages</td>
            <td>Custom Solidity errors (gas-efficient)</td>
          </tr>
          <tr>
            <td>Fee Cap</td>
            <td>Hardcoded 0.3%</td>
            <td>Configurable up to MAX_FEE (5%), currently 0.3%</td>
          </tr>
        </tbody>
      </table>

      <h2>New Supported Chains</h2>

      <table>
        <thead>
          <tr>
            <th>Chain</th>
            <th>Chain ID</th>
            <th>WrappedZkLTC Address</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Ethereum Sepolia</td>
            <td><code>11155111</code></td>
            <td><code>0x4320BB234A76f94F9eeDD0E81968668C6d29c39f</code></td>
          </tr>
          <tr>
            <td>Base Sepolia</td>
            <td><code>84532</code></td>
            <td><code>0xB378f0359815ECEC5Ae3c5aC4c49c12b70931688</code></td>
          </tr>
        </tbody>
      </table>

      <h2>New Custom Errors</h2>

      <p>V2 uses custom Solidity errors instead of <code>require()</code> strings, saving gas on reverts:</p>

      <table>
        <thead>
          <tr>
            <th>Error</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>UnsupportedChain()</code></td>
            <td>User passes a <code>destChainId</code> that is not registered</td>
          </tr>
          <tr>
            <td><code>ChainAlreadySupported()</code></td>
            <td>Owner tries to add a chain that's already in the list</td>
          </tr>
          <tr>
            <td><code>ChainNotSupported()</code></td>
            <td>Owner tries to remove a chain that's not in the list</td>
          </tr>
          <tr>
            <td><code>BelowMinimum()</code></td>
            <td>Lock amount is below 0.001 zkLTC</td>
          </tr>
          <tr>
            <td><code>InsufficientBalance()</code></td>
            <td>Vault doesn't have enough balance for unlock</td>
          </tr>
          <tr>
            <td><code>AlreadyProcessed()</code></td>
            <td>Replay protection &mdash; processId already used</td>
          </tr>
        </tbody>
      </table>

      <h2>New Events</h2>

      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>ChainAdded(uint256 chainId)</code></td>
            <td>Emitted when a new destination chain is registered</td>
          </tr>
          <tr>
            <td><code>ChainRemoved(uint256 chainId)</code></td>
            <td>Emitted when a destination chain is removed</td>
          </tr>
        </tbody>
      </table>

      <h2>For Integrators</h2>

      <p>If you were integrating with V1, here's what you need to change:</p>

      <ol>
        <li>Update the contract address to <code>0x9929ED0EdA9ecF57BDAB6423B4b12cDe3317196d</code></li>
        <li>Update the ABI to BridgeVaultV2 (includes <code>destChainId</code> parameter)</li>
        <li>Add <code>destChainId</code> parameter when calling <code>lock()</code></li>
        <li>Parse the updated <code>Locked</code> event which now includes <code>destChainId</code> as the 6th field</li>
        <li>Handle new custom errors instead of string-based reverts</li>
      </ol>

      <div className="callout">
        <div className="callout-title">V1 Funds</div>
        <div className="callout-content">
          Any zkLTC still locked in the V1 contract can be withdrawn by the owner. Users who bridged via V1 and hold wzkLTC on Sepolia can still burn normally &mdash; the Relayer handles unlocks from the V2 vault.
        </div>
      </div>
    </div>
  )
}
