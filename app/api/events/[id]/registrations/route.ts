import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateEventRegistrationsCSV } from '@/lib/events'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-address',
    },
  })
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id
    const { searchParams } = new URL(request.url)
    const requesterFromHeader = request.headers.get('x-user-address') || ''
    const requesterFromQuery = searchParams.get('address') || ''
    // Accept requester from header (browser fetch) or query param (deep link / Farcaster)
    const requester = (requesterFromHeader || requesterFromQuery).toLowerCase()

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    // Verify requester is the creator
    const { data: eventRow, error: eventErr } = await supabaseAdmin
      .from('events')
      .select('title, creator')
      .eq('id', eventId)
      .single()

    if (eventErr) {
      return NextResponse.json({ error: 'Event lookup failed' }, { status: 500 })
    }
    if (!eventRow) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    const eventCreator = String(eventRow.creator || '').toLowerCase()
    if (!requester || eventCreator !== requester) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch registrations
    const { data: regs, error: regErr } = await supabaseAdmin
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .order('registered_at', { ascending: false })

    if (regErr) {
      return NextResponse.json({ error: 'Failed to load registrations' }, { status: 500 })
    }

    if (!regs || regs.length === 0) {
      return NextResponse.json({ error: 'No registrations found' }, { status: 404 })
    }

    const csv = generateEventRegistrationsCSV(
      regs.map((r: any) => ({
        id: r.id,
        eventId: r.event_id,
        userAddress: r.user_address,
        userName: r.user_name,
        userEmail: r.user_email,
        userPhone: r.user_phone,
        userBio: r.user_bio,
        registeredAt: r.registered_at,
        status: r.status,
        paymentTxHash: r.payment_tx_hash,
      })),
      eventRow.title
    )

    const sanitizedTitle = String(eventRow.title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `${sanitizedTitle}_registrations_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-user-address',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}


