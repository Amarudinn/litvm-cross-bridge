// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WrappedZkLTC} from "../src/WrappedZkLTC.sol";

/**
 * @notice Deploy WrappedZkLTC to Sepolia
 *
 * Usage:
 *   forge script script/DeployWrappedZkLTC.s.sol:DeployWrappedZkLTC \
 *     --rpc-url $SEPOLIA_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployWrappedZkLTC is Script {
    function run() external {
        address relayer = vm.envAddress("RELAYER_ADDRESS");

        console.log("Deploying WrappedZkLTC...");
        console.log("  Relayer:", relayer);

        vm.startBroadcast();

        WrappedZkLTC token = new WrappedZkLTC(relayer);

        vm.stopBroadcast();

        console.log("WrappedZkLTC deployed at:", address(token));
        console.log("  Name:", token.name());
        console.log("  Symbol:", token.symbol());
        console.log("  Owner:", token.owner());
        console.log("  Relayer:", token.relayer());
        console.log("  Fee:", token.feePercent(), "basis points (0.3%)");
    }
}
