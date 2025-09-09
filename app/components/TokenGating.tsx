"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button, Icon } from './DemoComponents';
import { 
  verifyTokenRequirement, 
  getPopularTokenSuggestions, 
  isValidTokenAddress,
  formatTokenBalance,
  generateTokenRequirementDescription,
  logTokenVerification,
  isUserVerifiedForEvent,
  type TokenRequirement, 
  type TokenGateResult 
} from '@/lib/tokenGating';
import type { Event } from '@/lib/events';
import { useOpenUrl } from "@coinbase/onchainkit/minikit";

interface TokenGateSetupProps {
  onTokenGateChange: (tokenGate: {
    isTokenGated: boolean;
    requiredTokenAddress?: string;
    requiredTokenBalance?: number;
    requiredTokenSymbol?: string;
    requiredTokenName?: string;
    tokenGateType?: 'ERC20' | 'ERC721' | 'ERC1155';
    requiredNftCollection?: string;
    requiredNftCount?: number;
  }) => void;
  initialValues?: {
    isTokenGated?: boolean;
    requiredTokenAddress?: string;
    requiredTokenBalance?: number;
    requiredTokenSymbol?: string;
    requiredTokenName?: string;
    tokenGateType?: 'ERC20' | 'ERC721' | 'ERC1155';
    requiredNftCollection?: string;
    requiredNftCount?: number;
  };
}

