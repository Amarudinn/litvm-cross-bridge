// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BridgeVault
 * @notice Deployed on LiteForge (Chain ID: 4441)
 * @dev Locks native zkLTC for cross-chain bridging to Sepolia.
 *      Relayer watches Locked events and mints wzkLTC on Sepolia.
 *      Relayer calls unlock() when wzkLTC is burned on Sepolia.
 */
contract BridgeVault is Ownable, ReentrancyGuard, Pausable {
    // ============================================================
    //  State Variables
    // ============================================================

    /// @notice Address authorized to call unlock()
    address public relayer;

    /// @notice Fee in basis points (30 = 0.3%, max 500 = 5%)
    uint256 public feePercent = 30;

    /// @notice Maximum fee in basis points
    uint256 public constant MAX_FEE = 500;

    /// @notice Incrementing nonce for each lock operation
    uint256 public nonce;

    /// @notice Accumulated fees available for withdrawal
    uint256 public accumulatedFees;

    /// @notice Minimum lock amount (prevent dust attacks)
    uint256 public minLockAmount = 0.001 ether;

    /// @notice Tracks processed unlock operations to prevent replay
    mapping(bytes32 => bool) public processedUnlocks;

    // ============================================================
    //  Events
    // ============================================================

    event Locked(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 fee,
        uint256 nonce
    );

    event Unlocked(
        address indexed recipient,
        uint256 amount,
        bytes32 indexed processId
    );

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event FeePercentUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);
    event MinLockAmountUpdated(uint256 oldAmount, uint256 newAmount);

    // ============================================================
    //  Errors
    // ============================================================

    error ZeroAmount();
    error BelowMinimum(uint256 sent, uint256 minimum);
    error InvalidRecipient();
    error NotRelayer();
    error AlreadyProcessed(bytes32 processId);
    error TransferFailed();
    error InvalidRelayer();
    error FeeTooHigh(uint256 fee, uint256 max);
    error NoFeesToWithdraw();
    error InsufficientBalance(uint256 requested, uint256 available);

    // ============================================================
    //  Modifiers
    // ============================================================

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer();
        _;
    }

    // ============================================================
    //  Constructor
    // ============================================================

    constructor(address _relayer) Ownable(msg.sender) {
        if (_relayer == address(0)) revert InvalidRelayer();
        relayer = _relayer;
    }

    // ============================================================
    //  Core Functions
    // ============================================================

    /**
     * @notice Lock native zkLTC to bridge to Sepolia
     * @param _recipient Address to receive wzkLTC on Sepolia
     */
    function lock(address _recipient) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert ZeroAmount();
        if (msg.value < minLockAmount) revert BelowMinimum(msg.value, minLockAmount);
        if (_recipient == address(0)) revert InvalidRecipient();

        uint256 fee = (msg.value * feePercent) / 10000;
        uint256 netAmount = msg.value - fee;

        accumulatedFees += fee;
        nonce++;

        emit Locked(msg.sender, _recipient, netAmount, fee, nonce);
    }

    /**
     * @notice Unlock zkLTC to user (called by relayer after burn on Sepolia)
     * @param _recipient Address to receive zkLTC
     * @param _amount Amount of zkLTC to unlock
     * @param _burnTxHash Transaction hash of the burn on Sepolia
     * @param _sourceNonce Nonce from the burn event on Sepolia
     */
    function unlock(
        address _recipient,
        uint256 _amount,
        bytes32 _burnTxHash,
        uint256 _sourceNonce
    ) external onlyRelayer nonReentrant whenNotPaused {
        if (_recipient == address(0)) revert InvalidRecipient();
        if (_amount == 0) revert ZeroAmount();

        bytes32 processId = keccak256(abi.encodePacked(_burnTxHash, _sourceNonce));
        if (processedUnlocks[processId]) revert AlreadyProcessed(processId);

        // Check available balance (total balance minus accumulated fees)
        uint256 available = address(this).balance - accumulatedFees;
        if (_amount > available) revert InsufficientBalance(_amount, available);

        processedUnlocks[processId] = true;

        (bool success, ) = payable(_recipient).call{value: _amount}("");
        if (!success) revert TransferFailed();

        emit Unlocked(_recipient, _amount, processId);
    }

    // ============================================================
    //  Admin Functions
    // ============================================================

    /**
     * @notice Update the relayer address
     * @param _relayer New relayer address
     */
    function setRelayer(address _relayer) external onlyOwner {
        if (_relayer == address(0)) revert InvalidRelayer();
        address old = relayer;
        relayer = _relayer;
        emit RelayerUpdated(old, _relayer);
    }

    /**
     * @notice Update the fee percentage
     * @param _feePercent New fee in basis points (max 500 = 5%)
     */
    function setFeePercent(uint256 _feePercent) external onlyOwner {
        if (_feePercent > MAX_FEE) revert FeeTooHigh(_feePercent, MAX_FEE);
        uint256 old = feePercent;
        feePercent = _feePercent;
        emit FeePercentUpdated(old, _feePercent);
    }

    /**
     * @notice Update minimum lock amount
     * @param _minLockAmount New minimum amount
     */
    function setMinLockAmount(uint256 _minLockAmount) external onlyOwner {
        uint256 old = minLockAmount;
        minLockAmount = _minLockAmount;
        emit MinLockAmountUpdated(old, _minLockAmount);
    }

    /**
     * @notice Withdraw accumulated fees to owner
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = accumulatedFees;
        if (amount == 0) revert NoFeesToWithdraw();

        accumulatedFees = 0;

        (bool success, ) = payable(owner()).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FeesWithdrawn(owner(), amount);
    }

    /**
     * @notice Pause the contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================================
    //  View Functions
    // ============================================================

    /**
     * @notice Get available balance for unlocks (excludes accumulated fees)
     */
    function availableBalance() external view returns (uint256) {
        return address(this).balance - accumulatedFees;
    }

    /**
     * @notice Check if an unlock has been processed
     */
    function isProcessed(bytes32 _burnTxHash, uint256 _sourceNonce) external view returns (bool) {
        bytes32 processId = keccak256(abi.encodePacked(_burnTxHash, _sourceNonce));
        return processedUnlocks[processId];
    }

    // ============================================================
    //  Receive
    // ============================================================

    /// @notice Allow contract to receive native zkLTC (for liquidity top-up)
    receive() external payable {}
}
