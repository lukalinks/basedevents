# Token Gating Implementation Guide

## 🔒 **Token Gating for BasedEvents**

This comprehensive guide provides step-by-step instructions for implementing token gating functionality in your event management application, allowing event creators to restrict access based on token ownership.

---

## 📋 **Current Application Analysis**

### **Existing Architecture**
- **Frontend**: Next.js 15 with React
- **Blockchain**: Base network using Binance Smart Chain [[memory:4107631]]
- **Wallet Integration**: Wagmi v2 + OnChainKit + MiniKit
- **Database**: Supabase with PostgreSQL
- **Authentication**: Wallet-based (address-based)
- **Payment System**: USDC payments via OnChainKit

### **Current Event System**
- Event creation and management
- User registration with detailed forms
- USDC payment integration for paid events
- CSV export for event organizers
- Base name resolution for user display

---

## 🎯 **Token Gating Implementation Strategy**

### **Phase 1: Basic Token Gating**
1. Add token requirements to event creation
2. Implement token balance checks
3. Update registration flow with token verification
4. Add UI components for token gating

### **Phase 2: Advanced Features**
1. Multi-token requirements
2. NFT collection gating
3. Token staking requirements
4. Dynamic pricing based on token holdings

---

## 🏗️ **Database Schema Changes**

### **1. Update Events Table**

```sql
-- Add token gating columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_token_gated BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_token_address VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_token_balance DECIMAL(20,8);
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_token_symbol VARCHAR(10);
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_token_name VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS token_gate_type VARCHAR(20) DEFAULT 'ERC20'; -- ERC20, ERC721, ERC1155
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_nft_collection VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS required_nft_count INTEGER DEFAULT 1;

-- Index for token-gated events
CREATE INDEX IF NOT EXISTS idx_events_token_gated ON events(is_token_gated, required_token_address);
```

### **2. Create Token Verification Log Table**

```sql
-- Track token verification attempts
CREATE TABLE IF NOT EXISTS token_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_address VARCHAR(255) NOT NULL,
  token_address VARCHAR(255) NOT NULL,
  token_balance DECIMAL(20,8) NOT NULL,
  verification_status VARCHAR(20) NOT NULL, -- 'passed', 'failed'
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  block_number BIGINT,
  transaction_hash VARCHAR(255)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_token_verifications_event_user ON token_verifications(event_id, user_address);
CREATE INDEX IF NOT EXISTS idx_token_verifications_status ON token_verifications(verification_status);
```

### **3. Update Event Registration Policy**

```sql
-- Update RLS policy to consider token gating
DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;

CREATE POLICY "Users can register for events" ON event_registrations
  FOR INSERT
  USING (
    -- Allow registration if user address is authenticated
    auth.uid() IS NOT NULL
    OR
    -- Allow if the calling function has verified token requirements
    current_setting('app.token_verified', true)::boolean = true
  );
```

---

## 💻 **Frontend Implementation**

### **1. Token Gating Utilities**

Create `lib/tokenGating.ts`:

