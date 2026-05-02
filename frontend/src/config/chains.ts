import { defineChain } from 'viem'
import { sepolia } from 'viem/chains'

export const liteforge = defineChain({
  id: 4441,
  name: 'LiteForge',
  nativeCurrency: { name: 'zkLTC', symbol: 'zkLTC', decimals: 18 },
  rpcUrls: { default: { http: ['https://liteforge.rpc.caldera.xyz/http'] } },
  blockExplorers: { default: { name: 'LiteForge Explorer', url: 'https://liteforge.explorer.caldera.xyz' } },
})

export { sepolia }
