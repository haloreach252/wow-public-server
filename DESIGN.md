# WoW Public Server Website - Design Document

> **Note:** Server name and branding TBD. Design should accommodate easy branding changes.

## Overview

Public-facing website for a World of Warcraft (WotLK 3.3.5a) private server running on AzerothCore. The server's goal is a "Classic+" experience with custom content additions (world changes, quests, items, etc.).

### Goals

- User account registration and management
- Game account creation and management (1:1 with website accounts)
- Download page for custom patcher
- Content showcase for server additions (release pages, blog posts, wiki pages)
- Server status display
- Community forums (future phase)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React 19, file-based routing) |
| Auth | Supabase Auth (separate project from admin panel) |
| Database (App) | PostgreSQL via Supabase |
| Database (Game) | MySQL (AzerothCore - `acore_auth` as `acore_pb_auth`) |
| ORM | Prisma |
| Rich Text Editor | Tiptap |
| UI Components | Shadcn/UI + Radix UI |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Deployment | Same dedicated server as admin panel |
| Reverse Proxy | Nginx |

### Related Systems

- **Admin Panel:** `acadmin.miniversestudios.com` - Content management, server control
- **Patcher:** Custom Rust/Tauri binary (Windows only) - Downloads patches via admin panel API

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Nginx Reverse Proxy                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────────┐              ┌─────────────────────────┐   │
│   │  Public Website │              │      Admin Panel        │   │
│   │  (this project) │◄────────────►│ acadmin.miniversestudios│   │
│   │                 │  Local API   │         .com            │   │
│   └────────┬────────┘              └───────────┬─────────────┘   │
│            │                                   │                  │
│            ▼                                   ▼                  │
│   ┌─────────────────┐              ┌─────────────────────────┐   │
│   │    Supabase     │              │       Supabase          │   │
│   │ (separate proj) │              │    (admin project)      │   │
│   │  - Auth         │              │  - Auth (RBAC)          │   │
│   │  - PostgreSQL   │              │  - PostgreSQL           │   │
│   └─────────────────┘              └─────────────────────────┘   │
│                                                                   │
│            │                                   │                  │
│            └───────────────┬───────────────────┘                  │
│                            ▼                                      │
│                  ┌─────────────────┐                              │
│                  │    AzerothCore  │                              │
│                  │  MySQL Database │                              │
│                  │  (acore_pb_auth)│                              │
│                  └─────────────────┘                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Authentication & Accounts

### Website Account

- **Provider:** Supabase Auth
- **Registration:** Email/password with email verification required
- **MFA:** Optional TOTP (Google Authenticator compatible)
- **No social logins**

### Game Account

- **Relationship:** 1:1 with website account (one game account per user)
- **Creation:** After website registration/verification, user creates game account
- **Storage:** AzerothCore `acore_pb_auth.account` table
- **Management:** Via SOAP commands to worldserver (ensures AzerothCore handles account logic properly)
- **Password:** User can choose same password as website account or a different one

#### AzerothCore Account Restrictions

| Field | Max Length | Notes |
|-------|------------|-------|
| Username | 17 characters | Client-enforced limit |
| Password | 16 characters | Converted to uppercase internally |

### Account Actions

| Action | Website Account | Game Account |
|--------|-----------------|--------------|
| Create | Registration page | Post-verification, in dashboard |
| Change Email | Yes | N/A |
| Change Password | Yes | Yes |
| Change Username | N/A | No (permanent, chosen at creation) |
| Delete | Yes (cascades) | Yes |
| MFA | Optional TOTP | N/A |

---

## Pages & Routes

### Public Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage - Server pitch, latest news, server status, quick links |
| `/about` | About the server, team, vision |
| `/download` | Patcher download and setup instructions |
| `/content` | Content listing (releases, blog, wiki) |
| `/content/[type]/[slug]` | Individual content pages |
| `/forums` | Forums (future phase) |

### Auth Pages

| Route | Description |
|-------|-------------|
| `/login` | Login form |
| `/register` | Registration form |
| `/verify-email` | Email verification handler |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form |

### Protected Pages (Authenticated)

