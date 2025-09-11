import { supabase } from './supabaseClient'

export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  endTime?: string
  location: string
  creator: string
  attendees: string[]
  maxAttendees?: number
  tags: string[]
  category: string
  isRecurring: boolean
  recurringPattern?: 'daily' | 'weekly' | 'monthly'
  status: 'upcoming' | 'past' | 'cancelled'
  createdAt: string
  updatedAt: string
  imageUrl?: string
  slug?: string // SEO-friendly URL slug
  // Paid event fields
  isPaid?: boolean;
  priceUSDC?: number;
  // Token gating fields
  isTokenGated?: boolean;
  requiredTokenAddress?: string;
  requiredTokenBalance?: number;
  requiredTokenSymbol?: string;
  requiredTokenName?: string;
  tokenGateType?: 'ERC20' | 'ERC721' | 'ERC1155';
  requiredNftCollection?: string;
  requiredNftCount?: number;
}

export interface EventComment {
  id: string
  eventId: string
  author: string
  authorName?: string
  content: string
  createdAt: string
}

export interface EventRegistration {
  id: string
  eventId: string
  userAddress: string
  userName: string
  userEmail: string
  userPhone?: string
  userBio?: string
  registeredAt: string
  status: 'confirmed' | 'pending' | 'cancelled'
  paymentTxHash?: string
  ticketNft?: {
    contract: string
    tokenId: string
    txHash: string
  }
  event?: Event // Optional event details when fetched with join
}

export interface TokenVerification {
  id: string
  eventId: string
  userAddress: string
  tokenAddress: string
  tokenBalance: number
  verificationStatus: 'passed' | 'failed' | 'pending'
  verifiedAt: string
}

export interface TokenRequirement {
  type: 'ERC20' | 'ERC721' | 'ERC1155'
  contractAddress: `0x${string}`
  requiredBalance: string
  symbol?: string
  name?: string
  tokenId?: string // For ERC1155
}

export interface TokenGateResult {
  passed: boolean
  userBalance: string
  requiredBalance: string
  tokenInfo?: {
    symbol: string
    name: string
    decimals: number
    type?: 'ERC20' | 'ERC721' | 'ERC1155'
  }
  error?: string
}

export interface EventSupport {
  id: string
  eventId: string
  supporterAddress: string
  supporterName?: string
  hostAddress: string
  amountUSDC: number
  txHash: string
  chainId: number
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: string
  confirmedAt?: string
}

export interface ProofOfAttendance {
  id: string
  eventId: string
  attendeeAddress: string
  attendeeName?: string
  status: 'pending' | 'issued' | 'claimed' | 'revoked'
  poaType: 'digital' | 'nft' | 'both'
  
  // Check-in information
  checkedInAt?: string
  checkedInBy?: string
  checkInMethod?: 'manual' | 'qr_code' | 'geolocation' | 'nfc'
  checkInLocation?: string
  
  // Digital POA data
  poaTitle?: string
  poaDescription?: string
  poaImageUrl?: string
  poaMetadata?: any
  
  // NFT POA data
  nftContractAddress?: string
  nftTokenId?: string
  nftTxHash?: string
  nftMetadataUri?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  issuedAt?: string
  claimedAt?: string
  
  // Optional event details when fetched with join
  event?: Event
}

export interface EventCheckInSettings {
  id: string
  eventId: string
  
  // Check-in configuration
  checkInEnabled: boolean
  checkInWindowStart?: string
  checkInWindowEnd?: string
  requireGeolocation: boolean
  allowedCheckInRadius: number // meters
  eventLatitude?: number
  eventLongitude?: number
  
  // POA configuration
  autoIssuePoa: boolean
  poaTemplateTitle?: string
  poaTemplateDescription?: string
  poaTemplateImageUrl?: string
  poaCustomMetadata?: any
  
  // NFT POA configuration
  enableNftPoa: boolean
  nftContractAddress?: string
  nftBaseUri?: string
  nftCollectionName?: string
  nftCollectionSymbol?: string
  
  createdAt: string
  updatedAt: string
}

export interface POATemplate {
  id: string
  creatorAddress: string
  name: string
  description?: string
  category: string
  templateImageUrl?: string
  templateMetadata?: any
  backgroundColor: string
  textColor: string
  accentColor: string
  usageCount: number
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

// Create a new event
export async function createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
  console.log('Creating event with data:', eventData);
  
  // Generate slug from title
  const { slugify } = await import('./slugify');
  const baseSlug = slugify(eventData.title);
  
  // Ensure slug uniqueness by checking database
  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;
  
  while (!isUnique) {
    const { data: existingEvent } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (!existingEvent) {
      isUnique = true;
    } else {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
  
  console.log('Generated unique slug:', slug);
  
  // Transform camelCase to snake_case for database
  const dbEventData: any = {
    title: eventData.title,
    description: eventData.description,
    date: eventData.date,
    time: eventData.time,
    end_time: eventData.endTime,
    location: eventData.location,
    creator: eventData.creator,
    attendees: eventData.attendees,
    max_attendees: eventData.maxAttendees,
    tags: eventData.tags,
    category: eventData.category || 'General', // Default category if not provided
    is_recurring: eventData.isRecurring,
    recurring_pattern: eventData.recurringPattern,
    status: eventData.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    slug: slug, // Store the generated slug
    is_paid: eventData.isPaid,
    price_usdc: eventData.priceUSDC,
    // Token gating fields
    is_token_gated: eventData.isTokenGated,
    required_token_address: eventData.requiredTokenAddress,
    required_token_balance: eventData.requiredTokenBalance,
    required_token_symbol: eventData.requiredTokenSymbol,
    required_token_name: eventData.requiredTokenName,
    token_gate_type: eventData.tokenGateType,
    required_nft_collection: eventData.requiredNftCollection,
    required_nft_count: eventData.requiredNftCount,
  }

  // Only add image_url if it exists to avoid database errors
  if (eventData.imageUrl) {
    dbEventData.image_url = eventData.imageUrl;
  }

  console.log('Transformed data for database:', dbEventData);

  const { data, error } = await supabase
    .from('events')
    .insert([dbEventData])
    .select()
    .single()

  if (error) {
    console.error('Error creating event:', error);
    console.error('Error details:', error);
    
    // If the error is about image_url column not existing, try without it
    if (error.message?.includes('image_url') || error.code === '42703') {
      console.log('Retrying without image_url column...');
      const { image_url, ...dataWithoutImage } = dbEventData;
      const { data: retryData, error: retryError } = await supabase
        .from('events')
        .insert([dataWithoutImage])
        .select()
        .single()
      
      if (retryError) {
        console.error('Retry also failed:', retryError);
        throw retryError;
      }
      
      console.log('Event created successfully without image:', retryData);
      return transformEventFromDB(retryData);
    }
    
    throw error;
  }

  console.log('Event created successfully:', data);
  return transformEventFromDB(data)
}

// Get all events
export async function getAllEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching events:', error);
      throw error;
    }

