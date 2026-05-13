// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {BytecodeDeployer} from "../src/utils/BytecodeDeployer.sol";
import {WETH9} from "../src/WETH9.sol";

contract DeployUniswapV3 is Script {
    using BytecodeDeployer for bytes;

    // Canonical WETH addresses
    address constant SEPOLIA_WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
    address constant BASE_SEPOLIA_WETH = 0x4200000000000000000000000000000000000006;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console.log("Deploying UniswapV3 on chain:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // 1. WETH9
        address weth = _deployWeth();

        // 2. Factory
        address factory = _getArtifactBytecode("UniswapV3Factory").deploy();
        console.log("UniswapV3Factory:", factory);

        // 3. SwapRouter
        address swapRouter = _getArtifactBytecode("SwapRouter").deploy(abi.encode(factory, weth));
        console.log("SwapRouter:", swapRouter);

        // 4. NonfungiblePositionManager (use factory, weth, address(0) for tokenDescriptor)
        // We skip NFTDescriptor/TokenPositionDescriptor for testnet — not needed for swap functionality
        address nftPm = _getArtifactBytecode("NonfungiblePositionManager").deploy(
            abi.encode(factory, weth, address(0))
        );
        console.log("NonfungiblePositionManager:", nftPm);

        // 5. QuoterV2
        address quoter = _getArtifactBytecode("QuoterV2").deploy(abi.encode(factory, weth));
        console.log("QuoterV2:", quoter);

        // 6. TickLens
        address tickLens = _getArtifactBytecode("TickLens").deploy();
        console.log("TickLens:", tickLens);

        vm.stopBroadcast();
    }

    function _deployWeth() internal returns (address weth) {
        if (block.chainid == 4441) {
            weth = address(new WETH9());
            console.log("WETH9 deployed:", weth);
        } else if (block.chainid == 11155111) {
            weth = SEPOLIA_WETH;
            console.log("Using Sepolia WETH:", weth);
        } else if (block.chainid == 84532) {
            weth = BASE_SEPOLIA_WETH;
            console.log("Using Base Sepolia WETH:", weth);
        } else {
            revert("Unsupported chain");
        }
    }

    function _getArtifactBytecode(string memory name) internal view returns (bytes memory) {
        string memory path = string.concat("uniswap-artifacts/", name, ".hex");
        string memory hex_str = vm.readFile(path);
        return vm.parseBytes(hex_str);
    }
}
