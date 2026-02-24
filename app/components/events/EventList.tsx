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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
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

  // Get search suggestions
  const searchSuggestions = useMemo(() => {
    if (!localSearchQuery || localSearchQuery.length < 2) return [];
    
    const suggestions = new Set<string>();
    
    // Add event titles that match
    events.forEach(event => {
      if (event.title.toLowerCase().includes(localSearchQuery.toLowerCase())) {
        suggestions.add(event.title);
      }
    });
    
    // Add locations that match
    allLocations.forEach(location => {
      if (location.toLowerCase().includes(localSearchQuery.toLowerCase())) {
        suggestions.add(location);
      }
    });
    
    // Add tags that match
    allTags.forEach(tag => {
      if (tag.toLowerCase().includes(localSearchQuery.toLowerCase())) {
        suggestions.add(`#${tag}`);
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  }, [localSearchQuery, events, allLocations, allTags]);

  // Get popular searches
  const popularSearches = useMemo(() => {
    const popular = ['tech', 'networking', 'workshop', 'conference', 'meetup'];
    return popular.filter(term => 
      !localSearchQuery || term.toLowerCase().includes(localSearchQuery.toLowerCase())
    ).slice(0, 3);
  }, [localSearchQuery]);

  const openUrl = useOpenUrl();

  // Search handling functions
  const handleSearch = async (query: string, tags: string[] = []) => {
    setIsSearching(true);
    setShowSuggestions(false);
    
    // Add to search history
    if (query && !searchHistory.includes(query)) {
      setSearchHistory(prev => [query, ...prev.slice(0, 4)]);
    }
    
    if (onSearchAction) {
      await onSearchAction(query, tags);
    }
    
    setIsSearching(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLocalSearchQuery(suggestion);
    setShowSuggestions(false);
    handleSearch(suggestion, selectedTags || []);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalSearchQuery(value);
    setShowSuggestions(value.length >= 2);
    
    // Debounced search
    const timeoutId = setTimeout(() => {
      if (value.length >= 2 || value.length === 0) {
        handleSearch(value, selectedTags || []);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const clearSearch = () => {
    setLocalSearchQuery("");
    setSelectedLocation("");
    setSelectedTag("");
    setShowSuggestions(false);
    if (onSearchAction) {
      onSearchAction("", []);
    }
  };

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
          {/* Enhanced Search Bar */}
          <div className="relative">
          <div className="relative">
            <Icon name="search" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--app-foreground-muted)] z-10 pointer-events-none" />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
                  <div className="w-4 h-4 border-2 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            <input
              type="text"
              placeholder="Search events by title, description, or location..."
              value={localSearchQuery}
                onChange={handleSearchInputChange}
                onFocus={() => setShowSuggestions(localSearchQuery.length >= 2)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-10 pr-12 py-3 sm:py-4 lg:py-5 border-2 rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] transition-all text-sm sm:text-base lg:text-lg shadow-sm focus:shadow-md"
              />
              {localSearchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors z-10"
                >
                  <Icon name="x" size="sm" />
                </button>
              )}
            </div>
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && (searchSuggestions.length > 0 || popularSearches.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {searchSuggestions.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-[var(--app-foreground-muted)] mb-2 px-2">Suggestions</div>
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--app-foreground)] hover:bg-[var(--app-accent)]/10 rounded-md transition-colors flex items-center gap-2"
                      >
                        <Icon name="search" size="sm" className="text-[var(--app-foreground-muted)]" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                
                {searchHistory.length > 0 && (
                  <div className="p-2 border-t border-[var(--app-card-border)]">
                    <div className="text-xs font-medium text-[var(--app-foreground-muted)] mb-2 px-2">Recent Searches</div>
                    {searchHistory.slice(0, 3).map((term, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(term)}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--app-foreground)] hover:bg-[var(--app-accent)]/10 rounded-md transition-colors flex items-center gap-2"
                      >
                        <Icon name="clock" size="sm" className="text-[var(--app-foreground-muted)]" />
                        {term}
                      </button>
                    ))}
                  </div>
                )}
                
                {popularSearches.length > 0 && (
                  <div className="p-2 border-t border-[var(--app-card-border)]">
                    <div className="text-xs font-medium text-[var(--app-foreground-muted)] mb-2 px-2">Popular</div>
                    {popularSearches.map((term, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(term)}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--app-foreground)] hover:bg-[var(--app-accent)]/10 rounded-md transition-colors flex items-center gap-2"
                      >
                        <Icon name="trending-up" size="sm" className="text-[var(--app-foreground-muted)]" />
                        {term}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Enhanced Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-all bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg hover:border-[var(--app-accent)]/30 hover:shadow-sm"
              >
                <Icon name="filter" size="sm" />
                {showFilters ? "Hide Filters" : "Show Filters"}
                {(selectedLocation || selectedTag) && (
                  <span className="w-2 h-2 bg-[var(--app-accent)] rounded-full"></span>
                )}
              </button>
              
              {!showFilters && (selectedLocation || selectedTag || localSearchQuery) && (
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--app-accent)] hover:text-[var(--app-accent)]/80 transition-all bg-[var(--app-accent)]/10 border border-[var(--app-accent)]/20 rounded-lg hover:bg-[var(--app-accent)]/20 hover:shadow-sm"
                >
                  <Icon name="eye" size="sm" />
                  View Results ({filteredEvents.length})
                </button>
              )}
            </div>
            
            {(selectedLocation || selectedTag || localSearchQuery) && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--app-foreground-muted)]">
                  {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}
                </span>
              <button
                  onClick={clearSearch}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  <Icon name="x" size="sm" />
                Clear All
              </button>
              </div>
            )}
          </div>
          
          {/* Filters Section */}
          {showFilters && (
            <div className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                          selectedLocation === "" 
                            ? "bg-blue-600 text-white shadow-md" 
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                        }`}
                      >
                        <Icon name="globe" size="sm" />
                        All Locations
                      </button>
                      {allLocations.map(location => (
                        <button
                          key={location}
                          onClick={() => setSelectedLocation(location)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                            selectedLocation === location 
                              ? "bg-blue-600 text-white shadow-md" 
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                          }`}
                        >
                          <Icon name="location" size="sm" />
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
                      <div className="w-6 h-6 bg-[var(--app-accent)]/10 rounded-lg flex items-center justify-center">
                        <Icon name="tag" size="sm" className="text-[var(--app-accent)]" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--app-foreground)]">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedTag("")}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                          selectedTag === "" 
                            ? "bg-[var(--app-accent)] text-white shadow-md shadow-[var(--app-accent)]/25" 
                            : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-accent)]/10 hover:text-[var(--app-accent)] border border-transparent hover:border-[var(--app-accent)]/20"
                        }`}
                      >
                        <Icon name="tag" size="sm" />
                        All
                      </button>
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                            selectedTag === tag 
                              ? "bg-gradient-to-r from-[var(--app-accent)] to-[var(--app-token-gate)] text-white shadow-md shadow-[var(--app-accent)]/25" 
                              : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-gradient-to-r hover:from-[var(--app-accent)]/10 hover:to-[var(--app-token-gate)]/10 hover:text-[var(--app-accent)] border border-transparent hover:border-[var(--app-accent)]/20"
                          }`}
                        >
                          <span className="opacity-60">#</span>{tag}
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
                  <button
                    onClick={() => setSelectedTag("")}
                    className="px-2.5 py-1 bg-gradient-to-r from-[var(--app-accent)]/15 to-[var(--app-token-gate)]/15 text-[var(--app-accent)] text-xs rounded-full font-medium inline-flex items-center gap-1.5 hover:from-[var(--app-accent)]/25 hover:to-[var(--app-token-gate)]/25 transition-all border border-[var(--app-accent)]/20"
                  >
                    <span className="opacity-60">#</span>{selectedTag}
                    <span className="ml-0.5 opacity-60 hover:opacity-100">&times;</span>
                  </button>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
        {/* Search Results Feedback */}
        {(localSearchQuery || selectedLocation || selectedTag) && (
          <div className="col-span-full bg-gradient-to-r from-[var(--app-accent)]/5 to-transparent border border-[var(--app-accent)]/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="search" size="sm" className="text-[var(--app-accent)]" />
                <span className="text-sm font-medium text-[var(--app-foreground)]">
                  {filteredEvents.length === 0 ? 'No events found' : `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} found`}
                </span>
              </div>
        {filteredEvents.length === 0 && (
                <button
                  onClick={clearSearch}
                  className="text-xs text-[var(--app-accent)] hover:text-[var(--app-accent)]/80 font-medium px-2 py-1 rounded hover:bg-[var(--app-accent)]/10 transition-colors"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredEvents.length === 0 && !localSearchQuery && !selectedLocation && !selectedTag && (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-[var(--app-accent)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="calendar" size="lg" className="text-[var(--app-accent)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-2">No events yet</h3>
            <p className="text-[var(--app-foreground-muted)] mb-4">Be the first to create an event!</p>
          </div>
        )}

        {/* No Results State */}
        {filteredEvents.length === 0 && (localSearchQuery || selectedLocation || selectedTag) && (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="search" size="lg" className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-2">No events match your search</h3>
            <p className="text-[var(--app-foreground-muted)] mb-4">Try adjusting your filters or search terms</p>
            <button
              onClick={clearSearch}
              className="px-4 py-2 bg-[var(--app-accent)] text-white rounded-lg hover:bg-[var(--app-accent)]/90 transition-colors"
            >
              Clear all filters
            </button>
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