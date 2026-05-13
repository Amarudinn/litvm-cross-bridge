// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapV3Factory {
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
}

interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
}

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

/// @notice Redeploy pools with correct initial price based on LP ratio
contract RedeployPools is Script {
    // Tick ranges per fee tier (must be multiple of tick spacing)
    // Fee 500 = tick spacing 10, Fee 3000 = tick spacing 60, Fee 10000 = tick spacing 200
    int24 constant TICK_LOWER_200 = -887200; // multiple of 200
    int24 constant TICK_UPPER_200 = 887200;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address factory = vm.envAddress("UNISWAP_FACTORY");
        address nftPm = vm.envAddress("NFT_POSITION_MANAGER");
        uint24 feeTier = uint24(vm.envUint("FEE_TIER"));
        uint160 sqrtPriceX96 = uint160(vm.envUint("SQRT_PRICE_X96"));

        (address token0, address token1, uint256 amt0, uint256 amt1) = _getParams();

        vm.startBroadcast(deployerPrivateKey);

        address pool = IUniswapV3Factory(factory).createPool(token0, token1, feeTier);
        IUniswapV3Pool(pool).initialize(sqrtPriceX96);
        console.log("Pool:", pool);

        IERC20(token0).approve(nftPm, type(uint256).max);
        IERC20(token1).approve(nftPm, type(uint256).max);

        INonfungiblePositionManager(nftPm).mint(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: feeTier,
                tickLower: TICK_LOWER_200,
                tickUpper: TICK_UPPER_200,
                amount0Desired: amt0,
                amount1Desired: amt1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: vm.addr(deployerPrivateKey),
                deadline: block.timestamp + 600
            })
        );
        console.log("Liquidity added");

        vm.stopBroadcast();
    }

    function _getParams() internal view returns (address token0, address token1, uint256 amt0, uint256 amt1) {
        address tokenA = vm.envAddress("TOKEN0");
        address tokenB = vm.envAddress("TOKEN1");
        uint256 amount0 = vm.envUint("AMOUNT0");
        uint256 amount1 = vm.envUint("AMOUNT1");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (amt0, amt1) = tokenA < tokenB ? (amount0, amount1) : (amount1, amount0);
    }
}