    if (!data) {
      console.warn('No data returned from events table');
      return [];
    }

    return data.map(transformEventFromDB)
  } catch (error) {
    console.error('Failed to fetch events:', error);
    throw error;
  }
}

// Get events created by a user
export async function getUserCreatedEvents(userAddress: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('creator', userAddress)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching user created events:', error)
    throw error
  }

  return data.map(transformEventFromDB)
}

// Get events a user has RSVP'd to
export async function getUserRsvpEvents(userAddress: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .contains('attendees', [userAddress])
    .neq('creator', userAddress)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching user RSVP events:', error)
    throw error
  }

  return data.map(transformEventFromDB)
}

// Register for an event with user details
export async function registerForEvent(
  eventId: string, 
  userAddress: string, 
  userDetails: {
    name: string
    email: string
    phone?: string
    bio?: string
  },
  onchain?: {
    // If provided, we store tx hash and mark confirmed. If missing and event is paid, caller must handle payment first
    paymentTxHash?: `0x${string}`,
    ticketNft?: { contract: `0x${string}`, tokenId: string, txHash: `0x${string}` }
  }
): Promise<EventRegistration> {
  console.log('🔄 Starting registration process:', { eventId, userAddress, userDetails });
  
  try {
    // First, try the database registration approach directly
    console.log('📝 Attempting database registration first');
    
    // Check if user is already registered
  const { data: existingRegistration, error: checkError } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_address', userAddress)
    .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('⚠️ Could not check existing registration:', checkError);
      // Continue anyway
  }

  if (existingRegistration) {
      console.log('✅ User already registered, returning existing registration');
      return transformRegistrationFromDB(existingRegistration);
  }

  // Create registration record
  const registrationData: any = {
    event_id: eventId,
    user_address: userAddress,
    user_name: userDetails.name,
    user_email: userDetails.email,
      user_phone: userDetails.phone || null,
      user_bio: userDetails.bio || null,
    status: 'confirmed'
  }

    if (onchain?.paymentTxHash) {
      registrationData.payment_tx_hash = onchain.paymentTxHash
      registrationData.chain_id = 8453 // Base mainnet
    }
    if (onchain?.ticketNft) {
      registrationData.ticket_nft_contract = onchain.ticketNft.contract
      registrationData.ticket_token_id = onchain.ticketNft.tokenId
      registrationData.ticket_nft_tx_hash = onchain.ticketNft.txHash
    }

    console.log('📝 Creating database registration with data:', registrationData);

  const { data: registration, error: regError } = await supabase
    .from('event_registrations')
    .insert([registrationData])
    .select()
    .single()

  if (regError) {
      console.error('❌ Database registration failed:', regError);
      throw regError; // Will be caught by outer catch
    }

    console.log('✅ Database registration successful:', registration);
    
    // Also update the attendees array in the events table for UI compatibility
    try {
      console.log('📝 Updating attendees array for UI compatibility');
      
      // Get current event to update attendees array
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('attendees')
        .eq('id', eventId)
        .single();
      
      if (!fetchError && currentEvent) {
        const currentAttendees = currentEvent.attendees || [];
        if (!currentAttendees.includes(userAddress)) {
          await supabase
            .from('events')
            .update({ 
              attendees: [...currentAttendees, userAddress],
              updated_at: new Date().toISOString()
            })
            .eq('id', eventId);
          
          console.log('✅ Updated attendees array successfully');
        }
      }
    } catch (updateError) {
      console.warn('⚠️ Failed to update attendees array (non-critical):', updateError);
      // Don't fail the registration if attendees array update fails
    }

    console.log('📊 Registration complete - database is the source of truth');

    return transformRegistrationFromDB(registration);
    
  } catch (error) {
    console.error('❌ Database registration failed:', error);
    
    // No fallbacks - database is the single source of truth
    // Provide specific error messages based on the error
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = String(error.message);
      if (errorMessage.includes('already registered') || errorMessage.includes('23505')) {
        throw new Error('You are already registered for this event.');
      } else if (errorMessage.includes('Event not found') || errorMessage.includes('23503')) {
        throw new Error('Event not found. Please make sure the event still exists.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('RLS')) {
        throw new Error('Database access error. Please try again or contact support.');
      }
    }
    
    throw new Error('Registration failed. Please try again or contact support.');
  }
}

// RSVP to an event (simplified version for backward compatibility)
export async function rsvpToEvent(eventId: string, userAddress: string): Promise<Event> {
  console.log('🔄 Starting RSVP process:', { eventId, userAddress });
  
  try {
  // First get the current event
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError) {
      console.error('❌ Error fetching event for RSVP:', fetchError);
      if (fetchError.code === 'PGRST116') {
        throw new Error(`Event with ID ${eventId} not found`);
      }
      throw new Error(`Failed to fetch event: ${fetchError.message}`);
    }

    if (!currentEvent) {
      throw new Error(`Event with ID ${eventId} not found`);
    }

    console.log('📝 Found event for RSVP:', currentEvent.title);

  const attendees = currentEvent.attendees || []
  if (attendees.includes(userAddress)) {
      console.log('✅ User already RSVP\'d, returning current event');
    return transformEventFromDB(currentEvent) // Already RSVP'd
  }

    console.log('📝 Adding user to attendees list');

  const { data, error } = await supabase
    .from('events')
    .update({ 
      attendees: [...attendees, userAddress],
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
      .single();

    if (error) {
      console.error('❌ Error updating event attendees:', error);
      
      // Handle empty error objects gracefully
      let errorMessage = 'Unknown database error';
      if (error && typeof error === 'object') {
        if ('message' in error && error.message) {
          errorMessage = String(error.message);
        } else if ('code' in error && error.code) {
          errorMessage = `Database error (code: ${error.code})`;
        } else if ('details' in error && error.details) {
          errorMessage = String(error.details);
        } else {
          errorMessage = 'Database permission or RLS policy error';
        }
      }
      
      throw new Error(`Failed to update event attendees: ${errorMessage}`);
    }

  if (!data) {
      console.error('❌ No data returned from event update');
      throw new Error('Event not found or could not update attendees');
    }

    console.log('✅ Successfully added user to event attendees');
    return transformEventFromDB(data);
    
  } catch (error) {
    console.error('❌ RSVP process failed:', error);
    
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to RSVP to event');
    }
  }
}

