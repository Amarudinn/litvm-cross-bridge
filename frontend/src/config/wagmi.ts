import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { liteforge, sepolia } from './chains'

export const config = getDefaultConfig({
  appName: 'LitVM Bridge',
  projectId: 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5',
  chains: [liteforge, sepolia],
  transports: {
    [liteforge.id]: http('https://liteforge.rpc.caldera.xyz/http'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
})
