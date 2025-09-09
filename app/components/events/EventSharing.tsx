"use client";

import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { Button, Icon } from '../DemoComponents';
import { Event } from '@/lib/events';
import { useState } from 'react';

interface EventSharingProps {
  event: Event;
  variant?: 'default' | 'compact';
  className?: string;
}

export function EventSharing({ event, variant = 'default', className = '' }: EventSharingProps) {
  const { composeCast } = useComposeCast();
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const formatDate = (date: string, time: string, endTime?: string) => {
    const eventDate = new Date(`${date}T${time}`);
    const baseFormat = eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    
    if (endTime) {
      const endDate = new Date(`${date}T${endTime}`);
      const endFormat = endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
      return `${baseFormat} - ${endFormat}`;
    }
    
    return baseFormat;
  };

  const getEventUrl = () => {
    // Construct the full event URL with proper routing
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/events/${event.id}`;
  };

  const generateEventLink = () => {
    const eventUrl = getEventUrl();
    const eventData = {
      title: event.title,
      date: formatDate(event.date, event.time, event.endTime),
      location: event.location,
      description: event.description,
      imageUrl: event.imageUrl,
      url: eventUrl,
      // Add metadata for better link preview
      metadata: {
        type: 'event',
        eventId: event.id,
        creator: event.creator,
        isPaid: event.isPaid,
        isTokenGated: event.isTokenGated,
        price: event.priceUSDC,
        maxAttendees: event.maxAttendees,
        currentAttendees: event.attendees.length
      }
    };
    
    return {
      url: eventUrl,
      data: eventData
    };
  };

  const handleFarcasterShare = async () => {
    setIsSharing(true);
    setShareSuccess(false);
    
    try {
      const { url: eventUrl, data: eventData } = generateEventLink();
      
      // Create engaging share text with event details
      let shareText = `🎉 ${event.title}\n`;
      shareText += `📅 ${formatDate(event.date, event.time, event.endTime)}\n`;
      shareText += `📍 ${event.location}\n`;
      
      // Add price info if it's a paid event
      if (event.isPaid && event.priceUSDC) {
        shareText += `💰 ${event.priceUSDC} USDC\n`;
      }
      
      // Add token gating info if applicable
      if (event.isTokenGated) {
        shareText += `🔒 Token-gated event\n`;
      }
      
      // Add attendee count
      shareText += `👥 ${event.attendees.length}${event.maxAttendees ? `/${event.maxAttendees}` : ''} attending\n\n`;
      
      // Add call to action
      shareText += `Join me at this amazing event! 🚀\n\n`;
      shareText += `${eventUrl}`;
      
      // Prepare embeds - include event image if available
      const embeds: string[] = [];
      if (event.imageUrl) {
        embeds.push(event.imageUrl);
      }
      // Add the event URL as an embed for better link preview
      embeds.push(eventUrl);
      
      await composeCast({
        text: shareText,
        embeds: embeds as [string, ...string[]],
      });
      
      console.log('✅ Event shared on Farcaster successfully');
      setShareSuccess(true);
      
      // Store the shared event link for analytics
      storeSharedEventLink(eventData);
      
      // Reset success state after 3 seconds
      setTimeout(() => setShareSuccess(false), 3000);
      
    } catch (error) {
      console.error('❌ Failed to share on Farcaster:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const storeSharedEventLink = (eventData: any) => {
    try {
      // Store in localStorage for analytics
      const sharedEvents = JSON.parse(localStorage.getItem('sharedEvents') || '[]');
      sharedEvents.push({
        ...eventData,
        sharedAt: new Date().toISOString(),
        platform: 'farcaster'
      });
      localStorage.setItem('sharedEvents', JSON.stringify(sharedEvents));
      
      // You could also send to your analytics endpoint
      // await fetch('/api/analytics/event-shared', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(eventData)
      // });
    } catch (error) {
      console.error('Failed to store shared event link:', error);
    }
  };

  const handleCopyEventLink = async () => {
    const { url: eventUrl } = generateEventLink();
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopySuccess(true);
      console.log('✅ Event link copied to clipboard');
      
      // Reset success state after 3 seconds
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {/* Farcaster Share */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFarcasterShare}
          disabled={isSharing}
          className={`text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] flex items-center gap-1.5 text-xs px-3 py-2 transition-colors ${
            shareSuccess ? 'text-green-600 bg-green-50' : ''
          }`}
        >
          <Icon name="share" size="sm" />
          <span className="hidden xs:inline">
            {isSharing ? 'Sharing...' : shareSuccess ? 'Shared!' : 'Farcaster'}
          </span>
          <span className="xs:hidden">
            {isSharing ? '...' : shareSuccess ? '✓' : 'Farcaster'}
          </span>
        </Button>
        
        {/* Copy Link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyEventLink}
          className={`text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] flex items-center gap-1.5 text-xs px-3 py-2 transition-colors ${
            copySuccess ? 'text-green-600 bg-green-50' : ''
          }`}
        >
          <Icon name="link" size="sm" />
          <span className="hidden xs:inline">
            {copySuccess ? 'Copied!' : 'Copy Link'}
          </span>
          <span className="xs:hidden">
            {copySuccess ? '✓' : 'Link'}
          </span>
        </Button>
      </div>
    );
  }

  // Default variant with more detailed layout
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon name="share" size="sm" className="text-[var(--app-foreground-muted)]" />
        <span className="text-sm font-medium text-[var(--app-foreground)]">Share this event</span>
        {(shareSuccess || copySuccess) && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {shareSuccess ? 'Shared successfully!' : 'Link copied!'}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Farcaster Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFarcasterShare}
          disabled={isSharing}
          className={`bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 flex items-center justify-center gap-2 py-3 transition-colors ${
            shareSuccess ? 'bg-green-50 text-green-700 border-green-200' : ''
          }`}
        >
          <Icon name="share" size="sm" />
          <span className="font-medium">
            {isSharing ? 'Sharing...' : shareSuccess ? 'Shared!' : 'Share on Farcaster'}
          </span>
        </Button>
        
        {/* Copy Event Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyEventLink}
          className={`bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 flex items-center justify-center gap-2 py-3 transition-colors ${
            copySuccess ? 'bg-green-50 text-green-700 border-green-200' : ''
          }`}
        >
          <Icon name="link" size="sm" />
          <span className="font-medium">
            {copySuccess ? 'Copied!' : 'Copy Link'}
          </span>
        </Button>
      </div>
      
      {/* Event Preview */}
      <div className="bg-[var(--app-gray)] rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          {event.imageUrl && (
            <img 
              src={event.imageUrl} 
              alt={event.title} 
              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-[var(--app-foreground)] text-sm truncate">
              {event.title}
            </h4>
            <p className="text-[var(--app-foreground-muted)] text-xs">
              {formatDate(event.date, event.time, event.endTime)} • {event.location}
            </p>
            <p className="text-[var(--app-foreground-muted)] text-xs line-clamp-2">
              {event.description}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {event.isPaid && event.priceUSDC && (
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
                  💰 {event.priceUSDC} USDC
                </span>
              )}
              {event.isTokenGated && (
                <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-1 rounded-full">
                  🔒 Token-gated
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-xs text-[var(--app-foreground-muted)] break-all bg-white/50 p-2 rounded border">
          {getEventUrl()}
        </div>
      </div>
    </div>
  );
}