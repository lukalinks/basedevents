"use client";

import { useState, useEffect } from "react";
import { Icon } from "../DemoComponents";
import { EventRegistration } from "@/lib/events";

// User NFT Tickets Collection Component
export function UserNFTTicketsCollection({ 
  userAddress 
}: { 
  userAddress?: string 
}) {
  const [nftTickets, setNftTickets] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setNftTickets([]);
      setLoading(false);
      return;
    }

    const fetchNFTTickets = async () => {
      try {
        setLoading(true);
        setError(null);
        const { getUserNFTTickets } = await import('@/lib/events');
        const tickets = await getUserNFTTickets(userAddress);
        setNftTickets(tickets);
      } catch (err) {
        console.error('Error fetching NFT tickets:', err);
        setError('Failed to load NFT tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchNFTTickets();
  }, [userAddress]);

  if (!userAddress) {
    return (
      <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-800 mb-1">Connect Wallet</h3>
          <p className="text-xs text-blue-600">View your NFT ticket collection</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="onchain-card rounded-xl p-8 text-center border" style={{
        background: 'var(--app-nft-bg)',
        borderColor: 'var(--app-nft-light)'
      }}>
        <div className="w-16 h-16 nft-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{color: 'var(--app-nft)'}}>Loading NFT Collection</h3>
        <p className="text-sm font-medium text-gray-600">Fetching your event tickets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onchain-card rounded-xl p-8 text-center border" style={{
        background: 'var(--app-error-bg)',
        borderColor: 'var(--app-error-light)'
      }}>
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Icon name="users" size="lg" className="text-white" />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{color: 'var(--app-error)'}}>Error Loading NFT Collection</h3>
        <p className="text-sm font-medium text-gray-600 mb-4">{error}</p>
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30">
          <p className="text-xs text-gray-700">Please try refreshing the page or check your connection</p>
        </div>
      </div>
    );
  }

  if (nftTickets.length === 0) {
    return (
      <div className="onchain-card rounded-xl p-8 text-center border" style={{
        background: 'var(--app-nft-bg)',
        borderColor: 'var(--app-nft-light)'
      }}>
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Icon name="star" size="lg" className="text-gray-400" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{color: 'var(--app-nft)'}}>No NFT Tickets Yet</h3>
        <p className="text-sm font-medium text-gray-600 mb-4">
          Register for events that offer NFT tickets to start your collection!
        </p>
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/30">
          <p className="text-xs text-gray-700 mb-2 font-medium">💡 Tip:</p>
          <p className="text-xs text-gray-700">
            Many events on BasedEvents offer beautiful NFT tickets as collectibles. 
            Look for events with the NFT badge and start collecting today!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 nft-gradient rounded-xl flex items-center justify-center shadow-lg">
            <Icon name="star" size="md" className="text-white drop-shadow-sm" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{color: 'var(--app-nft)'}}>My NFT Collection</h2>
            <p className="text-sm text-gray-600">{nftTickets.length} event tickets collected</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nftTickets.map((ticket) => (
          <div key={ticket.id} className="bg-[var(--app-card-bg)] border-2 border-[var(--app-card-border)] rounded-xl p-4 hover:border-[var(--app-accent)] transition-all">
            {ticket.event?.imageUrl && (
              <div className="w-full h-32 bg-[var(--app-gray)] rounded-lg mb-3 overflow-hidden">
                <img 
                  src={ticket.event.imageUrl} 
                  alt={ticket.event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <h3 className="font-semibold text-[var(--app-foreground)] line-clamp-2">
                {ticket.event?.title || 'Unknown Event'}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-[var(--app-foreground-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{ticket.event?.date}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-[var(--app-foreground-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="line-clamp-1">{ticket.event?.location}</span>
              </div>
              
              {ticket.ticketNft && (
                <div className="pt-2 border-t border-[var(--app-card-border)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--app-foreground-muted)]">Token ID:</span>
                    <span className="font-mono text-[var(--app-accent)]">{ticket.ticketNft.tokenId}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`https://basescan.org/tx/${ticket.ticketNft.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--app-accent)] hover:underline"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View on BaseScan
                    </a>
                    
                    <a
                      href={`https://basescan.org/token/${ticket.ticketNft.contract}?a=${ticket.ticketNft.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--app-accent)] hover:underline"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View NFT
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
