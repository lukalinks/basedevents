"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Icon } from "../DemoComponents";
import { Event, EventComment, addEventComment, getEventComments, isUserRegisteredForEvent } from "@/lib/events";
import { TokenRequirementDisplay } from '../TokenGating';
import { OnchainActivitySummary } from '../OnchainStatusIndicators';
import { EventAttendeesList } from './EventAttendeesList';
import { EventSharing } from './EventSharing';
import { EventSupportComponent } from './EventSupport';
import { useOpenUrl } from "@coinbase/onchainkit/minikit";
import { getUserDisplayInfo } from "@/lib/basenames";
import { CheckInSettings } from '../poa/CheckInSettings';
import { AttendeeCheckIn } from '../poa/AttendeeCheckIn';
import { POADashboard } from '../poa/POADashboard';
import { POAClaimCard } from '../poa/POAClaimCard';
import { getEventRegistrations, getEventPOAForAttendee, EventRegistration, ProofOfAttendance } from '@/lib/events';

// Event Details Page Component (non-modal version)
export function EventDetailsPage({ 
  event, 
  userAddress, 
  onEditAction, 
  onDeleteAction, 
  onCancelRSVPAction,
  onRSVPAction,
  onAddCommentAction,
  onDownloadCSVAction,
  refreshTrigger
}: {
  event: Event;
  userAddress?: string;
  onEditAction?: (event: Event) => void;
  onDeleteAction?: (eventId: string) => void;
  onCancelRSVPAction?: (eventId: string) => void;
  onRSVPAction?: (eventId: string) => void;
  onAddCommentAction?: (eventId: string, comment: string) => void;
  onDownloadCSVAction?: (eventId: string, eventTitle: string) => void;
  refreshTrigger?: number;
}) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [creatorDisplayInfo, setCreatorDisplayInfo] = useState<{
    displayName: string;
    avatar: string | null;
    isBaseName: boolean;
    baseName?: string;
    address: string;
  } | null>(null);
  
  // POA-related state
  const [activeTab, setActiveTab] = useState('attendees');
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [userPOA, setUserPOA] = useState<ProofOfAttendance | null>(null);
  const [poaLoading, setPOALoading] = useState(false);

  // Farcaster share helper
  const openUrl = useOpenUrl();
  const openFarcasterCompose = useCallback(async (text: string, embedUrl?: string) => {
    try {
      // Try to use Farcaster SDK first
      const { composeCast } = await import('../../lib/farcaster-sdk');
      await composeCast(text, embedUrl ? [embedUrl] : undefined);
    } catch (error) {
      console.warn('Farcaster SDK not available, using fallback:', error);
      // Fallback to URL-based compose
      const base = 'https://warpcast.com/~/compose';
      const params = new URLSearchParams({ text });
      if (embedUrl) {
        params.append('embeds[]', embedUrl);
      }
      const composeUrl = `${base}?${params.toString()}`;
      openUrl(composeUrl);
    }
  }, [openUrl]);

  // Enhanced Farcaster sharing with event details
  const shareEventOnFarcaster = useCallback((event: Event, shareType: 'created' | 'registered' | 'general' = 'general') => {
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    
    // Create rich text with event details
    let shareText = '';
    
    switch (shareType) {
      case 'created':
        shareText = `🎉 I just created an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time, event.endTime)}\n📍 ${event.location}`;
        break;
      case 'registered':
        shareText = `✅ I just registered for an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time, event.endTime)}\n📍 ${event.location}`;
        break;
      case 'general':
      default:
        shareText = `📅 Check out this event!\n\n🎯 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time, event.endTime)}\n📍 ${event.location}`;
        break;
    }
    
    // Add event image as embed if available
    const embedUrl = event.imageUrl || eventUrl;
    openFarcasterCompose(shareText, embedUrl);
  }, [openFarcasterCompose]);

  // Add timeout for registration loading to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (registrationLoading) {
        console.log('⚠️ Registration loading timeout, setting to false');
        setRegistrationLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [registrationLoading]);

  useEffect(() => {
    loadComments();
    checkRegistrationStatus();
    loadCreatorInfo();
  }, [event, userAddress, refreshTrigger]);

  // Load POA data for event creators and attendees
  const loadPOAData = async () => {
    if (!userAddress) return;
    
    const isCreator = userAddress.toLowerCase() === event.creator.toLowerCase();
    
    try {
      setPOALoading(true);
      
      // Load registrations for creators
      if (isCreator) {
        const registrations = await getEventRegistrations(event.id);
        setEventRegistrations(registrations);
      }
      
      // Load user's POA if they're registered
      if (isRegistered) {
        const poa = await getEventPOAForAttendee(event.id, userAddress);
        setUserPOA(poa);
      }
      
    } catch (error) {
      console.error('Failed to load POA data:', error);
    } finally {
      setPOALoading(false);
    }
  };

  useEffect(() => {
    loadPOAData();
  }, [event.id, userAddress, isRegistered, refreshTrigger]);

  const loadCreatorInfo = async () => {
    if (!event?.creator) return;
    
    try {
      const info = await getUserDisplayInfo(event.creator);
      setCreatorDisplayInfo(info);
    } catch (error) {
      console.error('Error loading creator info:', error);
    }
  };

  const checkRegistrationStatus = async () => {
    if (!event || !userAddress) {
      setIsRegistered(false);
      setRegistrationLoading(false);
      return;
    }

    setRegistrationLoading(true);
    try {
      const registered = await isUserRegisteredForEvent(event.id, userAddress);
      setIsRegistered(registered);
      console.log('✅ Registration status checked from database:', registered);
    } catch (error) {
      console.error('❌ Failed to check registration status from database:', error);
      // Fallback: check if user is in attendees array (legacy method)
      const isInAttendees = event.attendees.includes(userAddress);
      setIsRegistered(isInAttendees);
      console.log('🔄 Fallback: Using attendees array check:', isInAttendees);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const eventComments = await getEventComments(event.id);
      setComments(eventComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !event || !userAddress) return;
    
    setLoading(true);
    try {
      await addEventComment(event.id, userAddress, newComment.trim());
      setNewComment("");
      await loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCreator = userAddress && event.creator.toLowerCase() === userAddress.toLowerCase();
  const isAttendee = userAddress && isRegistered && !isCreator;
  const canRSVP = userAddress && !isCreator && !isRegistered;
  const isFull = event.maxAttendees && event.attendees.length >= event.maxAttendees;
  
  // Debug logging
  console.log('🔍 Event Details Debug:', {
    userAddress,
    eventCreator: event.creator,
    isCreator,
    isAttendee,
    canRSVP,
    activeTab
  });
  
  const formatDate = (date: string, time: string, endTime?: string) => {
    const eventDate = new Date(`${date}T${time}`);
    const baseFormat = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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

  // Utility functions for calendar integration
  function getGoogleCalendarUrl(event: Event) {
    const start = encodeURIComponent(`${event.date}T${event.time}`);
    const end = encodeURIComponent(`${event.date}T${event.endTime || event.time}`);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");
    const title = encodeURIComponent(event.title);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  }

  function getOutlookCalendarUrl(event: Event) {
    const start = encodeURIComponent(`${event.date}T${event.time}`);
    const end = encodeURIComponent(`${event.date}T${event.endTime || event.time}`);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");
    const title = encodeURIComponent(event.title);
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${details}&startdt=${start}&enddt=${end}&location=${location}`;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      {/* Header with Share Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4 sm:mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--app-foreground)] leading-tight">{event.title}</h1>
            {event.isPaid && (
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-yellow-100 text-yellow-800 self-start">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#2775CA" />
                  <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">$</text>
                </svg>
                {event.priceUSDC ? `${event.priceUSDC} USDC` : "Paid"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <EventSharing event={event} variant="default" />
        </div>
      </div>

      {/* Event Image */}
      {event.imageUrl && (
        <div className="w-full max-h-96 overflow-hidden rounded-xl">
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="object-cover w-full h-full"
          />
        </div>
      )}

      {/* Registration Section - TOP PRIORITY */}
      {!isCreator && (
        <div className="bg-gradient-to-r from-[var(--app-accent-light)]/10 to-transparent rounded-xl p-4 sm:p-6 border border-[var(--app-accent-light)]/30">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[var(--app-accent)] rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              
              {registrationLoading ? (
                <>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--app-foreground)] mb-2">
                    🔄 Checking Registration...
                  </h3>
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </>
              ) : isAttendee ? (
                <>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--app-foreground)] mb-2">
                    ✅ You're Registered!
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--app-foreground-muted)] mb-4">
                    You're all set for this event. We'll send you reminders as the date approaches.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => onCancelRSVPAction && onCancelRSVPAction(event.id)} 
                      className="w-full max-w-sm mx-auto"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Registration
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        const { getEventUrl } = require('@/lib/events');
                        const eventUrl = getEventUrl(event);
                        const eventDate = new Date(`${event.date}T${event.time}`);
                        const formattedDate = eventDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        });
                        const shareText = `✅ I just registered for an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formattedDate}\n📍 ${event.location}`;
                        const embedUrl = event.imageUrl || eventUrl;
                        openFarcasterCompose(shareText, embedUrl);
                      }}
                      className="w-full max-w-sm mx-auto"
                    >
                      <Icon name="share" size="sm" className="mr-2" />
                      Share on Farcaster
                    </Button>
                  </div>
                </>
              ) : isFull ? (
                <>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--app-foreground)] mb-2">
                    😔 Event Full
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--app-foreground-muted)] mb-4">
                    This event has reached its maximum capacity of {event.maxAttendees} attendees.
                  </p>
                  <div className="bg-[var(--app-gray)] rounded-lg p-3">
                    <p className="text-xs sm:text-sm text-[var(--app-foreground-muted)]">
                      Check back later or contact the organizer to see if spots become available.
                    </p>
                  </div>
                </>
              ) : !userAddress ? (
                <>
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-blue-800 mb-1">Connect Wallet</h3>
                      <p className="text-xs text-blue-600">Connect to register for this event</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--app-foreground)] mb-2">
                    Register for Event
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--app-foreground-muted)] mb-4">
                    Join {event.attendees.length} other{event.attendees.length !== 1 ? 's' : ''} attending this event. 
                    {event.maxAttendees && ` ${event.maxAttendees - event.attendees.length} spots remaining.`}
                  </p>
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => onRSVPAction && onRSVPAction(event.id)}
                    className="w-full max-w-sm mx-auto font-semibold"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    Register Now
                  </Button>
                  <p className="text-xs text-[var(--app-foreground-muted)] mt-2">
                    Free registration • Instant confirmation
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Event Creator Info */}
          {creatorDisplayInfo && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 sm:p-6 border border-purple-200">
              <div className="flex items-center gap-3 sm:gap-4">
                {creatorDisplayInfo.avatar ? (
                  <img 
                    src={creatorDisplayInfo.avatar} 
                    alt="Creator avatar" 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-purple-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
                    {creatorDisplayInfo.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                    <span className="text-xs sm:text-sm text-purple-600 font-medium">
                      {isCreator ? "You are the Event Creator" : "Event Creator"}
                    </span>
                    {isCreator && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 self-start">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        You
                      </span>
                    )}
                    {creatorDisplayInfo.isBaseName && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 self-start">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Base Verified
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-base sm:text-lg text-[var(--app-foreground)] truncate">
                    {creatorDisplayInfo.displayName}
                  </h4>
                  {creatorDisplayInfo.baseName && creatorDisplayInfo.isBaseName && (
                    <div className="inline-block mt-1 px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200">
                      {creatorDisplayInfo.baseName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Key Event Info */}
          <div className="bg-gradient-to-r from-[var(--app-accent-light)]/20 to-transparent rounded-2xl p-4 sm:p-6 border border-[var(--app-accent-light)]/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--app-accent)] rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="calendar" size="sm" className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-[var(--app-foreground-muted)]">Date & Time</p>
                  <p className="font-semibold text-[var(--app-foreground)] text-sm sm:text-base break-words">{formatDate(event.date, event.time, event.endTime)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--app-accent)] rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon name="location" size="sm" className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-[var(--app-foreground-muted)]">Location</p>
                  <p className="font-semibold text-[var(--app-foreground)] text-sm sm:text-base break-words">{event.location}</p>
                </div>
              </div>
            </div>
          </div>
          
          {event.description && (
            <div className="bg-[var(--app-card-bg)] rounded-xl p-4 sm:p-6 border border-[var(--app-card-border)]">
              <h3 className="font-bold text-base sm:text-lg mb-3 text-[var(--app-foreground)]">About this Event</h3>
              <p className="text-sm sm:text-base text-[var(--app-foreground-muted)] leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
          
          {/* Token Requirement Display */}
          <TokenRequirementDisplay event={event} showDetails={true} />
          
          {/* Event Support */}
          <EventSupportComponent 
            event={event} 
            userAddress={userAddress}
          />
          
          {/* Onchain Activity Summary */}
          <OnchainActivitySummary event={event} userAddress={userAddress} />
          
          {event.tags.length > 0 && (
            <div>
              <h3 className="font-bold text-base sm:text-lg mb-3 text-[var(--app-foreground)]">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, tagIndex) => (
                  <span key={`page-tag-${event.id}-${tagIndex}-${tag}`} className="bg-gradient-to-r from-[var(--app-accent)]/20 to-[var(--app-accent)]/10 text-[var(--app-accent)] px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium border border-[var(--app-accent)]/20">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event Management Actions */}
          {isCreator && (
            <div className="bg-[var(--app-card-bg)] rounded-xl p-4 sm:p-6 border border-[var(--app-card-border)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--app-accent)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon name="edit" size="sm" className="text-[var(--app-accent)]" />
                </div>
                <h3 className="font-bold text-base sm:text-lg text-[var(--app-foreground)]">Manage Event</h3>
              </div>
              
              <div className="space-y-4">
                {/* Primary Actions */}
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => onEditAction && onEditAction(event)} 
                    className="w-full text-sm px-4 py-3 border-[var(--app-accent)]/30 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 hover:border-[var(--app-accent)]/50 transition-all"
                  >
                    <Icon name="edit" size="sm" className="mr-2" />
                    Edit Event
                  </Button>
                  
                  {onDownloadCSVAction && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onDownloadCSVAction(event.id, event.title)}
                      className="w-full text-sm px-4 py-3 border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400 transition-all"
                    >
                      <span className="text-base mr-2">📊</span>
                      Download CSV
                    </Button>
                  )}
                </div>
                
                {/* Danger Actions */}
                <div className="border-t border-[var(--app-card-border)] pt-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onDeleteAction && onDeleteAction(event.id)} 
                      className="w-full text-sm px-4 py-3 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all"
                    >
                      <Icon name="trash" size="sm" className="mr-2" />
                      Delete Event
                    </Button>
                    
                    {/* TODO: Add cancel event functionality */}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-[var(--app-card-bg)] rounded-xl p-4 sm:p-6 border border-[var(--app-card-border)]">
            <h3 className="font-semibold text-base sm:text-lg mb-4">Discussion ({comments.length})</h3>
            {userAddress && (
              <form onSubmit={handleAddComment} className="mb-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent text-sm sm:text-base"
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={loading || !newComment.trim()} className="w-full sm:w-auto">
                    {loading ? '...' : 'Post'}
                  </Button>
                </div>
              </form>
            )}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-[var(--app-foreground-muted)] text-sm text-center py-4">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="bg-[var(--app-gray)] rounded-lg p-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                      <span className="font-medium text-sm truncate">{comment.authorName || comment.author}</span>
                      <span className="text-xs text-[var(--app-foreground-muted)]">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm break-words">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Creator Status Indicator */}
          {isCreator && (
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-4 sm:p-6 border border-green-500/30">
              <div className="text-center">
                <div className="text-4xl mb-2">👑</div>
                <h3 className="font-bold text-lg text-[var(--app-foreground)] mb-2">
                  You're the Event Creator!
                </h3>
                <p className="text-sm text-[var(--app-foreground-muted)] mb-4">
                  You can manage POA settings, check in attendees, and view analytics.
                </p>
                <div className="text-xs text-[var(--app-foreground-muted)]">
                  Look for the POA management tabs below ↓
                </div>
              </div>
            </div>
          )}

          {/* POA Notification for Attendees */}
          {!isCreator && userPOA && userPOA.status === 'issued' && (
            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-4 sm:p-6 border border-green-500/30">
              <div className="text-center">
                <div className="text-4xl mb-2">🎫</div>
                <h3 className="font-bold text-lg text-[var(--app-foreground)] mb-2">
                  POA Available!
                </h3>
                <p className="text-sm text-[var(--app-foreground-muted)] mb-4">
                  You have a Proof of Attendance waiting to be claimed.
                </p>
                <button
                  onClick={() => setActiveTab('my-poa')}
                  className="w-full py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all"
                >
                  Claim My POA 🎯
                </button>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-[var(--app-card-bg)] rounded-xl border border-[var(--app-card-border)] overflow-hidden">
            {/* Tab Headers */}
            <div className="flex overflow-x-auto border-b border-[var(--app-card-border)]">
              <button
                onClick={() => setActiveTab('attendees')}
                className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'attendees' 
                    ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] border-b-2 border-[var(--app-accent)]' 
                    : 'text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
                }`}
              >
                👥 Attendees ({event.attendees.length})
              </button>
              
              {isCreator && (
                <>
                  <button
                    onClick={() => setActiveTab('checkin')}
                    className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === 'checkin' 
                        ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] border-b-2 border-[var(--app-accent)]' 
                        : 'text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
                    }`}
                  >
                    ✅ Check-in
                  </button>
                  <button
                    onClick={() => setActiveTab('poa-settings')}
                    className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === 'poa-settings' 
                        ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] border-b-2 border-[var(--app-accent)]' 
                        : 'text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
                    }`}
                  >
                    🎫 POA Settings
                  </button>
                  <button
                    onClick={() => setActiveTab('poa-dashboard')}
                    className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === 'poa-dashboard' 
                        ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] border-b-2 border-[var(--app-accent)]' 
                        : 'text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
                    }`}
                  >
                    📊 POA Dashboard
                  </button>
                </>
              )}
              
              {!isCreator && userPOA && (
                <button
                  onClick={() => setActiveTab('my-poa')}
                  className={`px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === 'my-poa' 
                      ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)] border-b-2 border-[var(--app-accent)]' 
                      : 'text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]'
                  }`}
                >
                  🎯 My POA
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6">
              {activeTab === 'attendees' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-base sm:text-lg text-[var(--app-foreground)]">
                        Attendees ({event.attendees.length}{event.maxAttendees && ` / ${event.maxAttendees}`})
                      </h3>
                      <button
                        onClick={() => setShowAttendees(!showAttendees)}
                        className="text-[var(--app-accent)] text-sm hover:underline font-medium mt-1"
                      >
                        {showAttendees ? 'Hide' : 'Show'} attendee list
                      </button>
                    </div>
                    {event.maxAttendees && (
                      <div className="text-center sm:text-right">
                        <div className="text-sm text-[var(--app-foreground-muted)]">Capacity</div>
                        <div className="text-xl sm:text-2xl font-bold text-[var(--app-accent)]">
                          {event.attendees.length} / {event.maxAttendees}
                        </div>
                        <div className="w-full bg-[var(--app-gray)] rounded-full h-2 mt-2">
                          <div 
                            className="bg-[var(--app-accent)] h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min((event.attendees.length / event.maxAttendees) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {showAttendees && (
                    <div className="bg-[var(--app-gray)] rounded-lg p-4">
                      {event.attendees.length === 0 ? (
                        <p className="text-[var(--app-foreground-muted)] text-sm">No attendees yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {event.attendees.map((attendee, idx) => (
                            <div key={attendee + idx} className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-[var(--app-accent)] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {idx + 1}
                              </div>
                              <span className="font-mono text-xs sm:text-sm break-all min-w-0 flex-1">{attendee}</span>
                              {attendee === event.creator && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex-shrink-0">Creator</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* POA Components */}
              {activeTab === 'checkin' && isCreator && (
                <AttendeeCheckIn
                  event={event}
                  eventRegistrations={eventRegistrations}
                  userAddress={userAddress}
                  onCheckInComplete={(poa) => {
                    loadPOAData();
                  }}
                />
              )}

              {activeTab === 'poa-settings' && isCreator && (
                <CheckInSettings
                  event={event}
                  onSettingsUpdate={(settings) => {
                    console.log('POA settings updated:', settings);
                  }}
                />
              )}

              {activeTab === 'poa-dashboard' && isCreator && (
                <POADashboard
                  event={event}
                  userAddress={userAddress}
                />
              )}

              {activeTab === 'my-poa' && !isCreator && userPOA && userAddress && (
                <POAClaimCard
                  poa={userPOA}
                  event={event}
                  userAddress={userAddress}
                  onClaim={(poa) => {
                    setUserPOA(poa);
                  }}
                />
              )}
            </div>
          </div>

          {/* Calendar Integration Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => openUrl(getGoogleCalendarUrl(event))}
              className="inline-flex items-center justify-center px-3 py-2 rounded-full bg-[#4285F4] text-white text-xs font-semibold hover:bg-[#357ae8] transition"
            >
              <Icon name="calendar" size="sm" className="mr-1" /> Google Calendar
            </button>
            <button
              onClick={() => openUrl(getOutlookCalendarUrl(event))}
              className="inline-flex items-center justify-center px-3 py-2 rounded-full bg-[#0072C6] text-white text-xs font-semibold hover:bg-[#005fa3] transition"
            >
              <Icon name="calendar" size="sm" className="mr-1" /> Outlook Calendar
            </button>
          </div>

          {/* Attendee List for Event Hosts */}
          {isCreator && (
            <div className="bg-[var(--app-card-bg)] rounded-xl p-4 sm:p-6 border border-[var(--app-card-border)]">
              <EventAttendeesList eventId={event.id} isHost={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

