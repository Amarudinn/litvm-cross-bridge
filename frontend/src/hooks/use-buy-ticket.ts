import { useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { useState, useEffect, useRef, useCallback } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/config/contract';
import { encodeFunctionData, createWalletClient, custom } from 'viem';

const liteforgeChain = {
  id: 4441,
  name: 'LiteForge',
  nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://liteforge.rpc.caldera.xyz/http'] } },
} as const;

function getWalletClient() {
  const provider = (window as any).ethereum;
  if (!provider) throw new Error('No wallet found');
  return createWalletClient({
    chain: liteforgeChain,
    transport: custom(provider),
  });
}

export function useBuyTicket() {
  const { address } = useAccount();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const onSuccessRef = useRef<(() => void) | null>(null);
  const onErrorRef = useRef<((err: Error) => void) | null>(null);

  useEffect(() => {
    if (isSuccess) onSuccessRef.current?.();
  }, [isSuccess]);

  useEffect(() => {
    if (error) onErrorRef.current?.(error);
  }, [error]);

  const buyTicket = useCallback(async (
    marketId: number,
    outcomeIndex: number,
    quantity: number,
    ticketPrice: string,
    fee: string,
    callbacks?: { onSuccess?: () => void; onError?: (err: Error) => void }
  ) => {
    onSuccessRef.current = callbacks?.onSuccess || null;
    onErrorRef.current = callbacks?.onError || null;
    setHash(undefined);
    setError(null);
    setIsPending(true);

    try {
      if (!address) throw new Error('Wallet not connected');

      const costPerTicket = BigInt(ticketPrice) + BigInt(fee);
      const totalCost = costPerTicket * BigInt(quantity);

      console.log('[useBuyTicket] Sending tx:', { marketId, outcomeIndex, quantity, totalCost: totalCost.toString() });

      const client = getWalletClient();
      const txHash = await client.sendTransaction({
        account: address,
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: 'buyTicket',
          args: [BigInt(marketId), BigInt(outcomeIndex), BigInt(quantity)],
        }),
        value: totalCost,
      });

      setHash(txHash);
      setIsPending(false);
    } catch (err: any) {
      console.error('[useBuyTicket] Error:', err.message);
      setError(err);
      setIsPending(false);
    }
  }, [address]);

  return { buyTicket, isPending, isConfirming, isSuccess, error, hash };
}

export function useClaim() {
  const { address } = useAccount();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const onSuccessRef = useRef<(() => void) | null>(null);
  const onErrorRef = useRef<((err: Error) => void) | null>(null);

  useEffect(() => {
    if (isSuccess) onSuccessRef.current?.();
  }, [isSuccess]);

  useEffect(() => {
    if (error) onErrorRef.current?.(error);
  }, [error]);

  const claim = useCallback(async (marketId: number, callbacks?: { onSuccess?: () => void; onError?: (err: Error) => void }) => {
    onSuccessRef.current = callbacks?.onSuccess || null;
    onErrorRef.current = callbacks?.onError || null;
    setHash(undefined);
    setError(null);
    setIsPending(true);

    try {
      if (!address) throw new Error('Wallet not connected');

      const client = getWalletClient();
      const txHash = await client.sendTransaction({
        account: address,
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: 'claim',
          args: [BigInt(marketId)],
        }),
      });

      setHash(txHash);
      setIsPending(false);
    } catch (err: any) {
      setError(err);
      setIsPending(false);
    }
  }, [address]);

  const claimRefund = useCallback(async (marketId: number, callbacks?: { onSuccess?: () => void; onError?: (err: Error) => void }) => {
    onSuccessRef.current = callbacks?.onSuccess || null;
    onErrorRef.current = callbacks?.onError || null;
    setHash(undefined);
    setError(null);
    setIsPending(true);

    try {
      if (!address) throw new Error('Wallet not connected');

      const client = getWalletClient();
      const txHash = await client.sendTransaction({
        account: address,
        to: CONTRACT_ADDRESS,
        data: encodeFunctionData({
          abi: CONTRACT_ABI,
          functionName: 'claimRefund',
          args: [BigInt(marketId)],
        }),
      });

      setHash(txHash);
      setIsPending(false);
    } catch (err: any) {
      setError(err);
      setIsPending(false);
    }
  }, [address]);

  return { claim, claimRefund, isPending, isConfirming, isSuccess, error, hash };
}
