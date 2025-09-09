"use client";

import { useState, useRef } from "react";
import { useAccount } from "wagmi";
import { Button, Icon } from "../DemoComponents";
import { Event } from "@/lib/events";
import { uploadEventImage } from "@/lib/imageUpload";
import { TokenGateSetup } from '../TokenGating';

// Enhanced Event Form with more fields
export function EnhancedEventForm({ 
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
  const [maxAttendees, setMaxAttendees] = useState(initialEvent?.maxAttendees?.toString() || "");
  const [tags, setTags] = useState(initialEvent?.tags.join(", ") || "");
  const [isRecurring, setIsRecurring] = useState(initialEvent?.isRecurring || false);
  const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly' | 'monthly'>(initialEvent?.recurringPattern || 'weekly');
  const [loading, setLoading] = useState(false);
  const { address } = useAccount();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const tagInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [imageUrl, setImageUrl] = useState(initialEvent?.imageUrl || "");
  const [imageUploading, setImageUploading] = useState(false);
  const [isPaid, setIsPaid] = useState(initialEvent?.isPaid || false);
  const [priceUSDC, setPriceUSDC] = useState(initialEvent?.priceUSDC?.toString() || "");
  
  // Token gating state
  const [tokenGateConfig, setTokenGateConfig] = useState({
    isTokenGated: initialEvent?.isTokenGated || false,
    requiredTokenAddress: initialEvent?.requiredTokenAddress || "",
    requiredTokenBalance: initialEvent?.requiredTokenBalance || 0,
    requiredTokenSymbol: initialEvent?.requiredTokenSymbol || "",
    requiredTokenName: initialEvent?.requiredTokenName || "",
    tokenGateType: initialEvent?.tokenGateType || ('ERC20' as const),
    requiredNftCollection: initialEvent?.requiredNftCollection || "",
    requiredNftCount: initialEvent?.requiredNftCount || 1,
  });
  
  // Online/Physical mode and platform
  const isOnlineInitial = (initialEvent?.location || "").toLowerCase().startsWith('online');
  const extractedPlatform = (() => {
    const match = /online\s*\(([^)]+)\)/i.exec(initialEvent?.location || "");
    return match ? match[1] : "";
  })();
  const [eventMode, setEventMode] = useState<'online' | 'physical'>(isOnlineInitial ? 'online' : 'physical');
  const [onlinePlatform, setOnlinePlatform] = useState<string>(isOnlineInitial ? extractedPlatform : "");

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!date) newErrors.date = "Date is required";
    if (!time) newErrors.time = "Time is required";
    if (eventMode === 'physical') {
      if (!location.trim()) newErrors.location = "Location is required";
    } else {
      if (!onlinePlatform.trim()) newErrors.onlinePlatform = "Platform is required";
    }
    if (isPaid && (!priceUSDC || isNaN(Number(priceUSDC)) || Number(priceUSDC) <= 0)) {
      newErrors.priceUSDC = "Enter a valid price in USDC";
    }
    return newErrors;
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInputRef.current) {
      e.preventDefault();
      const value = tagInputRef.current.value.trim();
      if (value && !tags.split(',').map(t => t.trim()).includes(value)) {
        setTags(tags ? tags + ', ' + value : value);
        tagInputRef.current.value = '';
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.split(',').map(t => t.trim()).filter(t => t !== tag).join(', '));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageUploading(true);
    setErrors(prev => {
      const { image, ...rest } = prev;
      return rest;
    });
    
    try {
      const uploadedImageUrl = await uploadEventImage(file);
      if (uploadedImageUrl) {
        setImageUrl(uploadedImageUrl);
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      setErrors(prev => ({ ...prev, image: error.message || 'Image upload failed' }));
      e.target.value = '';
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    
    setLoading(true);
    try {
      const finalLocation = eventMode === 'online'
        ? (onlinePlatform ? `Online (${onlinePlatform})` : 'Online')
        : location;

      const eventData = {
        title,
        description,
        date,
        time,
        location: finalLocation,
        creator: address || "",
        attendees: initialEvent?.attendees || [],
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
        tags: tags.split(",").map(tag => tag.trim()).filter(tag => tag),
        isRecurring,
        recurringPattern: isRecurring ? recurringPattern : undefined,
        status: 'upcoming' as const,
        imageUrl: imageUrl || undefined,
        isPaid,
        priceUSDC: isPaid ? Number(priceUSDC) : undefined,
        isTokenGated: tokenGateConfig.isTokenGated,
        requiredTokenAddress: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredTokenAddress : undefined,
        requiredTokenBalance: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredTokenBalance : undefined,
        requiredTokenSymbol: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredTokenSymbol : undefined,
        requiredTokenName: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredTokenName : undefined,
        tokenGateType: tokenGateConfig.isTokenGated ? tokenGateConfig.tokenGateType : undefined,
        requiredNftCollection: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredNftCollection : undefined,
        requiredNftCount: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredNftCount : undefined,
      };

      await onSubmitAction(eventData);
      
      if (!isEditing) {
        setTitle("");
        setDescription("");
        setDate("");
        setTime("");
        setLocation("");
        setMaxAttendees("");
        setTags("");
        setImageUrl("");
        setIsRecurring(false);
        setIsPaid(false);
        setPriceUSDC("");
        setEventMode('physical');
        setOnlinePlatform("");
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      setErrors({ general: 'Failed to create event. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 bg-transparent">
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 font-medium">{errors.general}</p>
          </div>
        </div>
      )}
      
      {imageUrl && (
        <div className="mb-4 flex justify-center">
          <img src={imageUrl} alt="Event" className="max-h-48 rounded-xl border" />
        </div>
      )}
      
      <form className="space-y-6" onSubmit={handleSubmit} ref={formRef}>
        {/* Basic Event Info */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
            Event Title <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]">
              <Icon name="star" size="sm" />
            </span>
            <input
              type="text"
              placeholder="Enter event title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.title ? 'border-red-500 bg-red-50' : ''}`}
              required
            />
          </div>
          {errors.title && <div className="text-xs text-red-500 mt-1">{errors.title}</div>}
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">Description</label>
          <textarea
            placeholder="Describe your event..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all resize-none"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]">
                <Icon name="calendar" size="sm" />
              </span>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.date ? 'border-red-500 bg-red-50' : ''}`}
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]">
                <Icon name="clock" size="sm" />
              </span>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.time ? 'border-red-500 bg-red-50' : ''}`}
                required
              />
            </div>
            {errors.time && <div className="text-xs text-red-500 mt-1">{errors.time}</div>}
          </div>
        </div>
        
        {/* Event Type and Payment */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">Event Type</label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="eventType"
                checked={!isPaid}
                onChange={() => setIsPaid(false)}
                className="accent-[var(--app-accent)]"
              />
              <span className="text-sm font-medium">Free</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="eventType"
                checked={isPaid}
                onChange={() => setIsPaid(true)}
                className="accent-[var(--app-accent)]"
              />
              <span className="text-sm font-medium">Paid (USDC)</span>
            </label>
          </div>
        </div>
        
        {isPaid && (
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">Price (USDC)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter price in USDC"
              value={priceUSDC}
              onChange={e => setPriceUSDC(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.priceUSDC ? 'border-red-500 bg-red-50' : ''}`}
              required={isPaid}
            />
            {errors.priceUSDC && <div className="text-xs text-red-500 mt-1">{errors.priceUSDC}</div>}
          </div>
        )}
        
        {/* Token Gating Section */}
        <div className="transition-all duration-300 ease-in-out">
          <TokenGateSetup
            onTokenGateChange={(config) => {
              setTokenGateConfig({
                isTokenGated: config.isTokenGated,
                requiredTokenAddress: config.requiredTokenAddress || "",
                requiredTokenBalance: config.requiredTokenBalance || 0,
                requiredTokenSymbol: config.requiredTokenSymbol || "",
                requiredTokenName: config.requiredTokenName || "",
                tokenGateType: config.tokenGateType || 'ERC20',
                requiredNftCollection: config.requiredNftCollection || "",
                requiredNftCount: config.requiredNftCount || 1,
              });
            }}
            initialValues={{
              isTokenGated: tokenGateConfig.isTokenGated,
              requiredTokenAddress: tokenGateConfig.requiredTokenAddress,
              requiredTokenBalance: tokenGateConfig.requiredTokenBalance,
              requiredTokenSymbol: tokenGateConfig.requiredTokenSymbol,
              requiredTokenName: tokenGateConfig.requiredTokenName,
              tokenGateType: tokenGateConfig.tokenGateType,
              requiredNftCollection: tokenGateConfig.requiredNftCollection,
              requiredNftCount: tokenGateConfig.requiredNftCount,
            }}
          />
        </div>
        
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">Event Image</label>
          <div className="relative">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              disabled={imageUploading}
              className="w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {imageUploading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className="animate-spin">⏳</span>
              </div>
            )}
          </div>
          {imageUploading && <div className="text-xs text-blue-500 mt-1">Uploading image...</div>}
          {errors.image && <div className="text-xs text-red-500 mt-1">{errors.image}</div>}
          {imageUrl && (
            <div className="mt-2">
              <button 
                type="button" 
                onClick={() => setImageUrl("")}
                className="text-xs text-red-500 hover:underline"
              >
                Remove image
              </button>
            </div>
          )}
        </div>
        
        {/* Location/Platform */}
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">Event Mode</label>
          <div className="flex items-center gap-6 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="eventMode"
                checked={eventMode === 'physical'}
                onChange={() => setEventMode('physical')}
                className="accent-[var(--app-accent)]"
              />
              <span className="text-sm font-medium">Physical</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="eventMode"
                checked={eventMode === 'online'}
                onChange={() => setEventMode('online')}
                className="accent-[var(--app-accent)]"
              />
              <span className="text-sm font-medium">Online</span>
            </label>
          </div>

          {eventMode === 'online' ? (
            <div>
              <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">Platform <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Zoom, Google Meet, Spaces"
                value={onlinePlatform}
                onChange={e => setOnlinePlatform(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.onlinePlatform ? 'border-red-500 bg-red-50' : ''}`}
                required={eventMode === 'online'}
              />
              {errors.onlinePlatform && <div className="text-xs text-red-500 mt-1">{errors.onlinePlatform}</div>}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">Location <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]">
                  <Icon name="location" size="sm" />
                </span>
                <input
                  type="text"
                  placeholder="Venue address or city"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.location ? 'border-red-500 bg-red-50' : ''}`}
                  required={eventMode === 'physical'}
                />
              </div>
              {errors.location && <div className="text-xs text-red-500 mt-1">{errors.location}</div>}
            </div>
          )}
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
        
        {/* Recurring Event */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="recurring"
            checked={isRecurring}
            onChange={e => setIsRecurring(e.target.checked)}
            className="w-4 h-4 text-[var(--app-accent)] bg-[var(--app-background)] border-2 border-[var(--app-card-border)] rounded focus:ring-[var(--app-accent)] focus:ring-2"
          />
          <label htmlFor="recurring" className="text-sm font-semibold text-[var(--app-foreground)]">Recurring Event</label>
          {isRecurring && (
            <select
              value={recurringPattern}
              onChange={e => setRecurringPattern(e.target.value as 'daily' | 'weekly' | 'monthly')}
              className="px-3 py-2 rounded-lg border-2 bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
        </div>
        
        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6 border-t border-[var(--app-card-border)] mt-6">
          <Button 
            type="submit" 
            variant="primary" 
            size="md" 
            disabled={loading}
            className="flex-1 text-lg font-semibold py-4 shadow-lg hover:shadow-xl transition-all"
            onClick={() => formRef.current?.requestSubmit()}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isEditing ? 'Update Event' : 'Create Event'}
              </>
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="md" 
            onClick={onCancelAction}
            className="flex-1 text-lg font-semibold py-4 border-2 shadow-sm hover:shadow-md transition-all"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
