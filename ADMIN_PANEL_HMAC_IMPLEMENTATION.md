# Admin Panel: HMAC Request Signing Implementation

This document provides instructions for implementing HMAC request signing verification on the admin panel side. This is a companion to the public site's security implementation.

## Overview

The public site is being updated to sign all requests to the admin panel with HMAC-SHA256. The admin panel needs to verify these signatures to ensure requests are authentic and haven't been tampered with.

## Why HMAC Signing?

1. **Request Integrity**: Ensures the request body hasn't been modified in transit
2. **Replay Prevention**: Timestamps prevent old requests from being replayed
3. **Defense in Depth**: Even if the service key is leaked, attackers can't forge valid signatures without knowing the exact signing algorithm
4. **Non-repudiation**: Provides proof that a request came from the public site

## Implementation

### Step 1: Create HMAC Verification Utility

**New File:** `src/server/services/hmac.ts`

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

const PUBLIC_SITE_SERVICE_KEY = process.env.PUBLIC_SITE_SERVICE_KEY
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

export interface HmacVerificationResult {
  valid: boolean
  error?: string
}

/**
 * Verifies the HMAC signature of a request from the public site.
 *
 * Expected headers:
 * - X-Service-Key: The shared service key
 * - X-Timestamp: Unix timestamp in milliseconds when request was created
 * - X-Signature: HMAC-SHA256 signature of "method:path:timestamp:body"
 */
export function verifyHmacSignature(
  method: string,
  path: string,
  body: string,
  headers: {
    serviceKey: string | null
    timestamp: string | null
    signature: string | null
  }
): HmacVerificationResult {
  // Check configuration
  if (!PUBLIC_SITE_SERVICE_KEY) {
    console.error('PUBLIC_SITE_SERVICE_KEY not configured')
    return { valid: false, error: 'Server configuration error' }
  }

  // Validate required headers
  if (!headers.serviceKey || !headers.timestamp || !headers.signature) {
    return { valid: false, error: 'Missing required authentication headers' }
  }

  // Verify service key (constant-time comparison)
  try {
    const keyBuffer = Buffer.from(headers.serviceKey, 'utf8')
    const expectedKeyBuffer = Buffer.from(PUBLIC_SITE_SERVICE_KEY, 'utf8')

    if (keyBuffer.length !== expectedKeyBuffer.length) {
      return { valid: false, error: 'Invalid service key' }
    }

    if (!timingSafeEqual(keyBuffer, expectedKeyBuffer)) {
      return { valid: false, error: 'Invalid service key' }
    }
  } catch {
    return { valid: false, error: 'Invalid service key format' }
  }

  // Verify timestamp is within allowed window
  const requestTime = parseInt(headers.timestamp, 10)
  const now = Date.now()

  if (isNaN(requestTime)) {
    return { valid: false, error: 'Invalid timestamp format' }
  }

  const timeDiff = Math.abs(now - requestTime)
  if (timeDiff > REQUEST_TIMEOUT_MS) {
    return {
      valid: false,
      error: `Request expired (${Math.round(timeDiff / 1000)}s old, max ${REQUEST_TIMEOUT_MS / 1000}s)`
    }
  }

  // Verify HMAC signature
  // Signature is computed from: method:path:timestamp:body
  const signaturePayload = `${method}:${path}:${headers.timestamp}:${body}`
  const expectedSignature = createHmac('sha256', PUBLIC_SITE_SERVICE_KEY)
    .update(signaturePayload)
    .digest('hex')

  try {
    const sigBuffer = Buffer.from(headers.signature, 'hex')
    const expectedSigBuffer = Buffer.from(expectedSignature, 'hex')

    if (sigBuffer.length !== expectedSigBuffer.length) {
      return { valid: false, error: 'Invalid signature' }
    }

    if (!timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return { valid: false, error: 'Invalid signature' }
    }
  } catch {
    return { valid: false, error: 'Invalid signature format' }
  }

  return { valid: true }
}

/**
 * Helper function to extract HMAC headers from a Request object
 */
