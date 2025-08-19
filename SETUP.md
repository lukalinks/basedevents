# Event Mini App - Setup Instructions

Follow these steps to get your Event Mini App up and running.

## Step 1: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select your existing project
3. Go to **Settings → API**
4. Copy your:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJ...`)

## Step 2: Set Up Environment Variables

Create a file called `.env.local` in your project root with:

```env
# Replace with your actual Supabase values
NEXT_PUBLIC_SUPABASE_URL=https://cuhyxunprrajypltimxb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here

# OnchainKit (optional, for MiniKit features)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Event Mini App
NEXT_PUBLIC_ICON_URL=/logo.png
```

## Step 3: Create Database Tables

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the sidebar
3. Copy and paste the contents of `supabase-schema.sql` into the editor
4. Click **Run** to create the tables

## Step 4: Install Dependencies (Already Done)

The Supabase client is already installed. If you need to reinstall:

```bash
npm install @supabase/supabase-js
```

## Step 5: Test Your Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Connect your wallet and try creating an event

## Troubleshooting

### Common Issues:

1. **"Invalid API key" error**
   - Double-check your Supabase URL and anon key in `.env.local`
   - Make sure there are no extra spaces or quotes

2. **Database connection errors**
   - Ensure you ran the SQL schema in your Supabase project
   - Check that RLS policies are enabled

3. **Events not loading**
   - Check the browser console for errors
   - Verify your Supabase project is active and not paused

4. **Wallet connection issues**
   - Make sure you're using a compatible wallet (MetaMask, Coinbase Wallet, etc.)
   - Check that you're on the correct network (Base)

### Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure your Supabase project is properly configured
4. Make sure you have a wallet extension installed

## Features to Test

Once setup is complete, test these features:

- ✅ Connect wallet
- ✅ Create an event
- ✅ View all events
- ✅ RSVP to an event
- ✅ View "My Events" tab
- ✅ Search and filter events
- ✅ Add comments to events
- ✅ Edit/delete your events
- ✅ Share events

Your Event Mini App should now be fully functional! 🎉
