# Admin Panel: Account Verification Endpoint

This document describes the new endpoint required in the admin panel to support the "Link Existing Account" feature on the public website.

## Overview

The public website now allows users to link pre-existing game accounts (created before the website launched) to their website accounts. This requires verifying the user's credentials against AzerothCore's auth database.

## Required Endpoint

### `POST /api/public/account/verify`

Verifies a game account username and password against the AzerothCore database.

#### Request

**Headers:**
```
Content-Type: application/json
X-Service-Key: <PUBLIC_SITE_SERVICE_KEY>
```

**Body:**
```json
{
  "username": "playername",
  "password": "theirpassword"
}
```

#### Response

**Success (200):**
```json
{
  "success": true
}
```

**Invalid Credentials (200):**
```json
{
  "success": false,
  "error": "Invalid username or password"
}
```

**Account Not Found (200):**
```json
{
  "success": false,
  "error": "Account not found"
}
```

**Server Error (500):**
```json
{
  "success": false,
  "error": "Database error"
}
```

## Implementation

### AzerothCore Password Verification

AzerothCore uses SRP6 (Secure Remote Password protocol) for password storage. The `auth.account` table contains:

| Column | Type | Description |
|--------|------|-------------|
| `username` | VARCHAR(32) | Account username (uppercase) |
| `salt` | BINARY(32) | Random salt for SRP6 |
| `verifier` | BINARY(32) | SRP6 verifier (derived from password + salt) |

### Verification Algorithm

```typescript
import crypto from 'crypto'

interface AccountRow {
  username: string
  salt: Buffer
  verifier: Buffer
}

function verifySRP6Password(
  account: AccountRow,
  providedPassword: string
): boolean {
  // AzerothCore normalizes username to uppercase for password calculation
  const username = account.username.toUpperCase()
  const password = providedPassword.toUpperCase()

  // Step 1: Calculate credential hash
  // h1 = SHA1(username:password)
  const credentialHash = crypto
    .createHash('sha1')
    .update(`${username}:${password}`)
    .digest()

  // Step 2: Calculate x = SHA1(salt || h1)
  const x = crypto
    .createHash('sha1')
    .update(Buffer.concat([account.salt, credentialHash]))
    .digest()

  // Step 3: Convert x to BigInt (little-endian)
  const xBigInt = bufferToBigIntLE(x)

  // Step 4: Calculate v = g^x mod N
  // SRP6 parameters (same as AzerothCore)
  const N = BigInt('0x894B645E89E1535BBDAD5B8B290650530801B18EBFBF5E8FAB3C82872A3E9BB7')
  const g = BigInt(7)

  const calculatedVerifier = modPow(g, xBigInt, N)

  // Step 5: Convert stored verifier to BigInt and compare
  const storedVerifier = bufferToBigIntLE(account.verifier)

  return calculatedVerifier === storedVerifier
}

function bufferToBigIntLE(buffer: Buffer): bigint {
  let result = BigInt(0)
  for (let i = buffer.length - 1; i >= 0; i--) {
    result = (result << BigInt(8)) + BigInt(buffer[i])
  }
  return result
}

function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = BigInt(1)
  base = base % modulus
  while (exponent > 0) {
    if (exponent % BigInt(2) === BigInt(1)) {
      result = (result * base) % modulus
    }
    exponent = exponent / BigInt(2)
    base = (base * base) % modulus
  }
  return result
}
```

### Example Route Handler (Express/Next.js)

```typescript
// /api/public/account/verify.ts

import { NextRequest, NextResponse } from 'next/server'
// or for Express: import { Request, Response } from 'express'

// Database connection to acore_auth
import { authDb } from '@/lib/database'

export async function POST(request: NextRequest) {
  // Verify service key
  const serviceKey = request.headers.get('X-Service-Key')
  if (serviceKey !== process.env.PUBLIC_SITE_SERVICE_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password are required'
      })
    }

    // Query the auth database
    const account = await authDb.query(
      'SELECT username, salt, verifier FROM account WHERE UPPER(username) = UPPER(?)',
      [username]
    )

    if (!account || account.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid username or password'
      })
    }

    // Verify password using SRP6
    const isValid = verifySRP6Password(account[0], password)

    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid username or password'
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Account verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}
```

## Security Considerations

1. **Rate Limiting**: Implement rate limiting on this endpoint to prevent brute-force attacks. Recommended: 5 attempts per minute per IP.

2. **Logging**: Log failed verification attempts (without passwords) for security monitoring.

3. **Service Key**: The `X-Service-Key` header must be validated before processing any requests.

4. **Timing Attacks**: Use constant-time comparison when comparing verifiers to prevent timing attacks.

5. **HTTPS Only**: This endpoint should only be accessible over HTTPS.

## Database Connection

The admin panel needs read access to the `acore_auth` database to query the `account` table. The existing database configuration should work if it already has access to the auth database for other operations.

## Testing

To test the endpoint manually:

```bash
curl -X POST https://admin.yourdomain.com/api/public/account/verify \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-service-key" \
  -d '{"username": "testuser", "password": "testpassword"}'
```

## Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Public Site    │     │  Admin Panel    │     │  AzerothCore    │
│  (React/TS)     │     │  (API)          │     │  (MySQL)        │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ POST /account/verify  │                       │
         │ {username, password}  │                       │
         │──────────────────────>│                       │
         │                       │                       │
         │                       │ SELECT salt, verifier │
         │                       │ FROM account          │
         │                       │──────────────────────>│
         │                       │                       │
         │                       │<──────────────────────│
         │                       │ {salt, verifier}      │
         │                       │                       │
         │                       │ Calculate SRP6        │
         │                       │ verifier and compare  │
         │                       │                       │
         │<──────────────────────│                       │
         │ {success: true/false} │                       │
         │                       │                       │
         │ If success:           │                       │
         │ Create GameAccount    │                       │
         │ record in PostgreSQL  │                       │
         │                       │                       │
```

## Alternative: Simpler Hash Check

If you prefer not to implement full SRP6 verification, an alternative is to check if an account exists and then test authentication by attempting a password change (which would fail if wrong password is provided). However, this is less clean and could have side effects.

The SRP6 implementation above is the recommended approach as it's read-only and matches exactly how AzerothCore verifies passwords.