export function TokenGateSetup({ onTokenGateChange, initialValues }: TokenGateSetupProps) {
  const [isTokenGated, setIsTokenGated] = useState(initialValues?.isTokenGated || false);
  const [tokenType, setTokenType] = useState<'ERC20' | 'ERC721' | 'ERC1155'>(initialValues?.tokenGateType || 'ERC20');
  const [tokenAddress, setTokenAddress] = useState(initialValues?.requiredTokenAddress || '');
  const [requiredBalance, setRequiredBalance] = useState(initialValues?.requiredTokenBalance?.toString() || '');
  const [tokenSymbol, setTokenSymbol] = useState(initialValues?.requiredTokenSymbol || '');
  const [tokenName, setTokenName] = useState(initialValues?.requiredTokenName || '');
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [showPopularTokens, setShowPopularTokens] = useState(false);

  const popularTokens = getPopularTokenSuggestions();

  useEffect(() => {
    if (tokenAddress) {
      setIsValidAddress(isValidTokenAddress(tokenAddress));
    } else {
      setIsValidAddress(true);
    }
  }, [tokenAddress]);

  useEffect(() => {
    onTokenGateChange({
      isTokenGated,
      requiredTokenAddress: isTokenGated ? tokenAddress : undefined,
      requiredTokenBalance: isTokenGated && requiredBalance ? parseFloat(requiredBalance) : undefined,
      requiredTokenSymbol: isTokenGated ? tokenSymbol : undefined,
      requiredTokenName: isTokenGated ? tokenName : undefined,
      tokenGateType: isTokenGated ? tokenType : undefined,
    });
  }, [isTokenGated, tokenType, tokenAddress, requiredBalance, tokenSymbol, tokenName]);

  const handlePopularTokenSelect = (token: typeof popularTokens[0]) => {
    setTokenAddress(token.address);
    setTokenSymbol(token.symbol);
    setTokenName(token.name);
    setTokenType(token.type);
    setShowPopularTokens(false);
  };

  return (
    <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] overflow-hidden transition-all duration-300 ease-in-out" style={{
      background: isTokenGated ? 'var(--app-token-gate-bg)' : 'var(--app-card-bg)',
      borderColor: isTokenGated ? 'var(--app-token-gate-light)' : 'var(--app-card-border)',
      minHeight: isTokenGated ? 'auto' : '80px'
    }}>
      {!isTokenGated ? (
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--app-accent)]/10 rounded-xl flex items-center justify-center">
                <Icon name="star" size="sm" className="text-[var(--app-accent)]" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--app-foreground)] mb-1">Token Gating</h3>
                <p className="text-xs sm:text-sm text-[var(--app-foreground-muted)]">Restrict event access to token holders</p>
              </div>
            </div>
            <button
              onClick={() => setIsTokenGated(true)}
              className="px-4 py-2 sm:py-3 rounded-xl font-bold text-white transition-all duration-200 shadow-lg hover:scale-105 hover:shadow-xl active:scale-95 w-full sm:w-auto"
              style={{background: 'var(--app-token-gate)'}}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon name="plus" size="sm" />
                <span>Enable</span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 token-gate-gradient rounded-xl flex items-center justify-center shadow-lg">
                <Icon name="star" size="sm" className="text-white drop-shadow-sm" />
              </div>
              <div>
                <h3 className="font-bold text-lg sm:text-xl mb-1" style={{color: 'var(--app-token-gate)'}}>Token Gating Enabled</h3>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Only token holders can register for this event</p>
              </div>
            </div>
            <button
              onClick={() => setIsTokenGated(false)}
              className="px-4 py-2 rounded-xl font-bold text-gray-600 bg-white/60 backdrop-blur-sm border border-white/30 transition-all duration-200 hover:bg-white/80 hover:scale-105 active:scale-95 w-full sm:w-auto"
            >
              Disable
            </button>
          </div>

          {/* Token Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2 sm:mb-3">
              Token Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {(['ERC20', 'ERC721', 'ERC1155'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTokenType(type)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    tokenType === type
                      ? 'border-[var(--app-accent)] bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                      : 'border-[var(--app-card-border)] bg-[var(--app-card-bg)] text-[var(--app-foreground)] hover:border-[var(--app-accent)]/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--app-foreground-muted)] mt-2">
              {tokenType === 'ERC20' && 'Fungible tokens (USDC, WETH, etc.)'}
              {tokenType === 'ERC721' && 'NFT collections (unique tokens)'}
              {tokenType === 'ERC1155' && 'Multi-token standard'}
            </p>
          </div>

          {/* Popular Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <label className="text-sm font-semibold text-[var(--app-foreground)]">
                Popular Tokens
              </label>
              <button
                type="button"
                onClick={() => setShowPopularTokens(!showPopularTokens)}
                className="text-xs text-[var(--app-accent)] hover:text-[var(--app-accent)]/80 transition-colors"
              >
                {showPopularTokens ? 'Hide' : 'Show'}
              </button>
            </div>
            {showPopularTokens && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
                {popularTokens
                  .filter(token => token.type === tokenType)
                  .map((token) => (
                    <button
                      key={token.address}
                      type="button"
                      onClick={() => handlePopularTokenSelect(token)}
                      className="p-3 rounded-lg border border-[var(--app-card-border)] bg-[var(--app-card-bg)] hover:bg-[var(--app-accent)]/5 hover:border-[var(--app-accent)]/30 text-left transition-all"
                    >
                      <div className="font-medium text-[var(--app-foreground)] text-sm">{token.symbol}</div>
                      <div className="text-xs text-[var(--app-foreground-muted)]">{token.name}</div>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Token Address */}
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2 sm:mb-3">
              Token Contract Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg bg-[var(--app-card-bg)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] transition-all font-mono text-xs sm:text-sm ${
                !isValidAddress ? 'border-red-300 bg-red-50' : 'border-[var(--app-card-border)]'
              }`}
            />
            {!isValidAddress && (
              <p className="text-xs text-red-600 mt-1">Please enter a valid contract address</p>
            )}
          </div>

          {/* Token Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
                Token Symbol
              </label>
              <input
                type="text"
                placeholder="USDC"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] transition-all text-xs sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
                Token Name
              </label>
              <input
                type="text"
                placeholder="USD Coin"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] transition-all text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Required Balance */}
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2 sm:mb-3">
              Required {tokenType === 'ERC20' ? 'Balance' : 'Count'}
            </label>
            <input
              type="number"
              placeholder={tokenType === 'ERC20' ? '1000' : '1'}
              value={requiredBalance}
              onChange={(e) => setRequiredBalance(e.target.value)}
              min="0"
              step={tokenType === 'ERC20' ? '0.01' : '1'}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] transition-all text-xs sm:text-sm"
            />
            <p className="text-xs text-[var(--app-foreground-muted)] mt-1 sm:mt-2">
              {tokenType === 'ERC20' && 'Minimum token balance required'}
              {tokenType === 'ERC721' && 'Minimum number of NFTs required'}
              {tokenType === 'ERC1155' && 'Minimum number of tokens required'}
            </p>
          </div>

          {/* Preview */}
          {tokenAddress && requiredBalance && isValidAddress && (
            <div className="bg-[var(--app-accent)]/5 rounded-lg p-3 sm:p-4 border border-[var(--app-accent)]/20">
              <h4 className="font-medium text-[var(--app-foreground)] mb-2 sm:mb-3">Preview</h4>
              <div className="flex items-center gap-2">
                <Icon name="star" size="sm" className="text-[var(--app-accent)]" />
                <span className="text-xs sm:text-sm text-[var(--app-foreground)]">
                  {generateTokenRequirementDescription({
                    type: tokenType,
                    contractAddress: tokenAddress as `0x${string}`,
                    requiredBalance,
                    symbol: tokenSymbol,
                    name: tokenName,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [hasVerified, setHasVerified] = useState(false);
  const openUrl = useOpenUrl();

  useEffect(() => {
    if (event.isTokenGated && userAddress && event.requiredTokenAddress) {
      checkPreviousVerification();
    }
  }, [event, userAddress]);

  const checkPreviousVerification = async () => {
    if (!userAddress || !event.id) return;

    try {
      const verified = await isUserVerifiedForEvent(event.id, userAddress);
      setHasVerified(verified);
      if (verified) {
        onVerificationComplete?.(true);
      }
    } catch (error) {
      console.error('Error checking previous verification:', error);
    }
  };

  const verifyUserTokens = async () => {
    if (!userAddress || !event.requiredTokenAddress) return;

    setLoading(true);
    setError(null);
    setVerification(null); // Clear previous verification

    try {
      const requirement: TokenRequirement = {
        type: event.tokenGateType || 'ERC20',
        contractAddress: event.requiredTokenAddress as `0x${string}`,
        requiredBalance: event.requiredTokenBalance?.toString() || '1',
        symbol: event.requiredTokenSymbol,
        name: event.requiredTokenName
      };

      const result = await verifyTokenRequirement(userAddress as `0x${string}`, requirement);
      setVerification(result);
      
      // Handle error from result
      if (result.error) {
        setError(result.error);
        onVerificationComplete?.(false);
      } else {
        // Log verification attempt only if no error
        try {
          await logTokenVerification(
            event.id,
            userAddress,
            event.requiredTokenAddress,
            parseFloat(result.userBalance),
            result.passed ? 'passed' : 'failed'
          );
        } catch (logError) {
          console.warn('Failed to log verification:', logError);
          // Don't fail the verification if logging fails
        }

        setHasVerified(result.passed);
        onVerificationComplete?.(result.passed);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      onVerificationComplete?.(false);
    } finally {
      setLoading(false);
    }
  };

  if (!event.isTokenGated) return null;

  if (!userAddress) {
    return (
      <div className="bg-[var(--app-card-bg)] rounded-xl p-4 sm:p-6 border border-[var(--app-card-border)]" style={{
        background: 'var(--app-token-gate-bg)', 
        borderColor: 'var(--app-token-gate-light)'
      }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 token-gate-gradient rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="star" size="sm" className="text-white drop-shadow-sm" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base sm:text-lg mb-1" style={{color: 'var(--app-token-gate)'}}>Token Gated Event</h3>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Connect your wallet to check token eligibility</p>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-card-bg)] rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6 border border-[var(--app-card-border)]" style={{
      background: 'var(--app-token-gate-bg)', 
      borderColor: 'var(--app-token-gate-light)'
    }}>
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 token-gate-gradient rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
          <Icon name="star" size="sm" className="text-white drop-shadow-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-3" style={{color: 'var(--app-token-gate)'}}>Token Gated Event</h3>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-4 sm:py-3 border border-white/30">
            <p className="text-xs sm:text-sm font-medium text-gray-800">
              {generateTokenRequirementDescription({
                type: event.tokenGateType || 'ERC20',
                contractAddress: event.requiredTokenAddress as `0x${string}`,
                requiredBalance: event.requiredTokenBalance?.toString() || '1',
                symbol: event.requiredTokenSymbol,
                name: event.requiredTokenName,
              })}
            </p>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-2 sm:mt-3">
            <div className={`w-2 h-2 rounded-full ${
              loading ? 'bg-yellow-500 animate-pulse' :
              error ? 'bg-red-500' :
              hasVerified ? 'bg-green-500' :
              verification ? (verification.passed ? 'bg-green-500' : 'bg-red-500') :
              'bg-gray-400'
            }`}></div>
            <span className="text-xs text-gray-600">
              {loading ? 'Verifying...' :
               error ? 'Error occurred' :
               hasVerified ? 'Previously verified' :
               verification ? (verification.passed ? 'Requirements met' : 'Requirements not met') :
               'Ready to verify'}
            </span>
          </div>
        </div>
      </div>

      {hasVerified && !verification && (
        <div className="flex items-center gap-3 rounded-lg p-3 sm:p-4 border border-green-200" style={{
          background: 'var(--app-success-bg)', 
          color: 'var(--app-success)'
        }}>
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
            <Icon name="heart" size="sm" className="text-white" />
          </div>
          <span className="font-bold text-sm sm:text-base">Previously verified ✓</span>
        </div>
      )}

      {verification && (
        <div className={`flex items-start gap-3 rounded-lg p-3 sm:p-4 border ${
          verification.passed 
            ? 'border-green-200' 
            : 'border-red-200'
        }`} style={{
          background: verification.passed ? 'var(--app-success-bg)' : 'var(--app-error-bg)',
          color: verification.passed ? 'var(--app-success)' : 'var(--app-error)'
        }}>
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            verification.passed ? 'bg-green-500' : 'bg-red-500'
          }`}>
            <Icon name={verification.passed ? "heart" : "users"} size="sm" className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm sm:text-lg mb-1">
              {verification.passed ? '✅ Token Requirements Met!' : '❌ Insufficient Tokens'}
            </div>
            <div className="text-xs sm:text-sm font-medium opacity-90">
              Balance: {formatTokenBalance(verification.userBalance)} {verification.tokenInfo?.symbol}
              {!verification.passed && ` (need ${formatTokenBalance(verification.requiredBalance)})`}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-lg p-3 sm:p-4 border border-red-200" style={{
          background: 'var(--app-error-bg)', 
          color: 'var(--app-error)'
        }}>
          <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon name="alert-triangle" size="sm" className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm sm:text-lg mb-1">Verification Error</div>
            <div className="text-xs sm:text-sm opacity-90 mb-3">{error}</div>
             
            {/* Error-specific help text */}
            {error.includes('No contract found') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                <div className="text-xs font-medium text-red-800 mb-1">💡 How to fix:</div>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• Verify the token contract address is correct</li>
                  <li>• Ensure the token exists on Base network</li>
                  <li>• Check if the address is copied correctly</li>
                </ul>
              </div>
            )}
            
            {error.includes('Network error') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                <div className="text-xs font-medium text-red-800 mb-1">💡 How to fix:</div>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• Check your internet connection</li>
                  <li>• Try again in a few moments</li>
                  <li>• Ensure you're connected to Base network</li>
                </ul>
              </div>
            )}
            
            {error.includes('Invalid address format') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                <div className="text-xs font-medium text-red-800 mb-1">💡 How to fix:</div>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• Use a valid Ethereum address format (0x...)</li>
                  <li>• Ensure the address is 42 characters long</li>
                  <li>• Check for typos in the address</li>
                </ul>
              </div>
            )}
            
            {error.includes('not a valid token contract') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                <div className="text-xs font-medium text-red-800 mb-1">💡 How to fix:</div>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• Verify this is a token contract address</li>
                  <li>• Check if the contract supports ERC20/ERC721 standards</li>
                  <li>• Try using a different token address</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={verifyUserTokens}
          disabled={loading || hasVerified}
          className={`flex-1 px-4 py-3 rounded-xl font-bold text-white transition-all duration-200 shadow-lg ${
            loading || hasVerified 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:scale-105 hover:shadow-xl active:scale-95'
          }`}
          style={{
            background: hasVerified 
              ? 'var(--app-success)' 
              : error 
                ? 'var(--app-error)'
                : 'var(--app-token-gate)'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm sm:text-base">Verifying Tokens...</span>
            </div>
          ) : hasVerified ? (
            <div className="flex items-center justify-center gap-2">
              <Icon name="heart" size="sm" />
              <span className="text-sm sm:text-base">Verified ✓</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-2">
              <Icon name="refresh" size="sm" />
              <span className="text-sm sm:text-base">Retry Verification</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Icon name="star" size="sm" />
              <span className="text-sm sm:text-base">Check Token Eligibility</span>
            </div>
          )}
        </button>

        {(verification || error) && event.requiredTokenAddress && (
          <button
            onClick={() => openUrl(`https://basescan.org/token/${event.requiredTokenAddress}`)}
            className="px-4 py-3 rounded-xl font-bold text-white transition-all duration-200 shadow-lg hover:scale-105 hover:shadow-xl active:scale-95 w-full sm:w-auto"
            style={{background: 'var(--app-base)'}}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm sm:text-base">BaseScan</span>
              <span>↗</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

interface TokenGateBadgeProps {
  event: Event;
  size?: 'sm' | 'md' | 'lg';
}

export function TokenGateBadge({ event, size = 'md' }: TokenGateBadgeProps) {
  if (!event.isTokenGated) return null;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'sm' as const,
    md: 'sm' as const,
    lg: 'md' as const,
  };

  return (
    <div className={`inline-flex items-center gap-1.5 token-gate-gradient text-white rounded-full font-semibold ${sizeClasses[size]} shadow-lg backdrop-blur-sm border border-white/20`}>
      <Icon name="star" size={iconSizes[size]} className="drop-shadow-sm" />
      <span className="drop-shadow-sm">Token Gated</span>
    </div>
  );
}

interface TokenRequirementDisplayProps {
  event: Event;
  showDetails?: boolean;
}

export function TokenRequirementDisplay({ event, showDetails = false }: TokenRequirementDisplayProps) {
  if (!event.isTokenGated) return null;

  const requirement = generateTokenRequirementDescription({
    type: event.tokenGateType || 'ERC20',
    contractAddress: event.requiredTokenAddress as `0x${string}`,
    requiredBalance: event.requiredTokenBalance?.toString() || '1',
    symbol: event.requiredTokenSymbol,
    name: event.requiredTokenName,
  });

  if (!showDetails) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{color: 'var(--app-token-gate)'}}>
        <Icon name="star" size="sm" />
        <span className="font-medium">{requirement}</span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--app-card-bg)] rounded-xl p-3 sm:p-4 border border-[var(--app-card-border)]" style={{
      background: 'var(--app-token-gate-bg)', 
      borderColor: 'var(--app-token-gate-light)'
    }}>
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg token-gate-gradient flex items-center justify-center">
          <Icon name="star" size="sm" className="text-white drop-shadow-sm" />
        </div>
        <span className="font-bold text-sm sm:text-lg" style={{color: 'var(--app-token-gate)'}}>Token Requirement</span>
      </div>
      
      <div className="bg-white/50 backdrop-blur-sm rounded-lg p-2 sm:p-3 mb-3 sm:mb-4 border border-white/20">
        <p className="text-xs sm:text-sm font-medium text-gray-800">{requirement}</p>
      </div>
      
      {event.requiredTokenAddress && (
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium">Contract Address:</span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <code className="text-xs font-mono bg-gray-100 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border font-medium text-gray-700 flex-1 min-w-0 break-all">
              {event.requiredTokenAddress.slice(0, 20)}...{event.requiredTokenAddress.slice(-20)}
            </code>
            <button
              onClick={() => openUrl(`https://basescan.org/token/${event.requiredTokenAddress}`)}
              className="text-xs font-medium px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 hover:scale-105 text-white shadow-md w-full sm:w-auto"
              style={{background: 'var(--app-base)'}}
            >
              View on BaseScan ↗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
