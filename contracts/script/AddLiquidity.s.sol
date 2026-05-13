// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
}

contract AddLiquidity is Script {
    int24 constant TICK_LOWER = -887220;
    int24 constant TICK_UPPER = 887220;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address nftPm = vm.envAddress("NFT_POSITION_MANAGER");
        address token0 = vm.envAddress("TOKEN0");
        address token1 = vm.envAddress("TOKEN1");
        uint256 amount = vm.envUint("LIQUIDITY_AMOUNT");

        // Sort tokens
        if (token0 > token1) {
            (token0, token1) = (token1, token0);
        }

        console.log("Adding liquidity on chain:", block.chainid);
        console.log("Token0:", token0);
        console.log("Token1:", token1);
        console.log("Amount:", amount);

        vm.startBroadcast(deployerPrivateKey);

        IERC20(token0).approve(nftPm, type(uint256).max);
        IERC20(token1).approve(nftPm, type(uint256).max);

        (uint256 tokenId, uint128 liquidity, uint256 amt0, uint256 amt1) = INonfungiblePositionManager(nftPm).mint(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: 3000,
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                amount0Desired: amount,
                amount1Desired: amount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: deployer,
                deadline: block.timestamp + 600
            })
        );

        console.log("Position NFT ID:", tokenId);
        console.log("Liquidity:", uint256(liquidity));
        console.log("Amount0 used:", amt0);
        console.log("Amount1 used:", amt1);

        vm.stopBroadcast();
    }
}
