// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MultyraRouter} from "../src/MultyraRouter.sol";

contract DeployMultyraRouter is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address swapRouter = vm.envAddress("SWAP_ROUTER");
        address weth = vm.envAddress("WETH_ADDRESS");

        console.log("Deploying MultyraRouter on chain:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("SwapRouter:", swapRouter);
        console.log("WETH:", weth);

        vm.startBroadcast(deployerPrivateKey);

        MultyraRouter router = new MultyraRouter(
            swapRouter,
            weth,
            deployer, // feeRecipient = deployer initially
            deployer  // owner
        );

        console.log("MultyraRouter deployed at:", address(router));

        vm.stopBroadcast();
    }
}
