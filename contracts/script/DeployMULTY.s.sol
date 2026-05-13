// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MULTYToken} from "../src/MULTYToken.sol";

contract DeployMULTY is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying MULTY token on chain:", block.chainid);
        console.log("Deployer:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        MULTYToken multy = new MULTYToken(deployer);
        console.log("MULTY Token deployed at:", address(multy));
        console.log("Total supply:", multy.totalSupply());

        vm.stopBroadcast();
    }
}
