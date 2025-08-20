"use client";

import { useState, useEffect } from "react";
import { Button, Icon } from "../DemoComponents";
import { Event, EventComment, addEventComment, getEventComments, isUserRegisteredForEvent } from "@/lib/events";
import { TokenRequirementDisplay } from '../TokenGating';
import { OnchainActivitySummary, OnchainEventBadges } from '../OnchainStatusIndicators';
import { EventAttendeesList } from './EventAttendeesList';

// Enhanced Event Details Modal with comments
export function EnhancedEventDetailsModal({ 
  event, 
  onCloseAction, 
  userAddress, 
  onEditAction, 
  onDeleteAction, 
  onCancelRSVPAction,
  onCancelEventAction,
  onRSVPAction,
  onAddCommentAction,
  onDownloadCSVAction,
  refreshTrigger
}: {
  event: Event | null;
  onCloseAction: () => void;
  userAddress?: string;
  onEditAction?: (event: Event) => void;
  onDeleteAction?: (eventId: string) => void;
  onCancelRSVPAction?: (eventId: string) => void;
  onCancelEventAction?: (eventId: string) => void;
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

  useEffect(() => {
    if (event) {
      loadComments();
      checkRegistrationStatus();
    }
  }, [event, userAddress, refreshTrigger]);

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
      // On database error, assume not registered to avoid showing wrong state
      // This is safer than showing "registered" when we can't confirm
      setIsRegistered(false);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const loadComments = async () => {
    if (!event) return;
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

  if (!event) return null;

  const isCreator = userAddress && event.creator === userAddress;
  const isAttendee = userAddress && isRegistered && !isCreator;
  const canRSVP = userAddress && !isCreator && !isRegistered;
  const isFull = event.maxAttendees && event.attendees.length >= event.maxAttendees;
  
  const formatDate = (date: string, time: string) => {
    const eventDate = new Date(`${date}T${time}`);
    return eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Utility functions for calendar integration
  function getGoogleCalendarUrl(event: Event) {
    const start = encodeURIComponent(`${event.date}T${event.time}`);
    const end = encodeURIComponent(`${event.date}T${event.time}`); // For now, 1 hour duration can be added if needed
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");
    const title = encodeURIComponent(event.title);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  }

  function getOutlookCalendarUrl(event: Event) {
    const start = encodeURIComponent(`${event.date}T${event.time}`);
    const end = encodeURIComponent(`${event.date}T${event.time}`); // For now, 1 hour duration can be added if needed
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");
    const title = encodeURIComponent(event.title);
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${details}&startdt=${start}&enddt=${end}&location=${location}`;
  }

  // Debug log for image URL
  console.log('Event imageUrl:', event.imageUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[var(--app-background)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-2 border-[var(--app-card-border)] animate-scale-in">
        {event.imageUrl && (
          <div className="w-full max-h-48 overflow-hidden flex justify-center items-center bg-[var(--app-gray)] flex-shrink-0">
            <img 
              src={event.imageUrl} 
              alt={event.title} 
              className="object-cover w-full max-h-48"
              onError={(e) => console.error('Image failed to load:', event.imageUrl)}
              onLoad={() => console.log('Image loaded successfully:', event.imageUrl)}
            />
          </div>
        )}
        <div className="bg-gradient-to-r from-[var(--app-card-bg)] to-[var(--app-card-bg)]/95 border-b border-[var(--app-card-border)] p-6 flex justify-between items-center flex-shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[var(--app-foreground)] truncate">{event.title}</h2>
            <OnchainEventBadges event={event} size="md" variant="default" />
          </div>
          <div className="flex items-center gap-2">
          <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--app-accent)] hover:bg-[var(--app-accent-hover)] text-white transition-all duration-200"
              onClick={() => {
                const eventUrl = `${window.location.origin}/events/${event.id}`;
                const shareText = `Check out this event: ${event.title} on ${formatDate(event.date, event.time)} at ${event.location}`;
                if (navigator.share) {
                  navigator.share({ 
                    title: event.title, 
                    text: shareText,
                    url: eventUrl
                  });
                } else {
                  navigator.clipboard.writeText(`${shareText}\n\n${eventUrl}`).then(() => {
                    // You could add a toast notification here
                    alert('Event link copied to clipboard!');
                  });
                }
              }}
              title="Share Event"
            >
              <Icon name="share" size="sm" />
            </button>
            <button
              className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--app-gray)] hover:bg-[var(--app-gray-dark)] text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-all duration-200 text-xl font-bold"
            onClick={onCloseAction}
              title="Close"
          >
            ×
          </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-8">
            {/* Registration Section - TOP PRIORITY */}
            {!isCreator && (
              <div className="bg-gradient-to-r from-[var(--app-accent-light)]/10 to-transparent rounded-xl p-6 border border-[var(--app-accent-light)]/30">
                <div className="text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-[var(--app-accent)] rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    
                    {registrationLoading ? (
                    <>
                      <h3 className="text-xl font-bold text-[var(--app-foreground)] mb-2">
                        🔄 Checking Registration...
                      </h3>
                      <div className="flex items-center justify-center py-4">
                        <div className="w-6 h-6 border-2 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </>
                  ) : isAttendee ? (
                      <>
                        <h3 className="text-xl font-bold text-[var(--app-foreground)] mb-2">
                          ✅ You're Registered!
                        </h3>
                        <p className="text-[var(--app-foreground-muted)] mb-4">
                          You're all set for this event. We'll send you reminders as the date approaches.
                        </p>
                        <Button 
                          variant="outline" 
                          size="lg" 
                          onClick={() => onCancelRSVPAction && onCancelRSVPAction(event.id)} 
                          className="w-full max-w-xs"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel Registration
                        </Button>
                      </>
                    ) : isFull ? (
                      <>
                        <h3 className="text-xl font-bold text-[var(--app-foreground)] mb-2">
                          😔 Event Full
                        </h3>
                        <p className="text-[var(--app-foreground-muted)] mb-4">
                          This event has reached its maximum capacity of {event.maxAttendees} attendees.
                        </p>
                        <div className="bg-[var(--app-gray)] rounded-lg p-3">
                          <p className="text-sm text-[var(--app-foreground-muted)]">
                            Check back later or contact the organizer to see if spots become available.
                          </p>
                        </div>
                      </>
                    ) : !userAddress ? (
                      <>
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-blue-800 mb-1">Connect Wallet</h3>
                            <p className="text-xs text-blue-600">Connect to register for this event</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold text-[var(--app-foreground)] mb-2">
                          Register for Event
                        </h3>
                        <p className="text-[var(--app-foreground-muted)] mb-4">
                          Join {event.attendees.length} other{event.attendees.length !== 1 ? 's' : ''} attending this event. 
                          {event.maxAttendees && ` ${event.maxAttendees - event.attendees.length} spots remaining.`}
                        </p>
                        <Button 
                          variant="primary" 
                          size="lg" 
                          onClick={() => onRSVPAction && onRSVPAction(event.id)}
                          className="w-full max-w-xs font-semibold"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Key Event Info */}
            <div className="bg-gradient-to-r from-[var(--app-accent-light)]/20 to-transparent rounded-2xl p-6 border border-[var(--app-accent-light)]/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--app-accent)] rounded-full flex items-center justify-center">
                    <Icon name="calendar" size="sm" className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--app-foreground-muted)]">Date & Time</p>
                    <p className="font-semibold text-[var(--app-foreground)]">{formatDate(event.date, event.time)}</p>
                  </div>
            </div>
            
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--app-accent)] rounded-full flex items-center justify-center">
                    <Icon name="location" size="sm" className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-[var(--app-foreground-muted)]">Location</p>
                    <p className="font-semibold text-[var(--app-foreground)]">{event.location}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {event.description && (
              <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
                <h3 className="font-bold text-lg mb-3 text-[var(--app-foreground)]">About this Event</h3>
                <p className="text-[var(--app-foreground-muted)] leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
            
            {/* Token Requirement Display */}
            <TokenRequirementDisplay event={event} showDetails={true} />
            
            {/* Onchain Activity Summary */}
            <OnchainActivitySummary event={event} userAddress={userAddress} />
            
            {event.tags.length > 0 && (
              <div>
                <h3 className="font-bold text-lg mb-3 text-[var(--app-foreground)]">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, tagIndex) => (
                    <span key={`modal-tag-${event.id}-${tagIndex}-${tag}`} className="bg-gradient-to-r from-[var(--app-accent)]/20 to-[var(--app-accent)]/10 text-[var(--app-accent)] px-4 py-2 rounded-full text-sm font-medium border border-[var(--app-accent)]/20">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Attendees Section */}
            <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
              <div className="flex items-center justify-between mb-4">
              <div>
                  <h3 className="font-bold text-lg text-[var(--app-foreground)]">
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
                <div className="text-right">
                  <div className="text-sm text-[var(--app-foreground-muted)]">Capacity</div>
                    <div className="text-2xl font-bold text-[var(--app-accent)]">
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
                        <div className="w-6 h-6 bg-[var(--app-accent)] rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {idx + 1}
                        </div>
                        <span className="font-mono text-sm break-all">{attendee}</span>
                        {attendee === event.creator && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Creator</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Calendar Integration Buttons */}
          <div className="flex gap-2 mt-2">
            <a
              href={getGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#4285F4] text-white text-xs font-semibold hover:bg-[#357ae8] transition"
            >
              <Icon name="calendar" size="sm" className="mr-1" /> Google Calendar
            </a>
            <a
              href={getOutlookCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#0072C6] text-white text-xs font-semibold hover:bg-[#005fa3] transition"
            >
              <Icon name="calendar" size="sm" className="mr-1" /> Outlook Calendar
            </a>
          </div>

                        {/* Attendee List for Event Hosts */}
            {isCreator && (
                <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)] mb-6">
                  <EventAttendeesList eventId={event.id} isHost={true} />
                </div>
              )}



                     {/* Event Management Actions */}
           {isCreator && (
             <div className="bg-[var(--app-card-bg)] rounded-xl p-4 border border-[var(--app-card-border)]">
               <h3 className="font-bold text-base mb-3 text-[var(--app-foreground)]">
                 Manage Event
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                 <Button variant="outline" size="sm" onClick={() => onEditAction && onEditAction(event)} className="w-full text-xs px-2 py-1.5">
                   <Icon name="edit" size="sm" className="mr-1" />
                   <span className="hidden sm:inline">Edit Event</span>
                   <span className="sm:hidden">Edit</span>
                 </Button>
                 
                 {onDownloadCSVAction && (
                   <Button variant="outline" size="sm" onClick={() => onDownloadCSVAction(event.id, event.title)} className="w-full text-green-600 hover:bg-green-50 hover:text-green-700 text-xs px-2 py-1.5">
                     <span className="text-sm mr-1">📊</span>
                     <span className="hidden sm:inline">Download CSV</span>
                     <span className="sm:hidden">CSV</span>
                   </Button>
                 )}
                 
                 <Button variant="outline" size="sm" onClick={() => {
                   const eventUrl = `${window.location.origin}/events/${event.id}`;
                   const eventDate = new Date(`${event.date}T${event.time}`);
                   const formattedDate = eventDate.toLocaleDateString('en-US', {
                     weekday: 'short',
                     month: 'short',
                     day: 'numeric',
                     hour: 'numeric',
                     minute: '2-digit'
                   });
                   const shareText = `📅 Check out this event!\n\n🎯 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formattedDate}\n📍 ${event.location}`;
                   const embedUrl = event.imageUrl || eventUrl;
                   if (navigator.share) {
                     navigator.share({ 
                       title: event.title, 
                       text: shareText,
                       url: eventUrl
                     });
                   } else {
                     navigator.clipboard.writeText(`${shareText}\n\n${eventUrl}`).then(() => {
                       alert('Event link copied to clipboard!');
                     });
                   }
                 }} className="w-full text-purple-600 hover:bg-purple-50 hover:text-purple-700 text-xs px-2 py-1.5">
                   <Icon name="share" size="sm" className="mr-1" />
                   <span className="hidden sm:inline">Share Event</span>
                   <span className="sm:hidden">Share</span>
                 </Button>
                 
                 {onCancelEventAction && event.status !== 'cancelled' && status !== 'past' && (
                   <Button variant="outline" size="sm" onClick={() => onCancelEventAction(event.id)} className="w-full text-orange-600 hover:bg-orange-50 hover:text-orange-700 text-xs px-2 py-1.5">
                     <span className="text-xs mr-1">⚠️</span>
                     <span className="hidden sm:inline">Cancel Event</span>
                     <span className="sm:hidden">Cancel</span>
                   </Button>
                 )}
                 
                 <Button variant="ghost" size="sm" onClick={() => onDeleteAction && onDeleteAction(event.id)} className="w-full text-red-500 hover:bg-red-50 hover:text-red-600 text-xs px-2 py-1.5">
                   <Icon name="trash" size="sm" className="mr-1" />
                   <span className="hidden sm:inline">Delete Event</span>
                   <span className="sm:hidden">Delete</span>
                 </Button>
                 
                 {event.status === 'cancelled' && (
                   <div className="col-span-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">
                     <span className="text-xs">❌</span>
                     <span>Event Cancelled</span>
                   </div>
                 )}
               </div>
             </div>
           )}
          
          {/* Comments Section */}
          <div className="border-t border-[var(--app-card-border)] pt-6">
            <h3 className="font-semibold mb-4">Discussion ({comments.length})</h3>
            {userAddress && (
              <form onSubmit={handleAddComment} className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-transparent"
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={loading || !newComment.trim()}>
                    {loading ? '...' : 'Post'}
                  </Button>
                </div>
              </form>
            )}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-[var(--app-foreground-muted)] text-sm text-center py-4">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="bg-[var(--app-gray)] rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{comment.authorName || comment.author}</span>
                      <span className="text-xs text-[var(--app-foreground-muted)]">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
