import { NextRequest, NextResponse } from 'next/server'
import { getUserPOAs } from '@/lib/events'

// GET /api/poa/user/[address] - Get all POAs for a user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params
    const userPOAs = await getUserPOAs(address)
    return NextResponse.json(userPOAs)
  } catch (error) {
    console.error('Error fetching user POAs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user POAs' },
      { status: 500 }
    )
  }
}
