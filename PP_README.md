# PP: Event Mini-App

## Project Overview

**PP** is a modern event management mini-app that allows users to create, discover, and register for events. It features wallet-based authentication, Farcaster notifications, and a beautiful, responsive UI. Hosts can manage their events, view signups, and customize their profiles.

## Features

- Create and manage events with images, tags, and recurring options
- RSVP and register for events with wallet authentication
- Host profile pages with bio, avatar, and Base Name support
- Real-time attendee and signup tracking
- Farcaster notifications for event creators
- Responsive, mobile-friendly design
- Search and filter events by tags
- Secure, database-driven backend (Supabase)

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd mini
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env.local` and fill in your Supabase, Farcaster, and other API keys.
4. **Run the development server:**
   ```bash
   npm run dev
   ```
5. **Open the app:**
   - Visit [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- **Create an event:** Connect your wallet and click "Create Event". Fill in the details and submit.
- **RSVP/Register:** Browse events and click "RSVP" or "Register". Complete the registration form.
- **Manage your events:** Go to your profile to see events you created and those you RSVP'd to.
- **Host page:** View all hosts, their events, and signups on the Hosts tab.
- **Notifications:** Event creators receive Farcaster notifications when someone registers.

## Technologies Used

- **Next.js** (React framework)
- **Supabase** (database & auth)
- **Tailwind CSS** (styling)
- **Wagmi** (wallet integration)
- **Farcaster** (notifications)
- **Neynar/Airstack** (Farcaster FID lookup, optional)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your improvements or bug fixes.

## License

This project is licensed under the MIT License.
