# Security Implementation Guide

This document contains all security fixes to be implemented on the public site.

## Overview

| Priority | Task | Effort |
|----------|------|--------|
| P0 | Fix nginx rate limiting for patcher API | Low |
| P0 | Fix timing attack in service key validation | Low |
| P0 | Implement HMAC request signing | Medium |
| P1 | Sanitize error messages from admin panel | Low |
| P1 | Add response delay for username checks | Low |
| P1 | Add Content-Security-Policy header | Low |
| P1 | Add environment variable validation | Low |
| P2 | Add server-side route guards | Medium |
| P2 | Update password requirement UI hints | Low |

---

## P0-1: Fix Nginx Rate Limiting for Patcher API

**File:** `/etc/nginx/sites-available/atlas`

**Problem:** The patcher auth endpoints (`/api/patcher/auth/*`) are not covered by the stricter `atlas_login` rate limit. They fall under `atlas_general` at 30r/s, which is too permissive for authentication.

**Fix:** Add a location block for the patcher API auth endpoints.

### Changes

Add this location block after the existing auth rate limit block (around line 53):

```nginx
# Rate limit patcher auth endpoints
location ~ ^/api/patcher/auth {
    limit_req zone=atlas_login burst=3 nodelay;
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
```

### After Implementation

1. Test nginx config: `sudo nginx -t`
2. Reload nginx: `sudo systemctl reload nginx`
3. Verify: Test login endpoint returns 429 after 5+ rapid requests

---

## P0-2: Fix Timing Attack in Service Key Validation

**File:** `src/server/services/content.ts`

**Problem:** The `validateServiceKey` function uses simple string comparison (`===`) which is vulnerable to timing attacks.

**Current Code (lines 172-180):**
```typescript
export function validateServiceKey(serviceKey: string | null): boolean {
  if (!PUBLIC_SITE_SERVICE_KEY) {
    console.error('PUBLIC_SITE_SERVICE_KEY not configured')
    return false
  }
  return serviceKey === PUBLIC_SITE_SERVICE_KEY  // Vulnerable!
}
```

**Fixed Code:**
```typescript
import { timingSafeEqual } from 'crypto'

export function validateServiceKey(serviceKey: string | null): boolean {
  if (!PUBLIC_SITE_SERVICE_KEY) {
    console.error('PUBLIC_SITE_SERVICE_KEY not configured')
    return false
  }

  if (!serviceKey) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    const keyBuffer = Buffer.from(serviceKey, 'utf8')
    const expectedBuffer = Buffer.from(PUBLIC_SITE_SERVICE_KEY, 'utf8')

    // timingSafeEqual requires same length buffers
    if (keyBuffer.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(keyBuffer, expectedBuffer)
  } catch {
    return false
  }
}
```

### Import Addition

Add at top of file:
```typescript
import { timingSafeEqual } from 'crypto'
```

---

## P0-3: Implement HMAC Request Signing

**Purpose:** Add cryptographic signing to requests between public site and admin panel for defense-in-depth security.

### Step 1: Create HMAC Utility

**New File:** `src/lib/hmac.ts`

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

const HMAC_SECRET = process.env.PUBLIC_SITE_SERVICE_KEY
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export interface SignedRequestHeaders {
  'X-Service-Key': string
  'X-Timestamp': string
  'X-Signature': string
  'Content-Type': string
}

/**
 * Generate HMAC signature for a request
 */
export function signRequest(
  method: string,
  path: string,
  body: object
): SignedRequestHeaders {
  if (!HMAC_SECRET) {
    throw new Error('PUBLIC_SITE_SERVICE_KEY not configured')
  }

  const timestamp = Date.now().toString()
  const bodyString = JSON.stringify(body)

  // Create signature from: method + path + timestamp + body
  const signaturePayload = `${method}:${path}:${timestamp}:${bodyString}`
  const signature = createHmac('sha256', HMAC_SECRET)
    .update(signaturePayload)
    .digest('hex')

  return {
    'X-Service-Key': HMAC_SECRET,
    'X-Timestamp': timestamp,
    'X-Signature': signature,
    'Content-Type': 'application/json',
  }
}

/**
 * Verify HMAC signature from a request (for admin panel side)
 * Note: This is provided for reference - actual verification happens on admin panel
 */
