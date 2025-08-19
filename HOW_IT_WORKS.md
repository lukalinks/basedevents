# How the MiniKit Template Works

This document provides a comprehensive overview of how the MiniKit template application works, covering its architecture, components, and key features.

## 🏗️ Architecture Overview

The application is built as a **Next.js 15** Mini App using the **MiniKit framework** from Coinbase, designed to run within the Farcaster ecosystem. It leverages modern web technologies and blockchain integration.

### Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS with custom theme variables
- **Blockchain**: OnchainKit, Wagmi, Viem (Base network)
- **Notifications**: Farcaster Frame SDK, Upstash Redis
- **Development**: ESLint, Prettier

## 📁 Project Structure

```
mini/
├── app/                          # Next.js App Router
│   ├── .well-known/             # Farcaster configuration
│   ├── api/                     # API routes
│   │   ├── notify/              # Notification endpoint
│   │   └── webhook/             # Webhook handler
│   ├── components/              # React components
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page
│   ├── providers.tsx            # Context providers
│   └── theme.css                # Custom theme
├── lib/                         # Utility libraries
│   ├── notification.ts          # Notification management
│   ├── notification-client.ts   # Notification client
│   └── redis.ts                 # Redis configuration
├── public/                      # Static assets
└── Configuration files
```

## 🔧 Core Components

### 1. Application Entry Point (`app/page.tsx`)

The main page serves as the application's entry point and includes:

- **Tab Navigation**: Home, Features, Events
- **Wallet Integration**: Connect/disconnect wallet functionality
- **User Identity**: Display user avatar, name, address, and balance
- **MiniKit Hooks**: Integration with Farcaster's MiniKit features

```typescript
// Key hooks used
const { isInstalled } = useMiniKit();
const { addFrame } = useAddFrame();
const { openUrl } = useOpenUrl();
```

### 2. Demo Components (`app/components/DemoComponents.tsx`)

Contains reusable UI components and demo functionality:

#### UI Components
- **Button**: Customizable button with variants (primary, secondary, outline, ghost)
- **Card**: Container component with title and content
- **Icon**: SVG icon system
- **Input**: Form input components

#### Feature Components
- **TodoList**: Interactive task management
- **TransactionCard**: Blockchain transaction demo
- **EventForm**: Event creation form
- **EventList**: Display events
- **EventDetailsModal**: Event detail view

### 3. Provider Setup (`app/providers.tsx`)

Configures the MiniKit provider with:
- **API Key**: OnchainKit integration
- **Chain**: Base network configuration
- **Appearance**: Theme and branding settings

```typescript
<MiniKitProvider
  apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
  chain={base}
  config={{
    appearance: {
      mode: "auto",
      theme: "mini-app-theme",
      name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
      logo: process.env.NEXT_PUBLIC_ICON_URL,
    },
  }}
>
```

## 🎨 Theming System

### Custom CSS Variables (`app/theme.css`)

The application uses a comprehensive theming system with:

- **Color Scheme**: Light/dark mode support
- **OnchainKit Integration**: Custom theme variables for wallet components
- **Typography**: Geist font family
- **Animations**: Fade in/out effects

```css
:root {
  --app-background: #ffffff;
  --app-foreground: #111111;
  --app-accent: #0052ff;
  /* ... more variables */
}

@media (prefers-color-scheme: dark) {
  /* Dark mode overrides */
}
```

## 🔔 Notification System

### Architecture

The notification system consists of three main components:

1. **Redis Storage** (`lib/redis.ts`)
   - Stores user notification details
   - Uses Upstash Redis for persistence

2. **Notification Management** (`lib/notification.ts`)
   - CRUD operations for user notification preferences
   - Key-based storage: `{projectName}:user:{fid}`

3. **Notification Client** (`lib/notification-client.ts`)
   - Sends notifications via Farcaster's notification service
   - Handles rate limiting and error states

### API Endpoints

#### `/api/notify` (POST)
Sends notifications to users:
```typescript
{
  fid: number,
  notification: {
    title: string,
    body: string,
    notificationDetails?: MiniAppNotificationDetails
  }
}
```

#### `/api/webhook` (POST)
Handles Farcaster webhooks for:
- User account association
- Notification preference updates
- Key validation via Optimism network

## 🔗 Farcaster Integration

### Frame Configuration (`.well-known/farcaster.json`)

Provides metadata for Farcaster integration:

```json
{
  "accountAssociation": {
    "header": "...",
    "payload": "...", 
    "signature": "..."
  },
  "frame": {
    "version": "1",
    "name": "App Name",
    "homeUrl": "https://your-app.com",
    "webhookUrl": "https://your-app.com/api/webhook"
  }
}
```

### Frame Metadata (`app/layout.tsx`)

Generates Open Graph metadata for frame embedding:

```typescript
other: {
  "fc:frame": JSON.stringify({
    version: "next",
    imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
    button: {
      title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME}`,
      action: {
        type: "launch_frame",
        name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
        url: URL,
        splashImageUrl: process.env.NEXT_PUBLIC_SPLASH_IMAGE,
      },
    },
  }),
}
```

## 🔐 Environment Configuration

### Required Environment Variables

```bash
# OnchainKit Configuration
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_ICON_URL=
NEXT_PUBLIC_ONCHAINKIT_API_KEY=

# Farcaster Frame Metadata
FARCASTER_HEADER=
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=
NEXT_PUBLIC_APP_ICON=
NEXT_PUBLIC_APP_SUBTITLE=
NEXT_PUBLIC_APP_DESCRIPTION=

# Redis Configuration (Optional)
REDIS_URL=
REDIS_TOKEN=
```

## 🚀 Key Features

### 1. Wallet Integration
- Connect/disconnect wallet functionality
- Display user identity (avatar, name, address)
- Show ETH balance
- Transaction capabilities

### 2. MiniKit Features
- Frame installation detection
- Add frame to user account
- Open external URLs
- Safe area insets for mobile

### 3. Interactive Components
- Todo list with add/toggle/delete functionality
- Event management system (create, list, view details)
- Transaction demonstrations

### 4. Responsive Design
- Mobile-first approach
- Dark/light mode support
- Touch-optimized interactions
- Safe area handling

## 🔄 Data Flow

1. **User Interaction**: User interacts with the Mini App
2. **Wallet Connection**: OnchainKit handles wallet connectivity
3. **State Management**: React state manages UI interactions
4. **Blockchain Operations**: Wagmi/Viem handle blockchain interactions
5. **Notifications**: Redis stores preferences, Farcaster delivers notifications
6. **Frame Integration**: MiniKit provides Farcaster-specific functionality

## 🛠️ Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

### Building for Production
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📱 Mobile Optimization

The app is optimized for mobile devices with:
- Touch-friendly interactions (`touch-action: manipulation`)
- Responsive design with Tailwind CSS
- Safe area insets for notched devices
- Optimized font sizing (80% base size)

## 🔒 Security Considerations

- Environment variables for sensitive data
- Webhook signature validation
- Key registry verification on Optimism network
- Rate limiting for notifications
- Input validation and error handling

## 📈 Extensibility

The template is designed for easy extension:
- Modular component architecture
- Configurable theming system
- Plugin-based notification system
- Environment-based configuration
- TypeScript for type safety

## 🎯 Use Cases

This template is ideal for building:
- Social applications within Farcaster
- DeFi interfaces with wallet integration
- Event management systems
- Notification-driven applications
- Community engagement tools

---

*This documentation covers the current state of the MiniKit template. For the latest updates and detailed API documentation, refer to the [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview) and [OnchainKit Documentation](https://docs.base.org/builderkits/onchainkit/getting-started).*