```typescript
import { createPublicClient, http, Address, formatUnits } from 'viem'
import { base } from 'viem/chains'
import { supabase } from './supabaseClient'

// Token contract ABIs
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const

const ERC721_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const

// Base network client
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

export interface TokenRequirement {
  type: 'ERC20' | 'ERC721' | 'ERC1155'
  contractAddress: Address
  requiredBalance: string
  symbol?: string
  name?: string
}

export interface TokenGateResult {
  passed: boolean
  userBalance: string
  requiredBalance: string
  tokenInfo: {
    name: string
    symbol: string
    decimals?: number
  }
  error?: string
}

/**
 * Verify if a user meets token requirements for an event
 */
export async function verifyTokenRequirement(
  userAddress: Address,
  requirement: TokenRequirement
): Promise<TokenGateResult> {
  try {
    switch (requirement.type) {
      case 'ERC20':
        return await verifyERC20Requirement(userAddress, requirement)
      case 'ERC721':
        return await verifyERC721Requirement(userAddress, requirement)
      default:
        throw new Error(`Unsupported token type: ${requirement.type}`)
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return {
      passed: false,
      userBalance: '0',
      requiredBalance: requirement.requiredBalance,
      tokenInfo: { name: 'Unknown', symbol: 'UNKNOWN' },
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function verifyERC20Requirement(
  userAddress: Address,
  requirement: TokenRequirement
): Promise<TokenGateResult> {
  const [balance, decimals, symbol, name] = await Promise.all([
    publicClient.readContract({
      address: requirement.contractAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    }),
    publicClient.readContract({
      address: requirement.contractAddress,
      abi: ERC20_ABI,
      functionName: 'decimals'
    }),
    publicClient.readContract({
      address: requirement.contractAddress,
      abi: ERC20_ABI,
      functionName: 'symbol'
    }),
    publicClient.readContract({
      address: requirement.contractAddress,
      abi: ERC20_ABI,
      functionName: 'name'
    })
  ])

  const userBalance = formatUnits(balance, decimals)
  const requiredBalance = requirement.requiredBalance

  return {
    passed: parseFloat(userBalance) >= parseFloat(requiredBalance),
    userBalance,
    requiredBalance,
    tokenInfo: { name, symbol, decimals }
  }
}

async function verifyERC721Requirement(
  userAddress: Address,
  requirement: TokenRequirement
): Promise<TokenGateResult> {
  const [balance, symbol, name] = await Promise.all([
    publicClient.readContract({
      address: requirement.contractAddress,
      abi: ERC721_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    }),
    publicClient.readContract({
      address: requirement.contractAddress,
      abi: ERC721_ABI,
      functionName: 'symbol'
    }),
    publicClient.readContract({
      address: requirement.contractAddress,
      abi: ERC721_ABI,
      functionName: 'name'
    })
  ])

  const userBalance = balance.toString()
  const requiredBalance = requirement.requiredBalance

  return {
    passed: parseInt(userBalance) >= parseInt(requiredBalance),
    userBalance,
    requiredBalance,
    tokenInfo: { name, symbol }
  }
}

/**
 * Get token info for display purposes
 */
export async function getTokenInfo(
  contractAddress: Address,
  type: 'ERC20' | 'ERC721'
): Promise<{ name: string; symbol: string; decimals?: number }> {
  try {
    if (type === 'ERC20') {
      const [name, symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'name'
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'symbol'
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: ERC20_ABI,
          functionName: 'decimals'
        })
      ])
      return { name, symbol, decimals }
    } else {
      const [name, symbol] = await Promise.all([
        publicClient.readContract({
          address: contractAddress,
          abi: ERC721_ABI,
          functionName: 'name'
        }),
        publicClient.readContract({
          address: contractAddress,
          abi: ERC721_ABI,
          functionName: 'symbol'
        })
      ])
      return { name, symbol }
    }
  } catch (error) {
    console.error('Failed to get token info:', error)
    return { name: 'Unknown Token', symbol: 'UNKNOWN' }
  }
}

/**
 * Log token verification attempt to database
 */
export async function logTokenVerification(
  eventId: string,
  userAddress: string,
  tokenAddress: string,
  tokenBalance: string,
  verificationStatus: 'passed' | 'failed'
): Promise<void> {
  try {
    await supabase
      .from('token_verifications')
      .insert({
        event_id: eventId,
        user_address: userAddress,
        token_address: tokenAddress,
        token_balance: parseFloat(tokenBalance),
        verification_status: verificationStatus
      })
  } catch (error) {
    console.error('Failed to log token verification:', error)
  }
}

/**
 * Check if user has been verified for a token-gated event
 */
export async function isUserVerifiedForEvent(
  eventId: string,
  userAddress: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('token_verifications')
      .select('verification_status')
      .eq('event_id', eventId)
      .eq('user_address', userAddress)
      .eq('verification_status', 'passed')
      .order('verified_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Failed to check verification status:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking verification status:', error)
    return false
  }
}
```

### **2. Update Event Interface**

Update `lib/events.ts` Event interface:

