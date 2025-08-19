import { NextRequest, NextResponse } from 'next/server';
import { getEventById } from '@/lib/events';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await getEventById(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const requester = request.headers.get('x-user-address') || '';
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !supabaseAdmin) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY or admin client not initialized');
      console.error('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      console.error('supabaseAdmin exists:', !!supabaseAdmin);
      return NextResponse.json({ error: 'Server not configured for deletes' }, { status: 500 });
    }

    if (!requester) {
      return NextResponse.json({ error: 'Missing user address' }, { status: 400 });
    }

    // Verify requester is the creator of the event
    const { data: eventRow, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('creator')
      .eq('id', params.id)
      .single();
    
    if (fetchError) {
      console.error('Failed to fetch event for delete check:', fetchError);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
    
    if (!eventRow) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Case-insensitive address comparison for authorization
    if (eventRow.creator.toLowerCase() !== requester.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized to delete this event' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Failed to delete event (admin):', error);
      return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}