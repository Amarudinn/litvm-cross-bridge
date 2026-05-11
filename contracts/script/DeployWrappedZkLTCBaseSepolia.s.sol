// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WrappedZkLTC} from "../src/WrappedZkLTC.sol";

contract DeployWrappedZkLTCBaseSepolia is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address relayer = vm.envAddress("RELAYER_ADDRESS");

        vm.startBroadcast(deployerKey);

        WrappedZkLTC wrapped = new WrappedZkLTC(relayer);
        console.log("WrappedZkLTC (Base Sepolia) deployed at:", address(wrapped));

        vm.stopBroadcast();
    }
}
