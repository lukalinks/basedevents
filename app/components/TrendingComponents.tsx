"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Icon } from "./DemoComponents";
import { Event } from "@/lib/events";
import { EnhancedEventList } from "./EventComponents";

// Location interfaces
interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
}

interface LocationSuggestion {
  id: string;
  formattedAddress: string;
  venueName?: string;
  city: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  venueType?: string;
  distance?: number;
}

// Trending interfaces
interface TrendingEvent extends Event {
  trendingScore: number;
  distanceKm?: number;
  rsvpCount: number;
  viewCount: number;
  commentCount: number;
  shareCount: number;
  trendingCategory: 'hot' | 'rising' | 'nearby' | 'new';
  trendingRank: number;
}

interface TrendingStats {
  totalViews: number;
  totalRSVPs: number;
  totalShares: number;
  totalComments: number;
  uniqueEvents: number;
  timeframe: string;
  city: string;
}

// Location Search Component
export function LocationSearch({ 
  onLocationSelect, 
  placeholder = "Search for a location...",
  userLocation 
}: {
  onLocationSelect: (location: LocationSuggestion) => void;
  placeholder?: string;
  userLocation?: UserLocation;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchLocations = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        ...(userLocation && {
          lat: userLocation.latitude.toString(),
          lon: userLocation.longitude.toString()
        })
      });

      const response = await fetch(`/api/location-search?${params}`);
      const data = await response.json();

      if (data.success) {
        setSuggestions(data.results);
      }
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLocations(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchLocations]);

  const handleLocationSelect = (location: LocationSuggestion) => {
    setQuery(location.formattedAddress);
    setShowSuggestions(false);
    onLocationSelect(location);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Icon name="location" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin w-4 h-4 border-2 border-[var(--app-accent)] border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => handleLocationSelect(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-[var(--app-accent)]/10 border-b border-[var(--app-card-border)] last:border-b-0 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon name="location" size="sm" className="text-[var(--app-accent)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--app-foreground)] truncate">
                    {suggestion.venueName || suggestion.city}
                  </div>
                  <div className="text-sm text-[var(--app-foreground-muted)] truncate">
                    {suggestion.formattedAddress}
                  </div>
                  {suggestion.distance && (
                    <div className="text-xs text-[var(--app-accent)] mt-1">
                      {suggestion.distance}km away
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// User Location Hook
export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const newLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };

        // Try to get city name from reverse geocoding
        try {
          const response = await fetch('/api/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: newLocation.latitude,
              longitude: newLocation.longitude
            })
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              newLocation.city = data.location.city;
            }
          }
        } catch (error) {
          console.warn('Reverse geocoding failed:', error);
        }

        setLocation(newLocation);
        setIsLoading(false);
      },
      (error) => {
        setError(error.message);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, []);

  return { location, error, isLoading, requestLocation };
}

