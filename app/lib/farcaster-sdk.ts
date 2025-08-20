import { sdk } from '@farcaster/miniapp-sdk';

// Farcaster SDK wrapper for better error handling and fallbacks
export class FarcasterSDKWrapper {
  private static instance: FarcasterSDKWrapper;
  private sdkInstance: typeof sdk;

  private constructor() {
    this.sdkInstance = sdk;
  }

  static getInstance(): FarcasterSDKWrapper {
    if (!FarcasterSDKWrapper.instance) {
      FarcasterSDKWrapper.instance = new FarcasterSDKWrapper();
    }
    return FarcasterSDKWrapper.instance;
  }

  // Safe compose cast with fallback
  async composeCast(text: string, embeds?: string[]): Promise<void> {
    try {
      await this.sdkInstance.actions.composeCast({
        text,
        embeds: embeds || []
      });
    } catch (error) {
      console.warn('Farcaster SDK composeCast failed, using fallback:', error);
      // Fallback to URL-based compose
      this.fallbackComposeCast(text, embeds);
    }
  }

  // Safe open URL with fallback
  async openUrl(url: string): Promise<void> {
    try {
      await this.sdkInstance.actions.openUrl(url);
    } catch (error) {
      console.warn('Farcaster SDK openUrl failed, using fallback:', error);
      // Fallback to window.open
      window.open(url, '_blank');
    }
  }

  // Fallback compose method using URL
  private fallbackComposeCast(text: string, embeds?: string[]): void {
    const base = 'https://warpcast.com/~/compose';
    const params = new URLSearchParams({ text });
    if (embeds && embeds.length > 0) {
      embeds.forEach(embed => params.append('embeds[]', embed));
    }
    const composeUrl = `${base}?${params.toString()}`;
    window.open(composeUrl, '_blank');
  }

  // Check if SDK is available
  isAvailable(): boolean {
    try {
      return !!this.sdkInstance && !!this.sdkInstance.actions;
    } catch {
      return false;
    }
  }

  // Get context information
  getContext() {
    try {
      return this.sdkInstance.context;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export const farcasterSDK = FarcasterSDKWrapper.getInstance();

// Convenience functions
export const composeCast = (text: string, embeds?: string[]) => 
  farcasterSDK.composeCast(text, embeds);

export const openUrl = (url: string) => 
  farcasterSDK.openUrl(url);

export const isFarcasterSDKAvailable = () => 
  farcasterSDK.isAvailable();

export const getFarcasterContext = () => 
  farcasterSDK.getContext();