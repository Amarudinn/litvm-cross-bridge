export function BridgeContract() {
  return (
    <div className="prose-docs">
      <h1>Smart Contracts</h1>
      <p>
        Multyra Bridge V2 consists of a multi-chain <strong>BridgeVaultV2</strong> on LiteForge and <strong>WrappedZkLTC</strong> tokens deployed on each supported destination chain. All contracts inherit from OpenZeppelin's <code>Ownable</code>, <code>ReentrancyGuard</code>, and <code>Pausable</code> for security.
      </p>

      <h2>Deployed Addresses</h2>

      <table>
        <thead>
          <tr>
            <th>Contract</th>
            <th>Chain</th>
            <th>Address</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>BridgeVaultV2</strong></td>
            <td>LiteForge (4441)</td>
            <td><code>0x9929ED0EdA9ecF57BDAB6423B4b12cDe3317196d</code></td>
          </tr>
          <tr>
            <td><strong>WrappedZkLTC</strong></td>
            <td>Ethereum Sepolia (11155111)</td>
            <td><code>0x4320BB234A76f94F9eeDD0E81968668C6d29c39f</code></td>
          </tr>
          <tr>
            <td><strong>WrappedZkLTC</strong></td>
            <td>Base Sepolia (84532)</td>
            <td><code>0xB378f0359815ECEC5Ae3c5aC4c49c12b70931688</code></td>
          </tr>
        </tbody>
      </table>

      <div className="callout">
        <div className="callout-title">Migration Note</div>
        <div className="callout-content">
          BridgeVaultV2 replaces the original BridgeVault (V1). The key upgrade is multi-chain destination support &mdash; users now specify which chain they want to bridge to when locking. The V1 contract at <code>0x6Bb77c1f465a18Bd16686330173B32821E59FD12</code> is deprecated.
        </div>
      </div>

      <hr />

      <h2>BridgeVaultV2 (LiteForge)</h2>
      <p>
        The BridgeVaultV2 contract lives on LiteForge and is responsible for locking native zkLTC when users bridge to any supported destination chain, and unlocking zkLTC when users bridge back. It supports dynamic chain management &mdash; new chains can be added without redeployment.
      </p>

      <h3>Core Functions</h3>

      <h4><code>lock(address _recipient, uint256 _destChainId)</code></h4>
      <p>Locks native zkLTC for bridging to a supported destination chain. Called by users.</p>
      <ul>
        <li><strong>Payable</strong> &mdash; Send zkLTC as <code>msg.value</code></li>
        <li><strong>Parameters</strong>:
          <ul>
            <li><code>_recipient</code> &mdash; address to receive wzkLTC on the destination chain</li>
            <li><code>_destChainId</code> &mdash; destination chain ID (e.g. <code>11155111</code> for Sepolia, <code>84532</code> for Base Sepolia)</li>
          </ul>
        </li>
        <li><strong>Validation</strong>: Reverts with <code>UnsupportedChain</code> if the destination chain is not registered</li>
        <li><strong>Fee</strong>: 0.3% deducted from the sent amount</li>
        <li><strong>Minimum</strong>: 0.001 zkLTC</li>
        <li><strong>Emits</strong>: <code>Locked(sender, recipient, amount, fee, nonce, destChainId)</code></li>
      </ul>

      <h4><code>unlock(address _recipient, uint256 _amount, bytes32 _burnTxHash, uint256 _sourceNonce)</code></h4>
      <p>Unlocks zkLTC to a user. Called only by the authorized Relayer.</p>
      <ul>
        <li><strong>Access</strong>: <code>onlyRelayer</code></li>
        <li><strong>Replay Protection</strong>: Uses <code>processId = keccak256(burnTxHash, sourceNonce)</code></li>
        <li><strong>Balance Check</strong>: Verifies available balance before transfer</li>
        <li><strong>Emits</strong>: <code>Unlocked(recipient, amount, processId)</code></li>
      </ul>

      <h3>Chain Management (Owner Only)</h3>

      <h4><code>addChain(uint256 _chainId)</code></h4>
      <p>Registers a new supported destination chain.</p>
      <ul>
        <li><strong>Access</strong>: <code>onlyOwner</code></li>
        <li><strong>Validation</strong>: Reverts with <code>ChainAlreadySupported</code> if already registered</li>
        <li><strong>Emits</strong>: <code>ChainAdded(chainId)</code></li>
      </ul>

      <h4><code>removeChain(uint256 _chainId)</code></h4>
      <p>Removes a destination chain from the supported list.</p>
      <ul>
        <li><strong>Access</strong>: <code>onlyOwner</code></li>
        <li><strong>Validation</strong>: Reverts with <code>ChainNotSupported</code> if not registered</li>
        <li><strong>Emits</strong>: <code>ChainRemoved(chainId)</code></li>
      </ul>

      <h4><code>getSupportedChains()</code></h4>
      <p>Returns an array of all currently supported destination chain IDs.</p>

      <h3>Custom Errors</h3>
      <table>
        <thead>
          <tr>
            <th>Error</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>UnsupportedChain</code></td>
            <td>Destination chain ID is not in the supported list</td>
          </tr>
          <tr>
            <td><code>ChainAlreadySupported</code></td>
            <td>Attempting to add a chain that's already registered</td>
          </tr>
          <tr>
            <td><code>ChainNotSupported</code></td>
            <td>Attempting to remove a chain that's not registered</td>
          </tr>
          <tr>
            <td><code>BelowMinimum</code></td>
            <td>Lock amount is below the minimum (0.001 zkLTC)</td>
          </tr>
          <tr>
            <td><code>InsufficientBalance</code></td>
            <td>Vault doesn't have enough balance for unlock</td>
          </tr>
          <tr>
            <td><code>AlreadyProcessed</code></td>
            <td>Transaction has already been processed (replay protection)</td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2>WrappedZkLTC (Destination Chains)</h2>
      <p>
        The WrappedZkLTC contract is an ERC-20 token deployed on each supported destination chain. It represents bridged zkLTC and can only be minted by the authorized Relayer. Any token holder can burn to bridge back to LiteForge.
      </p>

      <h3>Token Info</h3>
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
            <td>Wrapped zkLTC</td>
          </tr>
          <tr>
            <td>Symbol</td>
            <td>wzkLTC</td>
          </tr>
          <tr>
            <td>Decimals</td>
            <td>18</td>
          </tr>
          <tr>
            <td>Standard</td>
            <td>ERC-20</td>
          </tr>
        </tbody>
      </table>

      <h3>Core Functions</h3>

      <h4><code>mint(address _recipient, uint256 _amount, bytes32 _processId, uint256 _sourceNonce)</code></h4>
      <p>Mints wzkLTC to a user. Called only by the authorized Relayer after a lock on LiteForge.</p>
      <ul>
        <li><strong>Access</strong>: <code>onlyRelayer</code></li>
        <li><strong>Replay Protection</strong>: Uses <code>processId</code> (derived from lock tx hash + nonce)</li>
        <li><strong>Emits</strong>: <code>Minted(recipient, amount, processId)</code></li>
      </ul>

      <h4><code>burn(uint256 _amount, address _recipient)</code></h4>
      <p>Burns wzkLTC to unlock zkLTC on LiteForge. Called by any token holder.</p>
      <ul>
        <li><strong>Parameters</strong>: <code>_amount</code> &mdash; amount to burn, <code>_recipient</code> &mdash; address to receive zkLTC on LiteForge</li>
        <li><strong>Fee</strong>: 0.3% deducted, minted as wzkLTC to the contract owner</li>
        <li><strong>Minimum</strong>: 0.001 wzkLTC</li>
        <li><strong>Emits</strong>: <code>Burned(sender, recipient, netAmount, fee, nonce)</code></li>
      </ul>

      <hr />

      <h2>Security Features</h2>

      <h3>Replay Protection (Double Layer)</h3>
      <p>
        <strong>Layer 1 (On-chain):</strong> Each mint/unlock operation generates a unique <code>processId = keccak256(abi.encodePacked(txHash, nonce))</code>. The contract reverts if the same processId is used twice.
      </p>
      <p>
        <strong>Layer 2 (Database):</strong> The Relayer's SQLite database has a <code>UNIQUE(source_tx_hash, source_nonce)</code> constraint that prevents duplicate queue entries.
      </p>

      <h3>Fee Cap</h3>
      <p>
        The maximum fee is capped at <code>MAX_FEE = 500</code> (5% in basis points). The current operational fee is set to 30 basis points (0.3%). The owner can adjust the fee up to the cap but never exceed it.
      </p>

      <h3>What the Relayer Cannot Do</h3>
      <ul>
        <li>Mint wzkLTC without a valid lock event on LiteForge</li>
        <li>Unlock zkLTC without a valid burn event on a destination chain</li>
        <li>Process the same event twice (replay protection)</li>
        <li>Withdraw user funds from the vault (can only unlock to the event's recipient)</li>
        <li>Change fees, pause contracts, or manage chains (only the owner can)</li>
      </ul>

      <hr />

      <h2>Add wzkLTC to MetaMask</h2>

      <h3>On Ethereum Sepolia</h3>
      <ol>
        <li>Open MetaMask and switch to Sepolia network</li>
        <li>Click "Import tokens"</li>
        <li>Enter contract address: <code>0x4320BB234A76f94F9eeDD0E81968668C6d29c39f</code></li>
        <li>Symbol: <code>wzkLTC</code>, Decimals: <code>18</code></li>
        <li>Click "Add Custom Token"</li>
      </ol>

      <h3>On Base Sepolia</h3>
      <ol>
        <li>Open MetaMask and switch to Base Sepolia network</li>
        <li>Click "Import tokens"</li>
        <li>Enter contract address: <code>0xB378f0359815ECEC5Ae3c5aC4c49c12b70931688</code></li>
        <li>Symbol: <code>wzkLTC</code>, Decimals: <code>18</code></li>
        <li>Click "Add Custom Token"</li>
      </ol>
    </div>
  )
}
