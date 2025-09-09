import { base } from 'wagmi/chains'
import { createConfig, http } from 'wagmi'
import { coinbaseWallet } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    // Only Coinbase Wallet for OnchainKit integration
    coinbaseWallet({
      appName: 'EventFI',
      appLogoUrl: '/logo.png',
      headlessMode: false, // Enable full UI for better UX
    }),
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: false, // Disable SSR for better mobile compatibility
})