```typescript
export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  creator: string
  attendees: string[]
  maxAttendees?: number
  tags: string[]
  isRecurring: boolean
  recurringPattern?: 'daily' | 'weekly' | 'monthly'
  status: 'upcoming' | 'past' | 'cancelled'
  createdAt: string
  updatedAt: string
  imageUrl?: string
  isPaid?: boolean
  priceUSDC?: number
  // Token gating fields
  isTokenGated?: boolean
  requiredTokenAddress?: string
  requiredTokenBalance?: number
  requiredTokenSymbol?: string
  requiredTokenName?: string
  tokenGateType?: 'ERC20' | 'ERC721' | 'ERC1155'
  requiredNftCollection?: string
  requiredNftCount?: number
}
```

### **3. Token Gating Components**

Create `app/components/TokenGating.tsx`:

```typescript
"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button, Icon, Card } from './DemoComponents';
import { 
  verifyTokenRequirement, 
  getTokenInfo, 
  TokenRequirement, 
  TokenGateResult 
} from '@/lib/tokenGating';
import { Event } from '@/lib/events';

interface TokenGateStatusProps {
  event: Event;
  userAddress?: string;
  onVerificationComplete?: (passed: boolean) => void;
}

export function TokenGateStatus({ 
  event, 
  userAddress, 
  onVerificationComplete 
}: TokenGateStatusProps) {
  const [verification, setVerification] = useState<TokenGateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event.isTokenGated && userAddress && event.requiredTokenAddress) {
      verifyUserTokens();
    }
  }, [event, userAddress]);

  const verifyUserTokens = async () => {
    if (!userAddress || !event.requiredTokenAddress) return;

    setLoading(true);
    setError(null);

    try {
      const requirement: TokenRequirement = {
        type: event.tokenGateType || 'ERC20',
        contractAddress: event.requiredTokenAddress as `0x${string}`,
        requiredBalance: event.requiredTokenBalance?.toString() || '1',
        symbol: event.requiredTokenSymbol,
        name: event.requiredTokenName
      };

      const result = await verifyTokenRequirement(
        userAddress as `0x${string}`,
        requirement
      );

      setVerification(result);
      onVerificationComplete?.(result.passed);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      onVerificationComplete?.(false);
    } finally {
      setLoading(false);
    }
  };

  if (!event.isTokenGated) return null;

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name="star" size="sm" className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-purple-900 mb-1">Token Gated Event</h3>
          <p className="text-sm text-purple-700 mb-3">
            This event requires {event.requiredTokenBalance} {event.requiredTokenSymbol || 'tokens'} 
            {event.requiredTokenName && (
              <span className="block text-xs opacity-80">{event.requiredTokenName}</span>
            )}
          </p>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
              Verifying token balance...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
              <Icon name="alert" size="sm" />
              {error}
            </div>
          )}

          {verification && !loading && (
            <div className={`flex items-center gap-2 text-sm mb-2 ${
              verification.passed ? 'text-green-600' : 'text-red-600'
            }`}>
              <Icon 
                name={verification.passed ? "check" : "alert"} 
                size="sm" 
              />
              {verification.passed ? (
                <span>
                  ✅ Access granted! You have {verification.userBalance} {verification.tokenInfo.symbol}
                </span>
              ) : (
                <span>
                  ❌ Insufficient tokens. You have {verification.userBalance} {verification.tokenInfo.symbol}, 
                  need {verification.requiredBalance}
                </span>
              )}
            </div>
          )}

          {!userAddress && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <Icon name="alert" size="sm" />
              Connect your wallet to verify token requirements
            </div>
          )}

          {userAddress && !loading && !verification && (
            <Button
              size="sm"
              variant="outline"
              onClick={verifyUserTokens}
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              Verify Token Balance
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

interface TokenGateSetupProps {
  onTokenGateChange: (tokenGateData: {
    isTokenGated: boolean;
    requiredTokenAddress?: string;
    requiredTokenBalance?: number;
    requiredTokenSymbol?: string;
    requiredTokenName?: string;
    tokenGateType?: 'ERC20' | 'ERC721';
  }) => void;
  initialData?: {
    isTokenGated?: boolean;
    requiredTokenAddress?: string;
    requiredTokenBalance?: number;
    requiredTokenSymbol?: string;
    requiredTokenName?: string;
    tokenGateType?: 'ERC20' | 'ERC721';
  };
}

export function TokenGateSetup({ onTokenGateChange, initialData }: TokenGateSetupProps) {
  const [isTokenGated, setIsTokenGated] = useState(initialData?.isTokenGated || false);
  const [tokenType, setTokenType] = useState<'ERC20' | 'ERC721'>(
    initialData?.tokenGateType || 'ERC20'
  );
  const [tokenAddress, setTokenAddress] = useState(initialData?.requiredTokenAddress || '');
  const [requiredBalance, setRequiredBalance] = useState(
    initialData?.requiredTokenBalance?.toString() || '1'
  );
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    decimals?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onTokenGateChange({
      isTokenGated,
      requiredTokenAddress: isTokenGated ? tokenAddress : undefined,
      requiredTokenBalance: isTokenGated ? parseFloat(requiredBalance) : undefined,
      requiredTokenSymbol: tokenInfo?.symbol,
      requiredTokenName: tokenInfo?.name,
      tokenGateType: isTokenGated ? tokenType : undefined,
    });
  }, [isTokenGated, tokenAddress, requiredBalance, tokenType, tokenInfo]);

  const fetchTokenInfo = async () => {
    if (!tokenAddress || tokenAddress.length !== 42) return;

    setLoading(true);
    setError(null);

    try {
      const info = await getTokenInfo(tokenAddress as `0x${string}`, tokenType);
      setTokenInfo(info);
    } catch (err) {
      setError('Failed to fetch token information');
      setTokenInfo(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="tokenGated"
          checked={isTokenGated}
          onChange={(e) => setIsTokenGated(e.target.checked)}
          className="rounded border-gray-300"
        />
        <label htmlFor="tokenGated" className="text-sm font-medium">
          Make this a token-gated event
        </label>
      </div>

      {isTokenGated && (
        <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div>
            <label className="block text-sm font-medium mb-2">Token Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="ERC20"
                  checked={tokenType === 'ERC20'}
                  onChange={(e) => setTokenType(e.target.value as 'ERC20')}
                  className="mr-2"
                />
                ERC-20 (Fungible Tokens)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="ERC721"
                  checked={tokenType === 'ERC721'}
                  onChange={(e) => setTokenType(e.target.value as 'ERC721')}
                  className="mr-2"
                />
                ERC-721 (NFTs)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Token Contract Address
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="0x..."
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={fetchTokenInfo}
                disabled={loading || !tokenAddress}
              >
                {loading ? 'Loading...' : 'Verify'}
              </Button>
            </div>
            {error && (
              <p className="text-red-600 text-xs mt-1">{error}</p>
            )}
          </div>

          {tokenInfo && (
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-sm text-green-600 mb-1">✅ Token Found</h4>
              <p className="text-sm">
                <strong>{tokenInfo.name}</strong> ({tokenInfo.symbol})
              </p>
              {tokenInfo.decimals && (
                <p className="text-xs text-gray-600">Decimals: {tokenInfo.decimals}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Required {tokenType === 'ERC20' ? 'Token Balance' : 'NFT Count'}
            </label>
            <input
              type="number"
              step={tokenType === 'ERC20' ? '0.001' : '1'}
              min="0"
              placeholder={tokenType === 'ERC20' ? '1.0' : '1'}
              value={requiredBalance}
              onChange={(e) => setRequiredBalance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-600 mt-1">
              {tokenType === 'ERC20' 
                ? 'Minimum token balance required for access'
                : 'Minimum number of NFTs required for access'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### **4. Update Event Form Component**

Update the `EnhancedEventForm` in `app/components/EventComponents.tsx`:

```typescript
// Add these imports at the top
import { TokenGateSetup } from './TokenGating';

