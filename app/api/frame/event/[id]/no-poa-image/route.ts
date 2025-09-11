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

    const imageHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    .container {
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      text-align: center;
      position: relative;
    }
    .icon {
      font-size: 120px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .message {
      font-size: 24px;
      margin-bottom: 30px;
      max-width: 800px;
      opacity: 0.9;
    }
    .event-name {
      font-size: 20px;
      background: rgba(255,255,255,0.2);
      padding: 15px 25px;
      border-radius: 25px;
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🎫</div>
    <h1 class="title">No POA Yet</h1>
    <p class="message">You don't have a Proof of Attendance for this event yet.</p>
    <div class="event-name">${event.title}</div>
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
    console.error('Error generating no POA image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
