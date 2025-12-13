# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Public-facing website for a World of Warcraft (WotLK 3.3.5a) private server running on AzerothCore. Built with TanStack Start (React 19, SSR), Supabase Auth, PostgreSQL via Prisma, and Tailwind CSS.

## Commands

```bash
# Development
npm run dev              # Start dev server on port 3001

# Build
npm run build            # Production build

# Testing
npm run test             # Run all tests with Vitest

# Linting/Formatting
npm run lint             # Run ESLint
npm run format           # Run Prettier
npm run check            # Prettier write + ESLint fix

# Database (uses .env.local)
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed database
```

Add Shadcn components with:
```bash
pnpm dlx shadcn@latest add <component>
```

## Architecture

### Stack
- **Framework**: TanStack Start with file-based routing
- **Auth**: Supabase Auth (email/password, email verification required)
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Styling**: Tailwind CSS + Shadcn/UI components
- **Game Integration**: SOAP commands proxied through admin panel API

### Key Directories
- `src/routes/` - File-based routing (TanStack Router)
- `src/lib/` - Core utilities (auth, supabase client, game-account server functions)
- `src/components/ui/` - Shadcn/UI components
- `src/components/layout/` - Header, Footer
- `src/generated/prisma/` - Generated Prisma client (do not edit)
- `prisma/schema.prisma` - Database schema

### Routing Pattern
Routes are defined in `src/routes/`. The root layout is at `src/routes/__root.tsx`. Route file names map to URL paths:
- `index.tsx` → `/`
- `about.tsx` → `/about`
- `account/settings.tsx` → `/account/settings`

Generated route tree is in `src/routeTree.gen.ts` (auto-generated, do not edit).

### Server Functions
Use `createServerFn` from `@tanstack/react-start` for server-side logic. See `src/lib/auth.ts` and `src/lib/game-account.ts` for examples. Server functions validate access tokens via Supabase and interact with:
- Prisma for PostgreSQL operations
- Admin panel API for SOAP commands to AzerothCore

### Auth Flow
- Client-side auth functions in `src/lib/auth.ts` (signUp, signIn, signOut, etc.)
- Server-side verification via `createServerSupabaseClient()` in `src/lib/supabase.ts`
- Auth state provided via `AuthProvider` context in `src/lib/auth-context.tsx`
- Protected routes use components from `src/components/auth/`

### Game Account Integration
Game accounts are created via SOAP commands to the AzerothCore worldserver, proxied through the admin panel API at `ADMIN_PANEL_URL`. The `GameAccount` model in Prisma links Supabase users to their AzerothCore usernames.

Constraints from AzerothCore:
- Username: max 17 characters, alphanumeric only, permanent once chosen
- Password: max 16 characters

### Path Aliases
`@/` resolves to `src/` via tsconfig paths. Use `@/lib/utils`, `@/components/ui/button`, etc.

## Environment Variables

Copy `.env.example` to `.env.local`. Key variables:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` - Supabase client config (exposed to browser)
- `SUPABASE_SERVICE_KEY` - Server-side Supabase operations
- `DATABASE_URL` - PostgreSQL connection string for Prisma
- `ADMIN_PANEL_URL` - Admin panel API (default: http://localhost:3000)
- `PUBLIC_SITE_SERVICE_KEY` - Shared secret for admin panel requests
- `VITE_SITE_URL` - Public URL for email redirects