// Add these state variables in the component
const [tokenGateData, setTokenGateData] = useState({
  isTokenGated: initialEvent?.isTokenGated || false,
  requiredTokenAddress: initialEvent?.requiredTokenAddress,
  requiredTokenBalance: initialEvent?.requiredTokenBalance,
  requiredTokenSymbol: initialEvent?.requiredTokenSymbol,
  requiredTokenName: initialEvent?.requiredTokenName,
  tokenGateType: initialEvent?.tokenGateType || 'ERC20' as const,
});

// Update the handleSubmit function to include token gating data
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setErrors({});

  const validationErrors = validate();
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    setLoading(false);
    return;
  }

  try {
    const eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
      title: title.trim(),
      description: description.trim(),
      date,
      time,
      location: eventMode === 'online' ? `Online (${onlinePlatform.trim()})` : location.trim(),
      creator: address || "",
      attendees: initialEvent?.attendees || [],
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isRecurring,
      recurringPattern: isRecurring ? recurringPattern : undefined,
      status: initialEvent?.status || 'upcoming',
      imageUrl: imageUrl || undefined,
      isPaid,
      priceUSDC: isPaid ? parseFloat(priceUSDC) : undefined,
      // Add token gating data
      isTokenGated: tokenGateData.isTokenGated,
      requiredTokenAddress: tokenGateData.requiredTokenAddress,
      requiredTokenBalance: tokenGateData.requiredTokenBalance,
      requiredTokenSymbol: tokenGateData.requiredTokenSymbol,
      requiredTokenName: tokenGateData.requiredTokenName,
      tokenGateType: tokenGateData.tokenGateType,
    };

    await onSubmitAction(eventData);
  } catch (error) {
    console.error('Form submission error:', error);
    setErrors({ submit: 'Failed to save event. Please try again.' });
  } finally {
    setLoading(false);
  }
};