// Trending Events Section Component
export function TrendingEventsSection({ 
  userAddress, 
  onEventClick,
  onRSVPAction 
}: {
  userAddress?: string;
  onEventClick?: (event: Event) => void;
  onRSVPAction?: (eventId: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<'hot' | 'rising' | 'nearby' | 'new'>('hot');
  const [trendingEvents, setTrendingEvents] = useState<TrendingEvent[]>([]);
  const [stats, setStats] = useState<TrendingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const { location: userLocation, requestLocation, isLoading: locationLoading } = useUserLocation();

  // Fetch trending events
  const fetchTrendingEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        category: activeCategory,
        limit: '20'
      });

      // Add location parameters if available
      if (userLocation) {
        params.append('lat', userLocation.latitude.toString());
        params.append('lon', userLocation.longitude.toString());
        params.append('radius', '50'); // 50km radius
      }

      if (selectedLocation) {
        params.append('city', selectedLocation.city);
      }

      const response = await fetch(`/api/trending?${params}`);
      const data = await response.json();

      if (data.success) {
        setTrendingEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch trending events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, userLocation, selectedLocation]);

  // Fetch trending stats
  const fetchTrendingStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        timeframe: '7d'
      });

      if (selectedLocation) {
        params.append('city', selectedLocation.city);
      }

      const response = await fetch(`/api/trending?${params}`, {
        method: 'PUT'
      });
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch trending stats:', error);
    }
  }, [selectedLocation]);

  // Track analytics when user interacts with events
  const trackAnalytics = useCallback(async (eventId: string, actionType: string) => {
    try {
      await fetch('/api/trending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          actionType,
          userAddress,
          ...(userLocation && {
            userLatitude: userLocation.latitude,
            userLongitude: userLocation.longitude
          })
        })
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }, [userAddress, userLocation]);

  // Enhanced event click handler with analytics
  const handleEventClick = useCallback((event: Event) => {
    trackAnalytics(event.id, 'view');
    onEventClick?.(event);
  }, [onEventClick, trackAnalytics]);

  // Enhanced RSVP handler with analytics
  const handleRSVP = useCallback((eventId: string) => {
    trackAnalytics(eventId, 'rsvp');
    onRSVPAction?.(eventId);
  }, [onRSVPAction, trackAnalytics]);

  useEffect(() => {
    fetchTrendingEvents();
    fetchTrendingStats();
  }, [fetchTrendingEvents, fetchTrendingStats]);

  const categories = [
    { id: 'hot' as const, label: 'Hot', icon: '🔥', description: 'Most popular events' },
    { id: 'rising' as const, label: 'Rising', icon: '📈', description: 'Growing in popularity' },
    { id: 'nearby' as const, label: 'Nearby', icon: '📍', description: 'Events near you' },
    { id: 'new' as const, label: 'New', icon: '✨', description: 'Recently created' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Location */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--app-foreground)] mb-1">
            Trending Events
          </h2>
          <p className="text-[var(--app-foreground-muted)]">
            Discover what&apos;s popular in your area
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!userLocation && (
            <Button
              variant="secondary"
              size="sm"
              onClick={requestLocation}
              disabled={locationLoading}
              className="whitespace-nowrap"
            >
              <Icon name="location" size="sm" className="mr-2" />
              {locationLoading ? 'Locating...' : 'Enable Location'}
            </Button>
          )}
          
          {userLocation && (
            <div className="text-sm text-[var(--app-foreground-muted)] flex items-center gap-1">
              <Icon name="location" size="sm" className="text-[var(--app-accent)]" />
              {userLocation.city || 'Current Location'}
            </div>
          )}
        </div>
      </div>

      {/* Location Search */}
      <div className="max-w-md">
        <LocationSearch
          onLocationSelect={setSelectedLocation}
          placeholder="Filter by location..."
          userLocation={userLocation || undefined}
        />
        {selectedLocation && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-[var(--app-foreground-muted)]">
              Showing events in: {selectedLocation.city}
            </span>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-xs text-[var(--app-accent)] hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Trending Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[var(--app-card-bg)] rounded-lg p-4 border border-[var(--app-card-border)]">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{stats.totalRSVPs}</div>
            <div className="text-sm text-[var(--app-foreground-muted)]">RSVPs This Week</div>
          </div>
          <div className="bg-[var(--app-card-bg)] rounded-lg p-4 border border-[var(--app-card-border)]">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{stats.totalViews}</div>
            <div className="text-sm text-[var(--app-foreground-muted)]">Views</div>
          </div>
          <div className="bg-[var(--app-card-bg)] rounded-lg p-4 border border-[var(--app-card-border)]">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{stats.uniqueEvents}</div>
            <div className="text-sm text-[var(--app-foreground-muted)]">Active Events</div>
          </div>
          <div className="bg-[var(--app-card-bg)] rounded-lg p-4 border border-[var(--app-card-border)]">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{stats.totalShares}</div>
            <div className="text-sm text-[var(--app-foreground-muted)]">Shares</div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeCategory === category.id
                ? 'bg-[var(--app-accent)] text-white shadow-lg'
                : 'bg-[var(--app-card-bg)] text-[var(--app-foreground)] border border-[var(--app-card-border)] hover:bg-[var(--app-accent)]/10'
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.label}</span>
          </button>
        ))}
      </div>

      {/* Active Category Description */}
      <div className="text-sm text-[var(--app-foreground-muted)]">
        {categories.find(c => c.id === activeCategory)?.description}
      </div>

      {/* Trending Events List */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[var(--app-background)]/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin w-6 h-6 border-2 border-[var(--app-accent)] border-t-transparent rounded-full"></div>
              <span className="text-[var(--app-foreground)]">Loading trending events...</span>
            </div>
          </div>
        )}

        <EnhancedTrendingEventList
          events={trendingEvents}
          onRSVPAction={handleRSVP}
          userAddress={userAddress}
          onEventClickAction={handleEventClick}
          showSearch={false}
          userLocation={userLocation || undefined}
        />
      </div>
    </div>
  );
}

