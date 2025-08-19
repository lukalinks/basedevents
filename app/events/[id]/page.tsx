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
  // Ensure image is a full URL
  let imageUrl = event.imageUrl;
  if (imageUrl) {
    if (!imageUrl.startsWith('http')) {
      imageUrl = `${process.env.NEXT_PUBLIC_URL}${imageUrl}`;
    }
  } else {
    imageUrl = process.env.NEXT_PUBLIC_APP_OG_IMAGE;
  }
  return {
    title: event.title,
    description: event.description,
    openGraph: {
      title: event.title,
      description: event.description,
      images: [imageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description: event.description,
      images: [imageUrl],
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