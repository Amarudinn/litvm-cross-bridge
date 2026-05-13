// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MULTYToken} from "../src/MULTYToken.sol";

contract MULTYTokenTest is Test {
    MULTYToken public token;
    address public recipient;

    function setUp() public {
        recipient = makeAddr("recipient");
        token = new MULTYToken(recipient);
    }

    function test_name() public view {
        assertEq(token.name(), "Multyra");
    }

    function test_symbol() public view {
        assertEq(token.symbol(), "MULTY");
    }

    function test_decimals() public view {
        assertEq(token.decimals(), 18);
    }

    function test_totalSupply() public view {
        assertEq(token.totalSupply(), 1_000_000_000 * 10 ** 18);
    }

    function test_recipientBalance() public view {
        assertEq(token.balanceOf(recipient), 1_000_000_000 * 10 ** 18);
    }

    function test_transfer() public {
        address to = makeAddr("to");
        uint256 amount = 1000 * 10 ** 18;

        vm.prank(recipient);
        token.transfer(to, amount);

        assertEq(token.balanceOf(to), amount);
        assertEq(token.balanceOf(recipient), token.totalSupply() - amount);
    }

    function test_approve_and_transferFrom() public {
        address spender = makeAddr("spender");
        address to = makeAddr("to");
        uint256 amount = 500 * 10 ** 18;

        vm.prank(recipient);
        token.approve(spender, amount);

        assertEq(token.allowance(recipient, spender), amount);

        vm.prank(spender);
        token.transferFrom(recipient, to, amount);

        assertEq(token.balanceOf(to), amount);
        assertEq(token.allowance(recipient, spender), 0);
    }

    function test_transfer_reverts_insufficient_balance() public {
        address nobody = makeAddr("nobody");
        address to = makeAddr("to");

        vm.prank(nobody);
        vm.expectRevert();
        token.transfer(to, 1);
    }
}