export function verifySignature(
  method: string,
  path: string,
  body: string,
  timestamp: string,
  signature: string,
  serviceKey: string
): { valid: boolean; error?: string } {
  if (!HMAC_SECRET) {
    return { valid: false, error: 'Service key not configured' }
  }

  // Verify service key first (constant-time)
  try {
    const keyBuffer = Buffer.from(serviceKey, 'utf8')
    const expectedBuffer = Buffer.from(HMAC_SECRET, 'utf8')
    if (keyBuffer.length !== expectedBuffer.length || !timingSafeEqual(keyBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid service key' }
    }
  } catch {
    return { valid: false, error: 'Invalid service key' }
  }

  // Verify timestamp is within allowed window
  const requestTime = parseInt(timestamp, 10)
  const now = Date.now()
  if (isNaN(requestTime) || Math.abs(now - requestTime) > REQUEST_TIMEOUT_MS) {
    return { valid: false, error: 'Request expired or invalid timestamp' }
  }

  // Verify signature
  const signaturePayload = `${method}:${path}:${timestamp}:${body}`
  const expectedSignature = createHmac('sha256', HMAC_SECRET)
    .update(signaturePayload)
    .digest('hex')

  try {
    const sigBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'Invalid signature' }
    }
  } catch {
    return { valid: false, error: 'Invalid signature format' }
  }

  return { valid: true }
}
```

### Step 2: Update Admin Panel Requests

**File:** `src/lib/game-account.ts`

Update all `fetch()` calls to the admin panel to use signed requests.

**Example Change (createGameAccount function, around line 113):**

Before:
```typescript
const adminResponse = await fetch(`${ADMIN_PANEL_URL}/api/public/account/create`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Service-Key': PUBLIC_SITE_SERVICE_KEY,
  },
  body: JSON.stringify({
    username: username,
    password: data.password,
  }),
})
```

After:
```typescript
import { signRequest } from './hmac'

// ... in the function:
const requestBody = {
  username: username,
  password: data.password,
}
const path = '/api/public/account/create'
const headers = signRequest('POST', path, requestBody)

const adminResponse = await fetch(`${ADMIN_PANEL_URL}${path}`, {
  method: 'POST',
  headers,
  body: JSON.stringify(requestBody),
})
```

### Functions to Update

Apply the same pattern to these functions in `src/lib/game-account.ts`:
1. `createGameAccount()` - line ~113
2. `changeGamePassword()` - line ~191
3. `deleteGameAccount()` - line ~256
4. `claimGameAccount()` - line ~330
5. `deleteUserAccount()` - line ~401

And in `src/lib/server-status.ts`:
1. `getServerStatus()` - if it calls admin panel

### Step 3: Coordinate with Admin Panel

See `ADMIN_PANEL_HMAC_IMPLEMENTATION.md` for the admin panel side implementation.

---

## P1-1: Sanitize Error Messages from Admin Panel

**File:** `src/lib/game-account.ts`

**Problem:** Internal error details from admin panel are passed to users.

**Fix:** Create a sanitization function and use it for all admin panel responses.

### Add Error Sanitization Function

Add near the top of the file (after imports):

```typescript
/**
 * Sanitize error messages from admin panel before returning to users.
 * Prevents internal details from leaking to clients.
 */
