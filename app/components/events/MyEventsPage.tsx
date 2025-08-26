"use client";

import { useState, useMemo, useEffect } from "react";
import { Button, Icon } from "../DemoComponents";
import { Event } from "@/lib/events";
import { EnhancedEventList } from "./EventList";
import { UserNFTTicketsCollection } from "./UserNFTTicketsCollection";
import { OnchainEventBadges } from '../OnchainStatusIndicators';
import { getUserDisplayInfo } from "@/lib/basenames";
import { getHostByAddress, Host } from "@/lib/hosts";
import { ConnectWallet } from "@coinbase/onchainkit/wallet";
import { getComprehensiveUserProfile } from "@/lib/farcaster";
import EventUpdateNotification from '../EventUpdateNotification';

interface MyEventsPageProps {
  address?: string | null;
  events: Event[];
  onEditEvent?: (event: Event) => void;
  onDeleteEvent?: (eventId: string) => void;
  onCancelEvent?: (eventId: string) => void;
  onDownloadCSV?: (eventId: string, eventTitle: string) => void;
  onEventClick?: (event: Event) => void;
  onRSVP?: (eventId: string) => void;
  onCancelRSVP?: (eventId: string) => void;
}

export function MyEventsPage({
  address,
  events,
  onEditEvent,
  onDeleteEvent,
  onCancelEvent,
  onDownloadCSV,
  onEventClick,
  onRSVP,
  onCancelRSVP
}: MyEventsPageProps) {
  const [activeTab, setActiveTab] = useState<'created' | 'attending' | 'past' | 'tickets'>('created');
  const [userDisplayInfo, setUserDisplayInfo] = useState<{
    displayName: string;
    avatar: string | null;
    isBaseName: boolean;
    baseName?: string;
    address: string;
    username: string | null;
    fid: number | null;
    isFarcasterUser: boolean;
    source: 'farcaster' | 'local' | 'fallback';
  } | null>(null);
  const [profile, setProfile] = useState<Host | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [nftCount, setNftCount] = useState<number>(0);
  const [loadingNFTs, setLoadingNFTs] = useState(false);

  // Load user profile and display info
  useEffect(() => {
    const loadUserInfo = async () => {
      if (!address) return;
      
      setLoadingProfile(true);
      try {
        // Load host profile
        const hostProfile = await getHostByAddress(address);
        setProfile(hostProfile);
        
        // Get comprehensive user profile including Farcaster data
        const comprehensiveProfile = await getComprehensiveUserProfile(
          address,
          {
            name: hostProfile?.name,
            bio: hostProfile?.bio,
            avatarUrl: hostProfile?.avatarUrl
          }
        );
        
        // Combine with Base name info
        const baseNameInfo = await getUserDisplayInfo(
          address,
          comprehensiveProfile.displayName,
          comprehensiveProfile.avatar
        );
        
        setUserDisplayInfo({
          ...baseNameInfo,
          username: comprehensiveProfile.username,
          fid: comprehensiveProfile.fid,
          isFarcasterUser: comprehensiveProfile.isFarcasterUser,
          source: comprehensiveProfile.source
        });
      } catch (error) {
        console.error('Error loading user info:', error);
        // Still try to get comprehensive profile info
        try {
          const comprehensiveProfile = await getComprehensiveUserProfile(address);
          const baseNameInfo = await getUserDisplayInfo(address);
          
          setUserDisplayInfo({
            ...baseNameInfo,
            username: comprehensiveProfile.username,
            fid: comprehensiveProfile.fid,
            isFarcasterUser: comprehensiveProfile.isFarcasterUser,
            source: comprehensiveProfile.source
          });
        } catch (fallbackError) {
          console.error('Error loading fallback profile:', fallbackError);
        }
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUserInfo();
  }, [address]);

  // Load NFT count
  useEffect(() => {
    const loadNFTCount = async () => {
      if (!address) {
        setNftCount(0);
        return;
      }
      
      setLoadingNFTs(true);
      try {
        const { getUserNFTTickets } = await import('@/lib/events');
        const tickets = await getUserNFTTickets(address);
        setNftCount(tickets.length);
      } catch (error) {
        console.error('Error loading NFT count:', error);
        setNftCount(0);
      } finally {
        setLoadingNFTs(false);
      }
    };

    loadNFTCount();
  }, [address]);

  // Filter events
  const createdEvents = useMemo(() => 
    events.filter(e => e.creator === address), [events, address]);
  
  const attendingEvents = useMemo(() => 
    events.filter(e => e.attendees.includes(address || "") && e.creator !== address), 
    [events, address]);

  const activeEvents = useMemo(() => 
    createdEvents.filter(e => e.status !== 'cancelled'), [createdEvents]);
  
  const cancelledEvents = useMemo(() => 
    createdEvents.filter(e => e.status === 'cancelled'), [createdEvents]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return attendingEvents.filter(e => {
      const eventDate = new Date(`${e.date}T${e.time}`);
      return eventDate > now;
    });
  }, [attendingEvents]);

  const pastEvents = useMemo(() => {
    const now = new Date();
    return attendingEvents.filter(e => {
      const eventDate = new Date(`${e.date}T${e.time}`);
      return eventDate <= now;
    });
  }, [attendingEvents]);

  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-[200px] bg-white p-3">
        <div className="text-center space-y-3 max-w-sm mx-auto">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-gray-900">
              Connect Your Wallet
            </h3>
            <p className="text-gray-600 text-xs">
              Connect your wallet to view and manage your events
            </p>
          </div>
          <div className="pt-1">
            <ConnectWallet>
              <Button
                variant="primary"
                size="sm"
                className="font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                Connect Wallet
              </Button>
            </ConnectWallet>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full mx-auto p-3">
      {/* Compact Header */}
      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {userDisplayInfo?.avatar ? (
              <img 
                src={userDisplayInfo.avatar} 
                alt="Profile avatar" 
                className="w-10 h-10 rounded-lg object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-base">
                {userDisplayInfo?.displayName ? userDisplayInfo.displayName.charAt(0).toUpperCase() : address.slice(2, 4).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-base font-bold text-gray-900">
                My Events
              </h1>
              {userDisplayInfo?.isBaseName && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Verified
                </span>
              )}
              {userDisplayInfo?.isFarcasterUser && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Farcaster
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Welcome back, <span className="font-medium text-blue-600">
                {userDisplayInfo?.isFarcasterUser && userDisplayInfo?.username 
                  ? `@${userDisplayInfo.username}` 
                  : userDisplayInfo?.displayName || 'Event Organizer'
                }
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Compact Tab Navigation */}
      <div className="bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('created')}
            className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
              activeTab === 'created'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <span className="truncate">Created</span>
            <span className={`${activeTab === 'created' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'} inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1.5 rounded-full text-[10px] font-semibold`}>
              {activeEvents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('attending')}
            className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
              activeTab === 'attending'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">Upcoming</span>
            <span className={`${activeTab === 'attending' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'} inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1.5 rounded-full text-[10px] font-semibold`}>
              {upcomingEvents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
              activeTab === 'past'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">Past</span>
            <span className={`${activeTab === 'past' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'} inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1.5 rounded-full text-[10px] font-semibold`}>
              {pastEvents.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
              activeTab === 'tickets'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span className="truncate">Tickets</span>
            <span className={`${activeTab === 'tickets' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'} inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1.5 rounded-full text-[10px] font-semibold`}>
              {nftCount}
            </span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-3">
        {/* Created Events Tab */}
        {activeTab === 'created' && (
          <div className="space-y-3">
            {/* Active Events */}
            {activeEvents.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Active Events</h3>
                    <p className="text-xs text-gray-600">Your upcoming and ongoing events</p>
                  </div>
                </div>
                <EnhancedEventList
                  events={activeEvents}
                  onRSVPAction={onRSVP || (() => {})}
                  userAddress={address}
                  onEventClickAction={onEventClick}
                  onDeleteEventAction={onDeleteEvent}
                  onEditEventAction={onEditEvent}
                  onCancelEventAction={onCancelEvent}
                  onDownloadCSVAction={onDownloadCSV}
                  showSearch={false}
                />
                
                {/* Quick Update Notifications for Active Events */}
                {activeEvents.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-semibold text-blue-800">Quick Event Updates</h4>
                    </div>
                    <p className="text-xs text-blue-700 mb-3">
                      Send notifications to your event attendees about schedule changes, location updates, or important announcements.
                    </p>
                    <div className="space-y-3">
                      {activeEvents.slice(0, 3).map((event) => (
                        <div key={event.id} className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-sm font-medium text-gray-900 truncate">{event.title}</h5>
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                              {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <EventUpdateNotification
                            eventId={event.id}
                            eventTitle={event.title}
                            eventDate={event.date}
                            attendeeAddresses={event.attendees.map(attendee => attendee)}
                            onUpdateSent={(results) => {
                              console.log(`Update sent for ${event.title}:`, results);
                            }}
                          />
                        </div>
                      ))}
                      {activeEvents.length > 3 && (
                        <div className="text-center">
                          <p className="text-xs text-blue-600">
                            +{activeEvents.length - 3} more events with update capabilities
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cancelled Events */}
            {cancelledEvents.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-gray-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Cancelled Events</h3>
                    <p className="text-xs text-gray-600">Events that have been cancelled</p>
                  </div>
                </div>
                <EnhancedEventList
                  events={cancelledEvents}
                  onRSVPAction={onRSVP || (() => {})}
                  userAddress={address}
                  onEventClickAction={onEventClick}
                  onDeleteEventAction={onDeleteEvent}
                  onEditEventAction={onEditEvent}
                  onCancelEventAction={onCancelEvent}
                  onDownloadCSVAction={onDownloadCSV}
                  showSearch={false}
                />
              </div>
            )}

            {/* Empty State */}
            {activeEvents.length === 0 && cancelledEvents.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">No Events Created Yet</h3>
                <p className="text-gray-600 text-xs mb-3">
                  Start creating amazing events and build your community!
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.href = '?tab=create'}
                  className="font-medium px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  Create Your First Event
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Events Tab */}
        {activeTab === 'attending' && (
          <div className="space-y-3">
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Upcoming Events</h3>
                    <p className="text-xs text-gray-600">Events you're attending soon</p>
                  </div>
                </div>
                <EnhancedEventList
                  events={upcomingEvents}
                  onRSVPAction={onRSVP || (() => {})}
                  userAddress={address}
                  onEventClickAction={onEventClick}
                  onCancelRSVPAction={onCancelRSVP}
                  showSearch={false}
                />
              </div>
            )}

            {/* Empty State */}
            {upcomingEvents.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-center">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">No Upcoming Events</h3>
                <p className="text-gray-600 text-xs mb-3">
                  Start exploring events and RSVP to join the community!
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.href = '?tab=home'}
                  className="font-medium px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                >
                  Discover Events
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Past Events Tab */}
        {activeTab === 'past' && (
          <div className="space-y-3">
            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Past Events</h3>
                    <p className="text-xs text-gray-600">Events you've attended</p>
                  </div>
                </div>
                <EnhancedEventList
                  events={pastEvents}
                  onRSVPAction={onRSVP || (() => {})}
                  userAddress={address}
                  onEventClickAction={onEventClick}
                  showSearch={false}
                />
              </div>
            )}

            {/* Empty State */}
            {pastEvents.length === 0 && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">No Past Events</h3>
                <p className="text-gray-600 text-xs mb-3">
                  You haven't attended any events yet. Start exploring and join the community!
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.href = '?tab=home'}
                  className="font-medium px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                >
                  Discover Events
                </Button>
              </div>
            )}
          </div>
        )}

        {/* NFT Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">NFT Ticket Collection</h3>
                <p className="text-xs text-gray-600">Your on-chain event tickets</p>
              </div>
            </div>
            <UserNFTTicketsCollection userAddress={address} />
          </div>
        )}
      </div>
    </div>
  );
}
