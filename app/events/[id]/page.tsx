import { Metadata } from "next";
import ClientEventPage from "./ClientEventPage";
import { Event } from '@/lib/events';

export async function generateMetadata({ params }): Promise<Metadata> {
  // Fetch event data from API
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/events/${params.id}`);
  if (!res.ok) {
    return {
      title: "Event not found",
      description: "This event does not exist.",
    };
  }
  const data = await res.json();
  const event = data.event;
  
  // Ensure image is a full URL with proper fallback
  let imageUrl = event.imageUrl;
  console.log('Original event.imageUrl:', event.imageUrl);
  
  if (imageUrl) {
    // Handle different image URL formats
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Already a full URL
      imageUrl = imageUrl;
    } else if (imageUrl.startsWith('/')) {
      // Relative URL starting with /
      imageUrl = `${process.env.NEXT_PUBLIC_URL}${imageUrl}`;
    } else {
      // Relative URL without /
      imageUrl = `${process.env.NEXT_PUBLIC_URL}/${imageUrl}`;
    }
  } else {
    // Fallback to default OG image
    imageUrl = process.env.NEXT_PUBLIC_APP_OG_IMAGE || `${process.env.NEXT_PUBLIC_URL}/icon.png`;
  }
  
  console.log('Final imageUrl for metadata:', imageUrl);

  // Create a more comprehensive description
  const eventDate = new Date(`${event.date}T${event.time}`);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const description = `${event.description || 'Join us for an amazing event!'} 📅 ${formattedDate} at ${event.location}`;

  return {
    title: event.title,
    description: description,
    openGraph: {
      title: event.title,
      description: description,
      type: 'website',
      url: `${process.env.NEXT_PUBLIC_URL}/events/${event.id}`,
      siteName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'BasedEvents',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.title,
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: description,
      images: [imageUrl],
      creator: '@basedevents',
      site: '@basedevents',
    },
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/jpeg',
    },
  };
}

export default async function EventPage({ params }) {
  // Fetch event data on the server
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/events/${params.id}`);
  if (!res.ok) {
    return <div>Event not found</div>;
  }
  const data = await res.json();
  const event: Event = data.event;
  
  // Pass event to client component
  return <ClientEventPage event={event} />;
}