// Add this in the form JSX after the pricing section:
{/* Token Gating Section */}
<div className="space-y-2">
  <h3 className="text-lg font-semibold flex items-center gap-2">
    <Icon name="star" size="sm" />
    Token Gating
  </h3>
  <p className="text-sm text-gray-600">
    Restrict access to token or NFT holders
  </p>
  <TokenGateSetup
    onTokenGateChange={setTokenGateData}
    initialData={tokenGateData}
  />
</div>
```

### **5. Update Event Registration Flow**

Update the registration validation in `app/components/EventComponents.tsx`:

```typescript
// Add this to EventRegistrationForm component
import { TokenGateStatus, verifyTokenRequirement, logTokenVerification } from './TokenGating';

// Add state for token verification
const [tokenVerified, setTokenVerified] = useState(false);
const [tokenVerificationLoading, setTokenVerificationLoading] = useState(false);

// Add verification check before form submission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setErrors({});

  const validationErrors = validate();
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    setLoading(false);
    return;
  }

  // Check token requirements for token-gated events
  if (event.isTokenGated && !tokenVerified) {
    setErrors({ token: 'You must meet the token requirements to register for this event.' });
    setLoading(false);
    return;
  }

  try {
    if (event.isPaid && paymentConfirmed) {
      // Register with payment
      await onRegisterAction({ name, email, phone, bio });
    } else if (!event.isPaid) {
      // Register without payment
      await onRegisterAction({ name, email, phone, bio });
    } else {
      setErrors({ payment: 'Payment is required for this event.' });
    }
  } catch (error) {
    console.error("Registration failed:", error);
    setErrors({ submit: error instanceof Error ? error.message : 'Registration failed' });
  } finally {
    setLoading(false);
  }
};

// Add token verification handler
const handleTokenVerification = async (passed: boolean) => {
  setTokenVerified(passed);
  
  if (event.isTokenGated && event.requiredTokenAddress && address) {
    await logTokenVerification(
      event.id,
      address,
      event.requiredTokenAddress,
      '0', // This would be populated by the verification result
      passed ? 'passed' : 'failed'
    );
  }
};

