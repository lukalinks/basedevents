import { supabase } from './supabaseClient'

export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  creator: string
  attendees: string[]
  maxAttendees?: number
  tags: string[]
  isRecurring: boolean
  recurringPattern?: 'daily' | 'weekly' | 'monthly'
  status: 'upcoming' | 'past' | 'cancelled'
  createdAt: string
  updatedAt: string
  imageUrl?: string
  // Paid event fields
  isPaid?: boolean;
  priceUSDC?: number;
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
}

// Create a new event
export async function createEvent(eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Promise<Event> {
  console.log('Creating event with data:', eventData);
  
  // Transform camelCase to snake_case for database
  const dbEventData: any = {
    title: eventData.title,
    description: eventData.description,
    date: eventData.date,
    time: eventData.time,
    location: eventData.location,
    creator: eventData.creator,
    attendees: eventData.attendees,
    max_attendees: eventData.maxAttendees,
    tags: eventData.tags,
    is_recurring: eventData.isRecurring,
    recurring_pattern: eventData.recurringPattern,
    status: eventData.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_paid: eventData.isPaid,
    price_usdc: eventData.priceUSDC,
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
  const registrationData = {
    event_id: eventId,
    user_address: userAddress,
    user_name: userDetails.name,
    user_email: userDetails.email,
      user_phone: userDetails.phone || null,
      user_bio: userDetails.bio || null,
    status: 'confirmed'
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

  return transformEventFromDB(data)
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
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    console.error('Error deleting event:', error)
    throw error
  }
}

// Cancel an event (changes status to 'cancelled')
export async function cancelEvent(eventId: string): Promise<Event> {
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

  return transformEventFromDB(data)
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
    'Status'
  ];

  // Convert registrations to CSV rows
  const rows = registrations.map(reg => [
    reg.userName || 'N/A',
    reg.userEmail || 'N/A',
    reg.userPhone || 'N/A',
    reg.userAddress,
    reg.userBio || 'N/A',
    new Date(reg.registeredAt).toLocaleDateString() + ' ' + new Date(reg.registeredAt).toLocaleTimeString(),
    reg.status
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

// Transform database row to Event interface (handle snake_case to camelCase)
function transformEventFromDB(dbEvent: any): Event {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description,
    date: dbEvent.date,
    time: dbEvent.time,
    location: dbEvent.location,
    creator: dbEvent.creator,
    attendees: dbEvent.attendees || [],
    maxAttendees: dbEvent.max_attendees,
    tags: dbEvent.tags || [],
    isRecurring: dbEvent.is_recurring || false,
    recurringPattern: dbEvent.recurring_pattern,
    status: dbEvent.status || 'upcoming',
    createdAt: dbEvent.created_at,
    updatedAt: dbEvent.updated_at,
    imageUrl: dbEvent.image_url,
    isPaid: dbEvent.is_paid,
    priceUSDC: dbEvent.price_usdc,
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
    status: registration.status
  }
}

// Get event by ID with attendees information
export async function getEventById(eventId: string): Promise<Event | null> {
  try {
    // First get the event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) {
      if (eventError.code === 'PGRST116') {
        console.warn('Event not found:', eventId);
        return null;
      }
      console.error('Error fetching event by ID:', eventError);
      throw eventError;
    }

    if (!event) return null;

    // Get confirmed registrations for the event
    const { data: registrations, error: regError } = await supabase
      .from('event_registrations')
      .select('user_address')
      .eq('event_id', eventId)
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
    console.error('Error in getEventById:', error);
    throw error;
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