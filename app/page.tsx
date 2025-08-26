"use client";

import {
  useMiniKit,
  useAddFrame,
  useOpenUrl,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "./components/DemoComponents";
import { Icon } from "./components/DemoComponents";
import { Features } from "./components/DemoComponents";
import {
  EnhancedEventForm,
  EnhancedEventList,
  EnhancedEventDetailsModal,
  EventRegistrationForm,
  UserNFTTicketsCollection,
  MyEventsPage,
} from "./components/EventComponents";

import {
  createEvent,
  getAllEvents,
  updateEvent,
  cancelEvent,
  cancelRsvp,
  addEventComment,
  searchEvents,
  registerForEvent,
  getHostSignupCount,
  getEventRegistrations,
  generateEventRegistrationsCSV,
  downloadCSV,
} from "../lib/events";
import type { Event as LibEvent } from "../lib/events";
import { useAccount } from "wagmi";
import ProfileModal from "./components/ProfileModal";
import { Host, getHostByAddress } from "../lib/hosts";
import { getUserDisplayInfo } from "../lib/basenames";
import { getUserNFTTickets } from "../lib/events";
import { getComprehensiveUserProfile } from "../lib/farcaster";
import NotificationBanner, { useNotifications } from "./components/NotificationBanner";
import NotificationDemo from "./components/NotificationDemo";
import PushSetup from "./components/PushSetup";
import InAppBell from "./components/InAppBell";

// NFT Count Display Component
function NFTCountDisplay({ userAddress }: { userAddress: string }) {
  const [nftCount, setNftCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNFTCount = async () => {
      if (!userAddress) {
        setNftCount(0);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const tickets = await getUserNFTTickets(userAddress);
        setNftCount(tickets.length);
      } catch (error) {
        console.error('Error fetching NFT count:', error);
        setNftCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTCount();
  }, [userAddress]);

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-[var(--app-foreground-muted)]">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        <span>Loading NFT collection...</span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2 text-sm">
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-200">
        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <span className="font-semibold text-purple-700">
          {nftCount} NFT{nftCount !== 1 ? 's' : ''} collected from events
        </span>
      </div>
    </div>
  );
}

// Add Event type for local state

// Use the Event type from lib/events.ts
type Event = LibEvent;

function ProfilePage({ 
  address, 
  events, 
  onEditEvent, 
  onDeleteEvent, 
  onCancelEvent,
  onDownloadCSV 
}: { 
  address?: string | null, 
  events: Event[], 
  onEditEvent?: (event: Event) => void,
  onDeleteEvent?: (eventId: string) => void,
  onCancelEvent?: (eventId: string) => void,
  onDownloadCSV?: (eventId: string, eventTitle: string) => void
}) {
  const [profile, setProfile] = useState<Host | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
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

  useEffect(() => {
    const loadProfile = async () => {
      if (!address) return;
      setLoadingProfile(true);
      try {
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
        console.error('Error loading profile:', error);
        // Profile doesn't exist yet, that's okay
        setProfile(null);
        
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

    loadProfile();
  }, [address]);

  const handleProfileUpdated = (updatedProfile: Host) => {
    setProfile(updatedProfile);
  };

  if (!address) return <div className="p-6 text-center text-[var(--app-foreground-muted)]">Connect your wallet to view your profile.</div>;
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Enhanced Profile Card */}
      <div className="bg-gradient-to-br from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-[var(--app-glass-border)]">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--app-accent)] to-[var(--app-token-gate)] bg-clip-text text-transparent">
            Profile
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProfileModal(true)}
            icon={<Icon name="edit" size="sm" />}
            className="hover:bg-[var(--app-accent-light)] transition-colors"
          >
            Edit Profile
          </Button>
        </div>
        
        {loadingProfile ? (
          <div className="flex items-center justify-center gap-3 py-12 text-[var(--app-foreground-muted)]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent"></div>
            <span className="text-lg">Loading profile...</span>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col lg:flex-row items-start gap-8">
              {/* Avatar Section */}
              <div className="flex-shrink-0">
              {userDisplayInfo?.avatar ? (
                <img 
                  src={userDisplayInfo.avatar} 
                  alt="Profile avatar" 
                    className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl object-cover border-4 border-[var(--app-card-border)] shadow-2xl"
                />
              ) : (
                  <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-[var(--app-accent)] via-[var(--app-token-gate)] to-[var(--app-payment)] rounded-2xl flex items-center justify-center text-white font-bold text-3xl lg:text-4xl shadow-2xl">
                  {userDisplayInfo?.displayName ? userDisplayInfo.displayName.charAt(0).toUpperCase() : address.slice(2, 4).toUpperCase()}
                </div>
              )}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="space-y-3">
                  <h3 className="font-bold text-2xl lg:text-3xl text-[var(--app-foreground)]">
                    {userDisplayInfo?.displayName || 'Anonymous User'}
                  </h3>
                  
                  {/* Profile Source Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    {userDisplayInfo?.isBaseName && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Base Name Verified
                      </span>
                    )}
                    
                    {userDisplayInfo?.isFarcasterUser && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                        </svg>
                        Farcaster User
                      </span>
                    )}
                    
                    {userDisplayInfo?.source === 'farcaster' && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Profile from Farcaster
                      </span>
                    )}
                  </div>
                  
                  {/* Username Display */}
                  {userDisplayInfo?.username && (
                    <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 text-sm font-semibold border border-purple-200">
                      @{userDisplayInfo.username}
                    </div>
                  )}
                  
                  {userDisplayInfo?.baseName && userDisplayInfo.isBaseName && (
                    <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-sm font-semibold border border-blue-200">
                      {userDisplayInfo.baseName}
                    </div>
                  )}
                </div>
                
                <div className="bg-[var(--app-gray)] px-4 py-3 rounded-xl border border-[var(--app-card-border)] font-mono text-sm break-all">
                  {address}
                </div>
                
                <NFTCountDisplay userAddress={address} />
                
                {profile?.bio && (
                  <div className="bg-[var(--app-gray)] rounded-xl p-6 border border-[var(--app-card-border)]">
                    <p className="text-[var(--app-foreground-muted)] leading-relaxed text-lg">{profile.bio}</p>
                  </div>
                )}
              </div>
            </div>
            
            {!profile?.name && !profile?.bio && (
              <div className="text-center py-12 bg-gradient-to-r from-[var(--app-accent-light)]/10 to-transparent rounded-2xl border-2 border-dashed border-[var(--app-accent-light)]/30">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-token-gate)] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-[var(--app-foreground)] font-semibold text-xl mb-2">Complete Your Profile</p>
                  <p className="text-[var(--app-foreground-muted)] text-lg">Add your name and bio to personalize your experience</p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setShowProfileModal(true)}
                  className="font-semibold text-lg px-8 py-3"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-8">
        {/* Enhanced Event Management Summary */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-200 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-2xl text-gray-900">Event Management</h3>
              <p className="text-gray-600">Manage your events with ease</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-sm font-bold">✓</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">Active Events</span>
              </div>
              <span className="text-3xl font-bold text-green-600">
                {events.filter(e => e.creator === address && e.status !== 'cancelled').length}
              </span>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 text-sm font-bold">⚠️</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">Cancelled</span>
              </div>
              <span className="text-3xl font-bold text-orange-600">
                {events.filter(e => e.creator === address && e.status === 'cancelled').length}
              </span>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-blue-100 shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-bold">👥</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">Total RSVPs</span>
              </div>
              <span className="text-3xl font-bold text-blue-600">
                {events.filter(e => e.creator === address).reduce((sum, event) => sum + event.attendees.length, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Events I Created Section */}
        <div className="bg-gradient-to-br from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-[var(--app-glass-border)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-token-gate)] rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-xl text-[var(--app-foreground)]">Events I Created</h3>
            </div>
            <div className="text-sm text-[var(--app-foreground-muted)] bg-[var(--app-gray)] px-3 py-1 rounded-full">
              Click events to manage them
            </div>
          </div>
        <EnhancedEventList
          events={events.filter(e => e.creator === address)}
          onRSVPAction={() => {}}
          userAddress={address}
          onEventClickAction={() => {}}
          onDeleteEventAction={onDeleteEvent}
          onEditEventAction={onEditEvent}
          onCancelEventAction={onCancelEvent}
          onDownloadCSVAction={onDownloadCSV}
          showSearch={false}
        />
      </div>
        
        {/* Enhanced Events I RSVP'd To Section */}
        <div className="bg-gradient-to-br from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-[var(--app-glass-border)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-xl text-[var(--app-foreground)]">Events I RSVP&apos;d To</h3>
          </div>
        <EnhancedEventList
          events={events.filter(e => e.attendees.includes(address || "") && e.creator !== address)}
          onRSVPAction={() => {}}
          userAddress={address}
          onEventClickAction={() => {}}
          showSearch={false}
        />
      </div>

        {/* Enhanced NFT Tickets Collection */}
        <div className="bg-gradient-to-br from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-[var(--app-glass-border)]">
          <UserNFTTicketsCollection userAddress={address} />
        </div>
      </div>
      
      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        userAddress={address}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}

// HostsPage: shows recent hosts, number of events, and number of signups
function HostsPage({ events }: { events: Event[] }) {
  const [hostDisplayInfo, setHostDisplayInfo] = useState<Record<string, {
    displayName: string;
    avatar: string | null;
    isBaseName: boolean;
    baseName?: string;
    address: string;
  }>>({});
  const [signupCounts, setSignupCounts] = useState<Record<string, number>>({});
  const [loadingSignups, setLoadingSignups] = useState(false);

  // Aggregate hosts from events
  const hostStats = useMemo(() => {
    const stats: Record<string, { eventCount: number }> = {};
    events.forEach(event => {
      if (!stats[event.creator]) {
        stats[event.creator] = { eventCount: 0 };
      }
      stats[event.creator].eventCount += 1;
    });
    // Convert to array and sort by most recent (or most events)
    return Object.entries(stats)
      .map(([creator, data]) => ({ creator, ...data }))
      .sort((a, b) => b.eventCount - a.eventCount);
  }, [events]);

  // Load host profiles and Base names
  useEffect(() => {
    const loadHostProfiles = async () => {
      const displayInfo: Record<string, {
        displayName: string;
        avatar: string | null;
        isBaseName: boolean;
        baseName?: string;
        address: string;
      }> = {};
      for (const host of hostStats) {
        try {
          const profile = await getHostByAddress(host.creator);
          const userInfo = await getUserDisplayInfo(
            host.creator,
            profile?.name,
            profile?.avatarUrl
          );
          displayInfo[host.creator] = userInfo;
        } catch (error) {
          try {
            const userInfo = await getUserDisplayInfo(host.creator);
            displayInfo[host.creator] = userInfo;
          } catch {
            displayInfo[host.creator] = {
              displayName: `${host.creator.slice(0, 6)}...${host.creator.slice(-4)}`,
              avatar: null,
              isBaseName: false,
              address: host.creator
            };
          }
        }
      }
      setHostDisplayInfo(displayInfo);
    };
    if (hostStats.length > 0) {
      loadHostProfiles();
    }
  }, [hostStats]);

  // Load accurate signup counts for each host
  useEffect(() => {
    const loadSignupCounts = async () => {
      setLoadingSignups(true);
      const counts: Record<string, number> = {};
      await Promise.all(hostStats.map(async (host) => {
        counts[host.creator] = await getHostSignupCount(host.creator);
      }));
      setSignupCounts(counts);
      setLoadingSignups(false);
    };
    if (hostStats.length > 0) {
      loadSignupCounts();
    }
  }, [hostStats]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-br from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-[var(--app-glass-border)]">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-token-gate)] rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
      </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-[var(--app-accent)] to-[var(--app-token-gate)] bg-clip-text text-transparent">
              Event Hosts
            </h2>
            <p className="text-[var(--app-foreground-muted)] text-lg">Discover the community's most active event creators</p>
          </div>
        </div>
      </div>

      {/* Hosts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {hostStats.length === 0 && (
          <div className="text-center py-16 text-[var(--app-foreground-muted)] col-span-full">
            <div className="w-16 h-16 bg-[var(--app-gray)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Icon name="users" size="lg" className="opacity-50" />
            </div>
            <p className="text-lg font-medium">No hosts found</p>
            <p className="text-sm">Be the first to create an event!</p>
          </div>
        )}
        {hostStats.map((host, idx) => {
          const displayInfo = hostDisplayInfo[host.creator];
          const signupCount = signupCounts[host.creator];
          return (
            <div
              key={host.creator}
              className="bg-gradient-to-br from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm border border-[var(--app-glass-border)] rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col gap-4 relative group hover:scale-[1.02]"
            >
              <div className="flex items-start gap-6">
                {displayInfo?.avatar ? (
                  <img src={displayInfo.avatar} alt="Host avatar" className="w-16 h-16 rounded-2xl object-cover border-2 border-[var(--app-accent)] shadow-lg" />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-br from-[var(--app-accent)] via-[var(--app-token-gate)] to-[var(--app-payment)] rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {displayInfo?.displayName ? displayInfo.displayName.charAt(0).toUpperCase() : host.creator.slice(2, 4).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-xl text-[var(--app-foreground)] truncate">
                      {displayInfo?.displayName || formatAddress(host.creator)}
                    </span>
                    {displayInfo?.isBaseName && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Base Verified
                      </span>
                    )}
                  </div>
                  {displayInfo?.baseName && displayInfo.isBaseName && (
                    <div className="inline-block mb-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-sm font-semibold border border-blue-200">
                      {displayInfo.baseName}
                    </div>
                  )}
                  <div className="text-sm text-[var(--app-foreground-muted)] font-mono break-all bg-[var(--app-gray)] px-3 py-2 rounded-xl border border-[var(--app-card-border)]">
                    {formatAddress(host.creator)}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2 bg-gradient-to-r from-[var(--app-accent-light)] to-[var(--app-token-gate-bg)] text-[var(--app-accent)] px-4 py-2 rounded-xl text-sm font-semibold border border-[var(--app-accent)]/20">
                  <Icon name="star" size="sm" />
                  {host.eventCount} Events
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-4 py-2 rounded-xl text-sm font-semibold border border-green-200">
                  <Icon name="users" size="sm" />
                  {loadingSignups && signupCount === undefined ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    signupCount ?? 0
                  )} Signups
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const [frameAdded, setFrameAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const { addNotification } = useNotifications();
  
  // Handle URL parameters for tab navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const editParam = urlParams.get('edit');
      
      if (tabParam && ['home', 'my-events', 'create', 'hosts', 'profile'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
      
      if (editParam) {
        // Handle edit mode from event page
        setActiveTab('create');
        // You could load the event for editing here if needed
      }
    }
  }, []);

  const addFrame = useAddFrame();

  const { address } = useAccount();
  // Event state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState<Event | null>(null);
  const [error] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Add event handler
    const handleAddEvent = async (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Prevent duplicate submissions
      if (isSubmitting) return;
      setIsSubmitting(true);
      
      try {
        console.log('handleAddEvent called with:', event);
        const eventData = {
          ...event,
          creator: address || "",
          attendees: [],
          status: 'upcoming' as const
        };
        console.log('Creating event with data:', eventData);
        const newEvent = await createEvent(eventData);
        console.log('Event created successfully:', newEvent);
        setEvents((prev: Event[]) => [newEvent, ...prev]);
        setActiveTab("home"); // Go back to home tab
        setEditingEvent(null); // Clear editing state

        // Offer to share on Farcaster
        try {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const eventUrl = `${origin}/events/${newEvent.id}`;
          const eventDate = new Date(`${newEvent.date}T${newEvent.time}`);
          const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
          const shareText = `🎉 I just created an event!\n\n📅 ${newEvent.title}\n📝 ${newEvent.description.substring(0, 100)}${newEvent.description.length > 100 ? '...' : ''}\n🕒 ${formattedDate}\n📍 ${newEvent.location}`;
          if (typeof window !== 'undefined') {
            const shouldShare = window.confirm('Share your new event on Farcaster?');
            if (shouldShare) {
              const embedUrl = newEvent.imageUrl || eventUrl;
              openFarcasterCompose(shareText, embedUrl);
            }
          }
        } catch {}
      } catch (error) {
        console.error("Failed to create event:", error);
        // Show user-friendly error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to create event: ${errorMessage}. Please try again.`);
      } finally {
        setIsSubmitting(false);
      }
    };

  // Registration handler
  const handleRegister = async (eventId: string) => {
    if (!address) return;
    
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    setShowRegistrationForm(event);
  };

  // Handle registration form submission
  const handleRegistrationSubmit = async (userDetails: {name: string, email: string, phone?: string, bio?: string}, onchainFromChild?: { paymentTxHash?: `0x${string}` }) => {
    if (!showRegistrationForm || !address) return;
    
    try {
      // If paid event, initiate Base USDC transfer first and store tx hash
      let onchain: { paymentTxHash?: `0x${string}`, ticketNft?: { contract: `0x${string}`, tokenId: string, txHash: `0x${string}` } } | undefined
      if (showRegistrationForm.isPaid && showRegistrationForm.priceUSDC) {
        if (onchainFromChild?.paymentTxHash) {
          onchain = { paymentTxHash: onchainFromChild.paymentTxHash, ticketNft: undefined }
        } else {
        const { BASE_USDC_ADDRESS } = await import('@/lib/blockchain-base')
        const { ethers } = await import('ethers')

        if (typeof window === 'undefined' || !(window as any).ethereum) {
          throw new Error('Wallet not available')
        }

        const ethereum = (window as any).ethereum
        const baseChainHex = '0x2105' // 8453
        try {
          const current = await ethereum.request({ method: 'eth_chainId' })
          if (current?.toLowerCase() !== baseChainHex) {
            await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: baseChainHex }] })
          }
        } catch (e) {
          // Best-effort; user may already be on Base
        }

        const provider = new ethers.providers.Web3Provider(ethereum)
        const signer = provider.getSigner()

        const erc20Abi = [
          'function transfer(address to, uint256 amount) returns (bool)'
        ]

        const to = showRegistrationForm.creator
        const amount = ethers.BigNumber.from(Math.round(showRegistrationForm.priceUSDC * 1_000_000))
        const usdc = new ethers.Contract(BASE_USDC_ADDRESS, erc20Abi, signer)
        const tx = await usdc.transfer(to, amount)
        onchain = { paymentTxHash: tx.hash as `0x${string}`, ticketNft: undefined }
        }
      } else {
        // Free event: optionally log registration onchain if logger contract is configured
        const loggerAddress = process.env.NEXT_PUBLIC_ONCHAIN_REG_LOGGER as `0x${string}` | undefined
        if (loggerAddress) {
          if (typeof window === 'undefined' || !(window as any).ethereum) {
            throw new Error('Wallet not available')
          }
          const ethereum = (window as any).ethereum
          const baseChainHex = '0x2105'
          try {
            const current = await ethereum.request({ method: 'eth_chainId' })
            if (current?.toLowerCase() !== baseChainHex) {
              await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: baseChainHex }] })
            }
          } catch {}

          const { ethers } = await import('ethers')
          const provider = new ethers.providers.Web3Provider(ethereum)
          const signer = provider.getSigner()
          const abi = [
            'function register(bytes32 eventIdHash, address attendee) external'
          ]
          const contract = new ethers.Contract(loggerAddress, abi, signer)
          const eventIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(showRegistrationForm.id))
          const tx = await contract.register(eventIdHash, address)
          onchain = { paymentTxHash: tx.hash as `0x${string}`, ticketNft: undefined }
        }
      }

      // Optional: mint NFT ticket if configured (for both free and paid events)
      {
        const ticketContract = process.env.NEXT_PUBLIC_TICKET_NFT as `0x${string}` | undefined
        if (ticketContract && typeof window !== 'undefined' && (window as any).ethereum && address) {
          try {
            const { ethers } = await import('ethers')
            const ethereum = (window as any).ethereum
            // Ensure Base
            const baseChainHex = '0x2105'
            try {
              const current = await ethereum.request({ method: 'eth_chainId' })
              if (current?.toLowerCase() !== baseChainHex) {
                await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: baseChainHex }] })
              }
            } catch {}

            const provider = new ethers.providers.Web3Provider(ethereum)
            const signer = provider.getSigner()
            const abi = [
              'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
              'function mintTicket(address to, uint256 eventId, string tokenURI) external returns (uint256)'
            ]
            const contract = new ethers.Contract(ticketContract, abi, signer)
            const tokenUri = '' // Optional: point to IPFS ticket metadata
            const eventNumericId = Math.abs([...showRegistrationForm.id].reduce((acc, c) => acc + c.charCodeAt(0), 0))
            const tx = await contract.mintTicket(address, eventNumericId, tokenUri)
            let mintedTokenId = '0'
            try {
              const receipt = await tx.wait()
              const transferTopic = ethers.utils.id('Transfer(address,address,uint256)')
              const log = receipt?.logs?.find((l: any) => l.address?.toLowerCase() === ticketContract.toLowerCase() && l.topics?.[0] === transferTopic)
              if (log && log.topics && log.topics.length >= 4) {
                mintedTokenId = ethers.BigNumber.from(log.topics[3]).toString()
              }
            } catch {}

            onchain = {
              ...onchain,
              ticketNft: { contract: ticketContract, tokenId: mintedTokenId, txHash: tx.hash as `0x${string}` }
            }
          } catch (e) {
            console.warn('Ticket NFT mint skipped/failed:', e)
          }
        }
      }

      await registerForEvent(showRegistrationForm.id, address, userDetails, onchain);
      
      // Refresh events
      const updatedEvents = await getAllEvents();
      setEvents(updatedEvents);
      
      // Update selected event if it's currently open
      if (selectedEvent && selectedEvent.id === showRegistrationForm.id) {
        const updatedEvent = updatedEvents.find(e => e.id === showRegistrationForm.id);
        setSelectedEvent(updatedEvent || null);
      }
      
      setShowRegistrationForm(null);
      
      // Trigger refresh of registration status
      setRefreshTrigger(prev => prev + 1);
      
      // Show success message
      const successMessage = `🎉 Registration confirmed! You're all set for "${showRegistrationForm.title}". A receipt has been saved${onchain?.paymentTxHash ? ' (tx: ' + onchain.paymentTxHash.slice(0,10) + '...)' : ''}.`;
      
      // Send Farcaster notification to event creator
      try {
        if (showRegistrationForm.creator && showRegistrationForm.creator !== address) {
          // Import dynamically to avoid SSR issues
          const { notifyEventCreator } = await import('@/lib/farcaster');
          await notifyEventCreator(
            showRegistrationForm.creator,
            showRegistrationForm.title,
            address
          );
        }
      } catch (error) {
        console.log('Failed to send Farcaster notification:', error);
      }
      
      // Show local toast notification
      if (typeof window !== 'undefined') {
        // Create a temporary success notification
        const notification = document.createElement('div');
        notification.innerHTML = successMessage;
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm';
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
          notification.remove();
        }, 5000);

        // Offer to share registration on Farcaster
        try {
          const origin = window.location.origin;
          const eventUrl = `${origin}/events/${showRegistrationForm.id}`;
          const eventDate = new Date(`${showRegistrationForm.date}T${showRegistrationForm.time}`);
          const formattedDate = eventDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
          const shareText = `✅ I just registered for an event!\n\n📅 ${showRegistrationForm.title}\n📝 ${showRegistrationForm.description.substring(0, 100)}${showRegistrationForm.description.length > 100 ? '...' : ''}\n🕒 ${formattedDate}\n📍 ${showRegistrationForm.location}`;
          const shouldShare = window.confirm('Share your registration on Farcaster?');
          if (shouldShare) {
            const embedUrl = showRegistrationForm.imageUrl || eventUrl;
            openFarcasterCompose(shareText, embedUrl);
          }
        } catch {}
      }
    } catch (error) {
      console.error("Failed to register:", error);
      
      let errorMessage = 'Registration failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      // Show user-friendly error message
      if (typeof window !== 'undefined') {
        // Create a temporary error notification
        const notification = document.createElement('div');
        notification.innerHTML = `❌ ${errorMessage}`;
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm';
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
          notification.remove();
        }, 5000);
      }
    }
  };

  // RSVP handler (updated to use registration flow)
   const handleRSVP = async (eventId: string) => {
     if (!address) return;
     
     try {
       const event = events.find(e => e.id === eventId);
       if (!event) return;
       
       const isAlreadyAttending = event.attendees.includes(address);
       
       if (isAlreadyAttending) {
          await cancelRsvp(eventId, address);
          // Refresh events
          const updatedEvents = await getAllEvents();
          setEvents(updatedEvents);
        } else {
          // Use the new registration flow
          handleRegister(eventId);
        }
     } catch (error) {
       console.error("Failed to RSVP:", error);
     }
   };

  // Delete event handler
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events?eventId=${eventId}`, { 
        method: 'DELETE',
        headers: {
          'x-user-address': address || ''
        }
      });
      if (!res.ok) {
        let message = 'Failed to delete event';
        try {
          const data = await res.json();
          message = data?.error || message;
        } catch {
          // Response might be HTML if server crashed; keep default message
        }
        throw new Error(message);
      }
      setEvents((prev: Event[]) => prev.filter((event) => event.id !== eventId));
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Cancel event handler
  const handleCancelEvent = async (eventId: string) => {
    try {
      const cancelledEvent = await cancelEvent(eventId);
      setEvents((prev: Event[]) => 
        prev.map((event) => 
          event.id === eventId ? cancelledEvent : event
        )
      );
      // Update selected event if it's the one being cancelled
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(cancelledEvent);
      }
    } catch (error) {
      console.error("Failed to cancel event:", error);
    }
  };

  const openUrl = useOpenUrl();
  const openFarcasterCompose = useCallback(async (text: string, embedUrl?: string) => {
    try {
      // Try to use Farcaster SDK first
      const { composeCast } = await import('./lib/farcaster-sdk');
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

  // CSV download handler
  const handleDownloadCSV = async (eventId: string, eventTitle: string) => {
    try {
      // Construct the full URL for Farcaster environment
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${baseUrl}/api/events/${eventId}/registrations?address=${encodeURIComponent(address || '')}`;
      
      // If running inside Farcaster Mini app, prefer opening the URL
      if (context?.client?.added) {
        console.log('📱 Farcaster Mini app detected, opening download URL:', url);
        openUrl(url);
        console.log('✅ Download URL opened successfully in Farcaster');
        return;
      }

      // Fallback: browser download
      console.log('🌐 Browser environment detected, downloading directly');
      const res = await fetch(url, {
        headers: { 'x-user-address': address || '' }
      });
      
      if (res.status === 404) {
        alert('No registrations found for this event.');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to download CSV');
      }
      
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      const sanitizedTitle = eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${sanitizedTitle}_registrations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
      console.log('✅ CSV downloaded successfully in browser');
    } catch (error) {
      console.error("❌ Failed to download CSV:", error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to download registrations. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('Farcaster')) {
          errorMessage = 'Unable to download in Farcaster. Please try again or use a browser.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  // Cancel RSVP handler
   const handleCancelRSVP = async (eventId: string) => {
     if (!address) return;
     
     try {
        await cancelRsvp(eventId, address);
        // Refresh events
        const updatedEvents = await getAllEvents();
        setEvents(updatedEvents);
       
       // Update selected event if it's the one being modified
       if (selectedEvent?.id === eventId) {
         const updatedEvent = updatedEvents.find(e => e.id === eventId);
         setSelectedEvent(updatedEvent || null);
       }
     } catch (error) {
       console.error("Failed to cancel RSVP:", error);
     }
   };

  // Edit event handler
  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setActiveTab("create");
  };
  
  const handleUpdateEvent = async (updatedEvent: Omit<Event, "id" | "createdAt" | "updatedAt">) => {
      if (!editingEvent) return;
      
      try {
        const event = await updateEvent(editingEvent.id, updatedEvent);
        if (event) {
          setEvents(events.map(e => e.id === editingEvent.id ? event : e));
          setEditingEvent(null);
          setActiveTab("home");
        }
      } catch (error) {
        console.error("Failed to update event:", error);
      }
    };
  
  const handleAddComment = async (eventId: string, comment: string) => {
      if (!address) return;
      
      try {
        await addEventComment(eventId, address, comment);
      } catch (error) {
        console.error("Failed to add comment:", error);
      }
    };

  const loadEvents = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      console.log('Loading events...');
      const allEvents = await getAllEvents();
      console.log('Events loaded:', allEvents.length);
      setEvents(allEvents);
    } catch (error) {
      console.error("Failed to load events:", error);
      // Don't clear events on error, keep existing ones
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove isLoading from dependencies to prevent infinite loop

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Load events when frame is ready
  useEffect(() => {
    if (isFrameReady) {
      loadEvents();
    }
  }, [isFrameReady, loadEvents]);

  // Fallback: Load events after a delay if frame readiness is taking too long
  useEffect(() => {
    const timer = setTimeout(() => {
      if (events.length === 0 && !isLoading) {
        console.log('Fallback: Loading events without waiting for frame readiness');
        loadEvents();
      }
    }, 2000); // Wait 2 seconds then load events anyway

    return () => clearTimeout(timer);
  }, [events.length, isLoading, loadEvents]);

  // Handle wallet connection errors
  useEffect(() => {
    const handleWalletError = (error: any) => {
      console.warn('Wallet connection issue:', error);
      if (error?.message?.includes('MetaMask')) {
        setWalletError('MetaMask extension not found. Please install MetaMask to interact with events.');
      }
    };

    // Listen for wallet errors
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        if (event.reason?.message?.includes('MetaMask') || event.reason?.message?.includes('Failed to connect')) {
          handleWalletError(event.reason);
          event.preventDefault(); // Prevent console spam
        }
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleWalletError);
      }
    };
  }, []);
  
  const handleSearch = async (query: string, tags: string[]) => {
      setSearchQuery(query);
      setSelectedTags(tags);
      
      try {
        if (query || tags.length > 0) {
          let filteredEvents: LibEvent[] = [];
          
          if (query) {
            filteredEvents = await searchEvents(query);
          } else {
            filteredEvents = await getAllEvents();
          }
          
          // Filter by tags if provided
          if (tags.length > 0) {
            filteredEvents = filteredEvents.filter(event => 
              tags.some(tag => event.tags.includes(tag))
            );
          }
          
          setEvents(filteredEvents);
        } else {
          const allEvents = await getAllEvents();
          setEvents(allEvents);
        }
      } catch (error) {
        console.error("Failed to search events:", error);
      }
    };

  const handleAddFrame = useCallback(async () => {
    const frameAdded = await addFrame();
    setFrameAdded(Boolean(frameAdded));
  }, [addFrame]);

  useMemo(() => {
    if (context && !context.client.added) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddFrame}
          className="text-[var(--app-accent)] p-4"
          icon={<Icon name="plus" size="sm" />}
        >
          Save Frame
        </Button>
      );
    }

    if (frameAdded) {
      return (
        <div className="flex items-center space-x-1 text-sm font-medium text-[#0052FF] animate-fade-out">
          <Icon name="check" size="sm" className="text-[#0052FF]" />
          <span>Saved</span>
        </div>
      );
    }

    return null;
  }, [context, frameAdded, handleAddFrame]);

  // Bottom navigation items
  const navItems = [
    { key: "home", label: "Events", icon: <Icon name="star" size="md" /> },
    { key: "my-events", label: "My Events", icon: <Icon name="heart" size="md" /> },
    { key: "create", label: "Create", icon: <Icon name="plus" size="md" /> },
    { key: "hosts", label: "Hosts", icon: <Icon name="users" size="md" /> },
    { key: "profile", label: "Profile", icon: <Icon name="arrow-right" size="md" /> },
  ];

  // Show create form as a modal if activeTab === 'create'
  const showCreateModal = activeTab === "create";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[var(--app-background)] via-[var(--app-gray)] to-[var(--app-background)] font-sans text-[var(--app-foreground)]">
      {/* Enhanced Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--app-card-border)] bg-gradient-to-r from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 rounded-xl shadow-md" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-token-gate)] rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight">
              <span className="text-[var(--app-accent)]">Based</span>
              <span className="text-[var(--app-foreground-muted)]">Events</span>
            </span>
            <span className="text-xs text-[var(--app-foreground-muted)]">Find Your Next Event</span>
          </div>
        </div>
        <Wallet className="z-10 flex items-center gap-3">
          <ConnectWallet>
            <Name className="text-inherit" />
          </ConnectWallet>
          <div className="hidden sm:block">
            {/* In-app notifications bell */}
            <InAppBell />
          </div>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              <Name />
              <Address />
              <EthBalance />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </header>

      {/* Enhanced Main content */}
      <main className="flex-1 px-6 pb-24 pt-6 max-w-4xl mx-auto w-full overflow-x-hidden">
        {/* Register service worker and push subscription */}
        <PushSetup />
        {/* Notification Banner */}
        <NotificationBanner
          message="Welcome to Based Events! Create and manage your events with real-time notifications."
          type="info"
          autoDismiss={true}
          autoDismissDelay={8000}
        />
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin inline-block w-12 h-12 border-4 border-[var(--app-accent)] border-t-transparent rounded-full"></div>
              <div className="absolute inset-0 animate-ping inline-block w-12 h-12 border-2 border-[var(--app-accent)] rounded-full opacity-20"></div>
            </div>
            <p className="mt-6 text-lg text-[var(--app-foreground-muted)] font-medium">Loading events...</p>
            <p className="mt-2 text-sm text-[var(--app-foreground-muted)]">Please wait while we fetch the latest events</p>
          </div>
        )}
        
        {/* Enhanced Error State */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 mb-2">Error Loading Events</h3>
                <p className="text-red-700 text-sm mb-4">{error}</p>
            <button 
              onClick={loadEvents}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
              Try again
            </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced Wallet Error State */}
        {walletError && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 mb-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-2">Wallet Connection Issue</h3>
                <p className="text-yellow-700 text-sm mb-4">{walletError}</p>
            <button 
              onClick={() => setWalletError(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
              Dismiss
            </button>
              </div>
            </div>
          </div>
        )}
        
        {!isLoading && !error && activeTab === "home" && (
          <>
            {/* Enhanced Welcome Section */}
            <div className="mb-4">
              <div className="bg-gradient-to-br from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-[var(--app-glass-border)]">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="flex-1">

                    <p className="text-lg text-[var(--app-foreground-muted)] mb-4">
                      Discover and create amazing events on Base.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full text-sm">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium text-blue-800">NFT Tickets</span>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full text-sm">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="font-medium text-gray-800">Token Gating</span>
                      </div>
                      <div className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full text-sm">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        <span className="font-medium text-blue-800">USDC Payments</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Events Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[var(--app-foreground)]">Discover Events</h2>
                {address ? (
                  <Button
                    variant="primary"
                    icon={<Icon name="plus" size="md" />}
                    onClick={() => {
                      setActiveTab("create");
                      setEditingEvent(null);
                    }}
                    className="px-6 py-2 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    Create Event
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <div className="w-5 h-5 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <span className="text-blue-800 font-medium text-sm">Connect Wallet</span>
                  </div>
                )}
              </div>
              
            {isLoading && events.length === 0 ? (
                <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)]"></div>
                <span className="ml-2 text-[var(--app-foreground-muted)]">Loading events...</span>
              </div>
            ) : (
              <EnhancedEventList
                events={events as LibEvent[]}
                onRSVPAction={handleRSVP}
                userAddress={address}
                onEventClickAction={setSelectedEvent}
                onCancelRSVPAction={handleCancelRSVP}
                onDeleteEventAction={handleDeleteEvent}
                onEditEventAction={handleEditEvent}
                onDownloadCSVAction={handleDownloadCSV}
                onSearchAction={handleSearch}
                searchQuery={searchQuery}
                selectedTags={selectedTags}
              />
            )}
            
            {/* Notification System Demo */}
            <NotificationDemo />
            </div>
            {selectedEvent && (
              <EnhancedEventDetailsModal
                event={selectedEvent}
                onCloseAction={() => setSelectedEvent(null)}
                userAddress={address}
                onEditAction={handleEditEvent}
                onDeleteAction={handleDeleteEvent}
                onCancelRSVPAction={handleCancelRSVP}
                onRSVPAction={handleRSVP}
                onAddCommentAction={handleAddComment}
                onDownloadCSVAction={handleDownloadCSV}
                refreshTrigger={refreshTrigger}
              />
            )}
          </>
        )}
        {!isLoading && !error && activeTab === "my-events" && (
          <>
            <MyEventsPage
              address={address}
              events={events}
              onEditEvent={handleEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onCancelEvent={handleCancelEvent}
              onDownloadCSV={handleDownloadCSV}
              onEventClick={setSelectedEvent}
              onRSVP={handleRSVP}
              onCancelRSVP={handleCancelRSVP}
            />
            {selectedEvent && (
              <EnhancedEventDetailsModal
                event={selectedEvent}
                onCloseAction={() => setSelectedEvent(null)}
                userAddress={address}
                onEditAction={handleEditEvent}
                onDeleteAction={handleDeleteEvent}
                onCancelRSVPAction={handleCancelRSVP}
                onRSVPAction={handleRSVP}
                onAddCommentAction={handleAddComment}
                onDownloadCSVAction={handleDownloadCSV}
                refreshTrigger={refreshTrigger}
              />
            )}
          </>
        )}

        {!isLoading && !error && activeTab === "hosts" && <HostsPage events={events} />}
        {!isLoading && !error && activeTab === "profile" && (
          <ProfilePage 
            address={address} 
            events={events} 
            onEditEvent={handleEditEvent}
            onDeleteEvent={handleDeleteEvent}
            onCancelEvent={handleCancelEvent}
            onDownloadCSV={handleDownloadCSV}
          />
        )}
        {activeTab === "features" && <Features setActiveTab={setActiveTab} />}
        {/* Enhanced Create Event Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-br from-[var(--app-card-bg)] to-[var(--app-glass-bg)] backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative border border-[var(--app-glass-border)]">
              <button
                className="absolute top-4 right-4 w-8 h-8 bg-[var(--app-gray)] hover:bg-[var(--app-gray-dark)] rounded-full flex items-center justify-center text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors"
                onClick={() => {
                  setActiveTab("home");
                  setEditingEvent(null);
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-[var(--app-accent)] to-[var(--app-token-gate)] bg-clip-text text-transparent">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <p className="text-[var(--app-foreground-muted)] mt-2">
                  {editingEvent ? 'Update your event details below' : 'Fill in the details to create your event'}
                </p>
              </div>
              <EnhancedEventForm
                onSubmitAction={editingEvent ? handleUpdateEvent : handleAddEvent}
                onCancelAction={() => {
                  setActiveTab("home");
                  setEditingEvent(null);
                }}
                initialEvent={editingEvent}
                isEditing={!!editingEvent}
              />
            </div>
          </div>
        )}
        
        {/* Event Registration Form */}
        {showRegistrationForm && (
          <EventRegistrationForm
            event={showRegistrationForm}
            onRegisterAction={handleRegistrationSubmit}
            onCancelAction={() => setShowRegistrationForm(null)}
          />
        )}
      </main>

      {/* Enhanced Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-[var(--app-card-border)] shadow-2xl flex justify-around items-center h-20 max-w-4xl mx-auto w-full">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`flex flex-col items-center justify-center flex-1 py-3 transition-all duration-300 relative group ${
              activeTab === item.key 
                ? "text-[var(--app-accent)]" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
            }`}
            onClick={() => {
              setActiveTab(item.key);
              if (item.key === "create") setEditingEvent(null);
            }}
          >
            <div className={`relative ${activeTab === item.key ? 'scale-110' : 'group-hover:scale-105'} transition-transform duration-300`}>
            {item.icon}
              {activeTab === item.key && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--app-accent)] rounded-full animate-pulse"></div>
              )}
            </div>
            <span className={`text-xs mt-1 font-medium transition-all duration-300 ${
              activeTab === item.key ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
            }`}>
              {item.label}
            </span>
            {activeTab === item.key && (
              <div className="absolute bottom-0 w-8 h-1 bg-gradient-to-r from-[var(--app-accent)] to-[var(--app-token-gate)] rounded-t-full"></div>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