// Add TokenGateStatus component to the form JSX
{event.isTokenGated && (
  <TokenGateStatus
    event={event}
    userAddress={address}
    onVerificationComplete={handleTokenVerification}
  />
)}
```

### **6. Update Event List Display**

Update the `EnhancedEventList` component to show token gating information:

```typescript
// Add token gating badge in the event card
{event.isTokenGated && (
  <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
    <Icon name="star" size="sm" />
    Token Gated
  </div>
)}
```

---

## 🔧 **Backend Integration**

### **1. Update Event Creation API**

Update `app/api/events/route.ts`:

```typescript
// Update the POST handler to include token gating fields
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, creator } = body;
    
    if (!event || !creator) {
      return NextResponse.json(
        { error: "Event data and creator are required" },
        { status: 400 }
      );
    }
    
    // Validate token gating parameters if enabled
    if (event.isTokenGated) {
      if (!event.requiredTokenAddress || !event.requiredTokenBalance) {
        return NextResponse.json(
          { error: "Token address and balance are required for token-gated events" },
          { status: 400 }
        );
      }
      
      // Basic address validation
      if (!/^0x[a-fA-F0-9]{40}$/.test(event.requiredTokenAddress)) {
        return NextResponse.json(
          { error: "Invalid token contract address" },
          { status: 400 }
        );
      }
    }
    
    const eventData = { ...event, creator };
    const newEvent = await createEvent(eventData);
    return NextResponse.json({ event: newEvent });
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
```

### **2. Create Token Verification API**

Create `app/api/events/[id]/verify-token/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenRequirement, logTokenVerification } from '@/lib/tokenGating';
import { supabase } from '@/lib/supabaseClient';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    if (!event.is_token_gated) {
      return NextResponse.json(
        { error: 'Event is not token-gated' },
        { status: 400 }
      );
    }

    // Verify token requirements
    const requirement = {
      type: event.token_gate_type || 'ERC20',
      contractAddress: event.required_token_address,
      requiredBalance: event.required_token_balance?.toString() || '1',
      symbol: event.required_token_symbol,
      name: event.required_token_name
    };

    const verificationResult = await verifyTokenRequirement(
      userAddress,
      requirement
    );

    // Log verification attempt
    await logTokenVerification(
      eventId,
      userAddress,
      event.required_token_address,
      verificationResult.userBalance,
      verificationResult.passed ? 'passed' : 'failed'
    );

    return NextResponse.json({
      verified: verificationResult.passed,
      userBalance: verificationResult.userBalance,
      requiredBalance: verificationResult.requiredBalance,
      tokenInfo: verificationResult.tokenInfo,
      error: verificationResult.error
    });

  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    );
  }
}
```

### **3. Update Event Database Functions**

Update `lib/events.ts` to handle token gating fields:

```typescript
// Update transformEventFromDB function
function transformEventFromDB(dbEvent: any): Event {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description,
    date: dbEvent.date,
    time: dbEvent.time,
    location: dbEvent.location,
    creator: dbEvent.creator,
    attendees: dbEvent.attendees || [],
    maxAttendees: dbEvent.max_attendees,
    tags: dbEvent.tags || [],
    isRecurring: dbEvent.is_recurring || false,
    recurringPattern: dbEvent.recurring_pattern,
    status: dbEvent.status || 'upcoming',
    createdAt: dbEvent.created_at,
    updatedAt: dbEvent.updated_at,
    imageUrl: dbEvent.image_url,
    isPaid: dbEvent.is_paid,
    priceUSDC: dbEvent.price_usdc,
    // Token gating fields
    isTokenGated: dbEvent.is_token_gated,
    requiredTokenAddress: dbEvent.required_token_address,
    requiredTokenBalance: dbEvent.required_token_balance,
    requiredTokenSymbol: dbEvent.required_token_symbol,
    requiredTokenName: dbEvent.required_token_name,
    tokenGateType: dbEvent.token_gate_type,
    requiredNftCollection: dbEvent.required_nft_collection,
    requiredNftCount: dbEvent.required_nft_count,
  }
}

// Update createEvent function to handle token gating
export async function createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
  console.log('Creating event with data:', eventData);
  
  const dbEventData: any = {
    title: eventData.title,
    description: eventData.description,
    date: eventData.date,
    time: eventData.time,
    location: eventData.location,
    creator: eventData.creator,
    attendees: eventData.attendees,
    max_attendees: eventData.maxAttendees,
    tags: eventData.tags,
    is_recurring: eventData.isRecurring,
    recurring_pattern: eventData.recurringPattern,
    status: eventData.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_paid: eventData.isPaid,
    price_usdc: eventData.priceUSDC,
    // Token gating fields
    is_token_gated: eventData.isTokenGated,
    required_token_address: eventData.requiredTokenAddress,
    required_token_balance: eventData.requiredTokenBalance,
    required_token_symbol: eventData.requiredTokenSymbol,
    required_token_name: eventData.requiredTokenName,
    token_gate_type: eventData.tokenGateType,
    required_nft_collection: eventData.requiredNftCollection,
    required_nft_count: eventData.requiredNftCount,
  }

  // Rest of the function remains the same...
}

