"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useAccount, useChainId } from "wagmi";
import { Button, Icon, Card } from "./DemoComponents";
import { 
  Event, 
  EventComment,
  EventRegistration,
  createEvent,
  getAllEvents,
  getUserCreatedEvents,
  getUserRsvpEvents,
  rsvpToEvent,
  cancelRsvp,
  updateEvent,
  deleteEvent,
  addEventComment,
  getEventComments,
  searchEvents,
  getUpcomingEvents,
  registerForEvent,
  getEventRegistrations,
  cancelRegistration,
  isUserRegisteredForEvent
} from "@/lib/events";
import { getUserDisplayInfo } from "@/lib/basenames";
import { uploadEventImage } from "@/lib/imageUpload";
import { supabase } from "@/lib/supabaseClient";
import { Transaction, TransactionButton, TransactionStatus } from '@coinbase/onchainkit/transaction';
import { encodeFunctionData, parseUnits } from 'viem';
import { TokenGateSetup, TokenGateStatus, TokenGateBadge, TokenRequirementDisplay } from './TokenGating';
import { OnchainEventBadges, OnchainPaymentStatus, OnchainNFTStatus, OnchainActivitySummary } from './OnchainStatusIndicators';
import { useOpenUrl } from "@coinbase/onchainkit/minikit";

const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC address
const USDC_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "type": "function",
    "stateMutability": "nonpayable"
  }
] as const;

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
    // Token gating validation
    if (tokenGateConfig.isTokenGated) {
      if (!tokenGateConfig.requiredTokenAddress?.trim()) {
        newErrors.tokenAddress = "Token address is required";
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(tokenGateConfig.requiredTokenAddress)) {
        newErrors.tokenAddress = "Invalid token address format";
      }
      if (!tokenGateConfig.requiredTokenBalance || tokenGateConfig.requiredTokenBalance <= 0) {
        newErrors.tokenBalance = "Required balance must be greater than 0";
      }
      if (!tokenGateConfig.requiredTokenSymbol?.trim()) {
        newErrors.tokenSymbol = "Token symbol is required";
      }
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
    
    console.log('Starting image upload process for:', file.name);
    setImageUploading(true);
    setErrors(prev => {
      const { image, ...rest } = prev;
      return rest;
    });
    
    try {
      const uploadedImageUrl = await uploadEventImage(file);
      if (uploadedImageUrl) {
        console.log('Image upload completed:', uploadedImageUrl);
        setImageUrl(uploadedImageUrl);
      } else {
        throw new Error('Upload returned no URL');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      setErrors(prev => ({ ...prev, image: error.message || 'Image upload failed' }));
      // Reset the file input
      e.target.value = '';
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
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
        // Token gating fields
        isTokenGated: tokenGateConfig.isTokenGated,
        requiredTokenAddress: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredTokenAddress : undefined,
        requiredTokenBalance: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredTokenBalance : undefined,
        requiredTokenSymbol: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredTokenSymbol : undefined,
        requiredTokenName: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredTokenName : undefined,
        tokenGateType: tokenGateConfig.isTokenGated ? tokenGateConfig.tokenGateType : undefined,
        requiredNftCollection: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredNftCollection : undefined,
        requiredNftCount: tokenGateConfig.isTokenGated ? tokenGateConfig.requiredNftCount : undefined,
      };

      console.log('Form submitting event data:', eventData);
      await onSubmitAction(eventData);
      
      // Reset form after successful submission
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
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">{isEditing ? 'Edit Event' : 'Create New Event'}</h2>
        <p className="text-sm text-[var(--app-foreground-muted)]">
          {isEditing ? 'Update your event details' : 'Fill in the details to create your event'}
        </p>
      </div>
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
        {/* Free/Paid Toggle */}
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
        <div>
          <TokenGateSetup
            onTokenGateChange={setTokenGateConfig}
            initialValues={tokenGateConfig}
          />
          {errors.tokenAddress && <div className="text-xs text-red-500 mt-1">{errors.tokenAddress}</div>}
          {errors.tokenBalance && <div className="text-xs text-red-500 mt-1">{errors.tokenBalance}</div>}
          {errors.tokenSymbol && <div className="text-xs text-red-500 mt-1">{errors.tokenSymbol}</div>}
        </div>
        
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
        <div>
          <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
            Event Title <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]"><Icon name="star" size="sm" /></span>
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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]"><Icon name="calendar" size="sm" /></span>
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]"><Icon name="clock" size="sm" /></span>
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
        
        {/* Online/Physical mode */}
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--app-accent)]"><Icon name="location" size="sm" /></span>
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

