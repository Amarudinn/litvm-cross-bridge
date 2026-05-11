// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BridgeVaultV2} from "../src/BridgeVaultV2.sol";

contract DeployBridgeVaultV2 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address relayer = vm.envAddress("RELAYER_ADDRESS");

        vm.startBroadcast(deployerKey);

        BridgeVaultV2 vault = new BridgeVaultV2(relayer);
        console.log("BridgeVaultV2 deployed at:", address(vault));

        // Add supported chains
        vault.addChain(11155111); // Sepolia
        console.log("  Added chain: Sepolia (11155111)");

        vault.addChain(84532); // Base Sepolia
        console.log("  Added chain: Base Sepolia (84532)");

        vm.stopBroadcast();
    }
}