// Update registerForEvent to check token requirements
export async function registerForEvent(
  eventId: string, 
  userAddress: string, 
  userDetails: {
    name: string
    email: string
    phone?: string
    bio?: string
  }
): Promise<EventRegistration> {
  console.log('🔄 Starting registration process:', { eventId, userAddress, userDetails });
  
  try {
    // Get event details to check if it's token-gated
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    // Check token requirements if event is token-gated
    if (event.is_token_gated) {
      const { data: verification, error: verificationError } = await supabase
        .from('token_verifications')
        .select('verification_status')
        .eq('event_id', eventId)
        .eq('user_address', userAddress)
        .eq('verification_status', 'passed')
        .order('verified_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (verificationError) {
        console.error('Failed to check token verification:', verificationError);
        throw new Error('Failed to verify token requirements');
      }

      if (!verification) {
        throw new Error('You must meet the token requirements to register for this event. Please verify your token balance first.');
      }
    }

    // Rest of the registration logic remains the same...
    // ... (existing registration code)
    
  } catch (error) {
    console.error('❌ Registration failed:', error);
    throw error;
  }
}
```

---

## 📱 **Popular Token Integration Examples**

### **1. Common Base Network Tokens**

```typescript
// Popular tokens for token gating on Base
export const POPULAR_TOKENS = {
  // Native tokens
  USDC: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    type: 'ERC20'
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    type: 'ERC20'
  },
  
  // Popular NFT collections
  BASEAPES: {
    address: '0x...',  // Add actual Base Apes contract address
    symbol: 'BAPES',
    name: 'Base Apes',
    type: 'ERC721'
  },
  
  // Add more as needed
};

