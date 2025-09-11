import { NextRequest, NextResponse } from 'next/server'
import { 
  checkInAttendee, 
  claimPOA, 
  getEventPOAForAttendee,
  getEventCheckInSettings,
  createOrUpdateCheckInSettings
} from '@/lib/events'

export async function POST(request: NextRequest) {
  try {
    const { action, eventId, attendeeAddress, userAddress, poaId } = await request.json()

    switch (action) {
      case 'checkin':
        if (!eventId || !attendeeAddress) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        const poa = await checkInAttendee(eventId, attendeeAddress, {
          method: 'manual',
          location: null
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Attendee checked in successfully',
          poa 
        })

      case 'claim':
        if (!poaId || !userAddress) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        const claimedPOA = await claimPOA(poaId, userAddress)
        return NextResponse.json({ 
          success: true, 
          message: 'POA claimed successfully',
          poa: claimedPOA 
        })

      case 'get_poa':
        if (!eventId || !userAddress) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        const userPOA = await getEventPOAForAttendee(eventId, userAddress)
        return NextResponse.json({ 
          success: true, 
          poa: userPOA 
        })

      case 'setup_poa':
        if (!eventId) {
          return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
        }

        const settings = await createOrUpdateCheckInSettings(eventId, {
          check_in_enabled: true,
          check_in_start_time: new Date().toISOString(),
          check_in_end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          require_geolocation: false,
          geolocation_radius: 100,
          auto_issue_poa: true,
          poa_title: 'Event POA',
          poa_description: 'Proof of Attendance',
          poa_image_url: null,
          nft_contract_address: null,
          poa_template_id: null
        })

        return NextResponse.json({ 
          success: true, 
          message: 'POA system configured',
          settings 
        })

      case 'get_settings':
        if (!eventId) {
          return NextResponse.json({ error: 'Missing event ID' }, { status: 400 })
        }

        const checkInSettings = await getEventCheckInSettings(eventId)
        return NextResponse.json({ 
          success: true, 
          settings: checkInSettings 
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('POA Frame API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')
  const userAddress = searchParams.get('userAddress')

  if (!eventId || !userAddress) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  try {
    const poa = await getEventPOAForAttendee(eventId, userAddress)
    return NextResponse.json({ success: true, poa })
  } catch (error) {
    console.error('Error fetching POA:', error)
    return NextResponse.json({ error: 'Failed to fetch POA' }, { status: 500 })
  }
}
