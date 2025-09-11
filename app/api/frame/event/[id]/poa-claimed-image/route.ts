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
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
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
      animation: bounce 1s infinite;
    }
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-30px); }
      60% { transform: translateY(-15px); }
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
    .success-badge {
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
  </style>
</head>
<body>
  <div class="container">
    <div class="success-badge">🎉 Success!</div>
    <div class="icon">🎫</div>
    <h1 class="title">POA Claimed!</h1>
    <p class="message">Congratulations! Your Proof of Attendance has been successfully claimed.</p>
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
    console.error('Error generating POA claimed image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
