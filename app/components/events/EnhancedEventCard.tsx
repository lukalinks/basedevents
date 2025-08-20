"use client";

import { useState } from "react";
import { Button, Icon } from "../DemoComponents";
import { Event } from "@/lib/events";
import { OnchainEventBadges } from '../OnchainStatusIndicators';
import { useOpenUrl } from "@coinbase/onchainkit/minikit";

interface EnhancedEventCardProps {
  event: Event;
  userAddress?: string;
  onEventClick?: (event: Event) => void;
  onRSVP?: (eventId: string) => void;
  onCancelRSVP?: (eventId: string) => void;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  onCancel?: (eventId: string) => void;
  onDownloadCSV?: (eventId: string, eventTitle: string) => void;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
}

export function EnhancedEventCard({
  event,
  userAddress,
  onEventClick,
  onRSVP,
  onCancelRSVP,
  onEdit,
  onDelete,
  onCancel,
  onDownloadCSV,
  variant = 'default',
  showActions = true
}: EnhancedEventCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const openUrl = useOpenUrl();

  // Helper functions
  const getEventStatus = (event: Event) => {
    const now = new Date();
    const eventDate = new Date(`${event.date}T${event.time}`);
    const timeDiff = eventDate.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    
    if (hoursDiff < -2) return 'past';
    if (hoursDiff < 24) return 'soon';
    return 'upcoming';
  };

  const isEventFull = (event: Event) => {
    return (event as any).capacity && event.attendees.length >= (event as any).capacity;
  };

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

  const formatTimeUntil = (date: string, time: string) => {
    const now = new Date();
    const eventDate = new Date(`${date}T${time}`);
    const timeDiff = eventDate.getTime() - now.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    const hoursDiff = Math.floor((timeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
    
    if (daysDiff > 0) {
      return `${daysDiff} day${daysDiff !== 1 ? 's' : ''} away`;
    } else if (hoursDiff > 0) {
      return `${hoursDiff} hour${hoursDiff !== 1 ? 's' : ''} away`;
    } else {
      return 'Starting soon';
    }
  };

  const openFarcasterCompose = (text: string, embedUrl?: string) => {
    const encodedText = encodeURIComponent(text);
    const encodedEmbed = embedUrl ? encodeURIComponent(embedUrl) : '';
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodedText}&embeds[]=${encodedEmbed}`;
    openUrl(farcasterUrl);
  };

  const status = getEventStatus(event);
  const isAttending = event.attendees.includes(userAddress || "");
  const isFull = isEventFull(event);
  const isCreator = event.creator === userAddress;

  const getStatusColor = () => {
    if (event.status === 'cancelled') return 'red';
    if (status === 'past') return 'gray';
    if (status === 'soon') return 'orange';
    return 'blue';
  };

  const getStatusText = () => {
    if (event.status === 'cancelled') return 'Cancelled';
    if (status === 'past') return 'Past';
    if (status === 'soon') return 'Starting Soon';
    return 'Upcoming';
  };

  if (variant === 'compact') {
    return (
      <div 
        className={`bg-[var(--app-card-bg)] border rounded-xl p-4 hover:shadow-lg transition-all duration-200 cursor-pointer relative ${
          event.status === 'cancelled' 
            ? 'border-red-300 bg-gradient-to-br from-red-50/30 to-red-100/20' 
            : 'border-[var(--app-card-border)] hover:border-[var(--app-accent)]/30'
        }`}
        onClick={() => onEventClick && onEventClick(event)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            getStatusColor() === 'red' ? 'bg-red-100 text-red-800' :
            getStatusColor() === 'gray' ? 'bg-gray-100 text-gray-800' :
            getStatusColor() === 'orange' ? 'bg-orange-100 text-orange-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {getStatusText()}
          </span>
        </div>

        {/* Event Image */}
        {event.imageUrl && (
          <div className="mb-3 -mx-4 -mt-4">
            <img 
              src={event.imageUrl} 
              alt={event.title} 
              className="w-full h-32 object-cover rounded-t-xl"
            />
          </div>
        )}

        {/* Event Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-[var(--app-foreground)] text-lg leading-tight">
              {event.title}
            </h3>
            <OnchainEventBadges event={event} size="sm" variant="compact" />
          </div>
          
          <p className="text-[var(--app-foreground-muted)] text-sm line-clamp-2">
            {event.description}
          </p>

          <div className="flex items-center gap-3 text-sm text-[var(--app-foreground-muted)]">
            <div className="flex items-center gap-1">
              <Icon name="calendar" size="sm" />
              <span>{formatDate(event.date, event.time)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon name="location" size="sm" />
              <span>{event.location}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-[var(--app-foreground-muted)]">
              <Icon name="users" size="sm" />
              <span>{event.attendees.length}{(event as any).capacity ? `/${(event as any).capacity}` : ''} attending</span>
            </div>
            
            {showActions && (
              <div className="flex gap-2">
                {!isCreator && event.status !== 'cancelled' && status !== 'past' && (
                  <Button
                    variant={isAttending ? "secondary" : "primary"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAttending && onCancelRSVP) {
                        onCancelRSVP(event.id);
                      } else if (!isAttending && onRSVP) {
                        onRSVP(event.id);
                      }
                    }}
                    disabled={!isAttending && isFull}
                    className={`text-xs ${
                      isAttending 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : isFull 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-[var(--app-accent)] text-white hover:opacity-90'
                    }`}
                  >
                    {isAttending ? 'Cancel' : isFull ? 'Full' : 'RSVP'}
                  </Button>
                )}
                
                {isCreator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEventClick) onEventClick(event);
                    }}
                    className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                  >
                    Manage
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div 
      className={`bg-[var(--app-card-bg)] border rounded-xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer relative group ${
        event.status === 'cancelled' 
          ? 'border-red-300 bg-gradient-to-br from-red-50/30 to-red-100/20' 
          : 'border-[var(--app-card-border)] hover:border-[var(--app-accent)]/30'
      }`}
      onClick={() => onEventClick && onEventClick(event)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-10">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          getStatusColor() === 'red' ? 'bg-red-100 text-red-800' :
          getStatusColor() === 'gray' ? 'bg-gray-100 text-gray-800' :
          getStatusColor() === 'orange' ? 'bg-orange-100 text-orange-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {getStatusText()}
        </span>
      </div>

      {/* Event Image */}
      {event.imageUrl && (
        <div className="mb-4 -mx-6 -mt-6">
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="w-full h-48 object-cover rounded-t-xl"
          />
        </div>
      )}

      {/* Event Info */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-[var(--app-foreground)] text-xl mb-2">
              {event.title}
            </h3>
            <p className="text-[var(--app-foreground-muted)] text-base leading-relaxed">
              {event.description}
            </p>
          </div>
          <OnchainEventBadges event={event} size="md" variant="default" />
        </div>

        {/* Event Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[var(--app-foreground-muted)]">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Icon name="calendar" size="sm" className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--app-foreground)]">{formatDate(event.date, event.time)}</p>
                <p className="text-xs text-[var(--app-foreground-muted)]">{formatTimeUntil(event.date, event.time)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-[var(--app-foreground-muted)]">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="location" size="sm" className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--app-foreground)]">{event.location}</p>
                <p className="text-xs text-[var(--app-foreground-muted)]">Event Location</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[var(--app-foreground-muted)]">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="users" size="sm" className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--app-foreground)]">
                  {event.attendees.length}{(event as any).capacity ? `/${(event as any).capacity}` : ''} attending
                </p>
                <p className="text-xs text-[var(--app-foreground-muted)]">
                  {isFull ? 'Event is full' : `${(event as any).capacity ? (event as any).capacity - event.attendees.length : 'Unlimited'} spots left`}
                </p>
              </div>
            </div>

            {event.tags && event.tags.length > 0 && (
              <div className="flex items-center gap-3 text-[var(--app-foreground-muted)]">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Icon name="star" size="sm" className="text-orange-600" />
                </div>
                <div className="flex flex-wrap gap-1">
                  {event.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="bg-[var(--app-gray)] text-[var(--app-foreground-muted)] text-xs px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                  {event.tags.length > 3 && (
                    <span className="text-xs text-[var(--app-foreground-muted)]">
                      +{event.tags.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--app-card-border)]">
            <div className="flex gap-2">
              {!isCreator && event.status !== 'cancelled' && status !== 'past' && (
                <Button
                  variant={isAttending ? "secondary" : "primary"}
                  size="md"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAttending && onCancelRSVP) {
                      onCancelRSVP(event.id);
                    } else if (!isAttending && onRSVP) {
                      onRSVP(event.id);
                    }
                  }}
                  disabled={!isAttending && isFull}
                  className={`font-medium ${
                    isAttending 
                      ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                      : isFull 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-[var(--app-accent)] text-white hover:opacity-90'
                  }`}
                >
                  {isAttending ? 'Cancel RSVP' : isFull ? 'Event Full' : 'RSVP Now'}
                </Button>
              )}
              
              {isCreator && (
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEventClick) onEventClick(event);
                    }}
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 text-xs px-2 py-1.5"
                  >
                    <Icon name="edit" size="sm" className="mr-1" />
                    <span className="hidden sm:inline">Manage</span>
                    <span className="sm:hidden">Manage</span>
                  </Button>
                  
                  {onDownloadCSV && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadCSV(event.id, event.title);
                      }}
                      className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 text-xs px-2 py-1.5"
                    >
                      <Icon name="download" size="sm" className="mr-1" />
                      <span className="hidden sm:inline">Export</span>
                      <span className="sm:hidden">Export</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Share Buttons */}
            <div className="flex flex-wrap gap-1.5">
              {/* Farcaster Share */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const shareText = `Check out this event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
                  openFarcasterCompose(shareText);
                }}
                className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] flex items-center gap-1 text-xs px-2 py-1.5"
              >
                <Icon name="share" size="sm" />
                <span className="hidden sm:inline">Farcaster</span>
                <span className="sm:hidden">Farcaster</span>
              </Button>
              
              {/* Normal Share */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const eventUrl = `${window.location.origin}/events/${event.id}`;
                  const shareText = `Check out this event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
                  
                  if (navigator.share) {
                    navigator.share({
                      title: event.title,
                      text: shareText,
                      url: eventUrl
                    });
                  } else {
                    // Fallback: copy to clipboard
                    navigator.clipboard.writeText(`${shareText}\n\n${eventUrl}`);
                    // You could add a toast notification here
                  }
                }}
                className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] flex items-center gap-1 text-xs px-2 py-1.5"
              >
                <Icon name="share" size="sm" />
                <span className="hidden sm:inline">Share</span>
                <span className="sm:hidden">Share</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
