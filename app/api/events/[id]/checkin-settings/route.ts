import { NextRequest, NextResponse } from 'next/server'
import { 
  createOrUpdateCheckInSettings,
  getEventCheckInSettings
} from '@/lib/events'

// GET /api/events/[id]/checkin-settings - Get check-in settings for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const settings = await getEventCheckInSettings(params.id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching check-in settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch check-in settings' },
      { status: 500 }
    )
  }
}

// POST /api/events/[id]/checkin-settings - Create or update check-in settings
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (typeof body.checkInEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'checkInEnabled is required and must be a boolean' },
        { status: 400 }
      )
    }

    const settings = await createOrUpdateCheckInSettings(params.id, body)
    return NextResponse.json(settings)

  } catch (error) {
    console.error('Error creating/updating check-in settings:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create/update check-in settings'
      },
      { status: 500 }
    )
  }
}

// PUT /api/events/[id]/checkin-settings - Update check-in settings (alias for POST)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(request, { params })
}
