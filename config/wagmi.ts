// config/wagmi.ts
import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterFrame as miniAppConnector } from '@farcaster/frame-wagmi-connector'
import { QueryClient } from '@tanstack/react-query'

// Create a query client for Wagmi
export const queryClient = new QueryClient()

// Wagmi configuration with Base blockchain support
export const config = createConfig({
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
    [baseSepolia.id]: http(`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
  },
  connectors: [
    miniAppConnector()
  ],
})

// Export the chain configuration for easy access
export const supportedChains = {
  base: {
    id: base.id,
    name: base.name,
    nativeCurrency: base.nativeCurrency,
    rpcUrls: base.rpcUrls,
    blockExplorers: base.blockExplorers,
  },
  baseSepolia: {
    id: baseSepolia.id,
    name: baseSepolia.name,
    nativeCurrency: baseSepolia.nativeCurrency,
    rpcUrls: baseSepolia.rpcUrls,
    blockExplorers: baseSepolia.blockExplorers,
  }
}

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
