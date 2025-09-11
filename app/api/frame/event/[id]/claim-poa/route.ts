import { NextRequest, NextResponse } from 'next/server'
import { getEventPOAForAttendee, claimPOA } from '@/lib/events'

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

    // For now, we'll use a placeholder address based on FID
    const userAddress = `0x${fid.toString(16).padStart(40, '0')}`

    switch (buttonIndex) {
      case 1: // Claim POA
        try {
          const poa = await getEventPOAForAttendee(params.id, userAddress)
          
          if (!poa) {
            return NextResponse.json({
              type: 'frame',
              frame: {
                image: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/no-poa-image?fid=${fid}`,
                buttons: [
                  {
                    label: '🔙 Back to Event',
                    action: 'post',
                  },
                ],
                postUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/action`,
              },
            })
          }

          if (poa.status === 'claimed') {
            return NextResponse.json({
              type: 'frame',
              frame: {
                image: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/already-claimed-image?fid=${fid}`,
                buttons: [
                  {
                    label: '🎉 View Collection',
                    action: 'link',
                    target: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
                  },
                  {
                    label: '🔙 Back to Event',
                    action: 'post',
                  },
                ],
                postUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/action`,
              },
            })
          }

          // Claim the POA
          const claimedPOA = await claimPOA(poa.id, userAddress)

          return NextResponse.json({
            type: 'frame',
            frame: {
              image: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/poa-claimed-image?fid=${fid}`,
              buttons: [
                {
                  label: '🎉 View Collection',
                  action: 'link',
                  target: `${process.env.NEXT_PUBLIC_BASE_URL}/profile`,
                },
                {
                  label: '🔙 Back to Event',
                  action: 'post',
                },
              ],
              postUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/action`,
            },
          })
        } catch (error) {
          console.error('Error claiming POA:', error)
          return NextResponse.json({
            type: 'frame',
            frame: {
              image: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/claim-error-image?fid=${fid}`,
              buttons: [
                {
                  label: '🔙 Try Again',
                  action: 'post',
                },
              ],
              postUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/poa-action`,
            },
          })
        }

      default:
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
    }
  } catch (error) {
    console.error('Claim POA frame action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
