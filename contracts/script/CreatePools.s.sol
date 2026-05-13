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

contract CreatePools is Script {
    // 0.3% fee tier
    uint24 constant FEE_TIER = 3000;
    // Full range ticks for 0.3% fee (tick spacing = 60)
    int24 constant TICK_LOWER = -887220;
    int24 constant TICK_UPPER = 887220;
    // sqrtPriceX96 for 1:1 price = 2^96
    uint160 constant SQRT_PRICE_1_TO_1 = 79228162514264337593543950336;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address factory = vm.envAddress("UNISWAP_FACTORY");
        address nftPm = vm.envAddress("NFT_POSITION_MANAGER");

        console.log("Creating pools on chain:", block.chainid);
        console.log("Factory:", factory);
        console.log("PositionManager:", nftPm);

        vm.startBroadcast(deployerPrivateKey);

        if (block.chainid == 4441) {
            _createPoolsLiteForge(factory, nftPm, deployer);
        } else if (block.chainid == 11155111) {
            _createPoolsSepolia(factory, nftPm, deployer);
        } else if (block.chainid == 84532) {
            _createPoolsBaseSepolia(factory, nftPm, deployer);
        } else {
            revert("Unsupported chain");
        }

        vm.stopBroadcast();
    }

    function _createPoolsLiteForge(address factory, address nftPm, address deployer) internal {
        address multy = vm.envAddress("MULTY_TOKEN");
        address weth = vm.envAddress("WETH_ADDRESS"); // WETH9 on LiteForge = wrapped zkLTC

        console.log("--- LiteForge Pools ---");

        // Pool: WETH(zkLTC)/MULTY
        address pool = IUniswapV3Factory(factory).createPool(weth, multy, FEE_TIER);
        IUniswapV3Pool(pool).initialize(SQRT_PRICE_1_TO_1);
        console.log("Pool zkLTC/MULTY:", pool);

        // Add liquidity
        uint256 liquidityAmount = 100_000 * 1e18;
        IERC20(weth).approve(nftPm, type(uint256).max);
        IERC20(multy).approve(nftPm, type(uint256).max);
        _mintPosition(nftPm, weth, multy, liquidityAmount, liquidityAmount, deployer);
        console.log("Liquidity added to zkLTC/MULTY");
    }

    function _createPoolsSepolia(address factory, address nftPm, address deployer) internal {
        address wzkLTC = vm.envAddress("WZKLTC_ADDRESS");
        address weth = vm.envAddress("WETH_ADDRESS");
        address multy = vm.envAddress("MULTY_TOKEN");

        console.log("--- Sepolia Pools ---");

        // Pool 1: wzkLTC/WETH
        address pool1 = IUniswapV3Factory(factory).createPool(wzkLTC, weth, FEE_TIER);
        IUniswapV3Pool(pool1).initialize(SQRT_PRICE_1_TO_1);
        console.log("Pool wzkLTC/WETH:", pool1);

        // Pool 2: MULTY/WETH
        address pool2 = IUniswapV3Factory(factory).createPool(multy, weth, FEE_TIER);
        IUniswapV3Pool(pool2).initialize(SQRT_PRICE_1_TO_1);
        console.log("Pool MULTY/WETH:", pool2);

        // Pool 3: wzkLTC/MULTY
        address pool3 = IUniswapV3Factory(factory).createPool(wzkLTC, multy, FEE_TIER);
        IUniswapV3Pool(pool3).initialize(SQRT_PRICE_1_TO_1);
        console.log("Pool wzkLTC/MULTY:", pool3);

        // Add liquidity to all pools
        uint256 liquidityAmount = 10_000 * 1e18;
        IERC20(wzkLTC).approve(nftPm, type(uint256).max);
        IERC20(weth).approve(nftPm, type(uint256).max);
        IERC20(multy).approve(nftPm, type(uint256).max);

        _mintPosition(nftPm, wzkLTC, weth, liquidityAmount, liquidityAmount, deployer);
        console.log("Liquidity added to wzkLTC/WETH");

        _mintPosition(nftPm, multy, weth, liquidityAmount, liquidityAmount, deployer);
        console.log("Liquidity added to MULTY/WETH");

        _mintPosition(nftPm, wzkLTC, multy, liquidityAmount, liquidityAmount, deployer);
        console.log("Liquidity added to wzkLTC/MULTY");
    }

    function _createPoolsBaseSepolia(address factory, address nftPm, address deployer) internal {
        address wzkLTC = vm.envAddress("WZKLTC_ADDRESS");
        address weth = vm.envAddress("WETH_ADDRESS");
        address multy = vm.envAddress("MULTY_TOKEN");

        console.log("--- Base Sepolia Pools ---");

        // Pool 1: wzkLTC/WETH
        address pool1 = IUniswapV3Factory(factory).createPool(wzkLTC, weth, FEE_TIER);
        IUniswapV3Pool(pool1).initialize(SQRT_PRICE_1_TO_1);
        console.log("Pool wzkLTC/WETH:", pool1);

        // Pool 2: MULTY/WETH
        address pool2 = IUniswapV3Factory(factory).createPool(multy, weth, FEE_TIER);
        IUniswapV3Pool(pool2).initialize(SQRT_PRICE_1_TO_1);
        console.log("Pool MULTY/WETH:", pool2);

        // Pool 3: wzkLTC/MULTY
        address pool3 = IUniswapV3Factory(factory).createPool(wzkLTC, multy, FEE_TIER);
        IUniswapV3Pool(pool3).initialize(SQRT_PRICE_1_TO_1);
        console.log("Pool wzkLTC/MULTY:", pool3);

        // Add liquidity
        uint256 liquidityAmount = 10_000 * 1e18;
        IERC20(wzkLTC).approve(nftPm, type(uint256).max);
        IERC20(weth).approve(nftPm, type(uint256).max);
        IERC20(multy).approve(nftPm, type(uint256).max);

        _mintPosition(nftPm, wzkLTC, weth, liquidityAmount, liquidityAmount, deployer);
        console.log("Liquidity added to wzkLTC/WETH");

        _mintPosition(nftPm, multy, weth, liquidityAmount, liquidityAmount, deployer);
        console.log("Liquidity added to MULTY/WETH");

        _mintPosition(nftPm, wzkLTC, multy, liquidityAmount, liquidityAmount, deployer);
        console.log("Liquidity added to wzkLTC/MULTY");
    }

    function _mintPosition(
        address nftPm,
        address tokenA,
        address tokenB,
        uint256 amount0,
        uint256 amount1,
        address recipient
    ) internal {
        // Sort tokens (UniswapV3 requires token0 < token1)
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        (uint256 amt0, uint256 amt1) = tokenA < tokenB ? (amount0, amount1) : (amount1, amount0);

        INonfungiblePositionManager(nftPm).mint(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: FEE_TIER,
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                amount0Desired: amt0,
                amount1Desired: amt1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: recipient,
                deadline: block.timestamp + 600
            })
        );
    }
}