export function extractHmacHeaders(request: Request) {
  return {
    serviceKey: request.headers.get('X-Service-Key'),
    timestamp: request.headers.get('X-Timestamp'),
    signature: request.headers.get('X-Signature'),
  }
}

/**
 * Validates a request from the public site with full HMAC verification.
 * Returns error response if validation fails, null if valid.
 */
export async function validatePublicSiteRequest(
  request: Request,
  path: string
): Promise<Response | null> {
  try {
    // Get the raw body for signature verification
    const body = await request.text()

    const result = verifyHmacSignature(
      request.method,
      path,
      body,
      extractHmacHeaders(request)
    )

    if (!result.valid) {
      console.warn('HMAC verification failed:', result.error)
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Validation passed - return null to indicate success
    // Note: The caller will need to re-parse the body since we consumed it
    return null
  } catch (error) {
    console.error('HMAC validation error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication error' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
```

### Step 2: Update Public Site API Endpoints

Update each public site endpoint to use HMAC verification instead of simple service key validation.

**File:** `src/routes/api/public/account/create.ts`

**Before:**
```typescript
import { validateServiceKey } from '@/server/services/publicSite'

// In the handler:
if (!validateServiceKey(request)) {
  return json({ success: false, error: 'Invalid service key' }, { status: 401 })
}
```

**After:**
```typescript
import { verifyHmacSignature, extractHmacHeaders } from '@/server/services/hmac'

// In the handler:
POST: async ({ request }) => {
  try {
    const path = '/api/public/account/create'

    // Clone request to read body twice (once for verification, once for parsing)
    const clonedRequest = request.clone()
    const rawBody = await clonedRequest.text()

    // Verify HMAC signature
    const hmacResult = verifyHmacSignature(
      'POST',
      path,
      rawBody,
      extractHmacHeaders(request)
    )

    if (!hmacResult.valid) {
      console.warn('HMAC verification failed:', hmacResult.error)
      return json(
        { success: false, error: hmacResult.error || 'Authentication failed' },
        { status: 401 }
      )
    }

    // Parse the body (we already have it as text)
    let body: { username?: string; password?: string }
    try {
      body = JSON.parse(rawBody)
    } catch {
      return json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // ... rest of the handler remains the same
  } catch (error) {
    console.error('Public account create error:', error)
    return json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Step 3: Update All Public Site Endpoints

Apply the same pattern to these endpoints:

1. **`src/routes/api/public/account/create.ts`** - Account creation
2. **`src/routes/api/public/account/password.ts`** - Password change
3. **`src/routes/api/public/account/delete.ts`** - Account deletion
4. **`src/routes/api/public/account/verify.ts`** - Credential verification
5. **`src/routes/api/public/content/index.ts`** - Content listing (if authenticated)
6. **`src/routes/api/public/content/$id.ts`** - Content by ID (if authenticated)

### Step 4: Backward Compatibility (Optional)

If you need to support both old (service-key-only) and new (HMAC) authentication during migration:

```typescript
import { validateServiceKey } from '@/server/services/publicSite'
import { verifyHmacSignature, extractHmacHeaders } from '@/server/services/hmac'

// Check if request has HMAC headers
const headers = extractHmacHeaders(request)
const hasHmacHeaders = headers.timestamp && headers.signature

if (hasHmacHeaders) {
  // New HMAC verification
  const rawBody = await request.clone().text()
  const hmacResult = verifyHmacSignature('POST', path, rawBody, headers)
  if (!hmacResult.valid) {
    return json({ success: false, error: hmacResult.error }, { status: 401 })
  }
} else {
  // Legacy service key only (deprecate after migration)
  console.warn('Request using legacy auth - HMAC not present')
  if (!validateServiceKey(request)) {
    return json({ success: false, error: 'Invalid service key' }, { status: 401 })
  }
}
```

**Important:** Remove backward compatibility once the public site is fully deployed with HMAC signing.

### Step 5: Update the Existing validateServiceKey Function

**File:** `src/server/services/publicSite.ts`

Update to use constant-time comparison (matching the public site fix):

```typescript
import { timingSafeEqual } from 'crypto'

export function validateServiceKey(request: Request): boolean {
  const serviceKey = request.headers.get('X-Service-Key')
  const expectedKey = process.env.PUBLIC_SITE_SERVICE_KEY

  if (!expectedKey) {
    console.error('PUBLIC_SITE_SERVICE_KEY environment variable is not configured')
    return false
  }

  if (!serviceKey) {
    return false
  }

  // Use constant-time comparison to prevent timing attacks
  try {
    const keyBuffer = Buffer.from(serviceKey, 'utf8')
    const expectedBuffer = Buffer.from(expectedKey, 'utf8')

    if (keyBuffer.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(keyBuffer, expectedBuffer)
  } catch {
    return false
  }
}
```

## Testing

### Manual Testing

1. Deploy public site with HMAC signing
2. Test account creation:
   ```bash
   # This should fail (no HMAC headers)
   curl -X POST https://your-admin-panel/api/public/account/create \
     -H "Content-Type: application/json" \
     -H "X-Service-Key: your-key" \
     -d '{"username":"test","password":"test123"}'

   # Response should be 401 with "Missing required authentication headers"
   ```

3. Test via the public site UI - create a new game account and verify it works

### Unit Tests

```typescript
import { verifyHmacSignature } from './hmac'
import { createHmac } from 'crypto'

describe('HMAC Verification', () => {
  const SECRET = 'test-secret'
  process.env.PUBLIC_SITE_SERVICE_KEY = SECRET

  it('should verify valid signature', () => {
    const method = 'POST'
    const path = '/api/public/account/create'
    const timestamp = Date.now().toString()
    const body = JSON.stringify({ username: 'test' })

    const signaturePayload = `${method}:${path}:${timestamp}:${body}`
    const signature = createHmac('sha256', SECRET)
      .update(signaturePayload)
      .digest('hex')

    const result = verifyHmacSignature(method, path, body, {
      serviceKey: SECRET,
      timestamp,
      signature,
    })

    expect(result.valid).toBe(true)
  })

  it('should reject expired requests', () => {
    const method = 'POST'
    const path = '/api/public/account/create'
    const timestamp = (Date.now() - 10 * 60 * 1000).toString() // 10 minutes ago
    const body = JSON.stringify({ username: 'test' })

    const signaturePayload = `${method}:${path}:${timestamp}:${body}`
    const signature = createHmac('sha256', SECRET)
      .update(signaturePayload)
      .digest('hex')

    const result = verifyHmacSignature(method, path, body, {
      serviceKey: SECRET,
      timestamp,
      signature,
    })

    expect(result.valid).toBe(false)
    expect(result.error).toContain('expired')
  })

  it('should reject tampered body', () => {
    const method = 'POST'
    const path = '/api/public/account/create'
    const timestamp = Date.now().toString()
    const originalBody = JSON.stringify({ username: 'test' })
    const tamperedBody = JSON.stringify({ username: 'hacked' })

    const signaturePayload = `${method}:${path}:${timestamp}:${originalBody}`
    const signature = createHmac('sha256', SECRET)
      .update(signaturePayload)
      .digest('hex')

    const result = verifyHmacSignature(method, path, tamperedBody, {
      serviceKey: SECRET,
      timestamp,
      signature,
    })

    expect(result.valid).toBe(false)
  })
})
```

## Deployment Checklist

- [ ] Create `src/server/services/hmac.ts` with verification code
- [ ] Update `src/server/services/publicSite.ts` with constant-time comparison
- [ ] Update all public API endpoints to use HMAC verification
- [ ] Deploy admin panel first (with backward compatibility if needed)
- [ ] Deploy public site with HMAC signing
- [ ] Test all public site → admin panel operations
- [ ] Remove backward compatibility code after verification
- [ ] Monitor logs for any authentication failures

## Security Notes

1. **Never log the service key or signatures** - Only log that verification failed, not the actual values
2. **Keep the timeout reasonable** - 5 minutes allows for clock drift but limits replay window
3. **Monitor failed verifications** - Repeated failures could indicate an attack
4. **Rotate the service key periodically** - Update both systems simultaneously