// Cancel RSVP
export async function cancelRsvp(eventId: string, userAddress: string): Promise<Event> {
  // First get the current event
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError) {
    console.error('Error fetching event for cancel RSVP:', fetchError)
    throw fetchError
  }

  const attendees = (currentEvent.attendees || []).filter((addr: string) => addr !== userAddress)

  const { data, error } = await supabase
    .from('events')
    .update({ 
      attendees,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Error cancelling RSVP:', error)
    throw error
  }

  const updatedEvent = transformEventFromDB(data)

  // Send notification to event creator about RSVP cancellation
  try {
    // Import dynamically to avoid SSR issues
    const { notifyEventCreator } = await import('@/lib/farcaster');
    
    if (currentEvent.creator && currentEvent.creator !== userAddress) {
      await notifyEventCreator(
        currentEvent.creator,
        currentEvent.title,
        userAddress
      );
    }
  } catch (notificationError) {
    console.error('Failed to send RSVP cancellation notification:', notificationError);
    // Don't throw error here as the RSVP cancellation was successful
  }

  return updatedEvent
}

// Update an event
export async function updateEvent(eventId: string, updates: Partial<Omit<Event, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Event> {
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {
    updated_at: new Date().toISOString()
  }
  
  if (updates.title !== undefined) dbUpdates.title = updates.title
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.date !== undefined) dbUpdates.date = updates.date
  if (updates.time !== undefined) dbUpdates.time = updates.time
  if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime
  if (updates.location !== undefined) dbUpdates.location = updates.location
  if (updates.creator !== undefined) dbUpdates.creator = updates.creator
  if (updates.attendees !== undefined) dbUpdates.attendees = updates.attendees
  if (updates.maxAttendees !== undefined) dbUpdates.max_attendees = updates.maxAttendees
  if (updates.tags !== undefined) dbUpdates.tags = updates.tags
  if (updates.isRecurring !== undefined) dbUpdates.is_recurring = updates.isRecurring
  if (updates.recurringPattern !== undefined) dbUpdates.recurring_pattern = updates.recurringPattern
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl
  if (updates.isPaid !== undefined) dbUpdates.is_paid = updates.isPaid;
  if (updates.priceUSDC !== undefined) dbUpdates.price_usdc = updates.priceUSDC;
  // Token gating fields
  if (updates.isTokenGated !== undefined) dbUpdates.is_token_gated = updates.isTokenGated;
  if (updates.requiredTokenAddress !== undefined) dbUpdates.required_token_address = updates.requiredTokenAddress;
  if (updates.requiredTokenBalance !== undefined) dbUpdates.required_token_balance = updates.requiredTokenBalance;
  if (updates.requiredTokenSymbol !== undefined) dbUpdates.required_token_symbol = updates.requiredTokenSymbol;
  if (updates.requiredTokenName !== undefined) dbUpdates.required_token_name = updates.requiredTokenName;
  if (updates.tokenGateType !== undefined) dbUpdates.token_gate_type = updates.tokenGateType;
  if (updates.requiredNftCollection !== undefined) dbUpdates.required_nft_collection = updates.requiredNftCollection;
  if (updates.requiredNftCount !== undefined) dbUpdates.required_nft_count = updates.requiredNftCount;

  const { data, error } = await supabase
    .from('events')
    .update(dbUpdates)
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Error updating event:', error)
    throw error
  }

  return transformEventFromDB(data)
}

// Delete an event
export async function deleteEvent(eventId: string): Promise<void> {
  // First get the current event to capture attendee information before deletion
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError) {
    console.error('Error fetching event for deletion:', fetchError)
    throw fetchError
  }

  // Delete the event
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    console.error('Error deleting event:', error)
    throw error
  }

  // Send notifications to attendees and creator
  try {
    const eventDate = new Date(`${currentEvent.date}T${currentEvent.time}`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const response = await fetch('/api/events/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete',
        eventTitle: currentEvent.title,
        eventDate: eventDate,
        attendeeAddresses: currentEvent.attendees || [],
        creatorAddress: currentEvent.creator
      })
    });

    if (response.ok) {
      const results = await response.json();
      console.log('Deletion notification results:', results);
    } else {
      console.error('Failed to send deletion notifications:', await response.text());
    }
  } catch (notificationError) {
    console.error('Failed to send deletion notifications:', notificationError);
    // Don't throw error here as the event deletion was successful
  }
}

// Cancel an event (changes status to 'cancelled')
export async function cancelEvent(eventId: string): Promise<Event> {
  // First get the current event to capture attendee information before cancellation
  const { data: currentEvent, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError) {
    console.error('Error fetching event for cancellation:', fetchError)
    throw fetchError
  }

  // Update event status to cancelled
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    console.error('Error cancelling event:', error)
    throw error
  }

  const cancelledEvent = transformEventFromDB(data)

  // Send notifications to attendees and creator
  try {
    const eventDate = new Date(`${currentEvent.date}T${currentEvent.time}`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const response = await fetch('/api/events/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cancel',
        eventTitle: currentEvent.title,
        eventDate: eventDate,
        attendeeAddresses: currentEvent.attendees || [],
        creatorAddress: currentEvent.creator
      })
    });

    if (response.ok) {
      const results = await response.json();
      console.log('Cancellation notification results:', results);
    } else {
      console.error('Failed to send cancellation notifications:', await response.text());
    }
  } catch (notificationError) {
    console.error('Failed to send cancellation notifications:', notificationError);
    // Don't throw error here as the event cancellation was successful
  }

  return cancelledEvent
}

// CSV Export utility functions
export function generateEventRegistrationsCSV(registrations: EventRegistration[], eventTitle: string): string {
  // CSV headers
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Wallet Address',
    'Bio',
    'Registration Date',
    'Status',
    'Payment Tx Hash',
    'Ticket NFT Contract',
    'Ticket Token ID',
    'Ticket NFT Tx Hash'
  ];

  // Convert registrations to CSV rows
  const rows = registrations.map(reg => [
    reg.userName || 'N/A',
    reg.userEmail || 'N/A',
    reg.userPhone || 'N/A',
    reg.userAddress,
    reg.userBio || 'N/A',
    new Date(reg.registeredAt).toLocaleDateString() + ' ' + new Date(reg.registeredAt).toLocaleTimeString(),
    reg.status,
    reg.paymentTxHash || 'N/A',
    reg.ticketNft?.contract || 'N/A',
    reg.ticketNft?.tokenId || 'N/A',
    reg.ticketNft?.txHash || 'N/A'
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Helper to build CSV download URL supporting both browser and Farcaster
export function buildCsvDownloadUrl(baseUrl: string, eventId: string, address?: string | null) {
  const addr = address || ''
  const url = new URL(`/api/events/${eventId}/registrations`, baseUrl)
  if (addr) url.searchParams.set('address', addr)
  return url.toString()
}

// Search events
export async function searchEvents(query: string, tags: string[] = []): Promise<Event[]> {
  let queryBuilder = supabase
    .from('events')
    .select('*')

  if (query) {
    queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)
  }

  if (tags.length > 0) {
    queryBuilder = queryBuilder.overlaps('tags', tags)
  }

  const { data, error } = await queryBuilder
    .order('date', { ascending: true })

  if (error) {
    console.error('Error searching events:', error)
    throw error
  }

  return data.map(transformEventFromDB)
}

// Get upcoming events
export async function getUpcomingEvents(): Promise<Event[]> {
  const now = new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('date', now)
    .eq('status', 'upcoming')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching upcoming events:', error)
    throw error
  }

  return data.map(transformEventFromDB)
}

