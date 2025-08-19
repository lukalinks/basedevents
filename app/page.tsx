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
  } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!address) return;
      setLoadingProfile(true);
      try {
        const hostProfile = await getHostByAddress(address);
        setProfile(hostProfile);
        
        // Get Base name and display info
        const displayInfo = await getUserDisplayInfo(
          address,
          hostProfile?.name,
          hostProfile?.avatarUrl
        );
        setUserDisplayInfo(displayInfo);
      } catch (error) {
        console.error('Error loading profile:', error);
        // Profile doesn't exist yet, that's okay
        setProfile(null);
        
        // Still try to get Base name info
        try {
          const displayInfo = await getUserDisplayInfo(address);
          setUserDisplayInfo(displayInfo);
        } catch (baseError) {
          console.error('Error loading Base name:', baseError);
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
    <div className="space-y-6">
      <div className="bg-[var(--app-card-bg)] rounded-xl p-6 shadow mb-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Profile</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowProfileModal(true)}
            icon={<Icon name="edit" size="sm" />}
          >
            Edit Profile
          </Button>
        </div>
        
        {loadingProfile ? (
          <div className="flex items-center justify-center gap-3 py-8 text-[var(--app-foreground-muted)]">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent"></div>
            <span>Loading profile...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-6">
              {userDisplayInfo?.avatar ? (
                <img 
                  src={userDisplayInfo.avatar} 
                  alt="Profile avatar" 
                  className="w-20 h-20 rounded-full object-cover border-4 border-[var(--app-card-border)] shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent)]/80 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {userDisplayInfo?.displayName ? userDisplayInfo.displayName.charAt(0).toUpperCase() : address.slice(2, 4).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="mb-2">
                  <h3 className="font-bold text-xl text-[var(--app-foreground)] mb-1">
                    {userDisplayInfo?.displayName || 'Anonymous User'}
                  </h3>
                  {userDisplayInfo?.isBaseName && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Base Name
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-sm text-[var(--app-foreground-muted)] break-all font-mono bg-[var(--app-gray)] px-3 py-2 rounded-lg">
                  {address}
                </div>
                <NFTCountDisplay userAddress={address} />
                {profile?.bio && (
                  <div className="mt-4 bg-[var(--app-gray)] rounded-xl p-4 border border-[var(--app-card-border)]">
                    <p className="text-[var(--app-foreground-muted)] leading-relaxed">{profile.bio}</p>
                  </div>
                )}
              </div>
            </div>
            
            {!profile?.name && !profile?.bio && (
              <div className="text-center py-8 bg-gradient-to-r from-[var(--app-accent-light)]/10 to-transparent rounded-xl border border-[var(--app-accent-light)]/20">
                <div className="mb-4">
                  <div className="w-12 h-12 bg-[var(--app-accent)]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-[var(--app-foreground)] font-medium mb-1">Complete Your Profile</p>
                  <p className="text-sm text-[var(--app-foreground-muted)]">Add your name and bio to personalize your experience</p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setShowProfileModal(true)}
                  className="font-medium"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-8">
        {/* Event Management Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-xl text-gray-900">Event Management</h3>
              <p className="text-gray-600 text-sm">Manage your events with ease</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                <span className="text-sm font-medium text-gray-900">Active Events</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {events.filter(e => e.creator === address && e.status !== 'cancelled').length}
              </span>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 text-xs">⚠️</span>
                </div>
                <span className="text-sm font-medium text-gray-900">Cancelled</span>
              </div>
              <span className="text-2xl font-bold text-orange-600">
                {events.filter(e => e.creator === address && e.status === 'cancelled').length}
              </span>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-xs">👥</span>
                </div>
                <span className="text-sm font-medium text-gray-900">Total RSVPs</span>
              </div>
              <span className="text-2xl font-bold text-blue-600">
                {events.filter(e => e.creator === address).reduce((sum, event) => sum + event.attendees.length, 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--app-accent)]/20 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--app-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-[var(--app-foreground)]">Events I Created</h3>
            </div>
            <div className="text-sm text-[var(--app-foreground-muted)]">
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
        
        <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-[var(--app-foreground)]">Events I RSVP&apos;d To</h3>
          </div>
        <EnhancedEventList
          events={events.filter(e => e.attendees.includes(address || "") && e.creator !== address)}
          onRSVPAction={() => {}}
          userAddress={address}
          onEventClickAction={() => {}}
          showSearch={false}
        />
      </div>

        {/* NFT Tickets Collection */}
        <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
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
    <div className="space-y-8 p-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold tracking-tight">Recent Hosts</h2>
        <div className="flex-1 border-t border-[var(--app-card-border)] ml-4" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {hostStats.length === 0 && (
          <div className="text-center py-8 text-[var(--app-foreground-muted)] col-span-full">
            <Icon name="users" size="lg" className="mx-auto mb-2 opacity-50" />
            <p>No hosts found.</p>
          </div>
        )}
        {hostStats.map((host, idx) => {
          const displayInfo = hostDisplayInfo[host.creator];
          const signupCount = signupCounts[host.creator];
          return (
            <div
              key={host.creator}
              className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-shadow flex flex-col gap-3 relative group"
            >
              <div className="flex items-center gap-4 mb-2">
                {displayInfo?.avatar ? (
                  <img src={displayInfo.avatar} alt="Host avatar" className="w-14 h-14 rounded-full object-cover border-2 border-[var(--app-accent)] shadow" />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-[var(--app-accent)] to-[var(--app-accent)]/80 rounded-full flex items-center justify-center text-white font-bold text-xl shadow">
                    {displayInfo?.displayName ? displayInfo.displayName.charAt(0).toUpperCase() : host.creator.slice(2, 4).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-lg text-[var(--app-foreground)] truncate">
                      {displayInfo?.displayName || formatAddress(host.creator)}
                    </span>
                    {displayInfo?.isBaseName && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Base
                      </span>
                    )}
                  </div>
                  {displayInfo?.baseName && (
                    <div className="inline-block mt-0.5 mb-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                      {displayInfo.baseName}
                    </div>
                  )}
                  <div className="text-xs text-[var(--app-foreground-muted)] font-mono break-all bg-[var(--app-gray)] px-2 py-1 rounded">
                    {formatAddress(host.creator)}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1 bg-[var(--app-accent-light)] text-[var(--app-accent)] px-3 py-1 rounded-full text-xs font-semibold">
                  <Icon name="star" size="sm" />
                  {host.eventCount} Events
                </div>
                <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold min-w-[80px] justify-center">
                  <Icon name="users" size="sm" />
                  {loadingSignups && signupCount === undefined ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    signupCount ?? 0
                  )} Signups
                </div>
              </div>
              {idx < hostStats.length - 1 && (
                <div className="absolute left-0 right-0 bottom-0 h-px bg-[var(--app-card-border)] opacity-40 group-hover:opacity-80 transition-opacity" />
              )}
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

      // Optional: mint free NFT ticket if configured
      if (!showRegistrationForm.isPaid) {
        const ticketContract = process.env.NEXT_PUBLIC_TICKET_NFT as `0x${string}` | undefined
        if (ticketContract) {
          try {
            const { ethers } = await import('ethers')
            const ethereum = (window as any).ethereum
            const provider = new ethers.providers.Web3Provider(ethereum)
            const signer = provider.getSigner()
            const abi = [
              'function mintTicket(address to, uint256 eventId, string tokenURI) external returns (uint256)'
            ]
            const contract = new ethers.Contract(ticketContract, abi, signer)
            const tokenUri = '' // Optional: point to IPFS ticket metadata
            const eventNumericId = Math.abs([...showRegistrationForm.id].reduce((acc, c) => acc + c.charCodeAt(0), 0))
            const tx = await contract.mintTicket(address, eventNumericId, tokenUri)
            onchain = {
              ...onchain,
              ticketNft: { contract: ticketContract, tokenId: '0', txHash: tx.hash as `0x${string}` }
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
  const openFarcasterCompose = useCallback((text: string, embedUrl?: string) => {
    const base = 'https://warpcast.com/~/compose';
    const params = new URLSearchParams({ text });
    if (embedUrl) {
      params.append('embeds[]', embedUrl);
    }
    const composeUrl = `${base}?${params.toString()}`;
    openUrl(composeUrl);
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
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-[var(--app-background)] to-[var(--app-gray)] font-sans text-[var(--app-foreground)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-card-border)] bg-[var(--app-card-bg)] shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded" />
          <span className="font-bold text-lg tracking-tight">BasedEvents</span>
        </div>
        <Wallet className="z-10">
          <ConnectWallet>
            <Name className="text-inherit" />
          </ConnectWallet>
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

      {/* Main content */}
      <main className="flex-1 px-4 pb-20 pt-4 max-w-md mx-auto w-full overflow-x-hidden">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin inline-block w-8 h-8 border-4 border-current border-t-transparent rounded-full text-[var(--app-accent)]"></div>
            <p className="mt-4 text-[var(--app-foreground-muted)]">Loading events...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={loadEvents}
              className="mt-2 text-red-700 underline text-sm hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
        
        {/* Wallet Error State */}
        {walletError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-700 text-sm">{walletError}</p>
            <button 
              onClick={() => setWalletError(null)}
              className="mt-2 text-yellow-800 underline text-sm hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        {!isLoading && !error && activeTab === "home" && (
          <>
            {address ? (
              <div className="flex justify-end mb-4">
                <Button
                  variant="primary"
                  icon={<Icon name="plus" size="sm" />}
                  onClick={() => {
                    setActiveTab("create");
                    setEditingEvent(null);
                  }}
                >
                  Create Event
                </Button>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-600 text-sm text-center">
                  Connect your wallet to create events and RSVP
                </p>
              </div>
            )}
            {isLoading && events.length === 0 ? (
              <div className="flex justify-center items-center py-8">
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
            <h2 className="text-lg font-semibold mb-4">Events I Created</h2>
            <EnhancedEventList
              events={events.filter(e => e.creator === address) as LibEvent[]}
              onRSVPAction={handleRSVP}
              userAddress={address}
              onEventClickAction={setSelectedEvent}
              onCancelRSVPAction={handleCancelRSVP}
              onDeleteEventAction={handleDeleteEvent}
              onEditEventAction={handleEditEvent}
              onDownloadCSVAction={handleDownloadCSV}
              onSearchAction={handleSearch}
              searchQuery=""
              selectedTags={[]}
              showSearch={false}
            />
            <div className="my-6" />
            <h2 className="text-lg font-semibold mb-4">Events I RSVP&apos;d To</h2>
            <EnhancedEventList
              events={events.filter(e => e.attendees.includes(address || "") && e.creator !== address) as LibEvent[]}
              onRSVPAction={handleRSVP}
              userAddress={address}
              onEventClickAction={setSelectedEvent}
              onCancelRSVPAction={handleCancelRSVP}
              onDeleteEventAction={handleDeleteEvent}
              onEditEventAction={handleEditEvent}
              onSearchAction={handleSearch}
              searchQuery=""
              selectedTags={[]}
              showSearch={false}
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
        {/* Create Event Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
            <div className="bg-[var(--app-card-bg)] rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
              <button
                className="absolute top-2 right-2 text-2xl text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
                onClick={() => {
                  setActiveTab("home");
                  setEditingEvent(null);
                }}
              >
                ×
              </button>
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-[var(--app-card-border)] shadow-lg flex justify-around items-center h-16 max-w-md mx-auto w-full">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${activeTab === item.key ? "text-[var(--app-accent)]" : "text-[var(--app-foreground-muted)]"}`}
            onClick={() => {
              setActiveTab(item.key);
              if (item.key === "create") setEditingEvent(null);
            }}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
