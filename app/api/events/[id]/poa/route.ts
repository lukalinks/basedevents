import { NextRequest, NextResponse } from 'next/server'
import { 
  getEventPOAs, 
  getEventPOAForAttendee, 
  checkInAttendee, 
  issuePOA, 
  claimPOA,
  batchCheckInAttendees,
  getEventPOAStats
} from '@/lib/events'

// GET /api/events/[id]/poa - Get POAs for an event or specific attendee
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const attendeeAddress = searchParams.get('attendee')
    const statsOnly = searchParams.get('stats') === 'true'

    if (statsOnly) {
      // Return POA statistics for the event
      const stats = await getEventPOAStats(params.id)
      return NextResponse.json(stats)
    }

    if (attendeeAddress) {
      // Get POA for specific attendee
      const poa = await getEventPOAForAttendee(params.id, attendeeAddress)
      return NextResponse.json(poa)
    }

    // Get all POAs for the event
    const poas = await getEventPOAs(params.id)
    return NextResponse.json(poas)

  } catch (error) {
    console.error('Error fetching POAs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch POAs' },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/poa - Check in attendee or issue POA
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action, attendeeAddress, checkedInBy, ...data } = body

    if (!attendeeAddress || !checkedInBy) {
      return NextResponse.json(
        { error: 'attendeeAddress and checkedInBy are required' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'checkin':
        // Check in an attendee
        result = await checkInAttendee(params.id, attendeeAddress, checkedInBy, {
          method: data.method,
          location: data.location,
          attendeeName: data.attendeeName,
          latitude: data.latitude,
          longitude: data.longitude,
        })
        break

      case 'batch-checkin':
        // Batch check in multiple attendees
        if (!Array.isArray(data.attendeeAddresses)) {
          return NextResponse.json(
            { error: 'attendeeAddresses must be an array for batch check-in' },
            { status: 400 }
          )
        }
        result = await batchCheckInAttendees(params.id, data.attendeeAddresses, checkedInBy, {
          method: data.method,
          location: data.location,
        })
        break

      case 'issue':
        // Issue a POA
        result = await issuePOA(params.id, attendeeAddress, checkedInBy, {
          poaType: data.poaType,
          nftTxHash: data.nftTxHash,
          nftTokenId: data.nftTokenId,
          customMetadata: data.customMetadata,
        })
        break

      case 'claim':
        // Claim a POA
        result = await claimPOA(params.id, attendeeAddress)
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: checkin, batch-checkin, issue, claim' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error processing POA action:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to process POA action'
      },
      { status: 500 }
    )
  }
}
