"use client";

import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { Button, Icon } from '../DemoComponents';
import { Event } from '@/lib/events';
import { useState } from 'react';

interface ComposeCastButtonProps {
  event: Event;
  variant?: 'default' | 'compact' | 'achievement' | 'frame';
  className?: string;
}

export default function ComposeCastButton({ 
  event, 
  variant = 'default', 
  className = '' 
}: ComposeCastButtonProps) {
  const { composeCast } = useComposeCast();
  const [isComposing, setIsComposing] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState(false);

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
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/events/${event.id}`;
  };

  const handleCompose = async () => {
    setIsComposing(true);
    setComposeSuccess(false);

    try {
      const eventUrl = getEventUrl();
      const shareText = `Just minted an awesome NFT using @coinbase OnchainKit! 🎉\n\nCheck out this amazing event: ${event.title}\n📅 ${formatDate(event.date, event.time, event.endTime)}\n📍 ${event.location}\n\n${eventUrl}`;

      await composeCast({ 
        text: shareText 
      });

      console.log('✅ Cast composed successfully');
      setComposeSuccess(true);
      
      // Store analytics
      storeEventShareAnalytics('achievement');
      
    } catch (error) {
      console.error('❌ Failed to compose cast:', error);
    } finally {
      setIsComposing(false);
    }
  };

  const handleComposeWithEmbed = async () => {
    setIsComposing(true);
    setComposeSuccess(false);

    try {
      const eventUrl = getEventUrl();
      const shareText = `Check out this amazing Mini App! 🚀\n\n${event.title}\n📅 ${formatDate(event.date, event.time, event.endTime)}\n📍 ${event.location}\n\nJoin me at this incredible event!`;

      // Prepare embeds - include event image if available and the event URL
      const embeds: string[] = [];
      if (event.imageUrl) {
        embeds.push(event.imageUrl);
      }
      embeds.push(eventUrl);

      await composeCast({
        text: shareText,
        embeds: embeds as [string, ...string[]],
      });

      console.log('✅ Cast with embed composed successfully');
      setComposeSuccess(true);
      
      // Store analytics
      storeEventShareAnalytics('frame');
      
    } catch (error) {
      console.error('❌ Failed to compose cast with embed:', error);
    } finally {
      setIsComposing(false);
    }
  };

  const storeEventShareAnalytics = (type: 'achievement' | 'frame') => {
    try {
      const analyticsData = {
        eventId: event.id,
        eventTitle: event.title,
        shareType: type,
        timestamp: new Date().toISOString(),
        eventUrl: getEventUrl(),
        platform: 'farcaster'
      };

      // Store in localStorage for analytics
      const sharedEvents = JSON.parse(localStorage.getItem('farcasterSharedEvents') || '[]');
      sharedEvents.push(analyticsData);
      localStorage.setItem('farcasterSharedEvents', JSON.stringify(sharedEvents));

      // You could also send to your analytics endpoint
      // await fetch('/api/analytics/farcaster-share', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(analyticsData)
      // });
    } catch (error) {
      console.error('Failed to store event share analytics:', error);
    }
  };

  // Reset success state after 3 seconds
  if (composeSuccess) {
    setTimeout(() => setComposeSuccess(false), 3000);
  }

  if (variant === 'achievement') {
    return (
      <Button
        onClick={handleCompose}
        disabled={isComposing}
        className={`bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 ${className}`}
      >
        <Icon name="share" size="sm" />
        {isComposing ? 'Sharing Achievement...' : composeSuccess ? 'Achievement Shared!' : 'Share Achievement'}
      </Button>
    );
  }

  if (variant === 'frame') {
    return (
      <Button
        onClick={handleComposeWithEmbed}
        disabled={isComposing}
        className={`bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 ${className}`}
      >
        <Icon name="share" size="sm" />
        {isComposing ? 'Sharing Frame...' : composeSuccess ? 'Frame Shared!' : 'Share Frame'}
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCompose}
          disabled={isComposing}
          className="text-purple-600 hover:text-purple-700"
        >
          <Icon name="share" size="sm" />
          <span className="hidden sm:inline">
            {isComposing ? 'Sharing...' : composeSuccess ? 'Shared!' : 'Achievement'}
          </span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleComposeWithEmbed}
          disabled={isComposing}
          className="text-blue-600 hover:text-blue-700"
        >
          <Icon name="share" size="sm" />
          <span className="hidden sm:inline">
            {isComposing ? 'Sharing...' : composeSuccess ? 'Shared!' : 'Frame'}
          </span>
        </Button>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon name="share" size="sm" className="text-[var(--app-foreground-muted)]" />
        <span className="text-sm font-medium text-[var(--app-foreground)]">Share on Farcaster</span>
        {composeSuccess && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            Cast sent successfully!
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        <Button
          onClick={handleCompose}
          disabled={isComposing}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 flex items-center gap-2"
        >
          <Icon name="share" size="sm" />
          {isComposing ? 'Sharing Achievement...' : composeSuccess ? 'Achievement Shared!' : 'Share Achievement'}
        </Button>
        
        <Button
          onClick={handleComposeWithEmbed}
          disabled={isComposing}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 flex items-center gap-2"
        >
          <Icon name="share" size="sm" />
          {isComposing ? 'Sharing Frame...' : composeSuccess ? 'Frame Shared!' : 'Share Frame'}
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
              {formatDate(event.date, event.time, event.endTime)} • {event.location}
            </p>
            <p className="text-[var(--app-foreground-muted)] text-xs truncate">
              {event.description}
            </p>
          </div>
        </div>
        <div className="text-xs text-[var(--app-foreground-muted)] break-all">
          {getEventUrl()}
        </div>
      </div>
    </div>
  );
}