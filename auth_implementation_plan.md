# Email Auth Implementation Plan

## 1. Supabase Auth Setup
```bash
# Enable email auth in Supabase Dashboard:
# Authentication > Settings > Auth Providers
# - Enable Email
# - Configure email templates
# - Set up SMTP (optional, uses Supabase's by default)
```

## 2. Update Database Schema
```sql
-- Modify hosts table to support both auth types
ALTER TABLE hosts 
ADD COLUMN auth_type VARCHAR(20) DEFAULT 'wallet',
ADD COLUMN email VARCHAR(255),
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create unique constraint
CREATE UNIQUE INDEX hosts_user_id_idx ON hosts(user_id);
CREATE UNIQUE INDEX hosts_email_idx ON hosts(email);
```

## 3. Update Application Code

### Install Supabase Auth
```bash
npm install @supabase/auth-helpers-nextjs @supabase/auth-helpers-react
```

### Auth Components
- Login/Signup forms
- User profile management
- Auth state management

### Update Event Creation
- Support both wallet addresses and user IDs as creators
- Handle user identification in RLS policies

## 4. User Experience Flow

### For Email Users:
1. Sign up with email/password
2. Create profile (name, bio, avatar)
3. Browse events, RSVP, create events
4. Receive email notifications

### For Wallet Users:
1. Connect wallet (existing flow)
2. Optionally link email for notifications
3. All existing Web3 features

## 5. Benefits for Your App

### Enhanced Hosts Page
- Real names instead of wallet addresses
- Profile pictures
- User bios and descriptions
- Contact information

### Better Event Management
- Email notifications for RSVPs
- Event reminders
- Host communication tools
- Analytics on user engagement

### Wider Market Appeal
- Non-crypto users can participate
- Better for mainstream events
- Professional event management features

## 6. Implementation Priority

### Phase 1 (Quick Win):
- Enable email auth in Supabase
- Add basic login/signup forms
- Update hosts table schema

### Phase 2 (Enhanced UX):
- User profiles and avatars
- Email notifications
- Enhanced hosts page with real names

### Phase 3 (Advanced Features):
- Event analytics
- Advanced notifications
- Integration with calendar apps
