import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { getEventById } from '@/lib/events';

export const runtime = 'edge';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await getEventById(params.id);
    
    if (!event) {
      return new Response('Event not found', { status: 404 });
    }

    // Format date for display
    const eventDate = new Date(`${event.date}T${event.time}`);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });

    return new ImageResponse(
      (
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'relative',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3), transparent 50%)',
            }}
          />
          
          {/* Main Content Container */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '24px',
              padding: '60px',
              margin: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxWidth: '1000px',
              width: '90%',
            }}
          >
            {/* Event Title */}
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '800',
                color: '#1f2937',
                margin: '0 0 24px 0',
                lineHeight: '1.1',
                maxWidth: '800px',
                textAlign: 'center',
              }}
            >
              {event.title}
            </h1>

            {/* Event Details */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '32px',
                alignItems: 'center',
              }}
            >
              {/* Date */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '28px',
                  color: '#4b5563',
                  fontWeight: '600',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#667eea',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  📅
                </div>
                {formattedDate}
              </div>

              {/* Location */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '28px',
                  color: '#4b5563',
                  fontWeight: '600',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    background: '#667eea',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  📍
                </div>
                {event.location}
              </div>

              {/* Attendees */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '24px',
                  color: '#6b7280',
                  fontWeight: '500',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    background: '#10b981',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  👥
                </div>
                {event.attendees.length} attending
                {event.maxAttendees && ` / ${event.maxAttendees}`}
              </div>
            </div>

            {/* Event Status Badges */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {event.isPaid && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  💰 {event.priceUSDC ? `${event.priceUSDC} USDC` : 'Paid Event'}
                </div>
              )}
              {event.isTokenGated && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🔒 Token Gated
                </div>
              )}
            </div>

            {/* Call to Action */}
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                padding: '16px 32px',
                borderRadius: '16px',
                fontSize: '24px',
                fontWeight: '700',
                boxShadow: '0 10px 25px -3px rgba(102, 126, 234, 0.4)',
              }}
            >
              🚀 Join the Event
            </div>
          </div>

          {/* Brand */}
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              right: '32px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '20px',
              fontWeight: '600',
            }}
          >
            BasedEvents
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
}