// Add comment to event
export async function addEventComment(eventId: string, author: string, content: string): Promise<EventComment> {
  const { data, error } = await supabase
    .from('event_comments')
    .insert([{
      event_id: eventId,
    author,
    content,
      created_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    console.error('Error adding comment:', error)
    throw error
  }

  return transformCommentFromDB(data)
}

// Get comments for an event
export async function getEventComments(eventId: string): Promise<EventComment[]> {
  const { data, error } = await supabase
    .from('event_comments')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching comments:', error)
    throw error
  }

  return data.map(transformCommentFromDB)
}

/**
 * Generate a URL-friendly slug for an event
 */
export function getEventUrl(event: Event, baseUrl?: string): string {

  // Temporary: Use UUID for now to ensure URLs work
  // TODO: Re-enable slug generation once lookup is stable
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_URL || '');
  console.log('🔗 Using UUID for event URL:', { title: event.title, id: event.id });
  return `${base}/events/${event.id}`;
  
  // Original slug code (disabled for now):
  // const { generateEventSlug } = require('./slugify');
  // const slug = generateEventSlug(event.title, event.id);
  // console.log('🔗 Generated slug for event:', { title: event.title, id: event.id, slug });
  // return `${base}/events/${slug}`;
}

// Transform database row to Event interface (handle snake_case to camelCase)
function transformEventFromDB(dbEvent: any): Event {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description,
    date: dbEvent.date,
    time: dbEvent.time,
    endTime: dbEvent.end_time,
    location: dbEvent.location,
    creator: dbEvent.creator,
    attendees: dbEvent.attendees || [],
    maxAttendees: dbEvent.max_attendees,
    tags: dbEvent.tags || [],
    category: dbEvent.category || 'Other',
    isRecurring: dbEvent.is_recurring || false,
    recurringPattern: dbEvent.recurring_pattern,
    status: dbEvent.status || 'upcoming',
    createdAt: dbEvent.created_at,
    updatedAt: dbEvent.updated_at,
    imageUrl: dbEvent.image_url,
    slug: dbEvent.slug, // Include slug from database
    isPaid: dbEvent.is_paid,
    priceUSDC: dbEvent.price_usdc,
    // Token gating fields
    isTokenGated: dbEvent.is_token_gated,
    requiredTokenAddress: dbEvent.required_token_address,
    requiredTokenBalance: dbEvent.required_token_balance,
    requiredTokenSymbol: dbEvent.required_token_symbol,
    requiredTokenName: dbEvent.required_token_name,
    tokenGateType: dbEvent.token_gate_type,
    requiredNftCollection: dbEvent.required_nft_collection,
    requiredNftCount: dbEvent.required_nft_count,
  }
}

// Transform registration from database format
function transformRegistrationFromDB(registration: any): EventRegistration {
  return {
    id: registration.id,
    eventId: registration.event_id,
    userAddress: registration.user_address,
    userName: registration.user_name,
    userEmail: registration.user_email,
    userPhone: registration.user_phone,
    userBio: registration.user_bio,
    registeredAt: registration.registered_at,
    status: registration.status,
    paymentTxHash: registration.payment_tx_hash || undefined,
    ticketNft: registration.ticket_nft_contract && registration.ticket_nft_tx_hash ? {
      contract: registration.ticket_nft_contract,
      tokenId: String(registration.ticket_token_id ?? ''),
      txHash: registration.ticket_nft_tx_hash
    } : undefined
  }
}

// Get event by ID or slug with attendees information
export async function getEventById(eventIdOrSlug: string): Promise<Event | null> {
  try {
    console.log('🔍 Looking up event:', eventIdOrSlug);
    
    // Import slugify utilities
    const { isUUID } = await import('./slugify');
    
    // Strategy 1: Try slug lookup first (most common case for new events)
    if (!isUUID(eventIdOrSlug)) {
      console.log('✅ Detected slug, trying slug lookup');
      const { data: event, error: slugError } = await supabase
        .from('events')
        .select('*')
        .eq('slug', eventIdOrSlug)
        .single();
      
      if (!slugError && event) {
        console.log('✅ Found event by slug:', event.slug);
        return await processEventWithRegistrations(event);
      } else {
        console.log('⚠️ No event found by slug:', eventIdOrSlug);
      }
    }
    
    // Strategy 2: Try exact UUID match (backward compatibility)
    if (isUUID(eventIdOrSlug)) {
      console.log('✅ Detected UUID, using exact match');
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventIdOrSlug)
        .single();
      
      if (!eventError && event) {
        console.log('✅ Found event by UUID');
        return await processEventWithRegistrations(event);
      }
    }
    
    // Strategy 3: Fallback - try exact match on ID (for any edge cases)
    console.log('⚠️ Trying fallback exact match on ID');
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventIdOrSlug)
      .single();
    
    if (!eventError && event) {
      console.log('✅ Found event by ID fallback');
      return await processEventWithRegistrations(event);
    }
    
    console.warn('❌ Event not found with any strategy:', eventIdOrSlug);
    return null;
  } catch (error) {
    console.error('Error in getEventById:', error);
    throw error;
  }
}

// Helper function to process event with registrations
async function processEventWithRegistrations(event: any): Promise<Event> {
  try {
    // Get confirmed registrations for the event
    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select('user_address')
      .eq('event_id', event.id)
      .eq('status', 'confirmed');

    if (regError) {
      console.error('Error fetching event registrations:', regError);
      // Don't fail completely if we can't get registrations
      event.attendees = event.attendees || [];
    } else {
      // Update attendees array with confirmed registrations
      event.attendees = registrations?.map(reg => reg.user_address) || [];
    }

    return transformEventFromDB(event);
  } catch (error) {
    console.error('Error processing event with registrations:', error);
    return transformEventFromDB(event);
  }
}

// Get event registrations for hosts
export async function getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*')
    .eq('event_id', eventId)
    .order('registered_at', { ascending: false })

  if (error) {
    console.error('Error fetching event registrations:', error)
    throw error
  }

  return data.map(transformRegistrationFromDB)
}

