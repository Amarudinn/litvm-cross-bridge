// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MULTYToken
/// @notice Multyra governance/utility token — 1 billion supply, 18 decimals
contract MULTYToken is ERC20 {
    constructor(address _recipient) ERC20("Multyra", "MULTY") {
        _mint(_recipient, 1_000_000_000 * 10 ** 18);
    }
}
