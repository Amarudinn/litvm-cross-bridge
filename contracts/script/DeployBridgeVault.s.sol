// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BridgeVault} from "../src/BridgeVault.sol";

/**
 * @notice Deploy BridgeVault to LiteForge
 *
 * Usage:
 *   forge script script/DeployBridgeVault.s.sol:DeployBridgeVault \
 *     --rpc-url $LITEFORGE_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract DeployBridgeVault is Script {
    function run() external {
        address relayer = vm.envAddress("RELAYER_ADDRESS");

        console.log("Deploying BridgeVault...");
        console.log("  Relayer:", relayer);

        vm.startBroadcast();

        BridgeVault vault = new BridgeVault(relayer);

        vm.stopBroadcast();

        console.log("BridgeVault deployed at:", address(vault));
        console.log("  Owner:", vault.owner());
        console.log("  Relayer:", vault.relayer());
        console.log("  Fee:", vault.feePercent(), "basis points (0.3%)");
    }
}
