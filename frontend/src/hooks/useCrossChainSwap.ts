import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi'
import { parseUnits, encodeFunctionData, type Address, maxUint256, createPublicClient, http } from 'viem'
import { useSwapStore } from '@/stores/swapStore'
import { useBalanceStore } from '@/stores/balanceStore'
import { MULTYRA_ROUTER_ADDRESS } from '@/config/dex'
import { POOLS } from '@/config/pools'
import { BRIDGE_VAULT_ADDRESS, WRAPPED_ZKLTC_ADDRESS, WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS, LITEFORGE_CHAIN_ID, SEPOLIA_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID } from '@/config/contracts'
import { liteforge, sepolia, baseSepolia } from '@/config/chains'

// ABIs
const BRIDGE_VAULT_ABI = [
  {
    name: 'lock',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_recipient', type: 'address' },
      { name: '_destChainId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

const WRAPPED_ZKLTC_ABI = [
  {
    name: 'burn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_amount', type: 'uint256' },
      { name: '_recipient', type: 'address' },
    ],
    outputs: [],
  },
] as const

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

const MULTYRA_ROUTER_ABI = [
  {
    name: 'swapExactInputSingle',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'poolFee', type: 'uint24' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'amountOutMinimum', type: 'uint256' },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const

export type CrossChainStatus =
  | 'idle'
  | 'swapping_source'    // Swap on source chain (dest → LiteForge: swap token → wzkLTC)
  | 'approving_burn'     // Approve wzkLTC for burn
  | 'bridging'           // Lock or Burn
  | 'waiting_relay'      // Waiting for relayer to complete
  | 'swapping_dest'      // Swap on destination (LiteForge → dest: swap wzkLTC → target)
  | 'approving_swap'     // Approve for swap on destination
  | 'completed'
  | 'error'

export function useCrossChainSwap() {
  const [status, setStatus] = useState<CrossChainStatus>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const invalidateBalances = useBalanceStore((s) => s.invalidate)
  const { tokenIn, tokenOut, amountIn, amountOut, fromChainId, toChainId } = useSwapStore()

  const getChain = (id: number) => {
    switch (id) {
      case LITEFORGE_CHAIN_ID: return liteforge
      case SEPOLIA_CHAIN_ID: return sepolia
      case BASE_SEPOLIA_CHAIN_ID: return baseSepolia
      default: return sepolia
    }
  }

  // Create a public client for any chain (not tied to wallet's active chain)
  const getDestClient = (destChainId: number) => {
    const chain = getChain(destChainId)
    const rpcUrl = destChainId === LITEFORGE_CHAIN_ID
      ? 'https://liteforge.rpc.caldera.xyz/http'
      : destChainId === SEPOLIA_CHAIN_ID
        ? 'https://ethereum-sepolia-rpc.publicnode.com'
        : 'https://base-sepolia-rpc.publicnode.com'
    return createPublicClient({ chain, transport: http(rpcUrl) })
  }

  // Get a client for the source chain
  const getSourceClient = () => getDestClient(fromChainId)

  const getWzkLTCAddress = (chainId: number): Address => {
    if (chainId === SEPOLIA_CHAIN_ID) return WRAPPED_ZKLTC_ADDRESS as Address
    if (chainId === BASE_SEPOLIA_CHAIN_ID) return WRAPPED_ZKLTC_BASE_SEPOLIA_ADDRESS as Address
    return '0x0' as Address
  }

  const getPoolFee = (chainId: number, symbolIn: string, symbolOut: string): number => {
    const pool = POOLS.find(
      (p) =>
        p.chainId === chainId &&
        ((p.token0 === symbolIn && p.token1 === symbolOut) ||
          (p.token0 === symbolOut && p.token1 === symbolIn))
    )
    return pool?.feeTier ?? 10000
  }

  // Poll destination chain for wzkLTC balance increase
  const waitForBridgeComplete = async (destChainId: number, initialBalance: bigint): Promise<boolean> => {
    const wzkLTCAddr = getWzkLTCAddress(destChainId)
    if (!address) return false

    const destClient = getDestClient(destChainId)

    // Poll every 5 seconds for up to 2 minutes
    for (let i = 0; i < 24; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      try {
        const balance = await destClient.readContract({
          address: wzkLTCAddr,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        })
        if (balance > initialBalance) return true
      } catch {
        // continue polling
      }
    }
    return false
  }

  const execute = async () => {
    if (!address || !walletClient || !publicClient || !tokenIn || !tokenOut || !amountIn || !amountOut) return

    const chain = getChain(fromChainId)

    try {
      setError(null)
      setTxHash(null)

      const amountInWei = parseUnits(amountIn, tokenIn.decimals)

      // === LiteForge → Destination (lock + swap on dest) ===
      if (fromChainId === LITEFORGE_CHAIN_ID) {
        // Step 1: Lock zkLTC via BridgeVaultV2
        setStatus('approving_burn') // "Signing" step — waiting for MetaMask confirmation

        const lockData = encodeFunctionData({
          abi: BRIDGE_VAULT_ABI,
          functionName: 'lock',
          args: [address, BigInt(toChainId)],
        })

        const lockHash = await walletClient.sendTransaction({
          to: BRIDGE_VAULT_ADDRESS as Address,
          data: lockData,
          value: amountInWei,
          chain,
          gas: BigInt(200000),
        })

        setTxHash(lockHash)
        setStatus('bridging') // "Confirming" step — tx submitted, waiting for confirmation
        const sourceClient = getSourceClient()
        await sourceClient.waitForTransactionReceipt({ hash: lockHash })

        // Step 2: Wait for Relayer to mint wzkLTC on destination
        setStatus('waiting_relay')

        // Get initial wzkLTC balance on destination using dest client
        const wzkLTCAddr = getWzkLTCAddress(toChainId)
        const destClient = getDestClient(toChainId)
        let initialBalance = BigInt(0)
        try {
          initialBalance = await destClient.readContract({
            address: wzkLTCAddr,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          })
        } catch {}

        const bridged = await waitForBridgeComplete(toChainId, initialBalance)
        if (!bridged) {
          setError('Bridge timeout — wzkLTC not received. Check History page.')
          setStatus('error')
          return
        }


        // Step 3: If target token is wzkLTC, we're done
        if (tokenOut.symbol === 'wzkLTC') {
          setStatus('completed')
          invalidateBalances()
            return
        }

        // Step 4: Swap wzkLTC → target token on destination chain
        // Auto-switch wallet to destination chain
        setStatus('swapping_dest')

        await switchChainAsync({ chainId: toChainId })

        // Wait for wallet to settle on new chain
        await new Promise((r) => setTimeout(r, 3000))


        // Get wzkLTC balance after bridge using dest client
        const wzkLTCBalance = await destClient.readContract({
          address: wzkLTCAddr,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        })
        const swapAmount = wzkLTCBalance - initialBalance

        // Use window.ethereum directly since walletClient is stale after chain switch
        const destRouterAddress = MULTYRA_ROUTER_ADDRESS[toChainId] as Address

        // Get current account from wallet (address hook may be stale after chain switch)
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' })
        const currentAddress = accounts[0] as string

        // Check allowance first — skip approve if already sufficient
        const currentAllowance = await destClient.readContract({
          address: wzkLTCAddr,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [currentAddress as Address, destRouterAddress],
        })

        if (currentAllowance < swapAmount) {
          // Approve wzkLTC to MultyraRouter on destination
          setStatus('approving_swap')

          const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [destRouterAddress, maxUint256],
          })

          const approveTxHash = await (window as any).ethereum.request({
            method: 'eth_sendTransaction',
            params: [{
              from: currentAddress,
              to: wzkLTCAddr,
              data: approveData,
              gas: '0xEA60',
            }],
          })

          await destClient.waitForTransactionReceipt({ hash: approveTxHash })
        }

        // Execute swap
        setStatus('swapping_dest')
        const poolFee = getPoolFee(toChainId, 'wzkLTC', tokenOut.symbol)
        const minOut = BigInt(0)

        const swapData = encodeFunctionData({
          abi: MULTYRA_ROUTER_ABI,
          functionName: 'swapExactInputSingle',
          args: [wzkLTCAddr, tokenOut.address as Address, poolFee, swapAmount, minOut],
        })

        const swapTxHash = await (window as any).ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: currentAddress,
            to: destRouterAddress,
            data: swapData,
            gas: '0x493E0',
          }],
        })

        await destClient.waitForTransactionReceipt({ hash: swapTxHash })

        setStatus('completed')
        invalidateBalances()

      // === Destination → LiteForge (swap + burn) ===
      } else if (toChainId === LITEFORGE_CHAIN_ID) {
        const wzkLTCAddr = getWzkLTCAddress(fromChainId)
        const routerAddress = MULTYRA_ROUTER_ADDRESS[fromChainId] as Address
        const sourceClient = getSourceClient()

        // Step 1: If tokenIn is not wzkLTC, swap to wzkLTC first
        if (tokenIn.symbol !== 'wzkLTC') {
          setStatus('swapping_source')

          // Approve tokenIn to router
          const allowance = await sourceClient.readContract({
            address: tokenIn.address as Address,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, routerAddress],
          })

          if (allowance < amountInWei) {
            const approveData = encodeFunctionData({
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [routerAddress, maxUint256],
            })
            const approveHash = await walletClient.sendTransaction({
              to: tokenIn.address as Address,
              data: approveData,
              chain,
              gas: BigInt(60000),
            })
            await sourceClient.waitForTransactionReceipt({ hash: approveHash })
          }

          // Swap tokenIn → wzkLTC
          const poolFee = getPoolFee(fromChainId, tokenIn.symbol, 'wzkLTC')
          const swapData = encodeFunctionData({
            abi: MULTYRA_ROUTER_ABI,
            functionName: 'swapExactInputSingle',
            args: [tokenIn.address as Address, wzkLTCAddr, poolFee, amountInWei, BigInt(0)],
          })

          const swapHash = await walletClient.sendTransaction({
            to: routerAddress,
            data: swapData,
            chain,
            gas: BigInt(300000),
          })
          await sourceClient.waitForTransactionReceipt({ hash: swapHash })
        }

        // Step 2: Burn wzkLTC
        setStatus('approving_burn') // "Signing" step — waiting for MetaMask confirmation

        // Determine burn amount: if we swapped first, use the wzkLTC we received
        // If tokenIn is wzkLTC directly, use amountInWei
        const burnAmount = tokenIn.symbol === 'wzkLTC' ? amountInWei : await (async () => {
          // After swap, check how much wzkLTC we have now
          const bal = await sourceClient.readContract({
            address: wzkLTCAddr,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [address],
          })
          return bal
        })()

        if (burnAmount === BigInt(0)) {
          setError('No wzkLTC to burn')
          setStatus('error')
          return
        }

        const burnData = encodeFunctionData({
          abi: WRAPPED_ZKLTC_ABI,
          functionName: 'burn',
          args: [burnAmount, address],
        })

        const burnHash = await walletClient.sendTransaction({
          to: wzkLTCAddr,
          data: burnData,
          chain,
          gas: BigInt(200000),
        })

        setTxHash(burnHash)
        setStatus('bridging') // "Confirming" step — tx submitted, waiting for confirmation
        await sourceClient.waitForTransactionReceipt({ hash: burnHash })

        // Step 3: Wait for Relayer to unlock zkLTC on LiteForge
        setStatus('waiting_relay')

        // Poll for ~2 minutes
        await new Promise((r) => setTimeout(r, 45000))

        setStatus('completed')
        invalidateBalances()

      } else {
        setError('Unsupported cross-chain direction')
        setStatus('error')
      }
    } catch (err: any) {
      console.error('Cross-chain swap failed:', err)
      setStatus('error')
      const message = err?.shortMessage || err?.message || 'Cross-chain swap failed'
      setError(message)
    }
  }

  const reset = () => {
    setStatus('idle')
    setTxHash(null)
    setError(null)
  }

  return { status, txHash, error, execute, reset }
}
