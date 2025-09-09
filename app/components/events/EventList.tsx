"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Button, Icon } from "../DemoComponents";
import { Event } from "@/lib/events";
import { OnchainEventBadges } from '../OnchainStatusIndicators';
import { useOpenUrl } from "@coinbase/onchainkit/minikit";
import { ConfirmationModal } from './ConfirmationModal';
import { EnhancedEventCard } from './EnhancedEventCard';

// Enhanced Event List with search and filters
export function EnhancedEventList({ 
  events, 
  onRSVPAction, 
  userAddress, 
  onEventClickAction,
  onCancelRSVPAction,
  onDeleteEventAction,
  onEditEventAction,
  onCancelEventAction,
  onDownloadCSVAction,
  onSearchAction,
  searchQuery,
  selectedTags,
  showSearch = true 
}: { 
  events: Event[]; 
  onRSVPAction: (eventId: string) => void; 
  userAddress?: string; 
  onEventClickAction?: (event: Event) => void;
  onCancelRSVPAction?: (eventId: string) => void;
  onDeleteEventAction?: (eventId: string) => void;
  onEditEventAction?: (event: Event) => void;
  onCancelEventAction?: (eventId: string) => void;
  onDownloadCSVAction?: (eventId: string, eventTitle: string) => void;
  onSearchAction?: (query: string, tags: string[]) => void;
  searchQuery?: string;
  selectedTags?: string[];
  showSearch?: boolean;
}) {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery || "");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'cancel' | 'delete';
    eventId: string;
    eventTitle: string;
  }>({ isOpen: false, type: 'cancel', eventId: '', eventTitle: '' });

  // Auto-hide filters when search is active
  useEffect(() => {
    if (localSearchQuery || selectedLocation || selectedTag) {
      setShowFilters(false);
    }
  }, [localSearchQuery, selectedLocation, selectedTag]);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    events.forEach(event => {
      if (event.tags && Array.isArray(event.tags)) {
        event.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [events]);

  // Get all unique locations
  const allLocations = useMemo(() => {
    const locations = new Set<string>();
    events.forEach(event => {
      if (event.location && event.location.trim()) {
        locations.add(event.location.trim());
      }
    });
    return Array.from(locations).sort();
  }, [events]);

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

  const openFarcasterCompose = (text: string, embedUrl?: string) => {
    const encodedText = encodeURIComponent(text);
    const encodedEmbed = embedUrl ? encodeURIComponent(embedUrl) : '';
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodedText}&embeds[]=${encodedEmbed}`;
    openUrl(farcasterUrl);
  };

  const openCancelModal = (eventId: string, eventTitle: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'cancel',
      eventId,
      eventTitle
    });
  };

  const openDeleteModal = (eventId: string, eventTitle: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'delete',
      eventId,
      eventTitle
    });
  };

  const closeModal = () => {
    setConfirmModal({
      isOpen: false,
      type: 'cancel',
      eventId: '',
      eventTitle: ''
    });
  };

  const handleConfirmAction = () => {
    if (confirmModal.type === 'cancel' && onCancelEventAction) {
      onCancelEventAction(confirmModal.eventId);
    } else if (confirmModal.type === 'delete' && onDeleteEventAction) {
      onDeleteEventAction(confirmModal.eventId);
    }
    closeModal();
  };

  // Filter events based on search, location, and tag
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      const matchesSearch = !localSearchQuery || 
        event.title.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(localSearchQuery.toLowerCase());
      
      // Location filter
      const matchesLocation = !selectedLocation || event.location === selectedLocation;
      
      // Tag filter
      const matchesTag = !selectedTag || (event.tags && event.tags.includes(selectedTag));
      
      return matchesSearch && matchesLocation && matchesTag;
    });
  }, [events, localSearchQuery, selectedLocation, selectedTag]);

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Icon name="search" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--app-foreground-muted)] z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="Search events..."
              value={localSearchQuery}
              onChange={e => {
                setLocalSearchQuery(e.target.value);
                if (onSearchAction) {
                  onSearchAction(e.target.value, selectedTags || []);
                }
              }}
              className="w-full pl-10 pr-4 py-3 sm:py-4 border-2 rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] transition-all text-sm sm:text-base"
            />
          </div>
          
          {/* Filter Toggle Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg hover:border-[var(--app-accent)]/30"
              >
                <Icon name="search" size="sm" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
              {!showFilters && (selectedLocation || selectedTag || localSearchQuery) && (
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--app-accent)] hover:text-[var(--app-accent)]/80 transition-colors bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 rounded-lg hover:bg-[var(--app-accent)]/20"
                >
                  <Icon name="search" size="sm" />
                  Show Results ({filteredEvents.length})
                </button>
              )}
            </div>
            {(selectedLocation || selectedTag || localSearchQuery) && (
              <button
                onClick={() => {
                  setLocalSearchQuery("");
                  setSelectedLocation("");
                  setSelectedTag("");
                  if (onSearchAction) {
                    onSearchAction("", []);
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50"
              >
                Clear All
              </button>
            )}
          </div>
          
          {/* Filters Section */}
          {showFilters && (
            <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                {/* Location Filter */}
                {allLocations.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Icon name="location" size="sm" className="text-blue-600" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--app-foreground)]">Location</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedLocation("")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedLocation === "" 
                            ? "bg-blue-600 text-white shadow-md" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                        }`}
                      >
                        All Locations
                      </button>
                      {allLocations.map(location => (
                        <button
                          key={location}
                          onClick={() => setSelectedLocation(location)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedLocation === location 
                              ? "bg-blue-600 text-white shadow-md" 
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                          }`}
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tags Filter */}
                {allTags.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon name="star" size="sm" className="text-gray-600" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--app-foreground)]">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedTag("")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedTag === "" 
                            ? "bg-gray-600 text-white shadow-md" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                        }`}
                      >
                        All Tags
                      </button>
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedTag === tag 
                              ? "bg-gray-600 text-white shadow-md" 
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Active Filters Summary */}
          {(selectedLocation || selectedTag || localSearchQuery) && (
            <div className="bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="search" size="sm" className="text-[var(--app-accent)]" />
                <span className="text-sm font-medium text-[var(--app-foreground)]">Active Filters</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {localSearchQuery && (
                  <span className="px-2 py-1 bg-[var(--app-accent)]/20 text-[var(--app-accent)] text-xs rounded-full">
                    Search: "{localSearchQuery}"
                  </span>
                )}
                {selectedLocation && (
                  <span className="px-2 py-1 bg-[var(--app-accent)]/20 text-[var(--app-accent)] text-xs rounded-full">
                    Location: {selectedLocation}
                  </span>
                )}
                {selectedTag && (
                  <span className="px-2 py-1 bg-[var(--app-accent)]/20 text-[var(--app-accent)] text-xs rounded-full">
                    Tag: {selectedTag}
                  </span>
                )}
                <button
                  onClick={() => {
                    setLocalSearchQuery("");
                    setSelectedLocation("");
                    setSelectedTag("");
                    if (onSearchAction) {
                      onSearchAction("", []);
                    }
                  }}
                  className="px-2 py-1 bg-red-500/20 text-red-600 text-xs rounded-full hover:bg-red-500/30 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Compact Filter Summary (when filters are hidden) */}
      {!showFilters && (selectedLocation || selectedTag || localSearchQuery) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="search" size="sm" className="text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Filters Applied</span>
              <div className="flex gap-1">
                {localSearchQuery && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    "{localSearchQuery}"
                  </span>
                )}
                {selectedLocation && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    📍 {selectedLocation}
                  </span>
                )}
                {selectedTag && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                    #{selectedTag}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600">
                {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowFilters(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {filteredEvents.length === 0 && (
          <div className="col-span-full text-center py-8 text-[var(--app-foreground-muted)]">
            <Icon name="calendar" size="lg" className="mx-auto mb-2 opacity-50" />
            <p>No events found</p>
            {searchQuery && <p className="text-sm">Try adjusting your search</p>}
          </div>
        )}
        
        {filteredEvents.map((event, index) => (
          <EnhancedEventCard
            key={`event-${event.id}-${index}`}
            event={event}
            userAddress={userAddress}
            onEventClick={onEventClickAction}
            onRSVP={onRSVPAction}
            onCancelRSVP={onCancelRSVPAction}
            onEdit={onEditEventAction}
            onDelete={onDeleteEventAction}
            onCancel={onCancelEventAction}
            onDownloadCSV={onDownloadCSVAction}
            variant="default"
            showActions={true}
          />
        ))}
      </div>
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmAction}
        title={confirmModal.type === 'cancel' ? 'Cancel Event' : 'Delete Event'}
        message={confirmModal.type === 'cancel' 
          ? `Are you sure you want to cancel "${confirmModal.eventTitle}"?\n\nAttendees will be notified about the cancellation.\n\nYou can undo this by editing the event later.`
          : `Are you sure you want to permanently delete "${confirmModal.eventTitle}"?\n\n⚠️ This action CANNOT be undone!\n\n• All event data will be lost\n• Attendees will lose access\n• Comments will be deleted`
        }
        confirmText={confirmModal.type === 'cancel' ? 'Cancel Event' : 'Delete Forever'}
        cancelText="Keep Event"
        type={confirmModal.type === 'cancel' ? 'warning' : 'danger'}
      />
    </div>
  );
}