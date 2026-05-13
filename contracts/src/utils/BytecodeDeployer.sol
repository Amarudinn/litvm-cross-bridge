// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BytecodeDeployer
/// @notice Utility library for deploying contracts from raw bytecode
library BytecodeDeployer {
    error DeployFailed();
    error EmptyBytecode();

    /// @notice Deploy a contract with no constructor arguments
    function deploy(bytes memory bytecode) internal returns (address deployed) {
        if (bytecode.length == 0) revert EmptyBytecode();
        assembly {
            deployed := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        if (deployed == address(0)) revert DeployFailed();
    }

    /// @notice Deploy a contract with constructor arguments
    function deploy(bytes memory bytecode, bytes memory constructorArgs) internal returns (address) {
        return deploy(abi.encodePacked(bytecode, constructorArgs));
    }
}
