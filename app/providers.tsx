"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { WagmiProvider } from "wagmi";
import { config } from "@/lib/wagmi-config";

export function Providers(props: { children: ReactNode }) {
  // Debug: Log API key status
  console.log('OnChainKit API Key status:', {
    exists: !!process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    length: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY?.length,
    firstChars: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY?.substring(0, 4)
  });

  return (
    <WagmiProvider config={config}>
      <MiniKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
        config={{
          appearance: {
            mode: "auto",
            theme: "mini-app-theme",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "EventFI",
            logo: process.env.NEXT_PUBLIC_ICON_URL || "/logo.png",
          },
          features: {
            analytics: false, // Disable analytics for better mobile performance
          },
        }}
      >
        {props.children}
      </MiniKitProvider>
    </WagmiProvider>
  );
}
