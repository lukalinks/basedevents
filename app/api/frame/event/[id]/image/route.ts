import { NextRequest, NextResponse } from 'next/server'
import { getEvent } from '@/lib/events'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const fid = searchParams.get('fid')
    
    const event = await getEvent(params.id)
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Generate a simple image using HTML Canvas (in a real app, you'd use a proper image generation library)
    const imageHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .container {
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .event-title {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .event-description {
      font-size: 24px;
      margin-bottom: 30px;
      max-width: 800px;
      opacity: 0.9;
    }
    .event-details {
      font-size: 20px;
      margin-bottom: 20px;
    }
    .poa-badge {
      position: absolute;
      top: 30px;
      right: 30px;
      background: rgba(255,255,255,0.2);
      padding: 15px 25px;
      border-radius: 50px;
      font-size: 18px;
      font-weight: bold;
      backdrop-filter: blur(10px);
    }
    .attendees {
      position: absolute;
      bottom: 30px;
      left: 30px;
      background: rgba(255,255,255,0.2);
      padding: 15px 25px;
      border-radius: 25px;
      font-size: 18px;
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="poa-badge">🎫 POA Available</div>
    <h1 class="event-title">${event.title}</h1>
    <p class="event-description">${event.description}</p>
    <div class="event-details">
      📅 ${new Date(event.startTime).toLocaleDateString()} at ${new Date(event.startTime).toLocaleTimeString()}<br>
      📍 ${event.location}
    </div>
    <div class="attendees">
      👥 ${event.attendees.length} attendees${event.maxAttendees ? ` / ${event.maxAttendees} max` : ''}
    </div>
  </div>
</body>
</html>
    `

    return new NextResponse(imageHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    })
  } catch (error) {
    console.error('Error generating frame image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