// Enhanced Event List with Trending Indicators
export function EnhancedTrendingEventList({ 
  events, 
  onRSVPAction, 
  userAddress, 
  onEventClickAction,
  showSearch = false,
  userLocation
}: { 
  events: TrendingEvent[]; 
  onRSVPAction: (eventId: string) => void; 
  userAddress?: string; 
  onEventClickAction?: (event: Event) => void;
  showSearch?: boolean;
  userLocation?: UserLocation;
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-[var(--app-accent)]/10 rounded-full flex items-center justify-center">
          <Icon name="search" size="lg" className="text-[var(--app-accent)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--app-foreground)] mb-2">
          No trending events found
        </h3>
        <p className="text-[var(--app-foreground-muted)]">
          Try adjusting your location or check back later for new events.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <TrendingEventCard
          key={event.id}
          event={event}
          rank={index + 1}
          onRSVP={() => onRSVPAction(event.id)}
          onClick={() => onEventClickAction?.(event)}
          userAddress={userAddress}
          userLocation={userLocation}
        />
      ))}
    </div>
  );
}

// Individual Trending Event Card
function TrendingEventCard({ 
  event, 
  rank, 
  onRSVP, 
  onClick, 
  userAddress,
  userLocation 
}: {
  event: TrendingEvent;
  rank: number;
  onRSVP: () => void;
  onClick: () => void;
  userAddress?: string;
  userLocation?: UserLocation;
}) {
  const isUserRSVPd = userAddress ? event.attendees.includes(userAddress) : false;
  const isUserCreator = userAddress ? event.creator === userAddress : false;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'hot': return 'text-red-500 bg-red-50';
      case 'rising': return 'text-green-500 bg-green-50';
      case 'nearby': return 'text-blue-500 bg-blue-50';
      case 'new': return 'text-purple-500 bg-purple-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hot': return '🔥';
      case 'rising': return '📈';
      case 'nearby': return '📍';
      case 'new': return '✨';
      default: return '⭐';
    }
  };

  return (
    <div 
      className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group relative"
      onClick={onClick}
    >
      {/* Trending Rank Badge */}
      <div className="absolute top-4 left-4 w-8 h-8 bg-[var(--app-accent)] text-white rounded-full flex items-center justify-center text-sm font-bold">
        #{rank}
      </div>

      {/* Category Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.trendingCategory)}`}>
        <span className="mr-1">{getCategoryIcon(event.trendingCategory)}</span>
        {event.trendingCategory.toUpperCase()}
      </div>

      <div className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <h3 className="text-xl font-bold text-[var(--app-foreground)] mb-2 group-hover:text-[var(--app-accent)] transition-colors">
              {event.title}
            </h3>
            <p className="text-[var(--app-foreground-muted)] mb-3 line-clamp-2">
              {event.description}
            </p>
            
            {/* Event Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[var(--app-foreground-muted)]">
                <Icon name="calendar" size="sm" className="text-[var(--app-accent)]" />
                <span>{event.date} at {event.time}</span>
              </div>
              <div className="flex items-center gap-2 text-[var(--app-foreground-muted)]">
                <Icon name="location" size="sm" className="text-[var(--app-accent)]" />
                <span>{event.location}</span>
                {event.distanceKm && (
                  <span className="text-[var(--app-accent)] font-medium">
                    ({event.distanceKm}km away)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Event Image */}
          {event.imageUrl && (
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={event.imageUrl} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Trending Metrics */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <Icon name="users" size="sm" className="text-[var(--app-accent)]" />
            <span className="font-medium">{event.rsvpCount}</span>
            <span className="text-[var(--app-foreground-muted)]">RSVPs</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon name="heart" size="sm" className="text-red-500" />
            <span className="font-medium">{event.viewCount}</span>
            <span className="text-[var(--app-foreground-muted)]">views</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon name="share" size="sm" className="text-blue-500" />
            <span className="font-medium">{event.shareCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[var(--app-accent)] font-bold">⚡</span>
            <span className="font-medium text-[var(--app-accent)]">{event.trendingScore}</span>
            <span className="text-[var(--app-foreground-muted)]">trending score</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {event.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index}
                className="px-2 py-1 bg-[var(--app-accent)]/10 text-[var(--app-accent)] text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          {!isUserCreator && (
            <Button
              variant={isUserRSVPd ? "secondary" : "primary"}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRSVP();
              }}
              className="font-medium"
            >
              {isUserRSVPd ? 'RSVP\'d' : 'RSVP'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
