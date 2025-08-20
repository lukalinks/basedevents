import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { supabase } from './supabaseClient';
import type { TokenRequirement, TokenGateResult, TokenVerification } from './events';

// Re-export types for consumers of this module
export type { TokenRequirement, TokenGateResult, TokenVerification } from './events';

// Base network configuration
export const BASE_CHAIN_ID = base.id;

// Create public client for Base network with better error handling
export const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org'),
});

// Standard ERC-20 ABI functions we need
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// Standard ERC-721 ABI functions we need
export const ERC721_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

// Standard ERC-1155 ABI functions we need
export const ERC1155_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Popular token addresses on Base network
 */
export const POPULAR_TOKENS = {
  USDC: {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    type: 'ERC20' as const,
  },
  WETH: {
    address: '0x4200000000000000000000000000000000000006',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    type: 'ERC20' as const,
  },
  DAI: {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    type: 'ERC20' as const,
  },
} as const;

/**
 * Validate if an address is a valid Ethereum address
 */
export function isValidTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a contract exists at the given address
 */
export async function contractExists(address: `0x${string}`): Promise<boolean> {
  try {
    const code = await publicClient.getBytecode({ address });
    return code !== undefined && code !== '0x';
  } catch (error) {
    console.error('Error checking contract existence:', error);
    return false;
  }
}

/**
 * Get token information from the blockchain with better error handling
 */
