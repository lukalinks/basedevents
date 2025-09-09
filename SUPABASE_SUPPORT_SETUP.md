# 🚀 Supabase Setup for Event Support Feature

## What You Need to Add to Supabase

The support feature requires database tables and policies to be set up in your Supabase project. Here's exactly what you need to do:

## 📋 Setup Steps

### Step 1: Check if Tables Exist

First, check if you already have the main schema by running this query in your Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('events', 'event_support', 'event_registrations');
```

### Step 2A: If Tables DON'T Exist - Run Full Schema

If the query above returns no results, you need to run the complete database schema:

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click **Run** to execute

### Step 2B: If Tables Exist - Add Support Feature Only

If you already have the main tables, just add the support feature components:

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase-support-setup.sql`
4. Click **Run** to execute

## 🗄️ Database Tables Created

### `event_support` Table
This table stores all USDC support transactions:

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

### Key Fields:
- **`event_id`**: Links to the event being supported
- **`supporter_address`**: Wallet address of the supporter
- **`host_address`**: Wallet address of the event creator
- **`amount_usdc`**: Amount of USDC sent (e.g., 10.50)
- **`tx_hash`**: Blockchain transaction hash
- **`status`**: Transaction status (pending, confirmed, failed)

## 🔐 Security Policies

The setup includes Row Level Security (RLS) policies:

- ✅ **Public Read**: Anyone can view support transactions (for transparency)
- ✅ **Public Insert**: Anyone can create support transactions
- ✅ **System Update**: Only system can update transaction status

## 📊 Performance Optimizations

The setup includes indexes for fast queries:

- Event ID lookup
- Supporter address lookup
- Transaction hash lookup
- Status filtering
- Date sorting

## 🔧 Helper Functions

### `get_event_support_total(event_id)`
A database function to quickly calculate total support for an event:

```sql
SELECT get_event_support_total('your-event-id-here');
```

### `event_support_totals` View
A view that provides aggregated support statistics:

```sql
SELECT * FROM event_support_totals WHERE event_id = 'your-event-id';
```

## 🌍 Environment Variables

Make sure your `.env.local` file has these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your-onchainkit-api-key
```

## ✅ Verification

After running the SQL, verify the setup by checking:

1. **Tables exist**:
   ```sql
   SELECT * FROM event_support LIMIT 1;
   ```

2. **Policies are active**:
   ```sql
   SELECT schemaname, tablename, policyname 
   FROM pg_policies 
   WHERE tablename = 'event_support';
   ```

3. **Indexes are created**:
   ```sql
   SELECT indexname 
   FROM pg_indexes 
   WHERE tablename = 'event_support';
   ```

## 🎯 What This Enables

Once set up, users will be able to:

- 💜 **Support Events**: Send USDC directly to event creators
- 📊 **View Support Totals**: See how much support each event has received
- 🔍 **Track Transactions**: All support transactions are recorded and verifiable
- 🎉 **Real-time Updates**: Support totals update automatically after transactions

## 🚨 Important Notes

- The support feature uses **Base network** (Chain ID: 8453)
- USDC contract address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Transactions go **directly** to event creators (no intermediary)
- All transactions are recorded for transparency and analytics

## 🆘 Troubleshooting

If you encounter issues:

1. **Check Supabase project status** - Make sure it's not paused
2. **Verify environment variables** - Ensure URLs and keys are correct
3. **Check RLS policies** - Make sure they allow the operations you need
4. **Review browser console** - Look for any error messages

Your support feature will be ready to use once this database setup is complete! 🎉