// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapV3Factory {
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
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

contract AddLiquidityToExistingPool is Script {
    int24 constant TICK_LOWER = -887220;
    int24 constant TICK_UPPER = 887220;
    uint160 constant SQRT_PRICE_1_TO_1 = 79228162514264337593543950336;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address factory = vm.envAddress("UNISWAP_FACTORY");
        address nftPm = vm.envAddress("NFT_POSITION_MANAGER");

        (address token0, address token1, uint256 amt0, uint256 amt1) = _getParams();

        console.log("Chain:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // Create pool if not exists
        address pool = IUniswapV3Factory(factory).getPool(token0, token1, 3000);
        if (pool == address(0)) {
            pool = IUniswapV3Factory(factory).createPool(token0, token1, 3000);
            IUniswapV3Pool(pool).initialize(SQRT_PRICE_1_TO_1);
            console.log("Pool created:", pool);
        } else {
            console.log("Pool exists:", pool);
        }

        IERC20(token0).approve(nftPm, type(uint256).max);
        IERC20(token1).approve(nftPm, type(uint256).max);

        _mint(nftPm, token0, token1, amt0, amt1, deployer);

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

    function _mint(address nftPm, address token0, address token1, uint256 amt0, uint256 amt1, address recipient) internal {
        (uint256 tokenId, uint128 liquidity,,) = INonfungiblePositionManager(nftPm).mint(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: 3000,
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
        console.log("NFT ID:", tokenId);
        console.log("Liquidity:", uint256(liquidity));
    }
}

