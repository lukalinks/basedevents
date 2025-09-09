import { base } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { 
  coinbaseWallet, 
  metaMask, 
  walletConnect,
  injected 
} from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    // Prioritize Coinbase Wallet for OnchainKit integration
    coinbaseWallet({
      appName: 'EventFI',
      appLogoUrl: '/logo.png',
      headlessMode: false, // Enable full UI for better UX
    }),
    metaMask({
      dappMetadata: {
        name: 'EventFI',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        iconUrl: '/logo.png',
      },
    }),
    injected({
      target: 'metaMask',
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
      metadata: {
        name: 'EventFI',
        description: 'Find Your Next Event',
        url: typeof window !== 'undefined' ? window.location.origin : '',
        icons: ['/logo.png'],
      },
      qrModalOptions: {
        themeMode: 'light',
        themeVariables: {
          '--wcm-z-index': '1000',
        },
      },
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: false, // Disable SSR for better mobile compatibility
})