// Token suggestions component
export function TokenSuggestions({ onSelectToken }: { 
  onSelectToken: (token: any) => void 
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Popular Tokens:</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(POPULAR_TOKENS).map(([key, token]) => (
          <button
            key={key}
            onClick={() => onSelectToken(token)}
            className="text-left p-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            <div className="font-medium">{token.symbol}</div>
            <div className="text-xs text-gray-600">{token.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### **2. Advanced Token Gating Features**

```typescript
// Multi-token requirements
interface MultiTokenRequirement {
  operator: 'AND' | 'OR';
  requirements: TokenRequirement[];
}

// Time-based token requirements
interface TimedTokenRequirement extends TokenRequirement {
  validFrom?: Date;
  validUntil?: Date;
}

// Staking requirements
interface StakingRequirement extends TokenRequirement {
  stakingContract: Address;
  minimumStakingPeriod: number; // in seconds
}
```

---

## 🧪 **Testing Strategy**

### **1. Unit Tests**

```typescript
// tests/tokenGating.test.ts
import { verifyTokenRequirement, getTokenInfo } from '@/lib/tokenGating';

describe('Token Gating', () => {
  test('should verify ERC20 token balance', async () => {
    const result = await verifyTokenRequirement(
      '0x...' as Address,
      {
        type: 'ERC20',
        contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
        requiredBalance: '100'
      }
    );
    
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('userBalance');
    expect(result).toHaveProperty('tokenInfo');
  });

  test('should handle invalid token address', async () => {
    const result = await verifyTokenRequirement(
      '0x...' as Address,
      {
        type: 'ERC20',
        contractAddress: '0xinvalid' as Address,
        requiredBalance: '100'
      }
    );
    
    expect(result.passed).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### **2. Integration Tests**

```typescript
// tests/eventRegistration.test.ts
import { registerForEvent } from '@/lib/events';

describe('Token Gated Event Registration', () => {
  test('should prevent registration without token verification', async () => {
    await expect(
      registerForEvent('token-gated-event-id', '0x...', {
        name: 'Test User',
        email: 'test@example.com'
      })
    ).rejects.toThrow('token requirements');
  });
});
```

---

## 🚀 **Deployment & Monitoring**

### **1. Environment Variables**

Add to `.env.local`:

```bash
# Token gating settings
NEXT_PUBLIC_ENABLE_TOKEN_GATING=true
NEXT_PUBLIC_DEFAULT_TOKEN_VERIFICATION_CACHE_TTL=300000  # 5 minutes

# Network settings (already exists)
NEXT_PUBLIC_CHAIN_ID=8453  # Base mainnet
```

### **2. Performance Monitoring**

```typescript
// lib/analytics.ts
export function trackTokenVerification(
  eventId: string,
  userAddress: string,
  tokenAddress: string,
  success: boolean,
  duration: number
) {
  // Add your analytics tracking here
  console.log('Token verification:', {
    eventId,
    userAddress,
    tokenAddress,
    success,
    duration
  });
}
```

### **3. Error Monitoring**

```typescript
// lib/errorTracking.ts
export function reportTokenVerificationError(
  error: Error,
  context: {
    eventId: string;
    userAddress: string;
    tokenAddress: string;
  }
) {
  // Add error reporting logic
  console.error('Token verification error:', error, context);
}
```

---

## 📝 **Usage Examples**

### **1. ERC-20 Token Gated Event**

```typescript
const tokenGatedEvent = {
  title: "Exclusive DeFi Workshop",
  description: "Workshop for token holders only",
  isTokenGated: true,
  requiredTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  requiredTokenBalance: 1000,
  tokenGateType: "ERC20",
  // ... other event fields
};
```

### **2. NFT Gated Event**

```typescript
const nftGatedEvent = {
  title: "Base Apes Holders Meetup",
  description: "Exclusive meetup for Base Apes NFT holders",
  isTokenGated: true,
  requiredTokenAddress: "0x...", // Base Apes contract
  requiredTokenBalance: 1,
  tokenGateType: "ERC721",
  // ... other event fields
};
```

---

## 🔍 **Security Considerations**

### **1. Smart Contract Security**
- Always verify contract addresses before integration
- Use reputable token contracts only
- Implement rate limiting for verification calls
- Cache verification results appropriately

### **2. Frontend Security**
- Validate all user inputs
- Use TypeScript for type safety
- Implement proper error boundaries
- Don't store sensitive data in localStorage

### **3. Backend Security**
- Validate token contracts server-side
- Implement proper rate limiting
- Log all verification attempts
- Use environment variables for configuration

---

## 📈 **Future Enhancements**

### **Phase 2 Features**
1. **Multi-token Requirements**: Support AND/OR logic for multiple tokens
2. **Dynamic Pricing**: Adjust event prices based on token holdings
3. **Tiered Access**: Different access levels based on token amounts
4. **Social Verification**: Community-based token verification
5. **Integration with DeFi**: Staking and liquidity requirements

### **Phase 3 Features**
1. **Custom Token Standards**: Support for ERC-1155 and custom tokens
2. **Cross-chain Support**: Multi-chain token verification
3. **Governance Integration**: DAO-based event approval
4. **Advanced Analytics**: Token holder behavior analysis

---

## ✅ **Implementation Checklist**

- [ ] Update database schema with token gating fields
- [ ] Create token verification utility functions
- [ ] Build token gating UI components
- [ ] Update event creation form
- [ ] Modify event registration flow
- [ ] Create token verification API endpoints
- [ ] Update event list display
- [ ] Add popular token suggestions
- [ ] Implement error handling and logging
- [ ] Write tests for token gating functionality
- [ ] Add monitoring and analytics
- [ ] Deploy and test on testnet
- [ ] Deploy to production

---

This comprehensive guide provides everything you need to implement token gating in your BasedEvents application. Start with Phase 1 for basic functionality, then expand with advanced features as needed. The modular approach allows you to implement features incrementally while maintaining a stable application.

<function_calls>
<invoke name="todo_write">
<parameter name="merge">true
