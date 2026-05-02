// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {WrappedZkLTC} from "../src/WrappedZkLTC.sol";

contract WrappedZkLTCTest is Test {
    WrappedZkLTC public token;

    address public owner = address(this);
    address public relayer = makeAddr("relayer");
    address public user = makeAddr("user");
    address public recipient = makeAddr("recipient");

    function setUp() public {
        token = new WrappedZkLTC(relayer);
    }

    // ============================================================
    //  Mint Tests
    // ============================================================

    function test_mint_success() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        uint256 sourceNonce = 1;

        vm.prank(relayer);
        token.mint(user, 1 ether, lockTxHash, sourceNonce);

        assertEq(token.balanceOf(user), 1 ether);
        assertEq(token.totalSupply(), 1 ether);
    }

    function test_mint_emits_event() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        uint256 sourceNonce = 1;
        bytes32 processId = keccak256(abi.encodePacked(lockTxHash, sourceNonce));

        vm.prank(relayer);
        vm.expectEmit(true, true, false, true);
        emit WrappedZkLTC.Minted(user, 1 ether, processId);
        token.mint(user, 1 ether, lockTxHash, sourceNonce);
    }

    function test_mint_reverts_not_relayer() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");

        vm.prank(user);
        vm.expectRevert(WrappedZkLTC.NotRelayer.selector);
        token.mint(user, 1 ether, lockTxHash, 1);
    }

    function test_mint_reverts_replay() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        uint256 sourceNonce = 1;
        bytes32 processId = keccak256(abi.encodePacked(lockTxHash, sourceNonce));

        vm.prank(relayer);
        token.mint(user, 1 ether, lockTxHash, sourceNonce);

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(WrappedZkLTC.AlreadyProcessed.selector, processId));
        token.mint(user, 1 ether, lockTxHash, sourceNonce);
    }

    function test_mint_reverts_zero_amount() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");

        vm.prank(relayer);
        vm.expectRevert(WrappedZkLTC.ZeroAmount.selector);
        token.mint(user, 0, lockTxHash, 1);
    }

    function test_mint_reverts_zero_recipient() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");

        vm.prank(relayer);
        vm.expectRevert(WrappedZkLTC.InvalidRecipient.selector);
        token.mint(address(0), 1 ether, lockTxHash, 1);
    }

    function test_mint_reverts_when_paused() public {
        token.pause();
        bytes32 lockTxHash = keccak256("lock_tx_1");

        vm.prank(relayer);
        vm.expectRevert();
        token.mint(user, 1 ether, lockTxHash, 1);
    }

    // ============================================================
    //  Burn Tests
    // ============================================================

    function test_burn_success() public {
        // First mint some tokens to user
        bytes32 lockTxHash = keccak256("lock_tx_1");
        vm.prank(relayer);
        token.mint(user, 10 ether, lockTxHash, 1);

        // User burns
        vm.prank(user);
        token.burn(1 ether, recipient);

        // Fee = 1 ether * 30 / 10000 = 0.003 ether
        // Net = 0.997 ether (burned from supply)
        // Fee minted to owner
        assertEq(token.balanceOf(user), 9 ether); // 10 - 1
        assertEq(token.balanceOf(owner), 0.003 ether); // fee
        assertEq(token.totalSupply(), 9.003 ether); // 10 - 1 + 0.003
        assertEq(token.nonce(), 1);
    }

    function test_burn_emits_event() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        vm.prank(relayer);
        token.mint(user, 10 ether, lockTxHash, 1);

        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit WrappedZkLTC.Burned(user, recipient, 0.997 ether, 0.003 ether, 1);
        token.burn(1 ether, recipient);
    }

    function test_burn_reverts_zero_amount() public {
        vm.prank(user);
        vm.expectRevert(WrappedZkLTC.ZeroAmount.selector);
        token.burn(0, recipient);
    }

    function test_burn_reverts_below_minimum() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        vm.prank(relayer);
        token.mint(user, 10 ether, lockTxHash, 1);

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(WrappedZkLTC.BelowMinimum.selector, 0.0001 ether, 0.001 ether));
        token.burn(0.0001 ether, recipient);
    }

    function test_burn_reverts_zero_recipient() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        vm.prank(relayer);
        token.mint(user, 10 ether, lockTxHash, 1);

        vm.prank(user);
        vm.expectRevert(WrappedZkLTC.InvalidRecipient.selector);
        token.burn(1 ether, address(0));
    }

    function test_burn_reverts_insufficient_balance() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(WrappedZkLTC.InsufficientBalance.selector, 1 ether, 0));
        token.burn(1 ether, recipient);
    }

    function test_burn_reverts_when_paused() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        vm.prank(relayer);
        token.mint(user, 10 ether, lockTxHash, 1);

        token.pause();

        vm.prank(user);
        vm.expectRevert();
        token.burn(1 ether, recipient);
    }

    function test_burn_increments_nonce() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        vm.prank(relayer);
        token.mint(user, 10 ether, lockTxHash, 1);

        vm.startPrank(user);
        token.burn(1 ether, recipient);
        token.burn(1 ether, recipient);
        token.burn(1 ether, recipient);
        vm.stopPrank();

        assertEq(token.nonce(), 3);
    }

    // ============================================================
    //  Admin Tests
    // ============================================================

    function test_setRelayer() public {
        address newRelayer = makeAddr("newRelayer");
        token.setRelayer(newRelayer);
        assertEq(token.relayer(), newRelayer);
    }

    function test_setRelayer_reverts_zero_address() public {
        vm.expectRevert(WrappedZkLTC.InvalidRelayer.selector);
        token.setRelayer(address(0));
    }

    function test_setRelayer_reverts_not_owner() public {
        vm.prank(user);
        vm.expectRevert();
        token.setRelayer(makeAddr("newRelayer"));
    }

    function test_setFeePercent() public {
        token.setFeePercent(50);
        assertEq(token.feePercent(), 50);
    }

    function test_setFeePercent_reverts_too_high() public {
        vm.expectRevert(abi.encodeWithSelector(WrappedZkLTC.FeeTooHigh.selector, 600, 500));
        token.setFeePercent(600);
    }

    function test_isProcessed() public {
        bytes32 lockTxHash = keccak256("lock_tx_1");
        uint256 sourceNonce = 1;

        assertFalse(token.isProcessed(lockTxHash, sourceNonce));

        vm.prank(relayer);
        token.mint(user, 1 ether, lockTxHash, sourceNonce);

        assertTrue(token.isProcessed(lockTxHash, sourceNonce));
    }

    // ============================================================
    //  Token Metadata Tests
    // ============================================================

    function test_name() public view {
        assertEq(token.name(), "Wrapped zkLTC");
    }

    function test_symbol() public view {
        assertEq(token.symbol(), "wzkLTC");
    }

    function test_decimals() public view {
        assertEq(token.decimals(), 18);
    }

    // ============================================================
    //  Constructor Tests
    // ============================================================

    function test_constructor_reverts_zero_relayer() public {
        vm.expectRevert(WrappedZkLTC.InvalidRelayer.selector);
        new WrappedZkLTC(address(0));
    }
}
