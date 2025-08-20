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

  // Calculate statistics
  const totalRSVPs = useMemo(() => 
    createdEvents.reduce((sum, event) => sum + event.attendees.length, 0), 
    [createdEvents]);

  const averageAttendance = useMemo(() => 
    createdEvents.length > 0 ? Math.round(totalRSVPs / createdEvents.length) : 0, 
    [createdEvents, totalRSVPs]);

  if (!address) {
    return (
      <div className="flex items-center justify-center min-h-[500px] bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center space-y-8 max-w-md mx-auto p-8">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Connect Your Wallet
            </h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Connect your wallet to view and manage your events with our modern event platform
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <ConnectWallet>
              <Button
                variant="primary"
                size="lg"
                className="group relative font-semibold text-lg px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-300 shadow-xl hover:shadow-2xl rounded-2xl transform hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Connect Wallet
              </Button>
            </ConnectWallet>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-6">
      {/* Modern Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-3xl p-8 shadow-xl border border-blue-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-300/10 to-purple-300/10 rounded-full translate-y-24 -translate-x-24"></div>
        
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center gap-8">
          {/* Enhanced User Avatar */}
          <div className="flex-shrink-0 relative group">
            {userDisplayInfo?.avatar ? (
              <div className="relative">
                <img 
                  src={userDisplayInfo.avatar} 
                  alt="Profile avatar" 
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-3xl object-cover border-4 border-white shadow-2xl group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl lg:text-4xl shadow-2xl group-hover:scale-105 transition-transform duration-300">
                  {userDisplayInfo?.displayName ? userDisplayInfo.displayName.charAt(0).toUpperCase() : address.slice(2, 4).toUpperCase()}
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          
          {/* Enhanced User Info */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                  My Events
                </h1>
                <div className="flex items-center gap-3">
                  {userDisplayInfo?.isBaseName && (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified
                    </span>
                  )}
                  {userDisplayInfo?.isFarcasterUser && (
                    <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                      </svg>
                      Farcaster
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                Welcome back, <span className="font-semibold text-blue-600">
                  {userDisplayInfo?.isFarcasterUser && userDisplayInfo?.username 
                    ? `@${userDisplayInfo.username}` 
                    : userDisplayInfo?.displayName || 'Event Organizer'
                  }
                </span>! 
                Manage your events and track your RSVPs with our modern platform.
                {userDisplayInfo?.isFarcasterUser && userDisplayInfo?.fid && (
                  <span className="block text-sm text-gray-500 mt-1">
                    Farcaster ID: {userDisplayInfo.fid}
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Farcaster Badge - Show prominently if user has Farcaster */}
              {userDisplayInfo?.isFarcasterUser && userDisplayInfo?.username && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-violet-200 text-purple-800 text-sm font-semibold border border-purple-300 shadow-sm hover:shadow-md transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                  </svg>
                  @{userDisplayInfo.username}
                  {userDisplayInfo?.fid && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-200 rounded-full text-xs">
                      #{userDisplayInfo.fid}
                    </span>
                  )}
                </div>
              )}
              
              {/* Base Name Badge - Show if user has Base name but not Farcaster */}
              {userDisplayInfo?.baseName && userDisplayInfo.isBaseName && !userDisplayInfo?.isFarcasterUser && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 text-sm font-semibold border border-blue-300 shadow-sm hover:shadow-md transition-all duration-200">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {userDisplayInfo.baseName}
                </div>
              )}
              
              {/* Username Badge - Show if user has username but not Farcaster */}
              {userDisplayInfo?.username && !userDisplayInfo?.isFarcasterUser && (
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-700 text-sm font-medium border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  @{userDisplayInfo.username}
                </div>
              )}
              
              {/* NFT Collection Badge */}
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-200 text-purple-800 text-sm font-semibold border border-purple-300 shadow-sm hover:shadow-md transition-all duration-200">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                {loadingNFTs ? (
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <span>{nftCount} NFT{nftCount !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      

      {/* Modern Tab Navigation */}
      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-lg">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('created')}
            className={`group flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'created'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md'
            }`}
          >
            <svg className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'created' ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            Created ({activeEvents.length})
          </button>
                      <button
              onClick={() => setActiveTab('attending')}
              className={`group flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'attending'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'attending' ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upcoming ({upcomingEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`group flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'past'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md'
              }`}
            >
              <svg className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'past' ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Past ({pastEvents.length})
            </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`group flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'tickets'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:shadow-md'
            }`}
          >
            <svg className={`w-5 h-5 transition-transform duration-300 ${activeTab === 'tickets' ? 'scale-110' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            NFT Tickets
          </button>
        </div>
      </div>

      {/* Enhanced Tab Content */}
      <div className="space-y-8">
        {/* Created Events Tab */}
        {activeTab === 'created' && (
          <div className="space-y-8 animate-fade-in">
            {/* Active Events */}
            {activeEvents.length > 0 && (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Active Events</h3>
                    <p className="text-gray-600">Your upcoming and ongoing events</p>
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
              </div>
            )}

            {/* Cancelled Events */}
            {cancelledEvents.length > 0 && (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Cancelled Events</h3>
                    <p className="text-gray-600">Events that have been cancelled</p>
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

            {/* Enhanced Empty State */}
            {activeEvents.length === 0 && cancelledEvents.length === 0 && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-16 border border-blue-100 shadow-xl text-center">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">No Events Created Yet</h3>
                <p className="text-gray-600 text-xl mb-8 max-w-md mx-auto leading-relaxed">
                  Start creating amazing events and build your community with our modern platform!
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => window.location.href = '?tab=create'}
                  className="group font-semibold text-lg px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Your First Event
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Upcoming Events Tab */}
        {activeTab === 'attending' && (
          <div className="space-y-8 animate-fade-in">
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Upcoming Events</h3>
                    <p className="text-gray-600">Events you're attending soon</p>
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

            {/* Enhanced Empty State */}
            {upcomingEvents.length === 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-16 border border-green-100 shadow-xl text-center">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">No Upcoming Events</h3>
                <p className="text-gray-600 text-xl mb-8 max-w-md mx-auto leading-relaxed">
                  Start exploring events and RSVP to join the community!
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => window.location.href = '?tab=home'}
                  className="group font-semibold text-lg px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Discover Events
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Past Events Tab */}
        {activeTab === 'past' && (
          <div className="space-y-8 animate-fade-in">
            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Past Events</h3>
                    <p className="text-gray-600">Events you've attended</p>
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

            {/* Enhanced Empty State */}
            {pastEvents.length === 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-3xl p-16 border border-purple-100 shadow-xl text-center">
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl transform hover:scale-105 transition-transform duration-300">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-400 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">No Past Events</h3>
                <p className="text-gray-600 text-xl mb-8 max-w-md mx-auto leading-relaxed">
                  You haven't attended any events yet. Start exploring and join the community!
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => window.location.href = '?tab=home'}
                  className="group font-semibold text-lg px-10 py-4 bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Discover Events
                </Button>
              </div>
            )}
          </div>
        )}

        {/* NFT Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">NFT Ticket Collection</h3>
                <p className="text-gray-600">Your on-chain event tickets</p>
              </div>
            </div>
            <UserNFTTicketsCollection userAddress={address} />
          </div>
        )}
      </div>
    </div>
  );
}
