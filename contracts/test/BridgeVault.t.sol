// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {BridgeVault} from "../src/BridgeVault.sol";

contract BridgeVaultTest is Test {
    BridgeVault public vault;

    address public owner = address(this);
    address public relayer = makeAddr("relayer");
    address public user = makeAddr("user");
    address public recipient = makeAddr("recipient");

    // Allow test contract to receive ETH (for withdrawFees)
    receive() external payable {}

    function setUp() public {
        vault = new BridgeVault(relayer);
        // Fund the vault with some initial liquidity
        vm.deal(address(vault), 100 ether);
        // Fund user
        vm.deal(user, 10 ether);
    }

    // ============================================================
    //  Lock Tests
    // ============================================================

    function test_lock_success() public {
        vm.prank(user);
        vault.lock{value: 1 ether}(recipient);

        // Fee = 1 ether * 30 / 10000 = 0.003 ether
        // Net = 1 ether - 0.003 ether = 0.997 ether
        assertEq(vault.nonce(), 1);
        assertEq(vault.accumulatedFees(), 0.003 ether);
    }

    function test_lock_emits_event() public {
        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit BridgeVault.Locked(user, recipient, 0.997 ether, 0.003 ether, 1);
        vault.lock{value: 1 ether}(recipient);
    }

    function test_lock_reverts_zero_amount() public {
        vm.prank(user);
        vm.expectRevert(BridgeVault.ZeroAmount.selector);
        vault.lock{value: 0}(recipient);
    }

    function test_lock_reverts_below_minimum() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(BridgeVault.BelowMinimum.selector, 0.0001 ether, 0.001 ether));
        vault.lock{value: 0.0001 ether}(recipient);
    }

    function test_lock_reverts_zero_recipient() public {
        vm.prank(user);
        vm.expectRevert(BridgeVault.InvalidRecipient.selector);
        vault.lock{value: 1 ether}(address(0));
    }

    function test_lock_reverts_when_paused() public {
        vault.pause();
        vm.prank(user);
        vm.expectRevert();
        vault.lock{value: 1 ether}(recipient);
    }

    function test_lock_increments_nonce() public {
        vm.startPrank(user);
        vault.lock{value: 1 ether}(recipient);
        vault.lock{value: 1 ether}(recipient);
        vault.lock{value: 1 ether}(recipient);
        vm.stopPrank();

        assertEq(vault.nonce(), 3);
    }

    // ============================================================
    //  Unlock Tests
    // ============================================================

    function test_unlock_success() public {
        bytes32 burnTxHash = keccak256("burn_tx_1");
        uint256 sourceNonce = 1;

        uint256 recipientBalBefore = recipient.balance;

        vm.prank(relayer);
        vault.unlock(recipient, 1 ether, burnTxHash, sourceNonce);

        assertEq(recipient.balance - recipientBalBefore, 1 ether);
    }

    function test_unlock_emits_event() public {
        bytes32 burnTxHash = keccak256("burn_tx_1");
        uint256 sourceNonce = 1;
        bytes32 processId = keccak256(abi.encodePacked(burnTxHash, sourceNonce));

        vm.prank(relayer);
        vm.expectEmit(true, true, false, true);
        emit BridgeVault.Unlocked(recipient, 1 ether, processId);
        vault.unlock(recipient, 1 ether, burnTxHash, sourceNonce);
    }

    function test_unlock_reverts_not_relayer() public {
        bytes32 burnTxHash = keccak256("burn_tx_1");

        vm.prank(user);
        vm.expectRevert(BridgeVault.NotRelayer.selector);
        vault.unlock(recipient, 1 ether, burnTxHash, 1);
    }

    function test_unlock_reverts_replay() public {
        bytes32 burnTxHash = keccak256("burn_tx_1");
        uint256 sourceNonce = 1;
        bytes32 processId = keccak256(abi.encodePacked(burnTxHash, sourceNonce));

        vm.prank(relayer);
        vault.unlock(recipient, 1 ether, burnTxHash, sourceNonce);

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(BridgeVault.AlreadyProcessed.selector, processId));
        vault.unlock(recipient, 1 ether, burnTxHash, sourceNonce);
    }

    function test_unlock_reverts_insufficient_balance() public {
        bytes32 burnTxHash = keccak256("burn_tx_1");

        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(BridgeVault.InsufficientBalance.selector, 200 ether, 100 ether));
        vault.unlock(recipient, 200 ether, burnTxHash, 1);
    }

    function test_unlock_reverts_when_paused() public {
        vault.pause();
        bytes32 burnTxHash = keccak256("burn_tx_1");

        vm.prank(relayer);
        vm.expectRevert();
        vault.unlock(recipient, 1 ether, burnTxHash, 1);
    }

    // ============================================================
    //  Admin Tests
    // ============================================================

    function test_setRelayer() public {
        address newRelayer = makeAddr("newRelayer");
        vault.setRelayer(newRelayer);
        assertEq(vault.relayer(), newRelayer);
    }

    function test_setRelayer_reverts_zero_address() public {
        vm.expectRevert(BridgeVault.InvalidRelayer.selector);
        vault.setRelayer(address(0));
    }

    function test_setRelayer_reverts_not_owner() public {
        vm.prank(user);
        vm.expectRevert();
        vault.setRelayer(makeAddr("newRelayer"));
    }

    function test_setFeePercent() public {
        vault.setFeePercent(50); // 0.5%
        assertEq(vault.feePercent(), 50);
    }

    function test_setFeePercent_reverts_too_high() public {
        vm.expectRevert(abi.encodeWithSelector(BridgeVault.FeeTooHigh.selector, 600, 500));
        vault.setFeePercent(600);
    }

    function test_withdrawFees() public {
        // Generate some fees
        vm.prank(user);
        vault.lock{value: 1 ether}(recipient);

        uint256 fees = vault.accumulatedFees();
        assertGt(fees, 0);

        uint256 ownerBalBefore = owner.balance;
        vault.withdrawFees();

        assertEq(vault.accumulatedFees(), 0);
        assertEq(owner.balance - ownerBalBefore, fees);
    }

    function test_withdrawFees_reverts_no_fees() public {
        vm.expectRevert(BridgeVault.NoFeesToWithdraw.selector);
        vault.withdrawFees();
    }

    function test_availableBalance() public {
        // Initial: 100 ether, no fees
        assertEq(vault.availableBalance(), 100 ether);

        // After lock: balance increases, but fees are reserved
        vm.prank(user);
        vault.lock{value: 1 ether}(recipient);

        // Balance = 101 ether, fees = 0.003 ether
        assertEq(vault.availableBalance(), 101 ether - 0.003 ether);
    }

    function test_isProcessed() public {
        bytes32 burnTxHash = keccak256("burn_tx_1");
        uint256 sourceNonce = 1;

        assertFalse(vault.isProcessed(burnTxHash, sourceNonce));

        vm.prank(relayer);
        vault.unlock(recipient, 1 ether, burnTxHash, sourceNonce);

        assertTrue(vault.isProcessed(burnTxHash, sourceNonce));
    }

    // ============================================================
    //  Constructor Tests
    // ============================================================

    function test_constructor_reverts_zero_relayer() public {
        vm.expectRevert(BridgeVault.InvalidRelayer.selector);
        new BridgeVault(address(0));
    }

    function test_receive_ether() public {
        uint256 balBefore = address(vault).balance;
        vm.deal(user, 5 ether);
        vm.prank(user);
        (bool success, ) = address(vault).call{value: 5 ether}("");
        assertTrue(success);
        assertEq(address(vault).balance - balBefore, 5 ether);
    }
}
