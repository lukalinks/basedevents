## Email + Wallet: Use Both Identities Together

This guide explains how to let users sign in with email and also connect a wallet, so both identities are used together for registrations, notifications, and onchain actions in this app (Next.js + Supabase + Wagmi + Coinbase OnchainKit).

### Why combine both
- **Email**: notifications, recovery, human-friendly identity
- **Wallet**: onchain payments, token gating, ownership proofs
- **Together**: best UX + secure web3 features

### Prerequisites
Add to `.env.local` (examples):
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ONCHAINKIT_API_KEY=...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_URL=http://localhost:3000
```
- In the OnchainKit dashboard, add allowed origin: `http://localhost:3000`.

### What the app already does
- Registration form collects email and stores it with the wallet via `registerForEvent(...)` in `lib/events.ts`.
- Event page checks DB status with `isUserRegisteredForEvent(...)` to avoid duplicate prompts.
- Shared wallet UI (`ConnectWallet`) is used across pages (see `app/page.tsx`, `app/events/[id]/ClientEventPage.tsx`).

## UX flows you can support
- **Email-first**
  1) User signs in with email (Supabase).
  2) Prompt: “Connect wallet” → user connects and (optionally) links to their account.
- **Wallet-first**
  1) User clicks `ConnectWallet`.
  2) Prompt: “Add email for updates” → capture email (in profile or registration modal).
- **Registration**
  - Require wallet for paid or token‑gated events.
  - Require email for confirmations/CSV/notifications.

## Persist a stable email ↔ wallet link (recommended)
Create a small table to link a Supabase user to a wallet address, so the app can auto‑recognize users across sessions/devices.

```sql
create table if not exists user_wallet_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_address text primary key,
  created_at timestamptz default now(),
  unique(user_id)
);
```

### High‑level link flow
1) User authenticates with email (Supabase) → you have `user_id`.
2) User connects wallet (`ConnectWallet`).
3) Server generates a nonce; wallet signs: `Link wallet to your account. Nonce: <nonce>`.
4) Server verifies signature, stores `user_id ↔ wallet_address` in `user_wallet_links`.

### Server endpoints (outline)
- GET `/api/profile/link-wallet/nonce` → returns a nonce for the authed user
- POST `/api/profile/link-wallet` body: `{ address, signature }` → verifies signature and stores mapping

Verification: recover the wallet address from the signed message (viem/ethers) and compare to `address`. Only allow the current authed Supabase user to write their link.

### Client (outline)
- Fetch nonce → request wallet to sign → POST `{ address, signature }` → update UI on success.

## Using both during registration (already wired)
- UI: `app/components/events/EventRegistrationForm.tsx` collects `email`.
- Logic: `registerForEvent(...)` stores `userEmail` + `userAddress` in `event_registrations`.
- Event page: `app/events/[id]/ClientEventPage.tsx` enforces wallet connection and reflects DB registration status.

## Notifications and exports
- CSV export includes Email and Wallet columns (see `lib/events.ts` → `generateEventRegistrationsCSV`).
- You can send email reminders using Supabase functions or any ESP keyed by `userEmail`.

## Security tips
- Always use a unique nonce when linking wallets; verify signature server‑side.
- Only allow the authenticated Supabase user to create/update their link.
- Require a fresh signature to change the linked wallet.
- Use verified emails before sending sensitive notices.

## Where to customize (files)
- Wallet UI: `app/page.tsx`, `app/events/[id]/ClientEventPage.tsx`
- Registration UI: `app/components/events/EventRegistrationForm.tsx`
- Database logic: `lib/events.ts`
- Profile (email capture): `app/components/ProfileForm.tsx`

If you want, I can scaffold the `link-wallet` API routes and a DB migration next.
