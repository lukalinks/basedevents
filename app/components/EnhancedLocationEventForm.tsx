"use client";

import { useState, useRef } from "react";
import { Button, Icon } from "./DemoComponents";
import { Event } from "@/lib/events";
import { LocationSearch, useUserLocation } from "./TrendingComponents";

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

// Enhanced Event Form with Location Search
export function EnhancedLocationEventForm({ 
  onSubmitAction, 
  onCancelAction,
  initialEvent,
  isEditing = false
}: { 
  onSubmitAction: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancelAction: () => void;
  initialEvent?: Event | null;
  isEditing?: boolean;
}) {
  const [title, setTitle] = useState(initialEvent?.title || "");
  const [description, setDescription] = useState(initialEvent?.description || "");
  const [date, setDate] = useState(initialEvent?.date || "");
  const [time, setTime] = useState(initialEvent?.time || "");
  const [location, setLocation] = useState(initialEvent?.location || "");
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [tags, setTags] = useState(initialEvent?.tags.join(', ') || "");
  const [maxAttendees, setMaxAttendees] = useState(initialEvent?.maxAttendees?.toString() || "");
  const [isPaid, setIsPaid] = useState(initialEvent?.isPaid || false);
  const [priceUSDC, setPriceUSDC] = useState(initialEvent?.priceUSDC?.toString() || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const tagInputRef = useRef<HTMLInputElement>(null);
  const { location: userLocation } = useUserLocation();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    if (!date) newErrors.date = "Date is required";
    if (!time) newErrors.time = "Time is required";
    if (!location.trim() && !selectedLocation) newErrors.location = "Location is required";
    if (isPaid && (!priceUSDC || parseFloat(priceUSDC) <= 0)) {
      newErrors.priceUSDC = "Valid price is required for paid events";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLocationSelect = (locationSuggestion: LocationSuggestion) => {
    setSelectedLocation(locationSuggestion);
    setLocation(locationSuggestion.formattedAddress);
    setErrors({ ...errors, location: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      // Geocode location if not already selected
      let coordinates: { latitude: number; longitude: number } | null = null;
      let locationDetails: Partial<LocationSuggestion> = {};

      if (selectedLocation) {
        coordinates = {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude
        };
        locationDetails = {
          city: selectedLocation.city,
          state: selectedLocation.state,
          country: selectedLocation.country,
          venueName: selectedLocation.venueName,
          venueType: selectedLocation.venueType
        };
      } else if (location.trim()) {
        // Try to geocode the location
        try {
          const response = await fetch(`/api/geocode?address=${encodeURIComponent(location)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              coordinates = {
                latitude: data.location.latitude,
                longitude: data.location.longitude
              };
              locationDetails = {
                city: data.location.city,
                state: data.location.state,
                country: data.location.country
              };
            }
          }
        } catch (error) {
          console.warn('Geocoding failed:', error);
        }
      }

      const eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        location: location.trim(),
        creator: "", // Will be set by the parent component
        attendees: initialEvent?.attendees || [],
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        isRecurring: false,
        recurringPattern: undefined,
        status: 'upcoming',
        imageUrl: initialEvent?.imageUrl,
        isPaid,
        priceUSDC: isPaid ? parseFloat(priceUSDC) : undefined,
        // Add location data if available
        ...(coordinates && {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          addressCity: locationDetails.city,
          addressState: locationDetails.state,
          addressCountry: locationDetails.country,
          venueName: locationDetails.venueName,
          venueType: locationDetails.venueType
        })
      };

      await onSubmitAction(eventData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      const newTag = input.value.trim();
      if (newTag && !tags.split(',').map(t => t.trim()).includes(newTag)) {
        setTags(tags ? `${tags}, ${newTag}` : newTag);
        input.value = '';
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const tagList = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const filteredTags = tagList.filter(tag => tag !== tagToRemove);
    setTags(filteredTags.join(', '));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={onCancelAction}
          className="text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] transition-colors"
        >
          <Icon name="arrow-right" size="md" className="transform rotate-45" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter event title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.title ? 'border-red-500' : ''}`}
            required
          />
          {errors.title && <div className="text-xs text-red-500 mt-1">{errors.title}</div>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            placeholder="Describe your event"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all resize-none ${errors.description ? 'border-red-500' : ''}`}
            required
          />
          {errors.description && <div className="text-xs text-red-500 mt-1">{errors.description}</div>}
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Icon name="calendar" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.date ? 'border-red-500' : ''}`}
                required
              />
            </div>
            {errors.date && <div className="text-xs text-red-500 mt-1">{errors.date}</div>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Time <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Icon name="clock" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]" />
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.time ? 'border-red-500' : ''}`}
                required
              />
            </div>
            {errors.time && <div className="text-xs text-red-500 mt-1">{errors.time}</div>}
          </div>
        </div>
        
        {/* Enhanced Location with Search */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
            Location <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <LocationSearch
              onLocationSelect={handleLocationSelect}
              placeholder="Search for venues, addresses, or cities..."
              userLocation={userLocation || undefined}
            />
            {selectedLocation && (
              <div className="p-3 bg-[var(--app-accent)]/10 rounded-lg border border-[var(--app-accent)]/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-[var(--app-foreground)]">
                      {selectedLocation.venueName || selectedLocation.city}
                    </div>
                    <div className="text-sm text-[var(--app-foreground-muted)]">
                      {selectedLocation.formattedAddress}
                    </div>
                    {selectedLocation.distance && (
                      <div className="text-xs text-[var(--app-accent)] mt-1">
                        {selectedLocation.distance}km from your location
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation(null);
                      setLocation("");
                    }}
                    className="text-[var(--app-foreground-muted)] hover:text-red-500 transition-colors"
                  >
                    <Icon name="trash" size="sm" />
                  </button>
                </div>
              </div>
            )}
            {!selectedLocation && (
              <input
                type="text"
                placeholder="Or enter location manually"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.location ? 'border-red-500' : ''}`}
              />
            )}
          </div>
          {errors.location && <div className="text-xs text-red-500 mt-1">{errors.location}</div>}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">Tags</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.split(',').map(tag => tag.trim()).filter(Boolean).map((tag, index) => (
              <span key={`tag-${index}-${tag}`} className="bg-[var(--app-accent-light)] text-[var(--app-accent)] px-3 py-1 rounded-full text-xs flex items-center gap-1">
                {tag}
                <button type="button" className="ml-1 text-xs hover:text-red-500" onClick={() => handleRemoveTag(tag)}>&times;</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            placeholder="Type a tag and press Enter"
            ref={tagInputRef}
            onKeyDown={handleTagKeyDown}
            className="w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all"
          />
        </div>

        {/* Max Attendees */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
            Maximum Attendees (Optional)
          </label>
          <input
            type="number"
            min="1"
            placeholder="Leave empty for unlimited"
            value={maxAttendees}
            onChange={e => setMaxAttendees(e.target.value)}
            className="w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all"
          />
        </div>

        {/* Paid Event Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isPaid"
            checked={isPaid}
            onChange={e => setIsPaid(e.target.checked)}
            className="w-4 h-4 text-[var(--app-accent)] bg-[var(--app-background)] border-[var(--app-card-border)] rounded focus:ring-[var(--app-accent)]"
          />
          <label htmlFor="isPaid" className="text-sm font-medium text-[var(--app-foreground)]">
            This is a paid event
          </label>
        </div>

        {/* Price Input */}
        {isPaid && (
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Price (USDC) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter price in USDC"
              value={priceUSDC}
              onChange={e => setPriceUSDC(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.priceUSDC ? 'border-red-500' : ''}`}
              required={isPaid}
            />
            {errors.priceUSDC && <div className="text-xs text-red-500 mt-1">{errors.priceUSDC}</div>}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={onCancelAction}
            className="flex-1"
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                {isEditing ? 'Updating...' : 'Creating...'}
              </div>
            ) : (
              isEditing ? 'Update Event' : 'Create Event'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
