"use client";

import { useComposeCast } from '@coinbase/onchainkit/minikit';
import { Button, Icon } from '../DemoComponents';
import { Event } from '@/lib/events';

interface EventSharingProps {
  event: Event;
  variant?: 'default' | 'compact';
  className?: string;
}

export function EventSharing({ event, variant = 'default', className = '' }: EventSharingProps) {
  const { composeCast } = useComposeCast();

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
    // Construct the full event URL
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/events/${event.id}`;
  };

  const handleFarcasterShare = async () => {
    try {
      const eventUrl = getEventUrl();
      const shareText = `🎉 Check out this amazing event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
      
      // If event has an image, include it as an embed
      const embeds = event.imageUrl ? [event.imageUrl] as [string] : undefined;
      
      await composeCast({
        text: shareText,
        embeds,
      });
      
      console.log('✅ Event shared on Farcaster successfully');
    } catch (error) {
      console.error('❌ Failed to share on Farcaster:', error);
      // Fallback to URL-based sharing
      handleFallbackShare();
    }
  };

  const handleFallbackShare = () => {
    const eventUrl = getEventUrl();
    const shareText = `🎉 Check out this amazing event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
    
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
  };

  const copyToClipboard = async (text: string, url: string) => {
    try {
      const fullText = `${text}\n\n${url}`;
      await navigator.clipboard.writeText(fullText);
      
      // You could add a toast notification here
      console.log('✅ Event link copied to clipboard');
    } catch (error) {
      console.error('❌ Failed to copy to clipboard:', error);
    }
  };

  const handleTwitterShare = () => {
    const eventUrl = getEventUrl();
    const shareText = `🎉 Check out this amazing event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleLinkedInShare = () => {
    const eventUrl = getEventUrl();
    const shareText = `Check out this amazing event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}&title=${encodeURIComponent(event.title)}&summary=${encodeURIComponent(shareText)}`;
    window.open(linkedInUrl, '_blank');
  };

  if (variant === 'compact') {
    return (
      <div className={`flex gap-1.5 ${className}`}>
        {/* Farcaster Share */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFarcasterShare}
          className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] flex items-center gap-1 text-xs px-2 py-1.5"
        >
          <Icon name="share" size="sm" />
          <span className="hidden sm:inline">Farcaster</span>
          <span className="sm:hidden">Farcaster</span>
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
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Farcaster Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFarcasterShare}
          className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 flex items-center gap-2"
        >
          <Icon name="share" size="sm" />
          <span>Farcaster</span>
        </Button>
        
        {/* Native Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFallbackShare}
          className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 flex items-center gap-2"
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
          </div>
        </div>
        <div className="text-xs text-[var(--app-foreground-muted)]">
          {getEventUrl()}
        </div>
      </div>
    </div>
  );
}