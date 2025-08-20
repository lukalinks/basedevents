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

  const formatDate = (date: string, time: string) => {
    const eventDate = new Date(`${date}T${time}`);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
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
      date: formatDate(event.date, event.time),
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
      shareText += `📅 ${formatDate(event.date, event.time)}\n`;
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
      
    } catch (error) {
      console.error('❌ Failed to share on Farcaster:', error);
      // Fallback to URL-based sharing
      handleFallbackShare();
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

  const handleFallbackShare = () => {
    const { url: eventUrl, data: eventData } = generateEventLink();
    const shareText = `🎉 Check out this amazing event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}\n\n${eventUrl}`;
    
    // Try native sharing first
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: shareText,
        url: eventUrl,
      }).catch((error) => {
        console.log('Native sharing failed, falling back to clipboard:', error);
        copyToClipboard(shareText, eventUrl);
      });
    } else {
      copyToClipboard(shareText, eventUrl);
    }
    
    // Store the shared event link
    storeSharedEventLink(eventData);
  };

  const copyToClipboard = async (text: string, url: string) => {
    try {
      const fullText = `${text}\n\n${url}`;
      await navigator.clipboard.writeText(fullText);
      
      setShareSuccess(true);
      console.log('✅ Event link copied to clipboard');
      
      // Reset success state after 3 seconds
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
    }
  };

  const handleTwitterShare = () => {
    const { url: eventUrl } = generateEventLink();
    const shareText = `🎉 Check out this amazing event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleLinkedInShare = () => {
    const { url: eventUrl } = generateEventLink();
    const shareText = `Check out this amazing event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}&title=${encodeURIComponent(event.title)}&summary=${encodeURIComponent(shareText)}`;
    window.open(linkedInUrl, '_blank');
  };

  const handleCopyEventLink = () => {
    const { url: eventUrl } = generateEventLink();
    copyToClipboard(`Event: ${event.title}`, eventUrl);
  };

  if (variant === 'compact') {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        {/* Farcaster Share */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFarcasterShare}
          disabled={isSharing}
          className={`text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] flex items-center gap-1 text-xs px-2 py-1.5 ${
            shareSuccess ? 'text-green-600' : ''
          }`}
        >
          <Icon name="share" size="sm" />
          <span className="hidden sm:inline">
            {isSharing ? 'Sharing...' : shareSuccess ? 'Shared!' : 'Farcaster'}
          </span>
          <span className="sm:hidden">
            {isSharing ? '...' : shareSuccess ? '✓' : 'Farcaster'}
          </span>
        </Button>
        
        {/* Copy Link */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyEventLink}
          className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] flex items-center gap-1 text-xs px-2 py-1.5"
        >
          <Icon name="link" size="sm" />
          <span className="hidden sm:inline">Copy Link</span>
          <span className="sm:hidden">Link</span>
        </Button>
        
        {/* Native Share */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFallbackShare}
          className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] flex items-center gap-1 text-xs px-2 py-1.5"
        >
          <Icon name="share" size="sm" />
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">Share</span>
        </Button>
      </div>
    );
  }

  // Default variant with more options
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon name="share" size="sm" className="text-[var(--app-foreground-muted)]" />
        <span className="text-sm font-medium text-[var(--app-foreground)]">Share this event</span>
        {shareSuccess && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            Shared successfully!
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Farcaster Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFarcasterShare}
          disabled={isSharing}
          className={`bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 flex items-center gap-2 ${
            shareSuccess ? 'bg-green-50 text-green-700 border-green-200' : ''
          }`}
        >
          <Icon name="share" size="sm" />
          <span>
            {isSharing ? 'Sharing...' : shareSuccess ? 'Shared!' : 'Farcaster'}
          </span>
        </Button>
        
        {/* Copy Event Link */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyEventLink}
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 flex items-center gap-2"
        >
          <Icon name="link" size="sm" />
          <span>Copy Link</span>
        </Button>
        
        {/* Native Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFallbackShare}
          className="bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 flex items-center gap-2"
        >
          <Icon name="share" size="sm" />
          <span>Share</span>
        </Button>
        
        {/* Twitter Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleTwitterShare}
          className="bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200 flex items-center gap-2"
        >
          <Icon name="share" size="sm" />
          <span>Twitter</span>
        </Button>
        
        {/* LinkedIn Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLinkedInShare}
          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 flex items-center gap-2"
        >
          <Icon name="share" size="sm" />
          <span>LinkedIn</span>
        </Button>
      </div>
      
      {/* Event Preview */}
      <div className="bg-[var(--app-gray)] rounded-lg p-3 space-y-2">
        <div className="flex items-start gap-3">
          {event.imageUrl && (
            <img 
              src={event.imageUrl} 
              alt={event.title} 
              className="w-16 h-16 object-cover rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-[var(--app-foreground)] text-sm truncate">
              {event.title}
            </h4>
            <p className="text-[var(--app-foreground-muted)] text-xs">
              {formatDate(event.date, event.time)} • {event.location}
            </p>
            <p className="text-[var(--app-foreground-muted)] text-xs truncate">
              {event.description}
            </p>
            {event.isPaid && event.priceUSDC && (
              <p className="text-xs text-blue-600 font-medium">
                💰 {event.priceUSDC} USDC
              </p>
            )}
            {event.isTokenGated && (
              <p className="text-xs text-purple-600 font-medium">
                🔒 Token-gated event
              </p>
            )}
          </div>
        </div>
        <div className="text-xs text-[var(--app-foreground-muted)] break-all">
          {getEventUrl()}
        </div>
      </div>
    </div>
  );
}