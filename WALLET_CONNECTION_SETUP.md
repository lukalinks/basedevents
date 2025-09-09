# Wallet Connection Setup Guide

## Issue
The wallet connection is not working because the OnChainKit API key is not configured.

## Solution

### 1. **Get OnChainKit API Key**
1. Go to [OnChainKit Dashboard](https://onchainkit.com/)
2. Sign up or log in to your account
3. Create a new project or select an existing one
4. Copy your API key from the project settings

### 2. **Set Up Environment Variables**
Create a `.env.local` file in your project root with the following variables:

```bash
# Required for wallet connection
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key_here

# Project configuration
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=EventFI
NEXT_PUBLIC_URL=http://localhost:3000

# App images
NEXT_PUBLIC_ICON_URL=/logo.png
NEXT_PUBLIC_APP_HERO_IMAGE=/hero.png
NEXT_PUBLIC_SPLASH_IMAGE=/splash.png
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=#000000

# Optional: WalletConnect for additional wallet support
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here

# Optional: Farcaster integration
NEYNAR_API_KEY=your_neynar_api_key_here
```

### 3. **Restart Development Server**
After adding the environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
# or
yarn dev
```

### 4. **Test Wallet Connection**
1. Open your app in the browser
2. Click the "Connect Wallet" button in the header
3. You should see wallet options (Coinbase Wallet, MetaMask, etc.)
4. Select your preferred wallet and connect

## Troubleshooting

### If wallet connection still doesn't work:

1. **Check Console for Errors**
   - Open browser developer tools (F12)
   - Look for any error messages in the console
   - Check if the API key is being loaded correctly

2. **Verify Environment Variables**
   - Make sure the `.env.local` file is in the project root
   - Ensure the API key is correct and not expired
   - Check that the variable name is exactly `NEXT_PUBLIC_ONCHAINKIT_API_KEY`

3. **Clear Browser Cache**
   - Clear browser cache and cookies
   - Try in an incognito/private window

4. **Check Network Tab**
   - In developer tools, check the Network tab
   - Look for any failed API requests to OnChainKit

### Common Issues:

1. **"API key not found" error**
   - Make sure the environment variable is set correctly
   - Restart the development server after adding the variable

2. **"401 Unauthorized" error**
   - Your API key might be invalid or expired
   - Generate a new API key from OnChainKit dashboard

3. **No wallet options appear**
   - Check if you're on a supported network (Base chain)
   - Ensure the OnChainKit configuration is correct

## Alternative Setup (Without OnChainKit)

If you prefer not to use OnChainKit, you can set up wallet connection manually:

1. **Install wagmi and viem**
   ```bash
   npm install wagmi viem @wagmi/core
   ```

2. **Configure wagmi in providers.tsx**
   ```tsx
   import { WagmiConfig, createConfig, configureChains } from 'wagmi'
   import { base } from 'wagmi/chains'
   import { publicProvider } from 'wagmi/providers/public'
   import { MetaMaskConnector } from 'wagmi/connectors/metaMask'
   import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet'

   const { chains, publicClient, webSocketPublicClient } = configureChains(
     [base],
     [publicProvider()]
   )

   const config = createConfig({
     autoConnect: true,
     connectors: [
       new MetaMaskConnector({ chains }),
       new CoinbaseWalletConnector({
         chains,
         options: {
           appName: 'EventFI',
         },
       }),
     ],
     publicClient,
     webSocketPublicClient,
   })

   export function Providers({ children }) {
     return (
       <WagmiConfig config={config}>
         {children}
       </WagmiConfig>
     )
   }
   ```

## Support

If you're still having issues:

1. Check the [OnChainKit documentation](https://onchainkit.com/docs)
2. Look at the [Coinbase OnChainKit GitHub repository](https://github.com/coinbase/onchainkit)
3. Check the browser console for specific error messages
4. Ensure you're using the latest version of the dependencies

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | ✅ Yes | OnChainKit API key for wallet connection |
| `NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME` | ❌ No | Project name (defaults to "EventFI") |
| `NEXT_PUBLIC_URL` | ❌ No | App URL (defaults to localhost:3000) |
| `NEXT_PUBLIC_ICON_URL` | ❌ No | App icon URL |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | ❌ No | WalletConnect project ID for additional wallets |
| `NEYNAR_API_KEY` | ❌ No | Neynar API key for Farcaster integration |
