export function BridgeContract() {
  return (
    <div className="prose-docs">
      <h1>Smart Contracts</h1>
      <p>
        Multyra Bridge consists of two smart contracts deployed on different chains. Both contracts inherit from OpenZeppelin's <code>Ownable</code>, <code>ReentrancyGuard</code>, and <code>Pausable</code> for security.
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
            <td><strong>BridgeVault</strong></td>
            <td>LiteForge (4441)</td>
            <td><code>0x6Bb77c1f465a18Bd16686330173B32821E59FD12</code></td>
          </tr>
          <tr>
            <td><strong>WrappedZkLTC</strong></td>
            <td>Sepolia (11155111)</td>
            <td><code>0x4320BB234A76f94F9eeDD0E81968668C6d29c39f</code></td>
          </tr>
        </tbody>
      </table>

      <hr />

      <h2>BridgeVault (LiteForge)</h2>
      <p>
        The BridgeVault contract lives on LiteForge and is responsible for locking native zkLTC when users bridge to Sepolia, and unlocking zkLTC when users bridge back from Sepolia.
      </p>

      <h3>Core Functions</h3>

      <h4><code>lock(address _recipient)</code></h4>
      <p>Locks native zkLTC for bridging to Sepolia. Called by users.</p>
      <ul>
        <li><strong>Payable</strong> &mdash; Send zkLTC as <code>msg.value</code></li>
        <li><strong>Parameters</strong>: <code>_recipient</code> &mdash; address to receive wzkLTC on Sepolia</li>
        <li><strong>Fee</strong>: 0.3% deducted from the sent amount</li>
        <li><strong>Minimum</strong>: 0.001 zkLTC</li>
        <li><strong>Emits</strong>: <code>Locked(sender, recipient, netAmount, fee, nonce)</code></li>
      </ul>

      <h4><code>unlock(address _recipient, uint256 _amount, bytes32 _burnTxHash, uint256 _sourceNonce)</code></h4>
      <p>Unlocks zkLTC to a user. Called only by the authorized Relayer.</p>
      <ul>
        <li><strong>Access</strong>: <code>onlyRelayer</code></li>
        <li><strong>Replay Protection</strong>: Uses <code>processId = keccak256(burnTxHash, sourceNonce)</code></li>
        <li><strong>Balance Check</strong>: Verifies available balance before transfer</li>
        <li><strong>Emits</strong>: <code>Unlocked(recipient, amount, processId)</code></li>
      </ul>

      <hr />

      <h2>WrappedZkLTC (Sepolia)</h2>
      <p>
        The WrappedZkLTC contract is an ERC-20 token on Sepolia that represents bridged zkLTC. It can only be minted by the authorized Relayer and burned by any token holder.
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

      <h4><code>mint(address _recipient, uint256 _amount, bytes32 _lockTxHash, uint256 _sourceNonce)</code></h4>
      <p>Mints wzkLTC to a user. Called only by the authorized Relayer after a lock on LiteForge.</p>
      <ul>
        <li><strong>Access</strong>: <code>onlyRelayer</code></li>
        <li><strong>Replay Protection</strong>: Uses <code>processId = keccak256(lockTxHash, sourceNonce)</code></li>
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
        <strong>Layer 2 (On-chain):</strong> Each mint/unlock operation generates a unique <code>processId = keccak256(abi.encodePacked(txHash, nonce))</code>. The contract reverts if the same processId is used twice.
      </p>
      <p>
        <strong>Layer 2 (Database):</strong> The Relayer's SQLite database has a <code>UNIQUE(source_tx_hash, source_nonce)</code> constraint that prevents duplicate queue entries.
      </p>

      <h3>What the Relayer Cannot Do</h3>
      <ul>
        <li>Mint wzkLTC without a valid lock event on LiteForge</li>
        <li>Unlock zkLTC without a valid burn event on Sepolia</li>
        <li>Process the same event twice (replay protection)</li>
        <li>Withdraw user funds from the vault (can only unlock to the event's recipient)</li>
        <li>Change fees or pause contracts (only the owner can)</li>
      </ul>

      <h2>Add wzkLTC to MetaMask</h2>
      <p>To see your wzkLTC balance in MetaMask on Sepolia network:</p>
      <ol>
        <li>Open MetaMask and switch to Sepolia network</li>
        <li>Click "Import tokens"</li>
        <li>Enter contract address: <code>0x4320BB234A76f94F9eeDD0E81968668C6d29c39f</code></li>
        <li>Symbol: <code>wzkLTC</code>, Decimals: <code>18</code></li>
        <li>Click "Add Custom Token"</li>
      </ol>
    </div>
  )
}