function sanitizeAdminError(error: string | undefined, fallback: string): string {
  if (!error) return fallback

  // Map known error patterns to user-friendly messages
  const errorMappings: [RegExp, string][] = [
    [/already exist/i, 'Username is already taken'],
    [/not found/i, 'Account not found'],
    [/not exist/i, 'Account not found'],
    [/invalid.*password/i, 'Invalid credentials'],
    [/invalid.*username/i, 'Invalid username format'],
    [/server.*unavailable/i, 'Service temporarily unavailable'],
    [/ECONNREFUSED/i, 'Service temporarily unavailable'],
    [/syntax/i, 'Invalid input format'],
  ]

  for (const [pattern, message] of errorMappings) {
    if (pattern.test(error)) {
      return message
    }
  }

  // Don't expose internal errors - return generic message
  // Log the original error server-side for debugging
  console.error('Admin panel error (sanitized):', error)
  return fallback
}
```

### Update Error Handling

Replace all instances of direct error passthrough with sanitized versions.

**Example (around line 126):**

Before:
```typescript
if (!adminResponse.ok) {
  const errorData = await adminResponse.json().catch(() => ({}))
  return {
    success: false,
    error: errorData.error || `Admin panel error: ${adminResponse.status}`
  }
}
```

After:
```typescript
if (!adminResponse.ok) {
  const errorData = await adminResponse.json().catch(() => ({}))
  return {
    success: false,
    error: sanitizeAdminError(errorData.error, 'Failed to create game account')
  }
}
```

### All Locations to Update

1. `createGameAccount()` - around line 126, fallback: "Failed to create game account"
2. `changeGamePassword()` - around line 203, fallback: "Failed to change password"
3. `deleteGameAccount()` - around line 267, fallback: "Failed to delete game account"
4. `claimGameAccount()` - around line 343, fallback: "Failed to verify account"
5. `deleteUserAccount()` - around line 411, fallback: "Failed to delete account"

---

## P1-2: Add Response Delay for Username Checks

**File:** `src/lib/game-account.ts`

**Purpose:** Prevent username enumeration by making all responses take consistent time.

### Add Delay Utility

Add near the top of the file:

```typescript
/**
 * Ensures a minimum response time to prevent timing-based enumeration attacks.
 * @param startTime - Start time from Date.now()
 * @param minDelay - Minimum delay in milliseconds (default 1000ms)
 */
async function ensureMinimumDelay(startTime: number, minDelay: number = 1000): Promise<void> {
  const elapsed = Date.now() - startTime
  const remainingDelay = minDelay - elapsed
  if (remainingDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, remainingDelay))
  }
}
```

### Apply to Sensitive Functions

**Update `createGameAccount()`:**

```typescript
export const createGameAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; username: string; password: string }) => data)
  .handler(async ({ data }): Promise<GameAccountResult> => {
    const startTime = Date.now()

    try {
      // ... existing logic ...
    } finally {
      // Ensure consistent response time regardless of outcome
      await ensureMinimumDelay(startTime, 1000)
    }
  })
```

**Update `claimGameAccount()`:**

Apply the same pattern - this is particularly important for claim since it reveals whether accounts exist.

---

## P1-3: Add Content-Security-Policy Header

**File:** `/etc/nginx/sites-available/atlas`

**Add this header** in the HTTPS server block (around line 27, after other headers):

```nginx
# Content Security Policy
# Note: 'unsafe-inline' needed for React styles, tighten if possible
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'self';" always;
```

### CSP Breakdown

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Only allow resources from same origin by default |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | Required for React/Vite build |
| `style-src` | `'self' 'unsafe-inline'` | Required for Tailwind/styled components |
| `img-src` | `'self' data: https:` | Allow images from self, data URIs, and HTTPS |
| `font-src` | `'self' data:` | Allow fonts from self and data URIs |
| `connect-src` | `'self' https://*.supabase.co wss://*.supabase.co` | Allow API calls to self and Supabase |
| `frame-ancestors` | `'self'` | Prevent clickjacking (same as X-Frame-Options) |

### After Implementation

Test the site thoroughly - CSP can break functionality if too restrictive.

---

## P1-4: Add Environment Variable Validation

**File:** `src/lib/supabase.ts`

**Problem:** Missing env vars only log warnings instead of failing fast.

**Current Code:**
```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - auth will not work')
}
```

**Fixed Code:**
```typescript
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables: ' +
    (!supabaseUrl ? 'VITE_SUPABASE_URL ' : '') +
    (!supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : '')
  )
}
```

### Create Startup Validation

**New File:** `src/lib/env-validation.ts`

```typescript
/**
 * Validates all required environment variables are present.
 * Call this early in the application startup.
 */
export function validateEnvironment(): void {
  const required: Record<string, string | undefined> = {
    'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL,
    'VITE_SUPABASE_ANON_KEY': import.meta.env.VITE_SUPABASE_ANON_KEY,
  }

  // Server-side only variables (check only on server)
  if (typeof window === 'undefined') {
    const serverRequired: Record<string, string | undefined> = {
      'SUPABASE_SERVICE_KEY': process.env.SUPABASE_SERVICE_KEY,
      'DATABASE_URL': process.env.DATABASE_URL,
      'ADMIN_PANEL_URL': process.env.ADMIN_PANEL_URL,
      'PUBLIC_SITE_SERVICE_KEY': process.env.PUBLIC_SITE_SERVICE_KEY,
    }
    Object.assign(required, serverRequired)
  }

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n\n` +
      'Please check your .env.local file.'
    )
  }
}
```

### Call on Startup

**File:** `src/routes/__root.tsx` (or appropriate entry point)

```typescript
import { validateEnvironment } from '@/lib/env-validation'

