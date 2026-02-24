# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
EventFI is a single Next.js 15 app (not a monorepo) — a Farcaster Mini App for social event management on Base L2. Uses npm as the package manager (`package-lock.json`).

### Running the dev server
```bash
npm run dev   # starts Next.js on port 3000
```

### Lint / Build
```bash
npm run lint   # ESLint — exits 0 with warnings only (no errors expected)
npm run build  # production build — uses `ignoreBuildErrors: true` for TypeScript
```

### Environment variables
A `.env.local` file is needed at the project root. Required keys:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project credentials (app crashes without them)
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` — Coinbase OnchainKit API key
- `NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME` — defaults to `EventFI`

Placeholder values allow the dev server to start and render the UI, but Supabase-dependent features (event CRUD, comments, registrations) will fail without real credentials.

Optional: `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`, `REDIS_TOKEN`, `NEYNAR_API_KEY`.

### Tests
All tests under `test/` are Playwright integration tests that require:
1. The dev server running on port 3000
2. A working Supabase backend (real credentials in `.env.local`)
3. `@playwright/test` installed (`npm install --save-dev @playwright/test && npx playwright install chromium`)

Without real Supabase credentials, tests will time out. This is expected.

### Key gotchas
- The `next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so TypeScript errors won't block builds but may cause runtime issues.
- Some component imports in `EventDetailsPage.tsx` reference named exports that don't exist in their source files (e.g., `AttendeeCheckIn`, `CheckInSettings`, `POADashboard`, `POAClaimCard`). These produce build warnings but don't break the build due to how Next.js handles client components.
- Redis (Upstash) is optional — the app logs a warning if `REDIS_URL`/`REDIS_TOKEN` are not set but continues without notifications/webhooks.
