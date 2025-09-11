# POA Database Setup Guide

The POA system needs database tables to be created. Here's how to set them up:

## Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Sign in to your account
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the POA Setup Script**
   - Copy the contents of `setup-poa-database.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the script

4. **If you already created tables, run the fix script**
   - Copy the contents of `fix-poa-schema.sql`
   - Paste it into the SQL editor
   - Click "Run" to add missing columns

## Option 2: Use the Migration File

1. **Go to Database → Migrations**
   - In your Supabase dashboard
   - Click on "Migrations" in the left sidebar

2. **Create New Migration**
   - Click "New Migration"
   - Name it: "add_proof_of_attendance"
   - Copy the contents of `migrations/015_add_proof_of_attendance.sql`
   - Paste and save

## What This Creates

The script will create these tables:

- **`proof_of_attendance`** - Stores individual POA records
- **`event_check_in_settings`** - Stores POA configuration for each event
- **`poa_templates`** - Stores reusable POA design templates

## Verify Setup

After running the script, you should see:
- ✅ No more "table not found" errors
- ✅ POA collection tab works
- ✅ Event POA features are functional

## Troubleshooting

If you still get errors:
1. Check that the tables were created in the Database → Tables section
2. Verify RLS policies are enabled
3. Make sure your Supabase connection is working

## Next Steps

Once the database is set up:
1. Create an event
2. Enable POA settings for the event
3. Test the check-in and POA claiming flow
4. View POAs in the "🎫 My POAs" tab