// Validate environment on module load
validateEnvironment()
```

---

## P2-1: Add Server-Side Route Guards

**Purpose:** Add server-side authentication checks to protected routes for defense-in-depth.

### Create Auth Guard Utility

**New File:** `src/lib/auth-guard.ts`

```typescript
import { redirect } from '@tanstack/react-router'
import { createServerSupabaseClient } from './supabase'

export interface AuthGuardResult {
  userId: string
  email: string
}

/**
 * Server-side authentication guard for protected routes.
 * Throws a redirect to /login if not authenticated.
 */
export async function requireAuth(accessToken?: string): Promise<AuthGuardResult> {
  if (!accessToken) {
    throw redirect({ to: '/login' })
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error || !data.user) {
    throw redirect({ to: '/login' })
  }

  return {
    userId: data.user.id,
    email: data.user.email!,
  }
}

/**
 * Server-side admin guard for admin-only routes.
 * Throws a redirect if not authenticated or not admin.
 */
export async function requireAdmin(accessToken?: string): Promise<AuthGuardResult> {
  const user = await requireAuth(accessToken)

  // Check admin role
  const { prisma } = await import('@/db')
  const userRole = await prisma.userRole.findUnique({
    where: { supabaseUserId: user.userId },
  })

  if (userRole?.role !== 'admin') {
    throw redirect({ to: '/account' })
  }

  return user
}
```

### Update Protected Routes

**Example: `src/routes/account/index.tsx`**

Add `beforeLoad` to the route configuration:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '@/lib/auth-guard'
import { getSession } from '@/lib/auth'

export const Route = createFileRoute('/account/')({
  beforeLoad: async () => {
    // Server-side auth check
    const session = await getSession()
    await requireAuth(session?.access_token)
  },
  component: AccountDashboard,
})
```

### Routes to Update

Apply `beforeLoad` with `requireAuth()` to:
- `src/routes/account/index.tsx`
- `src/routes/account/settings.tsx`
- `src/routes/account/game.tsx`
- `src/routes/account/tester-request.tsx`

Apply `beforeLoad` with `requireAdmin()` to:
- `src/routes/admin/users.tsx`

---

## P2-2: Update Password Requirement UI Hints

**Purpose:** Ensure the UI reflects the new 12+ character password requirement from Supabase.

### Files to Update

**1. `src/routes/register.tsx`**

Update the validation (around line 64):
```typescript
if (password.length < 12) {
  setError('Password must be at least 12 characters')
  return false
}
```

Update the hint text (around line 202):
```tsx
<p className="text-xs text-muted-foreground">
  Must be at least 12 characters with uppercase, lowercase, and numbers
</p>
```

**2. `src/routes/auth/reset-password.tsx`**

Update validation and hint similarly.

**3. `src/routes/account/settings.tsx`**

Update the password change section with the same requirements.

---

## Testing Checklist

After implementing all changes:

- [ ] Nginx config validates: `sudo nginx -t`
- [ ] Rate limiting works: Test 6+ rapid login attempts
- [ ] Patcher API rate limited: Test `/api/patcher/auth/login`
- [ ] Service key validation works with HMAC
- [ ] Error messages don't expose internal details
- [ ] Username creation has consistent response time
- [ ] CSP header present: Check browser dev tools Network tab
- [ ] Missing env vars cause startup failure
- [ ] Protected routes redirect when not authenticated
- [ ] Admin routes redirect non-admins
- [ ] Password hints show 12 character requirement

---

## Rollback Plan

If issues occur:

1. **Nginx changes:** Restore from backup or remove new location block
2. **HMAC signing:** Can be disabled by removing signature verification on admin panel
3. **CSP header:** Remove or loosen the header in nginx config
4. **Route guards:** Remove `beforeLoad` from routes, client-side protection remains
