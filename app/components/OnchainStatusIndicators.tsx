"use client";

import { Icon } from './DemoComponents';
import type { Event, EventRegistration } from '@/lib/events';
import { useOpenUrl } from "@coinbase/onchainkit/minikit";

interface OnchainEventBadgesProps {
  event: Event;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export function OnchainEventBadges({ event, size = 'md', variant = 'default' }: OnchainEventBadgesProps) {
  const badges = [];
  
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

  // Event Type Badge
  if (event.status === 'cancelled') {
    badges.push(
      <div key="cancelled" className={`inline-flex items-center gap-1.5 bg-red-500 text-white rounded-full font-semibold ${sizeClasses[size]} shadow-lg`}>
        <Icon name="users" size={iconSizes[size]} />
        <span>Cancelled</span>
      </div>
    );
  } else if (event.isPaid && event.isTokenGated) {
    badges.push(
      <div key="premium" className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClasses[size]} shadow-lg text-white blockchain-border`}
           style={{background: 'linear-gradient(135deg, var(--app-payment) 0%, var(--app-token-gate) 100%)'}}>
        <Icon name="star" size={iconSizes[size]} />
        <span>Premium</span>
      </div>
    );
  } else if (event.isTokenGated) {
    badges.push(
      <div key="token-gated" className={`inline-flex items-center gap-1.5 token-gate-gradient text-white rounded-full font-semibold ${sizeClasses[size]} shadow-lg`}>
        <Icon name="star" size={iconSizes[size]} />
        <span>Token Gated</span>
      </div>
    );
  } else if (event.isPaid) {
    badges.push(
      <div key="paid" className={`inline-flex items-center gap-1.5 payment-gradient text-white rounded-full font-semibold ${sizeClasses[size]} shadow-lg`}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="var(--app-payment)"/>
          <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">$</text>
        </svg>
        <span>{event.priceUSDC ? `${event.priceUSDC} USDC` : "Paid"}</span>
      </div>
    );
  } else {
    badges.push(
      <div key="free" className={`inline-flex items-center gap-1.5 bg-blue-500 text-white rounded-full font-semibold ${sizeClasses[size]} shadow-lg`}>
        <Icon name="heart" size={iconSizes[size]} />
        <span>Free</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {badges}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {badges}
    </div>
  );
}

interface OnchainPaymentStatusProps {
  event: Event;
  registration?: EventRegistration;
  showDetails?: boolean;
}

export function OnchainPaymentStatus({ event, registration, showDetails = false }: OnchainPaymentStatusProps) {
  const openUrl = useOpenUrl();

  if (!event.isPaid && !registration?.paymentTxHash) return null;

  const hasPayment = !!registration?.paymentTxHash;

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
        hasPayment 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      }`}>
        <div className={`w-2 h-2 rounded-full ${hasPayment ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        <span>{hasPayment ? 'Payment Confirmed' : 'Payment Required'}</span>
      </div>
    );
  }

  return (
    <div className="onchain-card rounded-xl p-4 border" style={{
      background: hasPayment ? 'var(--app-success-bg)' : 'var(--app-warning-bg)',
      borderColor: hasPayment ? 'var(--app-success-light)' : 'var(--app-warning-light)'
    }}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          hasPayment ? 'bg-green-500' : 'bg-yellow-500'
        }`}>
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">$</text>
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-bold" style={{color: hasPayment ? 'var(--app-success)' : 'var(--app-warning)'}}>
            {hasPayment ? '✅ Payment Confirmed' : '⏳ Payment Required'}
          </h4>
          <p className="text-sm text-gray-600">
            {hasPayment 
              ? `Paid ${event.priceUSDC} USDC on Base` 
              : `${event.priceUSDC} USDC payment required`
            }
          </p>
        </div>
      </div>
      
      {hasPayment && registration?.paymentTxHash && (
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-600">Transaction:</span>
            <button
              onClick={() => openUrl(`https://basescan.org/tx/${registration.paymentTxHash}`)}
              className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 transition-colors"
            >
              {registration.paymentTxHash.slice(0, 10)}...{registration.paymentTxHash.slice(-8)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface OnchainNFTStatusProps {
  registration?: EventRegistration;
  showDetails?: boolean;
}

export function OnchainNFTStatus({ registration, showDetails = false }: OnchainNFTStatusProps) {
  const openUrl = useOpenUrl();

  if (!registration?.ticketNft?.txHash) return null;

  const { ticketNft } = registration;

  if (!showDetails) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-pink-100 text-pink-800 border border-pink-200">
        <div className="w-2 h-2 rounded-full bg-pink-500"></div>
        <span>NFT Ticket</span>
      </div>
    );
  }

  return (
    <div className="onchain-card rounded-xl p-4 border" style={{
      background: 'var(--app-nft-bg)',
      borderColor: 'var(--app-nft-light)'
    }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg nft-gradient flex items-center justify-center">
          <Icon name="star" size="sm" className="text-white" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold" style={{color: 'var(--app-nft)'}}>
            🎫 NFT Ticket Collected
          </h4>
          <p className="text-sm text-gray-600">
            Token ID: #{ticketNft.tokenId}
          </p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-600">Contract:</span>
            <button
              onClick={() => openUrl(`https://basescan.org/address/${ticketNft.contract}`)}
              className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 transition-colors"
            >
              {ticketNft.contract.slice(0, 8)}...{ticketNft.contract.slice(-6)}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-600">Mint Tx:</span>
            <button
              onClick={() => openUrl(`https://basescan.org/tx/${ticketNft.txHash}`)}
              className="text-xs font-mono bg-gray-100 px-2 py-1 rounded border hover:bg-gray-200 transition-colors"
            >
              {ticketNft.txHash.slice(0, 8)}...{ticketNft.txHash.slice(-6)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OnchainActivitySummaryProps {
  event: Event;
  registration?: EventRegistration;
  userAddress?: string;
}

export function OnchainActivitySummary({ event, registration, userAddress }: OnchainActivitySummaryProps) {
  const activities = [];

  // Event creation
  activities.push({
    type: 'creation',
    title: 'Event Created',
    description: `${event.isTokenGated ? 'Token-gated' : event.isPaid ? 'Paid' : 'Free'} event on Base`,
    icon: 'heart',
    color: 'var(--app-accent)',
    timestamp: event.createdAt
  });

  // Token verification
  if (event.isTokenGated && userAddress) {
    activities.push({
      type: 'verification',
      title: 'Token Verification',
      description: `Checking ${event.requiredTokenSymbol} balance`,
      icon: 'star',
      color: 'var(--app-token-gate)',
      timestamp: new Date().toISOString()
    });
  }

  // Payment
  if (registration?.paymentTxHash) {
    activities.push({
      type: 'payment',
      title: 'Payment Confirmed',
      description: `${event.priceUSDC} USDC paid on Base`,
      icon: 'heart',
      color: 'var(--app-payment)',
      timestamp: registration.registeredAt
    });
  }

  // NFT Ticket
  if (registration?.ticketNft?.txHash) {
    activities.push({
      type: 'nft',
      title: 'NFT Ticket Minted',
      description: `Token ID #${registration.ticketNft.tokenId}`,
      icon: 'star',
      color: 'var(--app-nft)',
      timestamp: registration.registeredAt
    });
  }

  if (activities.length <= 1) return null;

  return (
    <div className="onchain-card rounded-xl p-4 border" style={{
      background: 'var(--app-base-bg)',
      borderColor: 'var(--app-base-light)'
    }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <Icon name="heart" size="sm" className="text-white" />
        </div>
        <h4 className="font-bold text-lg" style={{color: 'var(--app-base)'}}>
          Onchain Activity
        </h4>
      </div>
      
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={activity.type} className="flex items-center gap-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{backgroundColor: activity.color}}
            >
              <Icon name={activity.icon as any} size="sm" className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{activity.title}</div>
              <div className="text-xs text-gray-600">{activity.description}</div>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(activity.timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