| Route | Description |
|-------|-------------|
| `/account` | Account dashboard |
| `/account/settings` | Website account settings (email, password, MFA) |
| `/account/game` | Game account management (create, password, delete) |
| `/account/security` | Security settings, active sessions |

---

## Features

### Homepage

- **Hero Section:** Server pitch/tagline, CTA buttons (Register, Download)
- **Server Status Widget:** Online/offline indicator (via admin panel API)
- **Latest News:** Recent blog posts/announcements
- **Quick Links:** Register, Download, Discord (if applicable)

### Server Status Widget

- **Data Source:** Admin panel local-only API endpoint
- **Display:** Online/offline status only (expandable later for player count, uptime)
- **Implementation:** Admin panel exposes `/api/public/status` (local-only via nginx)

### Download Page

- **Content:**
  - System requirements
  - Step-by-step setup instructions
  - Link to acquire WoW 3.3.5a client (external - we don't distribute)
  - Patcher download (Windows only)
  - Patcher usage instructions
- **Note:** Patcher binary hosted on admin panel (existing R2 integration)

### Content System

#### Content Types

| Type | Purpose | Example |
|------|---------|---------|
| Release | Major update showcases with detailed breakdowns | "Patch 1.0: The Northshire Expansion" |
| Blog | Development updates, announcements | "Dev Diary #5: New Quest System" |
| Wiki | Feature documentation, guides | "Custom Talent Trees Explained" |

#### Content Schema (PostgreSQL)

```
Content
├── id (uuid)
├── type (enum: release, blog, wiki)
├── slug (unique)
├── title
├── summary (short description)
├── body (Tiptap JSON)
├── featuredImage (optional)
├── published (boolean)
├── publishedAt (timestamp)
├── createdAt
├── updatedAt
├── authorId (references admin panel user)
└── metadata (jsonb - flexible fields per type)
```

#### Content Management

- **Editor:** Tiptap (rich text, no markdown)
- **Management:** Via admin panel (Admin/Super Admin roles only)
- **Storage:** Public site's Supabase PostgreSQL database
- **Admin panel will need:** Content CRUD UI (documented separately)

### Forums (Future Phase)

#### Structure

- **Categories:** Top-level organization (General, Support, Suggestions, etc.)
- **Threads:** User-created topics within categories
- **Replies:** Responses to threads
- **Pinned Posts:** Sticky threads at top of categories

#### Planned Features

- Category-based organization
- Thread creation (authenticated users)
- Reply system
- Pinned/sticky threads (moderator action)
- Basic moderation tools

#### Out of Scope (Initial)

- Reactions/likes
- Reputation system
- User signatures
- Private messaging

---

## Design Guidelines

### Visual Style

- **Theme:** Dark/moody WoW aesthetic blended with clean modern UI
- **Color Palette:** TBD (dark backgrounds, accent colors inspired by WoW)
- **Typography:** Clean, readable fonts
- **Imagery:** WoW-inspired but tasteful, avoiding copyright issues

### Branding Flexibility

- Server name stored in config/environment variable
- Logo as replaceable asset
- Color scheme via CSS variables/Tailwind config
- Easy theme customization for future rebranding

### Component Library

- Base: Shadcn/UI components
- Custom components built on Radix UI primitives
- Consistent with admin panel patterns where applicable

---

## Database Schema

### Supabase PostgreSQL (Public Site)

```sql
-- User profile (extends Supabase Auth)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  game_account_id INTEGER UNIQUE, -- References acore_pb_auth.account.id
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('release', 'blog', 'wiki')),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body JSONB NOT NULL, -- Tiptap JSON
  featured_image TEXT,
  published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  author_id UUID, -- Admin panel user (for display only)
  author_name TEXT, -- Denormalized for display
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Forums (Future)
CREATE TABLE public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body JSONB NOT NULL, -- Tiptap JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### AzerothCore MySQL (acore_pb_auth)

Existing schema - no modifications needed. Key table:

```sql
-- account table (existing)
-- Relevant fields:
-- id (INT)
-- username (VARCHAR(32))
-- sha_pass_hash (VARCHAR(40)) -- SHA1(UPPER(username):UPPER(password))
-- email (VARCHAR(255))
-- reg_mail (VARCHAR(255))
-- joindate (TIMESTAMP)
-- last_ip (VARCHAR(15))
-- locked (TINYINT)
-- online (TINYINT)
```

---

## API Routes

### Public API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/content` | List published content (filterable by type) |
| GET | `/api/content/[slug]` | Get single content item |
| GET | `/api/status` | Proxy to admin panel status (or cache) |

### Auth API (Supabase handles most)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Custom registration logic |
| POST | `/api/auth/verify-email` | Handle email verification |

### Game Account API (Protected)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/game-account/create` | Create game account (via SOAP) |
| PUT | `/api/game-account/password` | Change game password (via SOAP) |
| DELETE | `/api/game-account` | Delete game account (via SOAP) |

> **Implementation Note:** All game account operations use SOAP commands to the worldserver.
> This ensures AzerothCore handles account creation/modification properly.
> See [SOAP Commands](#soap-commands) section for available commands.

### Forums API (Future - Protected)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/forums/categories` | List categories |
| GET | `/api/forums/threads` | List threads (by category) |
| POST | `/api/forums/threads` | Create thread |
| GET | `/api/forums/threads/[id]` | Get thread with replies |
| POST | `/api/forums/threads/[id]/replies` | Create reply |

---

## SOAP Commands

Game account management is handled via SOAP commands to the AzerothCore worldserver. This ensures proper account handling by the game server.

### Available Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `account create $username $password` | Create new game account | `account create myuser mypass123` |
| `account set password $username $password` | Change account password | `account set password myuser newpass456` |
| `account delete $username` | Delete game account | `account delete myuser` |

> **Note:** There is no native username rename command. Usernames are permanent once chosen.

### SOAP Proxy via Admin Panel

The public site will proxy SOAP commands through the admin panel API to:
- Keep SOAP credentials centralized in admin panel
- Reuse existing SOAP integration
- Add additional validation/logging at admin panel level

#### Required Admin Panel Endpoints

| Method | Route | Description | SOAP Command |
|--------|-------|-------------|--------------|
| POST | `/api/public/account/create` | Create game account | `account create` |
| POST | `/api/public/account/password` | Change password | `account set password` |
| DELETE | `/api/public/account/delete` | Delete account | `account delete` |

These endpoints should be local-only (nginx IP restriction) and accept requests from the public site.

---

## Admin Panel Integration

### Required Admin Panel Changes

> **Important:** Document these in `/home/acore/projects/wow-web-manager/wow-web-manager/PUBLIC_SITE_INTEGRATION.md`

#### 1. Server Status Endpoint (Local-Only)

```
GET /api/public/status
Response: { "online": boolean }
Access: Local only (nginx IP restriction)
```

#### 2. SOAP Proxy Endpoints (Local-Only)

```
POST /api/public/account/create
Body: { "username": string, "password": string }
Response: { "success": boolean, "error"?: string }

POST /api/public/account/password
Body: { "username": string, "password": string }
Response: { "success": boolean, "error"?: string }

DELETE /api/public/account/delete
Body: { "username": string }
Response: { "success": boolean, "error"?: string }

Access: Local only (nginx IP restriction)
```

#### 3. Content Management UI

- Create/Edit/Delete content (release, blog, wiki pages)
- Tiptap rich text editor integration
- Image upload (existing R2 integration)
- Publish/unpublish functionality
- Content listing with filters

#### 4. Database Access

- Admin panel needs connection to public site's Supabase database
- Or: Admin panel writes to shared location (consider approach)

### Nginx Configuration

```nginx
# Public site
server {
    # ... SSL and domain config ...
    location / {
        proxy_pass http://localhost:3001;
    }
}

# Admin panel - public status endpoint (local only)
# This endpoint is called by public site (localhost:3001) to get server status
location /api/public/status {
    allow 127.0.0.1;
    deny all;
    proxy_pass http://localhost:3000;
}
```

---

## Security Considerations

### Authentication

- Email verification required before game account creation
- Rate limiting on registration/login endpoints
- Secure session handling via Supabase

### Game Account

- Password can be same as website account or different (user choice)
- Password requirements enforced (min length, complexity TBD)
- Username uniqueness validated by AzerothCore via SOAP
- All account operations performed via SOAP commands (not direct DB writes)

### API Security

- CSRF protection on forms
- Input validation on all endpoints
- SQL injection prevention (Prisma parameterized queries)
- XSS prevention (Tiptap sanitization, React escaping)

### Infrastructure

- Local-only endpoints via nginx IP restriction
- HTTPS enforced
- Environment variables for secrets

---

## Development Phases

### Phase 1: Core Foundation

- [ ] Project setup (TanStack Start, Tailwind, Shadcn)
- [ ] Supabase project setup and auth integration
- [ ] Basic layout and navigation
- [ ] Homepage (static content, no dynamic features)
- [ ] About page
- [ ] Download page

### Phase 2: Authentication

- [ ] Registration flow with email verification
- [ ] Login/logout
- [ ] Password reset
- [ ] MFA setup (optional TOTP)
- [ ] Protected route handling

### Phase 3: Game Account Management

- [ ] SOAP proxy endpoints on admin panel (document in admin repo)
- [ ] Game account creation
- [ ] Password change
- [ ] Account deletion
- [ ] Account dashboard UI

### Phase 4: Server Status

- [ ] Admin panel status endpoint (document in admin repo)
- [ ] Status widget component
- [ ] Homepage integration

### Phase 5: Content System

- [ ] Database schema for content
- [ ] Public content listing/viewing
- [ ] Tiptap renderer for content display
- [ ] Admin panel content management UI (document in admin repo)

### Phase 6: Forums

- [ ] Database schema for forums
- [ ] Category/thread/reply CRUD
- [ ] Forum UI components
- [ ] Moderation features (pin, lock)

---

## Future Considerations

- Content versioning/history
- Armory (character lookup)
- Voting system integration
- Enhanced forum features (reactions, reputation)
- Player count in server status
- Search functionality
- Localization/i18n

---

## File Structure

```
src/
├── components/
│   ├── ui/              # Shadcn components
│   ├── layout/          # Header, footer, navigation
│   ├── content/         # Content display components
│   ├── forms/           # Form components
│   └── widgets/         # Server status, etc.
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── auth.ts          # Auth utilities
│   ├── auth-context.tsx # Auth React context
│   └── utils.ts         # General utilities
├── routes/
│   ├── index.tsx        # Homepage
│   ├── about.tsx
│   ├── download.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── account/
│   │   ├── index.tsx    # Dashboard
│   │   ├── settings.tsx
│   │   ├── game.tsx
│   │   └── security.tsx
│   ├── content/
│   │   ├── index.tsx    # Content listing
│   │   └── $slug.tsx    # Content detail
│   ├── forums/          # Future
│   └── api/
│       ├── content.ts
│       ├── status.ts
│       └── game-account/
├── server/
│   └── services/
│       ├── auth.ts
│       ├── game-account.ts
│       └── content.ts
├── styles/
│   └── globals.css
└── types/
    └── index.ts
```

---

## Environment Variables

```env
# Supabase (Public Site Project)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# AzerothCore Database
ACORE_DB_HOST=
ACORE_DB_PORT=
ACORE_DB_USER=
ACORE_DB_PASSWORD=
ACORE_DB_NAME=acore_pb_auth

# Admin Panel (for status API)
ADMIN_PANEL_URL=http://localhost:3000

# Dev Server Port
PORT=3001

# Site Config
SITE_NAME="Server Name TBD"
SITE_URL=

# Patcher Download URL (hosted on admin panel R2)
PATCHER_DOWNLOAD_URL=
```

---

## References

- [TanStack Start Documentation](https://tanstack.com/start)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [AzerothCore Wiki](https://www.azerothcore.org/wiki/)
- [Tiptap Documentation](https://tiptap.dev/)
- [Shadcn/UI Documentation](https://ui.shadcn.com/)
- Admin Panel Codebase: `/home/acore/projects/wow-web-manager/wow-web-manager/`