// Check if user is registered for an event (database only - single source of truth)
export async function isUserRegisteredForEvent(eventId: string, userAddress: string): Promise<boolean> {
  if (!userAddress) return false;

  console.log('🔍 Checking registration status in database for:', { eventId, userAddress });

  try {
    // Check the database registrations table only
    const { data: registration, error: regError } = await supabase
      .from('event_registrations')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_address', userAddress)
      .eq('status', 'confirmed') // Only count confirmed registrations
      .single()

    if (regError) {
      if (regError.code === 'PGRST116') {
        // No rows found - user is not registered
        console.log('❌ User not found in database registrations');
        return false;
      } else {
        // Other database error
        console.error('❌ Database error checking registration:', regError);
        throw new Error(`Failed to check registration status: ${regError.message}`);
      }
    }

    if (registration) {
      console.log('✅ User found in database registrations with confirmed status');
      return true;
    }

    console.log('❌ User not registered in database');
    return false;

  } catch (error) {
    console.error('❌ Error checking registration status:', error);
    // Don't return false on error - let the UI handle the error state
    throw error;
  }
}

// Cancel registration (database only - single source of truth)
export async function cancelRegistration(eventId: string, userAddress: string): Promise<void> {
  console.log('🔄 Cancelling registration in database for:', { eventId, userAddress });
  
  try {
    // Update registration status in database
    const { error: regError } = await supabase
      .from('event_registrations')
      .update({ status: 'cancelled' })
      .eq('event_id', eventId)
      .eq('user_address', userAddress)

    if (regError) {
      console.error('❌ Error cancelling registration in database:', regError);
      throw new Error(`Failed to cancel registration: ${regError.message}`);
    }

    console.log('✅ Registration cancelled successfully in database');
    
    // Also update the attendees array in the events table for UI compatibility
    try {
      console.log('📝 Updating attendees array for UI compatibility');
      
      // Get current event to update attendees array
      const { data: currentEvent, error: fetchError } = await supabase
        .from('events')
        .select('attendees')
        .eq('id', eventId)
        .single();
      
      if (!fetchError && currentEvent) {
        const currentAttendees = currentEvent.attendees || [];
        const updatedAttendees = currentAttendees.filter((addr: string) => addr !== userAddress);
        
        await supabase
          .from('events')
          .update({ 
            attendees: updatedAttendees,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId);
        
        console.log('✅ Updated attendees array successfully');
      }
    } catch (updateError) {
      console.warn('⚠️ Failed to update attendees array (non-critical):', updateError);
      // Don't fail the cancellation if attendees array update fails
    }
    
    console.log('📊 Cancellation complete - database is the source of truth');
    
  } catch (error) {
    console.error('❌ Failed to cancel registration:', error);
    throw error;
  }
}

// Get actual attendee count from registrations table
export async function getEventAttendeeCount(eventId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmed')

    if (error) {
      console.error('Error fetching attendee count:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Failed to get attendee count:', error)
    return 0
  }
}

// Transform database row to EventComment interface
function transformCommentFromDB(dbComment: any): EventComment {
  return {
    id: dbComment.id,
    eventId: dbComment.event_id,
    author: dbComment.author,
    authorName: dbComment.author_name,
    content: dbComment.content,
    createdAt: dbComment.created_at
  }
}

// Get total confirmed signups for a host (across all their events)
export async function getHostSignupCount(hostAddress: string): Promise<number> {
  try {
    // Get all events created by this host
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('creator', hostAddress);
    if (eventsError || !events) {
      console.error('Error fetching events for host:', eventsError);
      return 0;
    }
    const eventIds = events.map((e: any) => e.id);
    if (eventIds.length === 0) return 0;
    // Get all confirmed registrations for these events
    const { count, error: regError } = await supabase
      .from('event_registrations')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .eq('status', 'confirmed');
    if (regError) {
      console.error('Error fetching registrations for host:', regError);
      return 0;
    }
    return count || 0;
  } catch (error) {
    console.error('Failed to get host signup count:', error);
    return 0;
  }
}

// Get all NFT tickets a user holds across different events
export async function getUserNFTTickets(userAddress: string): Promise<EventRegistration[]> {
  if (!userAddress) return [];

  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        events (
          id,
          title,
          date,
          time,
          location,
          image_url
        )
      `)
      .eq('user_address', userAddress)
      .not('ticket_nft_contract', 'is', null)
      .not('ticket_nft_tx_hash', 'is', null)
      .order('registered_at', { ascending: false })

    if (error) {
      console.error('Error fetching user NFT tickets:', error);
      throw error;
    }

    if (!data) return [];

    return data.map(registration => ({
      ...transformRegistrationFromDB(registration),
      event: registration.events ? transformEventFromDB(registration.events) : null
    }));
  } catch (error) {
    console.error('Error fetching user NFT tickets:', error);
    throw error;
  }
}

// Get NFT ticket details for a specific registration
export async function getNFTTicketDetails(registrationId: string): Promise<EventRegistration | null> {
  try {
    const { data, error } = await supabase
      .from('event_registrations')
      .select(`
        *,
        events (
          id,
          title,
          date,
          time,
          location,
          image_url,
          creator
        )
      `)
      .eq('id', registrationId)
      .not('ticket_nft_contract', 'is', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No NFT ticket found
      }
      console.error('Error fetching NFT ticket details:', error);
      throw error;
    }

    if (!data) return null;

    return {
      ...transformRegistrationFromDB(data),
      event: data.events ? transformEventFromDB(data.events) : null
    };
  } catch (error) {
    console.error('Error fetching NFT ticket details:', error);
    throw error;
  }
}

// Support an event with USDC
export async function supportEvent(
  eventId: string,
  supporterAddress: string,
  hostAddress: string,
  amountUSDC: number,
  txHash: string,
  supporterName?: string
): Promise<EventSupport> {
  console.log('📝 Recording support transaction:', { eventId, supporterAddress, hostAddress, amountUSDC, txHash });
  
  try {
    const supportData = {
      event_id: eventId,
      supporter_address: supporterAddress,
      supporter_name: supporterName || null,
      host_address: hostAddress,
      amount_usdc: amountUSDC,
      tx_hash: txHash,
      chain_id: 8453, // Base mainnet
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('event_support')
      .insert([supportData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error recording support transaction:', error);
      throw error;
    }

    console.log('✅ Support transaction recorded successfully:', data);
    return transformSupportFromDB(data);
  } catch (error) {
    console.error('❌ Failed to record support transaction:', error);
    throw error;
  }
}

// Get support transactions for an event
export async function getEventSupport(eventId: string): Promise<EventSupport[]> {
  try {
    const { data, error } = await supabase
      .from('event_support')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'confirmed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching event support:', error);
      throw error;
    }

    return data?.map(transformSupportFromDB) || [];
  } catch (error) {
    console.error('Failed to fetch event support:', error);
    throw error;
  }
}

// Get total support amount for an event (including pending and confirmed)
export async function getEventSupportTotal(eventId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('event_support')
      .select('amount_usdc')
      .eq('event_id', eventId)
      .in('status', ['pending', 'confirmed']); // Include both pending and confirmed transactions

    if (error) {
      console.error('Error fetching event support total:', error);
      return 0;
    }

    const total = data?.reduce((sum, support) => sum + parseFloat(support.amount_usdc), 0) || 0;
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Failed to calculate event support total:', error);
    return 0;
  }
}

// Get only pending support amount for an event
export async function getEventPendingSupportTotal(eventId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('event_support')
      .select('amount_usdc')
      .eq('event_id', eventId)
      .eq('status', 'pending'); // Only pending transactions

    if (error) {
      console.error('Error fetching pending support total:', error);
      return 0;
    }

    const total = data?.reduce((sum, support) => sum + parseFloat(support.amount_usdc), 0) || 0;
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Failed to calculate pending support total:', error);
    return 0;
  }
}

// Confirm support transaction (called by webhook or manual verification)
export async function confirmSupportTransaction(txHash: string): Promise<EventSupport | null> {
  try {
    const { data, error } = await supabase
      .from('event_support')
      .update({ 
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('tx_hash', txHash)
      .select()
      .single();

    if (error) {
      console.error('Error confirming support transaction:', error);
      throw error;
    }

    return data ? transformSupportFromDB(data) : null;
  } catch (error) {
    console.error('Failed to confirm support transaction:', error);
    throw error;
  }
}

// Transform database row to EventSupport interface
function transformSupportFromDB(dbSupport: any): EventSupport {
  return {
    id: dbSupport.id,
    eventId: dbSupport.event_id,
    supporterAddress: dbSupport.supporter_address,
    supporterName: dbSupport.supporter_name,
    hostAddress: dbSupport.host_address,
    amountUSDC: parseFloat(dbSupport.amount_usdc),
    txHash: dbSupport.tx_hash,
    chainId: dbSupport.chain_id,
    status: dbSupport.status,
    createdAt: dbSupport.created_at,
    confirmedAt: dbSupport.confirmed_at
  };
}

// ============================================================================
// PROOF OF ATTENDANCE FUNCTIONS
// ============================================================================

/**
 * Create or update check-in settings for an event
 */
export async function createOrUpdateCheckInSettings(
  eventId: string,
  settings: Omit<EventCheckInSettings, 'id' | 'eventId' | 'createdAt' | 'updatedAt'>
): Promise<EventCheckInSettings> {
  console.log('🔧 Creating/updating check-in settings for event:', eventId);
  
  try {
    const settingsData = {
      event_id: eventId,
      check_in_enabled: settings.checkInEnabled,
      check_in_window_start: settings.checkInWindowStart,
      check_in_window_end: settings.checkInWindowEnd,
      require_geolocation: settings.requireGeolocation,
      allowed_check_in_radius: settings.allowedCheckInRadius,
      event_latitude: settings.eventLatitude,
      event_longitude: settings.eventLongitude,
      auto_issue_poa: settings.autoIssuePoa,
      poa_template_title: settings.poaTemplateTitle,
      poa_template_description: settings.poaTemplateDescription,
      poa_template_image_url: settings.poaTemplateImageUrl,
      poa_custom_metadata: settings.poaCustomMetadata,
      enable_nft_poa: settings.enableNftPoa,
      nft_contract_address: settings.nftContractAddress,
      nft_base_uri: settings.nftBaseUri,
      nft_collection_name: settings.nftCollectionName,
      nft_collection_symbol: settings.nftCollectionSymbol,
    };

    const { data, error } = await supabase
      .from('event_check_in_settings')
      .upsert(settingsData, { onConflict: 'event_id' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating/updating check-in settings:', error);
      throw error;
    }

    console.log('✅ Check-in settings created/updated successfully');
    return transformCheckInSettingsFromDB(data);
  } catch (error) {
    console.error('❌ Failed to create/update check-in settings:', error);
    throw error;
  }
}

/**
 * Get check-in settings for an event
 */
export async function getEventCheckInSettings(eventId: string): Promise<EventCheckInSettings | null> {
  try {
    const { data, error } = await supabase
      .from('event_check_in_settings')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No settings found
      }
      console.error('Error fetching check-in settings:', error);
      throw error;
    }

    return data ? transformCheckInSettingsFromDB(data) : null;
  } catch (error) {
    console.error('Failed to fetch check-in settings:', error);
    throw error;
  }
}

/**
 * Check in an attendee to an event
 */
export async function checkInAttendee(
  eventId: string,
  attendeeAddress: string,
  checkedInBy: string,
  checkInData: {
    method?: 'manual' | 'qr_code' | 'geolocation' | 'nfc'
    location?: string
    attendeeName?: string
    latitude?: number
    longitude?: number
  } = {}
): Promise<ProofOfAttendance> {
  console.log('📋 Checking in attendee:', { eventId, attendeeAddress, checkedInBy });
  
  try {
    // Verify attendee is registered for the event
    const isRegistered = await isUserRegisteredForEvent(eventId, attendeeAddress);
    if (!isRegistered) {
      throw new Error('Attendee must be registered for the event before checking in');
    }

    // Get check-in settings
    const settings = await getEventCheckInSettings(eventId);
    
    // Validate check-in window if settings exist
    if (settings && settings.checkInEnabled) {
      const now = new Date();
      if (settings.checkInWindowStart && new Date(settings.checkInWindowStart) > now) {
        throw new Error('Check-in has not started yet');
      }
      if (settings.checkInWindowEnd && new Date(settings.checkInWindowEnd) < now) {
        throw new Error('Check-in period has ended');
      }
    }

    // Validate geolocation if required
    if (settings?.requireGeolocation && checkInData.latitude && checkInData.longitude) {
      if (!settings.eventLatitude || !settings.eventLongitude) {
        throw new Error('Event location not configured for geolocation check-in');
      }
      
      const distance = calculateDistance(
        checkInData.latitude,
        checkInData.longitude,
        settings.eventLatitude,
        settings.eventLongitude
      );
      
      if (distance > settings.allowedCheckInRadius) {
        throw new Error(`Check-in location is ${Math.round(distance)}m away. Must be within ${settings.allowedCheckInRadius}m of event location`);
      }
    }

    // Check if already checked in
    const existingPOA = await getEventPOAForAttendee(eventId, attendeeAddress);
    if (existingPOA && existingPOA.checkedInAt) {
      console.log('✅ Attendee already checked in, returning existing POA');
      return existingPOA;
    }

    // Get event details for POA
    const event = await getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Create or update POA record
    const poaData = {
      event_id: eventId,
      attendee_address: attendeeAddress,
      attendee_name: checkInData.attendeeName || null,
      status: settings?.autoIssuePoa ? 'issued' : 'pending',
      poa_type: settings?.enableNftPoa ? 'both' : 'digital',
      checked_in_at: new Date().toISOString(),
      checked_in_by: checkedInBy,
      check_in_method: checkInData.method || 'manual',
      check_in_location: checkInData.location || null,
      poa_title: settings?.poaTemplateTitle || `${event.title} - Proof of Attendance`,
      poa_description: settings?.poaTemplateDescription || `You attended ${event.title} on ${event.date}`,
      poa_image_url: settings?.poaTemplateImageUrl || event.imageUrl,
      poa_metadata: settings?.poaCustomMetadata || null,
      issued_at: settings?.autoIssuePoa ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('proof_of_attendance')
      .upsert(poaData, { onConflict: 'event_id,attendee_address' })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating POA record:', error);
      throw error;
    }

    console.log('✅ Attendee checked in successfully');
    return transformPOAFromDB(data);
  } catch (error) {
    console.error('❌ Failed to check in attendee:', error);
    throw error;
  }
}

/**
 * Issue a POA to an attendee (digital and/or NFT)
 */
export async function issuePOA(
  eventId: string,
  attendeeAddress: string,
  issuedBy: string,
  options: {
    poaType?: 'digital' | 'nft' | 'both'
    nftTxHash?: string
    nftTokenId?: string
    customMetadata?: any
  } = {}
): Promise<ProofOfAttendance> {
  console.log('🎫 Issuing POA:', { eventId, attendeeAddress, issuedBy, options });
  
  try {
    // Get existing POA record
    const existingPOA = await getEventPOAForAttendee(eventId, attendeeAddress);
    if (!existingPOA) {
      throw new Error('Attendee must be checked in before issuing POA');
    }

    if (existingPOA.status === 'issued' || existingPOA.status === 'claimed') {
      console.log('✅ POA already issued, returning existing POA');
      return existingPOA;
    }

    // Update POA record
    const updateData: any = {
      status: 'issued',
      issued_at: new Date().toISOString(),
      poa_type: options.poaType || existingPOA.poaType,
    };

    if (options.nftTxHash) {
      updateData.nft_tx_hash = options.nftTxHash;
    }
    if (options.nftTokenId) {
      updateData.nft_token_id = options.nftTokenId;
    }
    if (options.customMetadata) {
      updateData.poa_metadata = options.customMetadata;
    }

    const { data, error } = await supabase
      .from('proof_of_attendance')
      .update(updateData)
      .eq('event_id', eventId)
      .eq('attendee_address', attendeeAddress)
      .select()
      .single();

    if (error) {
      console.error('❌ Error issuing POA:', error);
      throw error;
    }

    console.log('✅ POA issued successfully');
    return transformPOAFromDB(data);
  } catch (error) {
    console.error('❌ Failed to issue POA:', error);
    throw error;
  }
}

/**
 * Batch check-in multiple attendees
 */
export async function batchCheckInAttendees(
  eventId: string,
  attendeeAddresses: string[],
  checkedInBy: string,
  checkInData: {
    method?: 'manual' | 'qr_code' | 'geolocation' | 'nfc'
    location?: string
  } = {}
): Promise<ProofOfAttendance[]> {
  console.log('📋 Batch checking in attendees:', { eventId, count: attendeeAddresses.length });
  
  const results: ProofOfAttendance[] = [];
  const errors: Array<{ address: string; error: string }> = [];

  for (const attendeeAddress of attendeeAddresses) {
    try {
      const poa = await checkInAttendee(eventId, attendeeAddress, checkedInBy, {
        ...checkInData,
        attendeeName: undefined, // Will be fetched from registration
      });
      results.push(poa);
    } catch (error) {
      console.error(`❌ Failed to check in ${attendeeAddress}:`, error);
      errors.push({
        address: attendeeAddress,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  console.log(`✅ Batch check-in completed: ${results.length} success, ${errors.length} errors`);
  
  if (errors.length > 0) {
    console.warn('⚠️ Some check-ins failed:', errors);
  }

  return results;
}

/**
 * Get POA for a specific attendee and event
 */
export async function getEventPOAForAttendee(
  eventId: string,
  attendeeAddress: string
): Promise<ProofOfAttendance | null> {
  try {
    const { data, error } = await supabase
      .from('proof_of_attendance')
      .select('*')
      .eq('event_id', eventId)
      .eq('attendee_address', attendeeAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No POA found
      }
      console.error('Error fetching POA:', error);
      throw error;
    }

    return data ? transformPOAFromDB(data) : null;
  } catch (error) {
    console.error('Failed to fetch POA:', error);
    throw error;
  }
}

/**
 * Get all POAs for an event
 */
export async function getEventPOAs(eventId: string): Promise<ProofOfAttendance[]> {
  try {
    const { data, error } = await supabase
      .from('proof_of_attendance')
      .select('*')
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false });

    if (error) {
      console.error('Error fetching event POAs:', error);
      throw error;
    }

    return data?.map(transformPOAFromDB) || [];
  } catch (error) {
    console.error('Failed to fetch event POAs:', error);
    throw error;
  }
}

/**
 * Get all POAs for a user across all events
 */
export async function getUserPOAs(userAddress: string): Promise<ProofOfAttendance[]> {
  try {
    const { data, error } = await supabase
      .from('proof_of_attendance')
      .select(`
        *,
        events (
          id,
          title,
          date,
          time,
          location,
          image_url,
          creator
        )
      `)
      .eq('attendee_address', userAddress)
      .neq('status', 'pending')
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Error fetching user POAs:', error);
      throw error;
    }

    return data?.map(poa => ({
      ...transformPOAFromDB(poa),
      event: poa.events ? transformEventFromDB(poa.events) : undefined
    })) || [];
  } catch (error) {
    console.error('Failed to fetch user POAs:', error);
    throw error;
  }
}

/**
 * Claim a POA (mark as claimed by user)
 */
export async function claimPOA(
  eventId: string,
  attendeeAddress: string
): Promise<ProofOfAttendance> {
  console.log('🎯 Claiming POA:', { eventId, attendeeAddress });
  
  try {
    const { data, error } = await supabase
      .from('proof_of_attendance')
      .update({
        status: 'claimed',
        claimed_at: new Date().toISOString()
      })
      .eq('event_id', eventId)
      .eq('attendee_address', attendeeAddress)
      .eq('status', 'issued')
      .select()
      .single();

    if (error) {
      console.error('❌ Error claiming POA:', error);
      throw error;
    }

    if (!data) {
      throw new Error('POA not found or not in issued status');
    }

    console.log('✅ POA claimed successfully');
    return transformPOAFromDB(data);
  } catch (error) {
    console.error('❌ Failed to claim POA:', error);
    throw error;
  }
}

/**
 * Get POA templates
 */
export async function getPOATemplates(
  creatorAddress?: string,
  category?: string,
  publicOnly: boolean = false
): Promise<POATemplate[]> {
  try {
    let query = supabase.from('poa_templates').select('*');

    if (publicOnly) {
      query = query.eq('is_public', true);
    } else if (creatorAddress) {
      query = query.or(`creator_address.eq.${creatorAddress},is_public.eq.true`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    query = query.order('usage_count', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching POA templates:', error);
      throw error;
    }

    return data?.map(transformPOATemplateFromDB) || [];
  } catch (error) {
    console.error('Failed to fetch POA templates:', error);
    throw error;
  }
}

/**
 * Create a new POA template
 */
export async function createPOATemplate(
  templateData: Omit<POATemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
): Promise<POATemplate> {
  try {
    const dbData = {
      creator_address: templateData.creatorAddress,
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      template_image_url: templateData.templateImageUrl,
      template_metadata: templateData.templateMetadata,
      background_color: templateData.backgroundColor,
      text_color: templateData.textColor,
      accent_color: templateData.accentColor,
      is_public: templateData.isPublic,
    };

    const { data, error } = await supabase
      .from('poa_templates')
      .insert([dbData])
      .select()
      .single();

    if (error) {
      console.error('Error creating POA template:', error);
      throw error;
    }

    return transformPOATemplateFromDB(data);
  } catch (error) {
    console.error('Failed to create POA template:', error);
    throw error;
  }
}

/**
 * Get POA statistics for an event
 */
export async function getEventPOAStats(eventId: string): Promise<{
  totalRegistrations: number
  totalCheckedIn: number
  totalPOAsIssued: number
  totalPOAsClaimed: number
  checkInRate: number
  claimRate: number
}> {
  try {
    const [registrationCount, poaStats] = await Promise.all([
      getEventAttendeeCount(eventId),
      supabase
        .from('proof_of_attendance')
        .select('status, checked_in_at')
        .eq('event_id', eventId)
    ]);

    if (poaStats.error) {
      console.error('Error fetching POA stats:', poaStats.error);
      throw poaStats.error;
    }

    const poas = poaStats.data || [];
    const totalCheckedIn = poas.filter(poa => poa.checked_in_at).length;
    const totalPOAsIssued = poas.filter(poa => ['issued', 'claimed'].includes(poa.status)).length;
    const totalPOAsClaimed = poas.filter(poa => poa.status === 'claimed').length;

    return {
      totalRegistrations: registrationCount,
      totalCheckedIn,
      totalPOAsIssued,
      totalPOAsClaimed,
      checkInRate: registrationCount > 0 ? (totalCheckedIn / registrationCount) * 100 : 0,
      claimRate: totalPOAsIssued > 0 ? (totalPOAsClaimed / totalPOAsIssued) * 100 : 0,
    };
  } catch (error) {
    console.error('Failed to fetch POA stats:', error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Transform database row to ProofOfAttendance interface
 */
function transformPOAFromDB(dbPOA: any): ProofOfAttendance {
  return {
    id: dbPOA.id,
    eventId: dbPOA.event_id,
    attendeeAddress: dbPOA.attendee_address,
    attendeeName: dbPOA.attendee_name,
    status: dbPOA.status,
    poaType: dbPOA.poa_type,
    checkedInAt: dbPOA.checked_in_at,
    checkedInBy: dbPOA.checked_in_by,
    checkInMethod: dbPOA.check_in_method,
    checkInLocation: dbPOA.check_in_location,
    poaTitle: dbPOA.poa_title,
    poaDescription: dbPOA.poa_description,
    poaImageUrl: dbPOA.poa_image_url,
    poaMetadata: dbPOA.poa_metadata,
    nftContractAddress: dbPOA.nft_contract_address,
    nftTokenId: dbPOA.nft_token_id?.toString(),
    nftTxHash: dbPOA.nft_tx_hash,
    nftMetadataUri: dbPOA.nft_metadata_uri,
    createdAt: dbPOA.created_at,
    updatedAt: dbPOA.updated_at,
    issuedAt: dbPOA.issued_at,
    claimedAt: dbPOA.claimed_at,
  };
}

/**
 * Transform database row to EventCheckInSettings interface
 */
function transformCheckInSettingsFromDB(dbSettings: any): EventCheckInSettings {
  return {
    id: dbSettings.id,
    eventId: dbSettings.event_id,
    checkInEnabled: dbSettings.check_in_enabled,
    checkInWindowStart: dbSettings.check_in_window_start,
    checkInWindowEnd: dbSettings.check_in_window_end,
    requireGeolocation: dbSettings.require_geolocation,
    allowedCheckInRadius: dbSettings.allowed_check_in_radius,
    eventLatitude: dbSettings.event_latitude,
    eventLongitude: dbSettings.event_longitude,
    autoIssuePoa: dbSettings.auto_issue_poa,
    poaTemplateTitle: dbSettings.poa_template_title,
    poaTemplateDescription: dbSettings.poa_template_description,
    poaTemplateImageUrl: dbSettings.poa_template_image_url,
    poaCustomMetadata: dbSettings.poa_custom_metadata,
    enableNftPoa: dbSettings.enable_nft_poa,
    nftContractAddress: dbSettings.nft_contract_address,
    nftBaseUri: dbSettings.nft_base_uri,
    nftCollectionName: dbSettings.nft_collection_name,
    nftCollectionSymbol: dbSettings.nft_collection_symbol,
    createdAt: dbSettings.created_at,
    updatedAt: dbSettings.updated_at,
  };
}

/**
 * Transform database row to POATemplate interface
 */
function transformPOATemplateFromDB(dbTemplate: any): POATemplate {
  return {
    id: dbTemplate.id,
    creatorAddress: dbTemplate.creator_address,
    name: dbTemplate.name,
    description: dbTemplate.description,
    category: dbTemplate.category,
    templateImageUrl: dbTemplate.template_image_url,
    templateMetadata: dbTemplate.template_metadata,
    backgroundColor: dbTemplate.background_color,
    textColor: dbTemplate.text_color,
    accentColor: dbTemplate.accent_color,
    usageCount: dbTemplate.usage_count,
    isPublic: dbTemplate.is_public,
    createdAt: dbTemplate.created_at,
    updatedAt: dbTemplate.updated_at,
  };
}