# Event Support Feature Implementation

## Overview

The Event Support feature allows users to support event hosts by sending USDC directly to their wallet. This feature enables community members to show appreciation for events they find valuable.

## Features

✅ **Support Button**: Easy-to-use support button on event detail pages
✅ **USDC Payments**: Direct USDC transfers to event host wallets on Base network
✅ **Multiple Amount Options**: Quick preset amounts ($5, $10, $25) plus custom amounts
✅ **Transaction Tracking**: All support transactions are recorded in the database
✅ **Support Totals**: Event creators can see total support received
✅ **Wallet Integration**: Uses Wagmi for seamless wallet interactions
✅ **Real-time Updates**: Support totals update automatically after transactions

## How It Works

### For Supporters
1. **Connect Wallet**: Users must connect their wallet to support events
2. **View Event**: Navigate to any event detail page
3. **Click Support**: Click the purple "💜 Support" button (only visible to non-creators)
4. **Enter Amount**: Choose from preset amounts ($5, $10, $25) or enter custom amount
5. **Send USDC**: Confirm the transaction in their wallet
6. **Confirmation**: Transaction is recorded and support total is updated

### For Event Creators
1. **View Support**: Event creators see a support summary showing total USDC received
2. **Track Supporters**: All support transactions are tracked with supporter addresses
3. **Direct Payments**: USDC goes directly to the creator's wallet address

## Technical Implementation

### Database Schema
```sql
CREATE TABLE event_support (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  supporter_address VARCHAR(255) NOT NULL,
  supporter_name VARCHAR(255),
  host_address VARCHAR(255) NOT NULL,
  amount_usdc DECIMAL(10,2) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL UNIQUE,
  chain_id INTEGER DEFAULT 8453, -- Base mainnet
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);
```

### Key Components

1. **EventSupportComponent** (`/app/components/events/EventSupport.tsx`)
   - Main UI component for the support feature
   - Handles USDC transfers using Wagmi
   - Shows support totals for creators
   - Provides support form for non-creators

2. **Support API** (`/app/api/events/[id]/support/route.ts`)
   - POST: Records support transactions in database
   - GET: Retrieves support data and totals

3. **Events Library** (`/lib/events.ts`)
   - `supportEvent()`: Records support transactions
   - `getEventSupport()`: Retrieves support transactions
   - `getEventSupportTotal()`: Calculates total support amount
   - `confirmSupportTransaction()`: Confirms transactions

### Blockchain Integration

- **Network**: Base mainnet (Chain ID: 8453)
- **Token**: USDC (6 decimals)
- **Contract**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Wallet**: Uses Wagmi with OnChainKit integration

## Setup Instructions

### 1. Database Migration
Run the SQL commands in `supabase-schema.sql` to create the `event_support` table:

```bash
# Apply the database migration
psql -h your-supabase-host -U postgres -d your-database -f supabase-schema.sql
```

### 2. Environment Variables
Ensure these environment variables are set in `.env.local`:

```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. Wallet Requirements
- Users need USDC in their wallet on Base network
- Wallet must be connected through OnChainKit/Wagmi
- Gas fees are paid in ETH on Base

## User Experience

### Support Flow
1. User sees event details
2. If not the creator, support section appears with purple gradient design
3. Click "💜 Support" button to open support form
4. Select or enter USDC amount
5. Click "Send X USDC" button
6. Confirm transaction in wallet
7. Transaction processes and support total updates

### Creator Experience
1. Event creators see support summary with green gradient design
2. Total support amount displayed prominently
3. Thank you message when support is received
4. All support goes directly to creator's wallet

## Security Features

- **Direct Transfers**: USDC goes directly to host wallet (no intermediary)
- **Transaction Verification**: All transactions are verified on-chain
- **Database Tracking**: Complete audit trail of all support transactions
- **Address Validation**: Supporter and host addresses are validated
- **Amount Validation**: Minimum amount checks and decimal precision

## Future Enhancements

Potential improvements that could be added:

1. **Notifications**: Notify hosts when they receive support
2. **Supporter Recognition**: Display top supporters on event pages
3. **Support Goals**: Allow hosts to set support targets
4. **Multi-token Support**: Support other tokens besides USDC
5. **Support Messages**: Allow supporters to leave messages
6. **Recurring Support**: Enable recurring monthly support
7. **Support Analytics**: Detailed analytics for event creators

## Testing

The feature has been tested for:
- ✅ Component integration in EventDetailsPage
- ✅ API endpoint functionality (POST/GET)
- ✅ Database schema compatibility
- ✅ Wagmi wallet integration
- ✅ USDC transfer functionality
- ✅ Support total calculations

## Troubleshooting

### Common Issues

1. **"Support button not showing"**
   - Make sure wallet is connected
   - Ensure user is not the event creator
   - Check that EventSupportComponent is properly imported

2. **"Transaction failed"**
   - Check USDC balance in wallet
   - Ensure sufficient ETH for gas fees on Base
   - Verify wallet is connected to Base network

3. **"Support total not updating"**
   - Check database migration was applied
   - Verify API endpoint is accessible
   - Check browser console for errors

### Debug Steps
1. Check browser console for error messages
2. Verify wallet connection and network
3. Test API endpoints directly
4. Check database for support records
5. Verify environment variables are set

## API Reference

### POST `/api/events/[id]/support`
Creates a new support transaction.

**Request Body:**
```json
{
  "supporterAddress": "0x...",
  "amountUSDC": 10.00,
  "txHash": "0x...",
  "supporterName": "optional"
}
```

**Response:**
```json
{
  "support": {
    "id": "uuid",
    "eventId": "uuid",
    "supporterAddress": "0x...",
    "hostAddress": "0x...",
    "amountUSDC": 10.00,
    "txHash": "0x...",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET `/api/events/[id]/support`
Retrieves support data for an event.

**Query Parameters:**
- `total=true`: Returns only the total support amount

**Response (with total=true):**
```json
{
  "total": 45.50
}
```

**Response (without total):**
```json
{
  "support": [
    {
      "id": "uuid",
      "eventId": "uuid",
      "supporterAddress": "0x...",
      "amountUSDC": 10.00,
      "status": "confirmed",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

This feature enhances the event platform by enabling direct financial support between community members and event creators, fostering a more sustainable and supportive ecosystem.