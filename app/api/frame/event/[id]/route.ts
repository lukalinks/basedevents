import { NextRequest, NextResponse } from 'next/server'
import { getEvent } from '@/lib/events'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await getEvent(params.id)
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Generate Farcaster frame metadata
    const frameMetadata = {
      'fc:frame': 'vNext',
      'fc:frame:image': event.imageUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`,
      'fc:frame:image:aspect_ratio': '1.91:1',
      'fc:frame:button:1': '🎫 View POA',
      'fc:frame:button:1:action': 'link',
      'fc:frame:button:1:target': `${process.env.NEXT_PUBLIC_BASE_URL}/events/${params.id}/frame`,
      'fc:frame:button:2': '📅 Register',
      'fc:frame:button:2:action': 'link', 
      'fc:frame:button:2:target': `${process.env.NEXT_PUBLIC_BASE_URL}/events/${params.id}`,
      'fc:frame:post_url': `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame/event/${params.id}/action`,
    }

    // Generate HTML with frame metadata
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="${event.title} - EventFI" />
  <meta property="og:description" content="${event.description}" />
  <meta property="og:image" content="${event.imageUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`}" />
  <meta property="og:url" content="${process.env.NEXT_PUBLIC_BASE_URL}/events/${params.id}" />
  
  ${Object.entries(frameMetadata).map(([key, value]) => 
    `<meta property="${key}" content="${value}" />`
  ).join('\n  ')}
  
  <title>${event.title} - EventFI</title>
</head>
<body>
  <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
    <h1>${event.title}</h1>
    <p>${event.description}</p>
    <p><strong>Date:</strong> ${new Date(event.startTime).toLocaleDateString()}</p>
    <p><strong>Location:</strong> ${event.location}</p>
    <p><strong>Attendees:</strong> ${event.attendees.length}${event.maxAttendees ? ` / ${event.maxAttendees}` : ''}</p>
    
    <div style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/events/${params.id}/frame" 
         style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
        🎫 View POA
      </a>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/events/${params.id}" 
         style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px;">
        📅 Register
      </a>
    </div>
  </div>
</body>
</html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating frame metadata:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
