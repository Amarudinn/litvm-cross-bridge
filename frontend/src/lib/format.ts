import { formatUnits } from 'viem'
import { liteforge, sepolia } from '@/config/chains'

/**
 * Format a bigint wei value to a human-readable string.
 */
export function formatAmount(value: bigint, decimals = 18): string {
  const formatted = formatUnits(value, decimals)
  const num = parseFloat(formatted)

  if (num === 0) return '0'
  if (num < 0.0001) return '< 0.0001'
  if (num < 1) return num.toFixed(4)
  if (num < 1000) return num.toFixed(4).replace(/\.?0+$/, '')
  return num.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

/**
 * Shorten an Ethereum address to 0x1234...5678 format.
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Shorten a transaction hash to 0x1234...5678 format.
 */
export function shortenTxHash(hash: string): string {
  if (!hash || hash.length < 10) return hash
  return `${hash.slice(0, 10)}...${hash.slice(-4)}`
}

/**
 * Get the block explorer URL for a transaction or address.
 */
export function getExplorerUrl(chainId: number, type: 'tx' | 'address', value: string): string {
  let baseUrl: string

  switch (chainId) {
    case liteforge.id:
      baseUrl = liteforge.blockExplorers.default.url
      break
    case sepolia.id:
      baseUrl = sepolia.blockExplorers?.default.url ?? 'https://sepolia.etherscan.io'
      break
    default:
      baseUrl = 'https://etherscan.io'
  }

  return `${baseUrl}/${type}/${value}`
}
