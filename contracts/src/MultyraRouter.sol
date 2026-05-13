// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ISwapRouter
/// @notice Minimal interface for UniswapV3 SwapRouter
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

/// @title IWETH9
/// @notice Minimal WETH interface
interface IWETH9 {
    function deposit() external payable;
    function withdraw(uint256) external;
    function approve(address, uint256) external returns (bool);
}

/// @title MultyraRouter
/// @notice Aggregator contract that wraps UniswapV3 SwapRouter with a 0.1% fee
contract MultyraRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Constants ---
    uint256 public constant FEE_BPS = 10; // 0.1%
    uint256 public constant MAX_FEE_BPS = 100; // 1% max
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // --- State ---
    ISwapRouter public immutable swapRouter;
    address public immutable WETH;
    address public feeRecipient;

    // --- Events ---
    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);

    // --- Errors ---
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientOutput();

    // --- Constructor ---
    constructor(
        address _swapRouter,
        address _weth,
        address _feeRecipient,
        address _owner
    ) Ownable(_owner) {
        if (_swapRouter == address(0) || _weth == address(0) || _feeRecipient == address(0)) {
            revert ZeroAddress();
        }
        swapRouter = ISwapRouter(_swapRouter);
        WETH = _weth;
        feeRecipient = _feeRecipient;
    }

    // --- Swap Functions ---

    /// @notice Swap exact input (single hop) via UniswapV3
    /// @param tokenIn Input token address
    /// @param tokenOut Output token address
    /// @param poolFee UniswapV3 pool fee tier (500, 3000, 10000)
    /// @param amountIn Amount of tokenIn to swap
    /// @param amountOutMinimum Minimum acceptable output (slippage protection)
    /// @return amountOut Actual output amount received
    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 poolFee,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();

        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Deduct aggregator fee
        uint256 fee = (amountIn * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;
        IERC20(tokenIn).safeTransfer(feeRecipient, fee);

        // Approve router
        IERC20(tokenIn).forceApprove(address(swapRouter), amountInAfterFee);

        // Execute swap
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountInAfterFee,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, amountIn, amountOut, fee);
    }

    /// @notice Swap exact native token (zkLTC/ETH) for ERC-20 via UniswapV3
    /// @param tokenOut Output token address
    /// @param poolFee UniswapV3 pool fee tier
    /// @param amountOutMinimum Minimum acceptable output
    /// @return amountOut Actual output amount received
    function swapExactNativeForToken(
        address tokenOut,
        uint24 poolFee,
        uint256 amountOutMinimum
    ) external payable nonReentrant returns (uint256 amountOut) {
        if (msg.value == 0) revert ZeroAmount();

        // Deduct aggregator fee
        uint256 fee = (msg.value * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountInAfterFee = msg.value - fee;

        // Send fee to recipient
        (bool sent, ) = feeRecipient.call{value: fee}("");
        require(sent, "Fee transfer failed");

        // Wrap native token to WETH
        IWETH9(WETH).deposit{value: amountInAfterFee}();
        IWETH9(WETH).approve(address(swapRouter), amountInAfterFee);

        // Execute swap
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: tokenOut,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountInAfterFee,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        emit SwapExecuted(msg.sender, WETH, tokenOut, msg.value, amountOut, fee);
    }

    /// @notice Swap ERC-20 token to native token (swap to WETH then unwrap)
    /// @param tokenIn Input token address
    /// @param poolFee UniswapV3 pool fee tier
    /// @param amountIn Amount of tokenIn to swap
    /// @param amountOutMinimum Minimum acceptable native output
    /// @return amountOut Actual native output amount received
    function swapExactInputSingleAndUnwrap(
        address tokenIn,
        uint24 poolFee,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();

        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Deduct aggregator fee
        uint256 fee = (amountIn * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;
        IERC20(tokenIn).safeTransfer(feeRecipient, fee);

        // Approve router
        IERC20(tokenIn).forceApprove(address(swapRouter), amountInAfterFee);

        // Swap to WETH (receive to this contract)
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: WETH,
                fee: poolFee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountInAfterFee,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        // Unwrap WETH to native
        IWETH9(WETH).withdraw(amountOut);

        // Send native to user
        (bool sent, ) = msg.sender.call{value: amountOut}("");
        require(sent, "Native transfer failed");

        emit SwapExecuted(msg.sender, tokenIn, WETH, amountIn, amountOut, fee);
    }

    /// @notice Swap exact input (multi-hop) via UniswapV3
    /// @param path Encoded swap path (tokenA + fee + tokenB + fee + tokenC)
    /// @param tokenIn First token in the path (for transferFrom)
    /// @param amountIn Amount of tokenIn to swap
    /// @param amountOutMinimum Minimum acceptable output
    /// @return amountOut Actual output amount received
    function swapExactInputMultihop(
        bytes calldata path,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();

        // Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Deduct aggregator fee
        uint256 fee = (amountIn * FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;
        IERC20(tokenIn).safeTransfer(feeRecipient, fee);

        // Approve router
        IERC20(tokenIn).forceApprove(address(swapRouter), amountInAfterFee);

        // Execute multi-hop swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountInAfterFee,
                amountOutMinimum: amountOutMinimum
            })
        );

        emit SwapExecuted(msg.sender, tokenIn, address(0), amountIn, amountOut, fee);
    }

    // --- Admin Functions ---

    /// @notice Update the fee recipient address
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        address old = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(old, _feeRecipient);
    }

    /// @notice Rescue stuck tokens (emergency)
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    /// @notice Rescue stuck native token (emergency)
    function rescueNative() external onlyOwner {
        (bool sent, ) = msg.sender.call{value: address(this).balance}("");
        require(sent, "Transfer failed");
    }

    // --- Receive ---
    receive() external payable {}
}
