# Event Mini App

A modern, social event management Mini App built with Next.js, MiniKit, and Supabase. Users can create, discover, and RSVP to events with a beautiful, mobile-first interface.

## Features

- 🎉 **Create & Manage Events** - Full CRUD operations for events
- 📅 **RSVP System** - Join and leave events with one click
- 🔍 **Search & Filter** - Find events by title, description, location, or tags
- 💬 **Event Comments** - Discuss events with other attendees
- 📱 **Modern UI** - Mobile-first design with glassmorphism and smooth animations
- 🔗 **Social Sharing** - Share events with friends
- 👛 **Wallet Integration** - Connect with MiniKit for seamless authentication
- 🗂️ **Personal Dashboard** - View your created events and RSVPs

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: MiniKit (Coinbase)
- **Styling**: Custom CSS variables with dark mode support

## Quick Start

### 1. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Event Mini App
NEXT_PUBLIC_ICON_URL=/logo.png
```

### 2. Database Setup

1. Create a new Supabase project
2. Run the SQL schema from `supabase-schema.sql` in your Supabase SQL editor
3. This will create the `events` and `event_comments` tables with proper RLS policies

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Database Schema

### Events Table
- `id` (UUID) - Primary key
- `title` (VARCHAR) - Event title
- `description` (TEXT) - Event description
- `date` (DATE) - Event date
- `time` (TIME) - Event time
- `location` (VARCHAR) - Event location
- `creator` (VARCHAR) - Wallet address of creator
- `attendees` (TEXT[]) - Array of attendee wallet addresses
- `max_attendees` (INTEGER) - Maximum number of attendees
- `tags` (TEXT[]) - Event tags for categorization
- `is_recurring` (BOOLEAN) - Whether event repeats
- `recurring_pattern` (VARCHAR) - How often it repeats
- `status` (VARCHAR) - Event status (upcoming/past/cancelled)
- `created_at` (TIMESTAMP) - Creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

### Event Comments Table
- `id` (UUID) - Primary key
- `event_id` (UUID) - Foreign key to events
- `author` (VARCHAR) - Wallet address of comment author
- `author_name` (VARCHAR) - Display name (optional)
- `content` (TEXT) - Comment content
- `created_at` (TIMESTAMP) - Creation timestamp

## Key Components

- **EnhancedEventForm** - Create/edit event form with validation
- **EnhancedEventList** - Event listing with search and filters
- **EnhancedEventDetailsModal** - Full event details with comments
- **Modern UI Components** - Button, Card, Icon with glassmorphism styling

## MiniKit Integration

This app is designed to work as a MiniKit Mini App:
- Wallet-based authentication
- Frame integration for social sharing
- Mobile-optimized interface
- Compatible with Base network

## Deployment

1. Deploy to Vercel, Netlify, or your preferred platform
2. Set environment variables in your deployment platform
3. Ensure your Supabase project is configured for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for your own Mini Apps!