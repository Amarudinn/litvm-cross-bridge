import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http, fallback } from 'wagmi'
import { liteforge, sepolia, baseSepolia } from './chains'

export const config = getDefaultConfig({
  appName: 'Multyra Bridge',
  projectId: 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5',
  chains: [liteforge, sepolia, baseSepolia],
  transports: {
    [liteforge.id]: http('https://liteforge.rpc.caldera.xyz/http'),
    [sepolia.id]: fallback([
      http('https://ethereum-sepolia-rpc.publicnode.com'),
      http('https://sepolia.drpc.org'),
      http('https://1rpc.io/sepolia'),
    ]),
    [baseSepolia.id]: fallback([
      http('https://base-sepolia-rpc.publicnode.com'),
      http('https://sepolia.base.org'),
      http('https://base-sepolia.drpc.org'),
    ]),
  },
})
