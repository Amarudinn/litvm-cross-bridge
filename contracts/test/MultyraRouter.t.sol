// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MultyraRouter, ISwapRouter, IWETH9} from "../src/MultyraRouter.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock WETH9
contract MockWETH9 is ERC20 {
    constructor() ERC20("Wrapped Ether", "WETH") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        _burn(msg.sender, amount);
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent);
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
    }
}

// Mock SwapRouter that returns a fixed output
contract MockSwapRouter {
    uint256 public mockOutput = 1000 * 1e18;

    function setMockOutput(uint256 _output) external {
        mockOutput = _output;
    }

    function exactInputSingle(ISwapRouter.ExactInputSingleParams calldata params) external returns (uint256) {
        // Transfer tokenIn from caller (MultyraRouter)
        ERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        // Mint tokenOut to recipient
        MockERC20(params.tokenOut).mint(params.recipient, mockOutput);
        return mockOutput;
    }

    function exactInput(ISwapRouter.ExactInputParams calldata params) external returns (uint256) {
        // For simplicity, just return mock output
        // In real scenario, would parse path and do multi-hop
        MockERC20(address(bytes20(params.path[params.path.length - 20:]))).mint(params.recipient, mockOutput);
        return mockOutput;
    }
}

contract MultyraRouterTest is Test {
    MultyraRouter public router;
    MockSwapRouter public mockSwapRouter;
    MockWETH9 public weth;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public owner;
    address public feeRecipient;
    address public user;

    function setUp() public {
        owner = makeAddr("owner");
        feeRecipient = makeAddr("feeRecipient");
        user = makeAddr("user");

        mockSwapRouter = new MockSwapRouter();
        weth = new MockWETH9();
        tokenA = new MockERC20("Token A", "TKA");
        tokenB = new MockERC20("Token B", "TKB");

        router = new MultyraRouter(
            address(mockSwapRouter),
            address(weth),
            feeRecipient,
            owner
        );

        // Give user some tokens
        tokenA.mint(user, 10_000 * 1e18);
    }

    // --- Constructor Tests ---

    function test_constructor_sets_values() public view {
        assertEq(address(router.swapRouter()), address(mockSwapRouter));
        assertEq(router.WETH(), address(weth));
        assertEq(router.feeRecipient(), feeRecipient);
        assertEq(router.owner(), owner);
    }

    function test_constructor_reverts_zero_address() public {
        vm.expectRevert(MultyraRouter.ZeroAddress.selector);
        new MultyraRouter(address(0), address(weth), feeRecipient, owner);

        vm.expectRevert(MultyraRouter.ZeroAddress.selector);
        new MultyraRouter(address(mockSwapRouter), address(0), feeRecipient, owner);

        vm.expectRevert(MultyraRouter.ZeroAddress.selector);
        new MultyraRouter(address(mockSwapRouter), address(weth), address(0), owner);
    }

    // --- swapExactInputSingle Tests ---

    function test_swapExactInputSingle_success() public {
        uint256 amountIn = 1000 * 1e18;
        uint256 expectedFee = (amountIn * 10) / 10_000; // 0.1%

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);

        uint256 amountOut = router.swapExactInputSingle(
            address(tokenA),
            address(tokenB),
            3000,
            amountIn,
            0
        );
        vm.stopPrank();

        // Fee recipient got the fee
        assertEq(tokenA.balanceOf(feeRecipient), expectedFee);
        // User got output tokens
        assertEq(tokenB.balanceOf(user), amountOut);
        // User's tokenA decreased
        assertEq(tokenA.balanceOf(user), 10_000 * 1e18 - amountIn);
    }

    function test_swapExactInputSingle_reverts_zero_amount() public {
        vm.prank(user);
        vm.expectRevert(MultyraRouter.ZeroAmount.selector);
        router.swapExactInputSingle(address(tokenA), address(tokenB), 3000, 0, 0);
    }

    function test_swapExactInputSingle_fee_calculation() public {
        uint256 amountIn = 5000 * 1e18;
        uint256 expectedFee = (amountIn * 10) / 10_000; // 0.1% = 5 tokens

        vm.startPrank(user);
        tokenA.approve(address(router), amountIn);
        router.swapExactInputSingle(address(tokenA), address(tokenB), 3000, amountIn, 0);
        vm.stopPrank();

        assertEq(tokenA.balanceOf(feeRecipient), expectedFee);
        assertEq(expectedFee, 5 * 1e18); // 5 tokens
    }

    // --- swapExactNativeForToken Tests ---

    function test_swapExactNativeForToken_success() public {
        uint256 amountIn = 1 ether;
        uint256 expectedFee = (amountIn * 10) / 10_000;

        vm.deal(user, amountIn);
        vm.prank(user);
        uint256 amountOut = router.swapExactNativeForToken{value: amountIn}(
            address(tokenB),
            3000,
            0
        );

        // Fee recipient got native fee
        assertEq(feeRecipient.balance, expectedFee);
        // User got output tokens
        assertEq(tokenB.balanceOf(user), amountOut);
    }

    function test_swapExactNativeForToken_reverts_zero_value() public {
        vm.prank(user);
        vm.expectRevert(MultyraRouter.ZeroAmount.selector);
        router.swapExactNativeForToken{value: 0}(address(tokenB), 3000, 0);
    }

    // --- Admin Tests ---

    function test_setFeeRecipient() public {
        address newRecipient = makeAddr("newRecipient");

        vm.prank(owner);
        router.setFeeRecipient(newRecipient);

        assertEq(router.feeRecipient(), newRecipient);
    }

    function test_setFeeRecipient_reverts_non_owner() public {
        vm.prank(user);
        vm.expectRevert();
        router.setFeeRecipient(makeAddr("new"));
    }

    function test_setFeeRecipient_reverts_zero_address() public {
        vm.prank(owner);
        vm.expectRevert(MultyraRouter.ZeroAddress.selector);
        router.setFeeRecipient(address(0));
    }

    function test_rescueTokens() public {
        // Send some tokens to router accidentally
        tokenA.mint(address(router), 100 * 1e18);

        vm.prank(owner);
        router.rescueTokens(address(tokenA), 100 * 1e18);

        assertEq(tokenA.balanceOf(owner), 100 * 1e18);
    }

    function test_rescueNative() public {
        // Send some ETH to router
        vm.deal(address(router), 1 ether);

        vm.prank(owner);
        router.rescueNative();

        assertEq(owner.balance, 1 ether);
    }

    // --- Constants Tests ---

    function test_constants() public view {
        assertEq(router.FEE_BPS(), 10);
        assertEq(router.MAX_FEE_BPS(), 100);
        assertEq(router.BPS_DENOMINATOR(), 10_000);
    }
}
