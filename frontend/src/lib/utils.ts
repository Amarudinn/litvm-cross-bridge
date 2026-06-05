import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEth(wei: bigint | string | number): string {
  const value = BigInt(wei);
  const eth = Number(value) / 1e18;
  if (eth === 0) return '0';
  const abs = Math.abs(eth);
  if (abs < 0.0001) return '0';
  const formatted = abs.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return eth < 0 ? `-${formatted}` : formatted;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimeLeft(closeTime: string | Date): string {
  const close = new Date(closeTime).getTime();
  const now = Date.now();
  const diff = close - now;

  if (diff <= 0) return 'CLOSED';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN': return 'text-accent';
    case 'CLOSED': return 'text-muted-foreground';
    case 'RESOLVED': return 'text-accent-muted';
    case 'CANCELLED': return 'text-danger';
    case 'PAUSED': return 'text-yellow-400';
    default: return 'text-muted-foreground';
  }
}
