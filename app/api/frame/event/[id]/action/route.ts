import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { untrustedData } = body

    if (!untrustedData) {
      return NextResponse.json({ error: 'Invalid frame data' }, { status: 400 })
    }

    const { buttonIndex, fid } = untrustedData

    // Handle different button actions
    switch (buttonIndex) {
      case 1: // POA button
        return NextResponse.json({
          type: 'frame',
          frame: {
            image: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/image?fid=${fid}`,
            buttons: [
              {
                label: '🎫 Check POA Status',
                action: 'post',
              },
              {
                label: '📊 View Event',
                action: 'link',
                target: `${process.env.NEXT_PUBLIC_BASE_URL}/events/${params.id}`,
              },
            ],
            postUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/poa-action`,
          },
        })

      case 2: // Register button
        return NextResponse.json({
          type: 'frame',
          frame: {
            image: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/register-image?fid=${fid}`,
            buttons: [
              {
                label: '✅ Register Now',
                action: 'link',
                target: `${process.env.NEXT_PUBLIC_BASE_URL}/events/${params.id}`,
              },
              {
                label: '🔙 Back to Event',
                action: 'post',
              },
            ],
            postUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/action`,
          },
        })

      default:
        return NextResponse.json({
          type: 'frame',
          frame: {
            image: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/image?fid=${fid}`,
            buttons: [
              {
                label: '🎫 View POA',
                action: 'post',
              },
              {
                label: '📅 Register',
                action: 'post',
              },
            ],
            postUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/action`,
          },
        })
    }
  } catch (error) {
    console.error('Frame action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