export async function getTokenInfo(tokenAddress: `0x${string}`, tokenType: 'ERC20' | 'ERC721' | 'ERC1155' = 'ERC20') {
  try {
    // First check if contract exists
    const exists = await contractExists(tokenAddress);
    if (!exists) {
      throw new Error(`No contract found at address ${tokenAddress}`);
    }

    if (tokenType === 'ERC20') {
      try {
        const [name, symbol, decimals] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'name',
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'symbol',
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'decimals',
          }),
        ]);

        return {
          name: name as string,
          symbol: symbol as string,
          decimals: decimals as number,
          type: 'ERC20' as const,
        };
      } catch (error) {
        // If ERC20 calls fail, try ERC721
        console.warn(`ERC20 calls failed for ${tokenAddress}, trying ERC721...`);
        return await getTokenInfo(tokenAddress, 'ERC721');
      }
    } else if (tokenType === 'ERC721') {
      try {
        const [name, symbol] = await Promise.all([
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC721_ABI,
            functionName: 'name',
          }),
          publicClient.readContract({
            address: tokenAddress,
            abi: ERC721_ABI,
            functionName: 'symbol',
          }),
        ]);

        return {
          name: name as string,
          symbol: symbol as string,
          decimals: 0, // NFTs don't have decimals
          type: 'ERC721' as const,
        };
      } catch (error) {
        throw new Error(`Contract at ${tokenAddress} is not a valid ERC721 token`);
      }
    }

    throw new Error(`Unsupported token type: ${tokenType}`);
  } catch (error) {
    console.error('Error fetching token info:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('No contract found')) {
        throw new Error(`No contract found at address ${tokenAddress}. Please verify the token address is correct.`);
      }
      if (error.message.includes('execution reverted')) {
        throw new Error(`Contract at ${tokenAddress} is not a valid token contract.`);
      }
      if (error.message.includes('network')) {
        throw new Error(`Network error while fetching token information for ${tokenAddress}. Please try again.`);
      }
    }
    
    throw new Error(`Failed to fetch token information for ${tokenAddress}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check ERC-20 token balance with improved error handling
 */
export async function checkERC20Balance(
  userAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
  requiredBalance: string
): Promise<TokenGateResult> {
  try {
    // Validate addresses
    if (!isValidTokenAddress(userAddress)) {
      throw new Error('Invalid user address format');
    }
    if (!isValidTokenAddress(tokenAddress)) {
      throw new Error('Invalid token address format');
    }

    // Check if contract exists
    const exists = await contractExists(tokenAddress);
    if (!exists) {
      return {
        passed: false,
        userBalance: '0',
        requiredBalance,
        tokenInfo: {
          name: 'Unknown Token',
          symbol: 'UNKNOWN',
          decimals: 18,
          type: 'ERC20'
        },
        error: `No contract found at address ${tokenAddress}`
      };
    }

    // Get token info and balance
    const [tokenInfo, balance] = await Promise.all([
      getTokenInfo(tokenAddress, 'ERC20'),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      }),
    ]);

    // Convert balance from wei to human-readable format
    const balanceInTokens = Number(balance) / Math.pow(10, tokenInfo.decimals);
    const requiredInTokens = parseFloat(requiredBalance);

    return {
      passed: balanceInTokens >= requiredInTokens,
      userBalance: balanceInTokens.toString(),
      requiredBalance: requiredInTokens.toString(),
      tokenInfo,
    };
  } catch (error) {
    console.error('Error checking ERC20 balance:', error);
    
    // Return a graceful error result instead of throwing
    return {
      passed: false,
      userBalance: '0',
      requiredBalance,
      tokenInfo: {
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
        type: 'ERC20'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check ERC-721 NFT balance with improved error handling
 */
export async function checkERC721Balance(
  userAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
  requiredBalance: string = '1'
): Promise<TokenGateResult> {
  try {
    // Validate addresses
    if (!isValidTokenAddress(userAddress)) {
      throw new Error('Invalid user address format');
    }
    if (!isValidTokenAddress(tokenAddress)) {
      throw new Error('Invalid token address format');
    }

    // Check if contract exists
    const exists = await contractExists(tokenAddress);
    if (!exists) {
      return {
        passed: false,
        userBalance: '0',
        requiredBalance,
        tokenInfo: {
          name: 'Unknown NFT',
          symbol: 'UNKNOWN',
          decimals: 0,
          type: 'ERC721'
        },
        error: `No contract found at address ${tokenAddress}`
      };
    }

    // Get token info and balance
    const [tokenInfo, balance] = await Promise.all([
      getTokenInfo(tokenAddress, 'ERC721'),
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC721_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      }),
    ]);

    const userBalanceNumber = Number(balance);
    const requiredBalanceNumber = parseInt(requiredBalance);

    return {
      passed: userBalanceNumber >= requiredBalanceNumber,
      userBalance: userBalanceNumber.toString(),
      requiredBalance: requiredBalanceNumber.toString(),
      tokenInfo,
    };
  } catch (error) {
    console.error('Error checking ERC721 balance:', error);
    
    // Return a graceful error result instead of throwing
    return {
      passed: false,
      userBalance: '0',
      requiredBalance,
      tokenInfo: {
        name: 'Unknown NFT',
        symbol: 'UNKNOWN',
        decimals: 0,
        type: 'ERC721'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check ERC-1155 token balance with improved error handling
 */
export async function checkERC1155Balance(
  userAddress: `0x${string}`,
  tokenAddress: `0x${string}`,
  tokenId: string,
  requiredBalance: string = '1'
): Promise<TokenGateResult> {
  try {
    // Validate addresses
    if (!isValidTokenAddress(userAddress)) {
      throw new Error('Invalid user address format');
    }
    if (!isValidTokenAddress(tokenAddress)) {
      throw new Error('Invalid token address format');
    }

    // Check if contract exists
    const exists = await contractExists(tokenAddress);
    if (!exists) {
      return {
        passed: false,
        userBalance: '0',
        requiredBalance,
        tokenInfo: {
          name: 'Unknown ERC1155',
          symbol: 'UNKNOWN',
          decimals: 0,
          type: 'ERC1155'
        },
        error: `No contract found at address ${tokenAddress}`
      };
    }

    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC1155_ABI,
      functionName: 'balanceOf',
      args: [userAddress, BigInt(tokenId)],
    });

    const userBalanceNumber = Number(balance);
    const requiredBalanceNumber = parseInt(requiredBalance);

    return {
      passed: userBalanceNumber >= requiredBalanceNumber,
      userBalance: userBalanceNumber.toString(),
      requiredBalance: requiredBalanceNumber.toString(),
      tokenInfo: {
        name: 'ERC1155 Token',
        symbol: 'ERC1155',
        decimals: 0,
        type: 'ERC1155'
      },
    };
  } catch (error) {
    console.error('Error checking ERC1155 balance:', error);
    
    // Return a graceful error result instead of throwing
    return {
      passed: false,
      userBalance: '0',
      requiredBalance,
      tokenInfo: {
        name: 'Unknown ERC1155',
        symbol: 'UNKNOWN',
        decimals: 0,
        type: 'ERC1155'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Main function to verify token requirements with improved error handling
 */
export async function verifyTokenRequirement(
  userAddress: `0x${string}`,
  requirement: TokenRequirement
): Promise<TokenGateResult> {
  try {
    // Validate user address
    if (!isValidTokenAddress(userAddress)) {
      throw new Error('Invalid user address format');
    }

    // Validate token address
    if (!isValidTokenAddress(requirement.contractAddress)) {
      throw new Error('Invalid token address format');
    }

    switch (requirement.type) {
      case 'ERC20':
        return await checkERC20Balance(
          userAddress,
          requirement.contractAddress,
          requirement.requiredBalance
        );

      case 'ERC721':
        return await checkERC721Balance(
          userAddress,
          requirement.contractAddress,
          requirement.requiredBalance
        );

      case 'ERC1155':
        if (!requirement.tokenId) {
          throw new Error('Token ID is required for ERC1155 tokens');
        }
        return await checkERC1155Balance(
          userAddress,
          requirement.contractAddress,
          requirement.tokenId,
          requirement.requiredBalance
        );

      default:
        throw new Error(`Unsupported token type: ${requirement.type}`);
    }
  } catch (error) {
    console.error('Error verifying token requirement:', error);
    
    // Return a graceful error result
    return {
      passed: false,
      userBalance: '0',
      requiredBalance: requirement.requiredBalance,
      tokenInfo: {
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
        type: 'ERC20'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Log token verification attempt to database
 */
export async function logTokenVerification(
  eventId: string,
  userAddress: string,
  tokenAddress: string,
  tokenBalance: number,
  verificationStatus: 'passed' | 'failed' | 'pending'
): Promise<TokenVerification> {
  try {
    const { data, error } = await supabase
      .from('token_verifications')
      .insert([
        {
          event_id: eventId,
          user_address: userAddress,
          token_address: tokenAddress,
          token_balance: tokenBalance,
          verification_status: verificationStatus,
          verified_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error logging token verification:', error);
      throw error;
    }

    return transformTokenVerificationFromDB(data);
  } catch (error) {
    console.error('Failed to log token verification:', error);
    throw error;
  }
}

/**
 * Get token verification history for a user and event
 */
export async function getTokenVerificationHistory(
  eventId: string,
  userAddress: string
): Promise<TokenVerification[]> {
  try {
    const { data, error } = await supabase
      .from('token_verifications')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_address', userAddress)
      .order('verified_at', { ascending: false });

    if (error) {
      console.error('Error fetching token verification history:', error);
      throw error;
    }

    return data.map(transformTokenVerificationFromDB);
  } catch (error) {
    console.error('Failed to fetch token verification history:', error);
    throw error;
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
      .maybeSingle();

    if (error) {
      console.error('Failed to check verification status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking verification status:', error);
    return false;
  }
}

/**
 * Transform token verification from database format
 */
function transformTokenVerificationFromDB(data: any): TokenVerification {
  return {
    id: data.id,
    eventId: data.event_id,
    userAddress: data.user_address,
    tokenAddress: data.token_address,
    tokenBalance: data.token_balance,
    verificationStatus: data.verification_status,
    verifiedAt: data.verified_at,
  };
}

/**
 * Get popular token suggestions for Base network
 */
export function getPopularTokenSuggestions() {
  return Object.values(POPULAR_TOKENS);
}

/**
 * Find token by symbol from popular tokens
 */
export function findTokenBySymbol(symbol: string) {
  return Object.values(POPULAR_TOKENS).find(
    token => token.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

/**
 * Format token balance for display
 */
export function formatTokenBalance(balance: string): string {
  const num = parseFloat(balance);
  if (isNaN(num)) return '0';
  
  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
}

/**
 * Generate human-readable token requirement description
 */
export function generateTokenRequirementDescription(requirement: TokenRequirement): string {
  const { type, requiredBalance, symbol, name } = requirement;
  
  if (type === 'ERC20') {
    return `Hold at least ${formatTokenBalance(requiredBalance)} ${symbol || 'tokens'} (${name || 'Unknown Token'})`;
  } else if (type === 'ERC721') {
    const count = parseInt(requiredBalance);
    const plural = count === 1 ? 'NFT' : 'NFTs';
    return `Own at least ${count} ${plural} from ${name || 'Unknown Collection'}`;
  } else if (type === 'ERC1155') {
    const count = parseInt(requiredBalance);
    const plural = count === 1 ? 'token' : 'tokens';
    return `Hold at least ${count} ${plural} (${name || 'Unknown Token'})`;
  }
  
  return `Meet token requirements`;
}