// Confirmation Modal Component
function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "warning" 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "warning" | "danger";
}) {
  if (!isOpen) return null;

  const typeStyles = {
    warning: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      icon: "⚠️",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      confirmBtn: "bg-orange-600 hover:bg-orange-700"
    },
    danger: {
      bg: "bg-red-50",
      border: "border-red-200", 
      icon: "🗑️",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      confirmBtn: "bg-red-600 hover:bg-red-700"
    }
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-2 border-gray-200 animate-scale-in">
        <div className={`${styles.bg} ${styles.border} p-6 rounded-t-2xl border-b`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center text-xl`}>
              {styles.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        
        <div className="flex gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2 text-white ${styles.confirmBtn} rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'cancel' | 'delete';
    eventId: string;
    eventTitle: string;
  }>({ isOpen: false, type: 'cancel', eventId: '', eventTitle: '' });

  // Get all unique tags
  const allTags = Array.from(new Set(events.flatMap(event => event.tags)));
  // Get all unique locations
  const allLocations = Array.from(new Set(events.map(event => event.location).filter(Boolean)));
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

  // Enhanced Farcaster sharing with event details
  const shareEventOnFarcaster = useCallback((event: Event, shareType: 'created' | 'registered' | 'general' = 'general') => {
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    
    // Create rich text with event details
    let shareText = '';
    
    switch (shareType) {
      case 'created':
        shareText = `🎉 I just created an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time)}\n📍 ${event.location}`;
        break;
      case 'registered':
        shareText = `✅ I just registered for an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time)}\n📍 ${event.location}`;
        break;
      case 'general':
      default:
        shareText = `📅 Check out this event!\n\n🎯 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time)}\n📍 ${event.location}`;
        break;
    }
    
    // Add event image as embed if available
    const embedUrl = event.imageUrl || eventUrl;
    openFarcasterCompose(shareText, embedUrl);
  }, [openFarcasterCompose]);

  // Handle confirmation modal actions
  const handleConfirmAction = () => {
    if (confirmModal.type === 'cancel' && onCancelEventAction) {
      onCancelEventAction(confirmModal.eventId);
    } else if (confirmModal.type === 'delete' && onDeleteEventAction) {
      onDeleteEventAction(confirmModal.eventId);
    }
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
    setConfirmModal({ isOpen: false, type: 'cancel', eventId: '', eventTitle: '' });
  };

  // Filter events directly without local state to prevent blinking
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    if (localSearchQuery) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(localSearchQuery.toLowerCase())
      );
    }
    
    if (selectedTag) {
      filtered = filtered.filter(event => event.tags.includes(selectedTag));
    }
    
    if (selectedLocation) {
      filtered = filtered.filter(event => event.location === selectedLocation);
    }
    
    return filtered;
  }, [events, localSearchQuery, selectedTag, selectedLocation]);

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

  const isEventFull = (event: Event) => {
    return event.maxAttendees && event.attendees.length >= event.maxAttendees;
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const eventDate = new Date(`${event.date}T${event.time}`);
    
    if (eventDate < now) {
      return 'past';
    } else if (eventDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return 'soon';
    }
    return 'upcoming';
  };

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="space-y-3">
          <div className="relative">
            <Icon name="search" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--app-foreground-muted)] z-10 pointer-events-none" />
            <input
              type="text"
              placeholder="Search events by title, description, or location..."
              value={localSearchQuery}
              onChange={e => {
                setLocalSearchQuery(e.target.value);
                if (onSearchAction) {
                  onSearchAction(e.target.value, selectedTags || []);
                }
              }}
              className="w-full pl-10 pr-4 py-3 border-2 rounded-lg bg-[var(--app-card-bg)] border-[var(--app-card-border)] text-[var(--app-foreground)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] transition-all"
            />
            <div className="text-xs text-[var(--app-foreground-muted)] mt-1 ml-1">
              💡 Try searching for "Zoom", "Lusaka", "Johannesburg", "online", or event names
            </div>
          </div>
          
          {/* Location Filter */}
          {allLocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-[var(--app-foreground)]">Location:</span>
              <button
                onClick={() => setSelectedLocation("")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedLocation === "" 
                    ? "bg-[var(--app-accent)] text-white" 
                    : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-gray-dark)]"
                }`}
              >
                All Locations
              </button>
              {allLocations.map(location => (
                <button
                  key={location}
                  onClick={() => setSelectedLocation(location)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedLocation === location 
                      ? "bg-[var(--app-accent)] text-white" 
                      : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-gray-dark)]"
                  }`}
                >
                  {location}
                </button>
              ))}
            </div>
          )}
          
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-[var(--app-foreground)]">Tags:</span>
              <button
                onClick={() => setSelectedTag("")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTag === "" 
                    ? "bg-[var(--app-accent)] text-white" 
                    : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-gray-dark)]"
                }`}
              >
                All Tags
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTag === tag 
                      ? "bg-[var(--app-accent)] text-white" 
                      : "bg-[var(--app-gray)] text-[var(--app-foreground-muted)] hover:bg-[var(--app-gray-dark)]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      
      <div className="space-y-3">
        {filteredEvents.length === 0 && (
          <div className="text-center py-8 text-[var(--app-foreground-muted)]">
            <Icon name="calendar" size="lg" className="mx-auto mb-2 opacity-50" />
            <p>No events found</p>
            {searchQuery && <p className="text-sm">Try adjusting your search</p>}
          </div>
        )}
        
        {filteredEvents.map((event, index) => {
          const status = getEventStatus(event);
          const isAttending = event.attendees.includes(userAddress || "");
          const isFull = isEventFull(event);
          const isCreator = event.creator === userAddress;
          
          return (
            <div 
              key={`event-${event.id}-${index}`} 
              className={`bg-[var(--app-card-bg)] border rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer relative ${
                event.status === 'cancelled' 
                  ? 'border-red-300 bg-gradient-to-br from-red-50/30 to-red-100/20 shadow-sm' 
                  : 'border-[var(--app-card-border)] hover:border-[var(--app-accent)]/30'
              }`}
              onClick={() => onEventClickAction && onEventClickAction(event)}
            >
              {/* Cancelled overlay */}
              {event.status === 'cancelled' && (
                <div className="absolute inset-0 bg-red-100/10 rounded-xl pointer-events-none">
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold shadow-sm">
                    CANCELLED
                  </div>
                </div>
              )}
              {event.imageUrl && (
                <div className="mb-2 flex justify-center">
                  <img src={event.imageUrl} alt={event.title} className="max-h-40 rounded-lg object-cover w-full" />
                </div>
              )}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[var(--app-foreground)] text-lg">{event.title}</h3>
                    <OnchainEventBadges event={event} size="sm" variant="compact" />
                    {status === 'soon' && (
                      <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Soon</span>
                    )}
                    {status === 'past' && (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Past</span>
                    )}
                    {event.isRecurring && (
                      <Icon name="repeat" size="sm" className="text-[var(--app-accent)]" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-[var(--app-foreground-muted)] mb-2">
                    <div className="flex items-center gap-1">
                      <Icon name="calendar" size="sm" />
                      <span>{formatDate(event.date, event.time)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Icon name="location" size="sm" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-[var(--app-foreground-muted)] mb-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-[var(--app-foreground-muted)]">
                      <span className="flex items-center gap-1">
                        <Icon name="users" size="sm" />
                        {event.attendees.length}
                        {event.maxAttendees && ` / ${event.maxAttendees}`}
                      </span>
                      {isCreator && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Creator</span>
                      )}
                    </div>
                    
                    {event.tags.length > 0 && (
                      <div className="flex gap-1">
                        {event.tags.slice(0, 2).map((tag, tagIndex) => (
                          <span key={`event-tag-${event.id}-${tagIndex}-${tag}`} className="bg-[var(--app-gray)] text-[var(--app-foreground-muted)] text-xs px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                        {event.tags.length > 2 && (
                          <span className="text-xs text-[var(--app-foreground-muted)]">+{event.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ml-4 flex flex-col gap-2">
                  {!isCreator && status !== 'past' && (
                    <Button
                      variant={isAttending ? "secondary" : "primary"}
                      size="sm"
                      disabled={Boolean(isFull && !isAttending)}
                      onClick={() => onRSVPAction(event.id)}
                      className="whitespace-nowrap"
                    >
                      {isAttending ? "✓ Going" : isFull ? "Full" : "RSVP"}
                    </Button>
                  )}
                  
                  {/* Host management buttons */}
                  {isCreator && (
                    <div className="flex flex-col gap-2 min-w-[160px]">
                      <div className="grid grid-cols-2 gap-1">
                        {onEditEventAction && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEventAction(event);
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Edit Event"
                          >
                            <Icon name="edit" size="sm" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                        )}
                        
                        {onDownloadCSVAction && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadCSVAction(event.id, event.title);
                            }}
                            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold text-green-800 hover:text-green-900 bg-green-200 hover:bg-green-300 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg border-2 border-green-300 hover:border-green-400"
                            title="Download Registrations CSV"
                          >
                            <span className="text-base">📊</span>
                            <span className="font-bold">CSV</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
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
                            openFarcasterCompose(shareText, embedUrl);
                          }}
                          className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title="Share on Farcaster"
                        >
                          <Icon name="share" size="sm" />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                        
                        {onCancelEventAction && event.status !== 'cancelled' && status !== 'past' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCancelModal(event.id, event.title);
                            }}
                            className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium text-orange-700 hover:text-orange-900 bg-orange-100 hover:bg-orange-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                            title="Cancel Event"
                          >
                            <span className="text-sm">⚠️</span>
                            <span className="hidden sm:inline">Cancel</span>
                          </button>
                  )}
                </div>
                      
                      {onDeleteEventAction && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(event.id, event.title);
                          }}
                          className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md border border-red-200 hover:border-red-300"
                          title="Delete Event Permanently"
                        >
                          <Icon name="trash" size="sm" />
                          <span className="font-semibold">Delete Forever</span>
                        </button>
                      )}
                      
                      {event.status === 'cancelled' && (
                        <div className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg">
                          <span className="text-sm">❌</span>
                          <span>Event Cancelled</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

// Enhanced Event Details Modal with comments
export function EnhancedEventDetailsModal({ 
  event, 
  onCloseAction, 
  userAddress, 
  onEditAction, 
  onDeleteAction, 
  onCancelRSVPAction,
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
                        <h3 className="text-xl font-bold text-[var(--app-foreground)] mb-2">
                          Connect to Register
                        </h3>
                        <p className="text-[var(--app-foreground-muted)] mb-4">
                          Connect your wallet to register for this event and join other attendees.
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-600">
                            💡 Use the wallet button in the top right to get started
                          </p>
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
          <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
            <h3 className="font-bold text-lg mb-4 text-[var(--app-foreground)]">
              {isCreator ? 'Manage Event' : 'Event Actions'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {isCreator && (
                <>
                  <Button variant="outline" size="md" onClick={() => onEditAction && onEditAction(event)} className="w-full">
                    <Icon name="edit" size="sm" className="mr-2" />
                    Edit Event
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => onDeleteAction && onDeleteAction(event.id)} className="w-full text-red-500 hover:bg-red-50 hover:text-red-600">
                    <Icon name="trash" size="sm" className="mr-2" />
                    Delete Event
                  </Button>
                </>
              )}

            </div>
          </div>
          
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

// Event Registration Form
export function EventRegistrationForm({ 
  event, 
  onRegisterAction, 
  onCancelAction 
}: { 
  event: Event
  onRegisterAction: (userDetails: {name: string, email: string, phone?: string, bio?: string}, onchain?: { paymentTxHash?: `0x${string}` }) => void
  onCancelAction: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const { address } = useAccount();
  const chainId = useChainId();
  const isBase = chainId === 8453; // Base mainnet chain ID
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentTx, setPaymentTx] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [tokenVerified, setTokenVerified] = useState(!event.isTokenGated); // Start as true if no token gating

  // OnchainKit payment call for paid events using viem
  const paymentCalls: { to: `0x${string}`; data?: `0x${string}`; value?: bigint }[] = useMemo(() => {
    if (!event.isPaid || !event.priceUSDC || !event.creator) return [];
    
    try {
      const transferData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [
            event.creator as `0x${string}`,
            parseUnits(event.priceUSDC.toString(), 6)
        ]
      });

      return [{
        to: USDC_BASE_ADDRESS as `0x${string}`,
        value: BigInt(0),
        data: transferData,
      }];
    } catch (error) {
      console.error('Error creating payment call:', error);
      return [];
    }
  }, [event.isPaid, event.priceUSDC, event.creator]);

  const validate = () => {
    const newErrors: {[key: string]: string} = {}
    if (!name.trim()) newErrors.name = "Name is required"
    if (!email.trim()) newErrors.email = "Email is required"
    if (email && !/\S+@\S+\.\S+/.test(email)) newErrors.email = "Email is invalid"
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return
    
    const validation = validate()
    setErrors(validation)
    if (Object.keys(validation).length > 0) return
    
    // Check token verification for token-gated events
    if (event.isTokenGated && !tokenVerified) {
      setErrors({ tokenVerification: 'Please verify token requirements before registering' });
      return;
    }
    
    setLoading(true)
    try {
      const onchain: { paymentTxHash?: `0x${string}` } = {}
      if (event.isPaid && paymentTx) {
        onchain.paymentTxHash = paymentTx as `0x${string}`
      }
      await onRegisterAction({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined
      }, onchain)
    } catch (error) {
      console.error('Registration error:', error)
      setErrors({ general: 'Registration failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--app-background)] border-2 border-[var(--app-card-border)] rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-2 right-2 text-2xl text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
          onClick={onCancelAction}
        >
          ×
        </button>
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[var(--app-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Complete Registration</h2>
          <h3 className="text-lg font-semibold text-[var(--app-accent)] mb-2">{event.title}</h3>
          <p className="text-sm text-[var(--app-foreground-muted)]">
            Please provide your details to complete your event registration
          </p>
        </div>
        
        {/* Token Gating Verification */}
        {event.isTokenGated && (
          <div className="mb-6">
            <TokenGateStatus 
              event={event}
              userAddress={address}
              onVerificationComplete={(passed) => {
                setTokenVerified(passed);
                if (!passed) {
                  setErrors(prev => ({ ...prev, tokenVerification: 'Token requirements not met' }));
                } else {
                  setErrors(prev => {
                    const { tokenVerification, ...rest } = prev;
                    return rest;
                  });
                }
              }}
            />
          </div>
        )}
        
        {event.isPaid && (
          <div className="mb-6 onchain-card rounded-xl p-6 border-2" style={{
            background: 'var(--app-payment-bg)',
            borderColor: 'var(--app-payment-light)'
          }}>
            <div className="text-center mb-4">
              <div className="w-16 h-16 payment-gradient rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <text x="12" y="16" textAnchor="middle" fontSize="12" fill="white">$</text>
                </svg>
              </div>
              <h3 className="font-bold text-2xl mb-2" style={{color: 'var(--app-payment)'}}>
                {event.priceUSDC} USDC
              </h3>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Payment required to complete registration on Base network
              </p>
              
              {paymentConfirmed ? (
                <div className="flex items-center justify-center gap-3 rounded-lg p-4 border border-green-200 bg-green-50 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-bold text-green-800">Payment Confirmed!</div>
                    <div className="text-sm text-green-700">USDC payment successful on Base</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!isBase && (
                    <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-red-700 text-sm">
                      ⚠️ Please switch to Base network to make payment
                    </div>
                  )}
                  
                  {paymentError && (
                    <div className="bg-red-100 border border-red-300 rounded-lg p-3 text-red-700 text-sm">
                      Payment failed: {paymentError}
                    </div>
                  )}
                  
            <Transaction
              chainId={8453}
              calls={paymentCalls}
                    onSuccess={(response) => {
                      console.log('Payment successful:', response);
                setPaymentConfirmed(true);
                      setPaymentError(null);
                      const txHash = response.transactionReceipts[0]?.transactionHash;
                      if (txHash) {
                        setPaymentTx(txHash);
                      }
                    }}
                    onError={(error) => {
                      console.error('Payment failed:', error);
                      setPaymentError(error.message || 'Payment failed');
                      setPaymentConfirmed(false);
                    }}
                  >
                    <TransactionButton 
                      text={paymentConfirmed ? '✓ Payment Confirmed' : 'Pay with USDC'}
                      disabled={paymentConfirmed}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                        paymentConfirmed 
                          ? 'bg-green-500 text-white cursor-default' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    />
                    <TransactionStatus>
                      <div className="mt-2 text-sm text-center">
                        {paymentTx && (
                          <a
                            href={`https://basescan.org/tx/${paymentTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View transaction ↗
                          </a>
                        )}
                      </div>
                    </TransactionStatus>
            </Transaction>
                </div>
              )}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={e => setName(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.name ? 'border-red-500 bg-red-50' : ''}`}
              required
            />
            {errors.name && <div className="text-xs text-red-500 mt-1">{errors.name}</div>}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all ${errors.email ? 'border-red-500 bg-red-50' : ''}`}
              required
            />
            {errors.email && <div className="text-xs text-red-500 mt-1">{errors.email}</div>}
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Phone Number <span className="text-[var(--app-foreground-muted)] text-xs font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-[var(--app-foreground)] mb-2">
              Bio <span className="text-[var(--app-foreground-muted)] text-xs font-normal">(Optional)</span>
            </label>
            <textarea
              placeholder="Tell us a bit about yourself..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 rounded-lg bg-[var(--app-background)] border-[var(--app-card-border)] text-[var(--app-foreground)] placeholder-[var(--app-foreground-muted)] focus:ring-2 focus:ring-[var(--app-accent)] focus:border-[var(--app-accent)] shadow-sm transition-all resize-none"
            />
          </div>
          
          <div className="flex space-x-4 pt-2">
            <button
              type="submit"
              disabled={loading || (event.isPaid && !paymentConfirmed) || (event.isTokenGated && !tokenVerified)}
              className="flex-1 bg-[var(--app-accent)] text-white py-4 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--app-accent-hover)] transition-all font-semibold flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete Registration
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancelAction}
              className="flex-1 bg-[var(--app-gray)] text-[var(--app-foreground)] py-4 px-6 rounded-xl hover:bg-[var(--app-gray-dark)] transition-colors font-semibold border-2 border-[var(--app-card-border)] shadow-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Event Details Page Component (non-modal version)
export function EventDetailsPage({ 
  event, 
  userAddress, 
  onEditAction, 
  onDeleteAction, 
  onCancelRSVPAction,
  onRSVPAction,
  onAddCommentAction,
  onDownloadCSVAction,
  refreshTrigger
}: {
  event: Event;
  userAddress?: string;
  onEditAction?: (event: Event) => void;
  onDeleteAction?: (eventId: string) => void;
  onCancelRSVPAction?: (eventId: string) => void;
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

  // Farcaster share helper
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

  // Enhanced Farcaster sharing with event details
  const shareEventOnFarcaster = useCallback((event: Event, shareType: 'created' | 'registered' | 'general' = 'general') => {
    const eventUrl = `${window.location.origin}/events/${event.id}`;
    
    // Create rich text with event details
    let shareText = '';
    
    switch (shareType) {
      case 'created':
        shareText = `🎉 I just created an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time)}\n📍 ${event.location}`;
        break;
      case 'registered':
        shareText = `✅ I just registered for an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time)}\n📍 ${event.location}`;
        break;
      case 'general':
      default:
        shareText = `📅 Check out this event!\n\n🎯 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formatDate(event.date, event.time)}\n📍 ${event.location}`;
        break;
    }
    
    // Add event image as embed if available
    const embedUrl = event.imageUrl || eventUrl;
    openFarcasterCompose(shareText, embedUrl);
  }, [openFarcasterCompose]);

  // Add timeout for registration loading to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (registrationLoading) {
        console.log('⚠️ Registration loading timeout, setting to false');
        setRegistrationLoading(false);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, [registrationLoading]);

  useEffect(() => {
    loadComments();
    checkRegistrationStatus();
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
      // Fallback: check if user is in attendees array (legacy method)
      const isInAttendees = event.attendees.includes(userAddress);
      setIsRegistered(isInAttendees);
      console.log('🔄 Fallback: Using attendees array check:', isInAttendees);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const loadComments = async () => {
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
    const end = encodeURIComponent(`${event.date}T${event.time}`);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");
    const title = encodeURIComponent(event.title);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
  }

  function getOutlookCalendarUrl(event: Event) {
    const start = encodeURIComponent(`${event.date}T${event.time}`);
    const end = encodeURIComponent(`${event.date}T${event.time}`);
    const details = encodeURIComponent(event.description || "");
    const location = encodeURIComponent(event.location || "");
    const title = encodeURIComponent(event.title);
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&body=${details}&startdt=${start}&enddt=${end}&location=${location}`;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header with Share Button */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-[var(--app-foreground)]">{event.title}</h1>
            {event.isPaid && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#2775CA" />
                  <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white">$</text>
                </svg>
                {event.priceUSDC ? `${event.priceUSDC} USDC` : "Paid"}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
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
                  alert('Event link copied to clipboard!');
                });
              }
            }}
            className="flex items-center gap-2"
          >
            <Icon name="share" size="sm" />
            Share Event
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => {
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
              openFarcasterCompose(shareText, embedUrl);
            }}
            className="flex items-center gap-2"
          >
            <Icon name="share" size="sm" />
            Share on Farcaster
          </Button>
        </div>
      </div>

      {/* Event Image */}
      {event.imageUrl && (
        <div className="w-full max-h-96 overflow-hidden rounded-xl">
          <img 
            src={event.imageUrl} 
            alt={event.title} 
            className="object-cover w-full h-full"
          />
        </div>
      )}

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
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => onCancelRSVPAction && onCancelRSVPAction(event.id)} 
                      className="w-full sm:w-auto max-w-xs"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Registration
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        const eventUrl = `${window.location.origin}/events/${event.id}`;
                        const eventDate = new Date(`${event.date}T${event.time}`);
                        const formattedDate = eventDate.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        });
                        const shareText = `✅ I just registered for an event!\n\n📅 ${event.title}\n📝 ${event.description.substring(0, 100)}${event.description.length > 100 ? '...' : ''}\n🕒 ${formattedDate}\n📍 ${event.location}`;
                        const embedUrl = event.imageUrl || eventUrl;
                        openFarcasterCompose(shareText, embedUrl);
                      }}
                      className="w-full sm:w-auto max-w-xs"
                    >
                      <Icon name="share" size="sm" className="mr-2" />
                      Share on Farcaster
                    </Button>
                  </div>
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
                  <h3 className="text-xl font-bold text-[var(--app-foreground)] mb-2">
                    Connect to Register
                  </h3>
                  <p className="text-[var(--app-foreground-muted)] mb-4">
                    Connect your wallet to register for this event and join other attendees.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-600">
                      💡 Click "Connect Wallet" in the header to get started
                    </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
                  <span key={`page-tag-${event.id}-${tagIndex}-${tag}`} className="bg-gradient-to-r from-[var(--app-accent)]/20 to-[var(--app-accent)]/10 text-[var(--app-accent)] px-4 py-2 rounded-full text-sm font-medium border border-[var(--app-accent)]/20">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Event Management Actions */}
          {isCreator && (
            <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
              <h3 className="font-bold text-lg mb-4 text-[var(--app-foreground)]">Manage Event</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button variant="outline" size="md" onClick={() => onEditAction && onEditAction(event)}>
                  <Icon name="edit" size="sm" className="mr-2" />
                  Edit Event
                </Button>
                
                {onDownloadCSVAction && (
                  <Button 
                    variant="primary" 
                    size="md" 
                    onClick={() => onDownloadCSVAction(event.id, event.title)}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 font-semibold shadow-lg"
                  >
                    <span className="mr-2 text-lg">📊</span>
                    Download CSV
                  </Button>
                )}
                
                <Button variant="ghost" size="md" onClick={() => onDeleteAction && onDeleteAction(event.id)} className="text-red-500 hover:bg-red-50 hover:text-red-600">
                  <Icon name="trash" size="sm" className="mr-2" />
                  Delete Event
                </Button>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
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
            <div className="space-y-3">
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

        {/* Sidebar */}
        <div className="space-y-6">
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

          {/* Calendar Integration */}
          <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
            <h3 className="font-bold text-lg mb-4 text-[var(--app-foreground)]">Add to Calendar</h3>
            <div className="space-y-2">
              <a
                href={getGoogleCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#4285F4] text-white text-sm font-semibold hover:bg-[#357ae8] transition"
              >
                <Icon name="calendar" size="sm" className="mr-2" /> Google Calendar
              </a>
              <a
                href={getOutlookCalendarUrl(event)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#0072C6] text-white text-sm font-semibold hover:bg-[#005fa3] transition"
              >
                <Icon name="calendar" size="sm" className="mr-2" /> Outlook Calendar
              </a>
            </div>
          </div>

          {/* Attendee List for Event Hosts */}
          {isCreator && (
            <div className="bg-[var(--app-card-bg)] rounded-xl p-6 border border-[var(--app-card-border)]">
              <EventAttendeesList eventId={event.id} isHost={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Attendee List for Event Hosts
export function EventAttendeesList({ 
  eventId, 
  isHost 
}: { 
  eventId: string
  isHost: boolean
}) {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userDisplayInfo, setUserDisplayInfo] = useState<Record<string, {
    displayName: string;
    avatar: string | null;
    isBaseName: boolean;
    baseName?: string;
    address: string;
  }>>({})
  const [loadingDisplayInfo, setLoadingDisplayInfo] = useState(false)

  useEffect(() => {
    const loadRegistrations = async () => {
      if (!isHost) return
      
      try {
        setLoading(true)
        const data = await getEventRegistrations(eventId)
        const confirmedRegistrations = data.filter(reg => reg.status === 'confirmed')
        setRegistrations(confirmedRegistrations)
        
        // Load display info for all attendees
        await loadUserDisplayInfo(confirmedRegistrations)
      } catch (err) {
        console.error('Error loading registrations:', err)
        setError('Failed to load attendee list')
      } finally {
        setLoading(false)
      }
    }

    loadRegistrations()
  }, [eventId, isHost])

  const loadUserDisplayInfo = async (registrations: EventRegistration[]) => {
    if (registrations.length === 0) return
    
    setLoadingDisplayInfo(true)
    const displayInfo: Record<string, any> = {}
    
    try {
      // Load display info for each unique wallet address
      const uniqueAddresses = [...new Set(registrations.map(reg => reg.userAddress))]
      
      for (const address of uniqueAddresses) {
        try {
          const info = await getUserDisplayInfo(address)
          displayInfo[address] = info
        } catch (error) {
          console.warn('Failed to load display info for', address, error)
          // Fallback to address only
          displayInfo[address] = {
            displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
            avatar: null,
            isBaseName: false,
            address
          }
        }
      }
      
      setUserDisplayInfo(displayInfo)
    } catch (error) {
      console.error('Error loading user display info:', error)
    } finally {
      setLoadingDisplayInfo(false)
    }
  }

  if (!isHost) {
    return (
      <div className="p-4 text-center text-[var(--app-foreground-muted)]">
        Only event hosts can view attendee details.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full"></div>
        <p className="mt-2 text-[var(--app-foreground-muted)]">Loading attendees...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    )
  }

  if (registrations.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--app-foreground-muted)]">
        No attendees registered yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">
        Registered Attendees ({registrations.length})
      </h3>
      
      <div className="space-y-3">
        {registrations.map((registration, index) => {
          const displayInfo = userDisplayInfo[registration.userAddress]
          
          return (
            <div 
              key={registration.id}
              className="bg-[var(--app-card-bg)] border border-[var(--app-card-border)] rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--app-gray)] flex items-center justify-center">
                      {displayInfo?.avatar ? (
                        <img 
                          src={displayInfo.avatar} 
                          alt={displayInfo.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-[var(--app-accent)] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {registration.userName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-[var(--app-foreground)]">
                          {registration.userName}
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          #{index + 1}
                        </span>
                      </div>
                      
                      {/* Wallet Address / Base Name */}
                      <div className="flex items-center space-x-2 text-sm">
                        <Icon name="users" size="sm" />
                        <span className="font-mono text-[var(--app-foreground-muted)]">
                          {loadingDisplayInfo ? (
                            <span className="animate-pulse">Loading...</span>
                          ) : displayInfo ? (
                            <>
                              {displayInfo.isBaseName && displayInfo.baseName ? (
                                <>
                                  <span className="text-[var(--app-accent)] font-semibold">{displayInfo.baseName}</span>
                                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">Base</span>
                                </>
                              ) : (
                                <span>{displayInfo.displayName}</span>
                              )}
                            </>
                          ) : (
                            <span>{registration.userAddress.slice(0, 6)}...{registration.userAddress.slice(-4)}</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-[var(--app-foreground-muted)] ml-12">
                    <div className="flex items-center space-x-2">
                      <Icon name="mail" size="sm" />
                      <span>{registration.userEmail}</span>
                    </div>
                    
                    {registration.userPhone && (
                      <div className="flex items-center space-x-2">
                        <Icon name="phone" size="sm" />
                        <span>{registration.userPhone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Icon name="calendar" size="sm" />
                      <span>Registered: {new Date(registration.registeredAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {registration.userBio && (
                    <div className="mt-3 ml-12 p-2 bg-[var(--app-background)] rounded text-sm">
                      <strong>Bio:</strong> {registration.userBio}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// User NFT Tickets Collection Component
export function UserNFTTicketsCollection({ 
  userAddress 
}: { 
  userAddress?: string 
}) {
  const [nftTickets, setNftTickets] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) {
      setNftTickets([]);
      setLoading(false);
      return;
    }

    const fetchNFTTickets = async () => {
      try {
        setLoading(true);
        setError(null);
        const { getUserNFTTickets } = await import('@/lib/events');
        const tickets = await getUserNFTTickets(userAddress);
        setNftTickets(tickets);
      } catch (err) {
        console.error('Error fetching NFT tickets:', err);
        setError('Failed to load NFT tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchNFTTickets();
  }, [userAddress]);

  if (!userAddress) {
    return (
      <div className="onchain-card rounded-xl p-8 text-center border-2" style={{
        background: 'var(--app-nft-bg)',
        borderColor: 'var(--app-nft-light)'
      }}>
        <div className="w-20 h-20 nft-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Icon name="star" size="lg" className="text-white drop-shadow-sm" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{color: 'var(--app-nft)'}}>Connect Wallet</h3>
        <p className="text-sm font-medium text-gray-600 mb-4">Connect your wallet to view your collected NFT tickets</p>
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30">
          <p className="text-xs text-gray-700">Your event tickets will appear here as beautiful NFT collectibles</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="onchain-card rounded-xl p-8 text-center border" style={{
        background: 'var(--app-nft-bg)',
        borderColor: 'var(--app-nft-light)'
      }}>
        <div className="w-16 h-16 nft-gradient rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h3 className="text-lg font-bold mb-2" style={{color: 'var(--app-nft)'}}>Loading NFT Collection</h3>
        <p className="text-sm font-medium text-gray-600">Fetching your event tickets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="onchain-card rounded-xl p-8 text-center border" style={{
        background: 'var(--app-error-bg)',
        borderColor: 'var(--app-error-light)'
      }}>
        <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Icon name="users" size="lg" className="text-white" />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{color: 'var(--app-error)'}}>Error Loading NFT Collection</h3>
        <p className="text-sm font-medium text-gray-600 mb-4">{error}</p>
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-white/30">
          <p className="text-xs text-gray-700">Please try refreshing the page or check your connection</p>
        </div>
      </div>
    );
  }

  if (nftTickets.length === 0) {
    return (
      <div className="onchain-card rounded-xl p-8 text-center border" style={{
        background: 'var(--app-nft-bg)',
        borderColor: 'var(--app-nft-light)'
      }}>
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Icon name="star" size="lg" className="text-gray-400" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{color: 'var(--app-nft)'}}>No NFT Tickets Yet</h3>
        <p className="text-sm font-medium text-gray-600 mb-4">
          Register for events that offer NFT tickets to start your collection!
        </p>
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-white/30">
          <p className="text-xs text-gray-700 mb-2 font-medium">💡 Tip:</p>
          <p className="text-xs text-gray-700">
            Many events on BasedEvents offer beautiful NFT tickets as collectibles. 
            Look for events with the NFT badge and start collecting today!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 nft-gradient rounded-xl flex items-center justify-center shadow-lg">
            <Icon name="star" size="md" className="text-white drop-shadow-sm" />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{color: 'var(--app-nft)'}}>My NFT Collection</h2>
            <p className="text-sm text-gray-600">{nftTickets.length} event tickets collected</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nftTickets.map((ticket) => (
          <div key={ticket.id} className="bg-[var(--app-card-bg)] border-2 border-[var(--app-card-border)] rounded-xl p-4 hover:border-[var(--app-accent)] transition-all">
            {ticket.event?.imageUrl && (
              <div className="w-full h-32 bg-[var(--app-gray)] rounded-lg mb-3 overflow-hidden">
                <img 
                  src={ticket.event.imageUrl} 
                  alt={ticket.event.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <h3 className="font-semibold text-[var(--app-foreground)] line-clamp-2">
                {ticket.event?.title || 'Unknown Event'}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-[var(--app-foreground-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{ticket.event?.date}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-[var(--app-foreground-muted)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="line-clamp-1">{ticket.event?.location}</span>
              </div>
              
              {ticket.ticketNft && (
                <div className="pt-2 border-t border-[var(--app-card-border)]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--app-foreground-muted)]">Token ID:</span>
                    <span className="font-mono text-[var(--app-accent)]">{ticket.ticketNft.tokenId}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <a
                      href={`https://basescan.org/tx/${ticket.ticketNft.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--app-accent)] hover:underline"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View on BaseScan
                    </a>
                    
                    <a
                      href={`https://basescan.org/token/${ticket.ticketNft.contract}?a=${ticket.ticketNft.tokenId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--app-accent)] hover:underline"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View NFT
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}