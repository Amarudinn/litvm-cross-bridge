// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title WrappedZkLTC
 * @notice Deployed on Sepolia (Chain ID: 11155111)
 * @dev ERC20 wrapped representation of zkLTC from LiteForge.
 *      Relayer mints wzkLTC when zkLTC is locked on LiteForge.
 *      Users burn wzkLTC to unlock zkLTC on LiteForge.
 */
contract WrappedZkLTC is ERC20, Ownable, ReentrancyGuard, Pausable {
    // ============================================================
    //  State Variables
    // ============================================================

    /// @notice Address authorized to call mint()
    address public relayer;

    /// @notice Fee in basis points for burn (30 = 0.3%, max 500 = 5%)
    uint256 public feePercent = 30;

    /// @notice Maximum fee in basis points
    uint256 public constant MAX_FEE = 500;

    /// @notice Incrementing nonce for each burn operation
    uint256 public nonce;

    /// @notice Minimum burn amount
    uint256 public minBurnAmount = 0.001 ether;

    /// @notice Tracks processed mint operations to prevent replay
    mapping(bytes32 => bool) public processedMints;

    // ============================================================
    //  Events
    // ============================================================

    event Minted(
        address indexed recipient,
        uint256 amount,
        bytes32 indexed processId
    );

    event Burned(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 fee,
        uint256 nonce
    );

    event RelayerUpdated(address indexed oldRelayer, address indexed newRelayer);
    event FeePercentUpdated(uint256 oldFee, uint256 newFee);
    event MinBurnAmountUpdated(uint256 oldAmount, uint256 newAmount);

    // ============================================================
    //  Errors
    // ============================================================

    error ZeroAmount();
    error BelowMinimum(uint256 sent, uint256 minimum);
    error InvalidRecipient();
    error NotRelayer();
    error AlreadyProcessed(bytes32 processId);
    error InvalidRelayer();
    error FeeTooHigh(uint256 fee, uint256 max);
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

    constructor(address _relayer) ERC20("Wrapped zkLTC", "wzkLTC") Ownable(msg.sender) {
        if (_relayer == address(0)) revert InvalidRelayer();
        relayer = _relayer;
    }

    // ============================================================
    //  Core Functions
    // ============================================================

    /**
     * @notice Mint wzkLTC to user (called by relayer after lock on LiteForge)
     * @param _recipient Address to receive wzkLTC
     * @param _amount Amount of wzkLTC to mint
     * @param _lockTxHash Transaction hash of the lock on LiteForge
     * @param _sourceNonce Nonce from the lock event on LiteForge
     */
    function mint(
        address _recipient,
        uint256 _amount,
        bytes32 _lockTxHash,
        uint256 _sourceNonce
    ) external onlyRelayer nonReentrant whenNotPaused {
        if (_recipient == address(0)) revert InvalidRecipient();
        if (_amount == 0) revert ZeroAmount();

        bytes32 processId = keccak256(abi.encodePacked(_lockTxHash, _sourceNonce));
        if (processedMints[processId]) revert AlreadyProcessed(processId);

        processedMints[processId] = true;

        _mint(_recipient, _amount);

        emit Minted(_recipient, _amount, processId);
    }

    /**
     * @notice Burn wzkLTC to unlock zkLTC on LiteForge
     * @param _amount Amount of wzkLTC to burn
     * @param _recipient Address to receive zkLTC on LiteForge
     */
    function burn(uint256 _amount, address _recipient) external nonReentrant whenNotPaused {
        if (_amount == 0) revert ZeroAmount();
        if (_amount < minBurnAmount) revert BelowMinimum(_amount, minBurnAmount);
        if (_recipient == address(0)) revert InvalidRecipient();
        if (balanceOf(msg.sender) < _amount) revert InsufficientBalance(_amount, balanceOf(msg.sender));

        uint256 fee = (_amount * feePercent) / 10000;
        uint256 netAmount = _amount - fee;

        // Burn the full amount from user
        _burn(msg.sender, _amount);

        // Mint fee to owner (as wzkLTC)
        if (fee > 0) {
            _mint(owner(), fee);
        }

        nonce++;

        emit Burned(msg.sender, _recipient, netAmount, fee, nonce);
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
     * @notice Update minimum burn amount
     * @param _minBurnAmount New minimum amount
     */
    function setMinBurnAmount(uint256 _minBurnAmount) external onlyOwner {
        uint256 old = minBurnAmount;
        minBurnAmount = _minBurnAmount;
        emit MinBurnAmountUpdated(old, _minBurnAmount);
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
     * @notice Check if a mint has been processed
     */
    function isProcessed(bytes32 _lockTxHash, uint256 _sourceNonce) external view returns (bool) {
        bytes32 processId = keccak256(abi.encodePacked(_lockTxHash, _sourceNonce));
        return processedMints[processId];
    }

    /**
     * @notice Returns 18 decimals (same as zkLTC native)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
