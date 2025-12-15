# Admin Panel: Game Account Delete Endpoint

This document describes the endpoint that needs to be implemented in the admin panel (`wow-web-manager`) to support game account deletion from the public site.

## Overview

The public site now has a "Delete Game Account" feature that allows users to permanently delete their game accounts. This feature requires an admin panel endpoint to execute the SOAP command that deletes the account from AzerothCore.

## Endpoint Specification

### Route
```
POST /api/public/account/delete
```

### Location
Create file: `src/routes/api/public/account/delete.ts`

### Request
```typescript
// Headers
{
  "X-Service-Key": string // Required - shared secret for authentication
}

// Body (JSON)
{
  "username": string // Required - game username to delete
}
```

### Response
```typescript
// Success (200)
{ "success": true }

// Error (4xx/5xx)
{ "success": false, "error": string }
```

### Status Codes
- `200` - Account deleted successfully
- `400` - Invalid request (missing username, invalid format)
- `401` - Invalid service key
- `404` - Account not found
- `500` - Server error / SOAP error

## SOAP Command

The AzerothCore command to delete an account is:
```
account delete <username>
```

This command:
- Deletes the account from the `account` table
- Cascades to delete all characters associated with the account
- Removes all related data (achievements, items, mail, etc.)

**Note**: This is an irreversible operation. The public site already requires the user to type their username as confirmation before calling this endpoint.

## Implementation

### 1. Add to `src/server/services/publicSite.ts`

Add a new function and response parser:

```typescript
/**
 * Parses SOAP response for account deletion into user-friendly message
 */
function parseDeleteAccountResponse(message: string): { success: boolean; error?: string } {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('deleted') || lowerMessage.includes('account removed')) {
    return { success: true }
  }

  if (lowerMessage.includes('not exist') || lowerMessage.includes('not found')) {
    return { success: false, error: 'Account not found' }
  }

  if (lowerMessage.includes('syntax')) {
    return { success: false, error: 'Invalid username format' }
  }

  // Return the raw message if we can't parse it
  return { success: false, error: message || 'Failed to delete account' }
}

/**
 * Deletes a game account via SOAP
 */
export async function deleteGameAccount(
  username: string,
  clientIp?: string
): Promise<PublicSiteResult> {
  const sanitizedUsername = sanitizeUsername(username)

  try {
    const result = await executeCommand(
      'live',
      `account delete ${sanitizedUsername}`
    )

    const parsed = parseDeleteAccountResponse(result.message)

    // Audit log the action
    try {
      await createAuditLogEntry(
        PUBLIC_SITE_SYSTEM_ID,
        PUBLIC_SITE_SYSTEM_EMAIL,
        'public.account.delete',
        sanitizedUsername,
        { success: parsed.success, error: parsed.error },
        clientIp
      )
    } catch (err) {
      console.error('Failed to create audit log:', err)
    }

    return parsed
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failed attempt
    try {
      await createAuditLogEntry(
        PUBLIC_SITE_SYSTEM_ID,
        PUBLIC_SITE_SYSTEM_EMAIL,
        'public.account.delete',
        sanitizedUsername,
        { success: false, error: errorMessage },
        clientIp
      )
    } catch (err) {
      console.error('Failed to create audit log:', err)
    }

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Cannot connect')) {
      return { success: false, error: 'Game server is currently unavailable' }
    }

    return { success: false, error: 'Failed to delete account' }
  }
}
```

### 2. Create Route File `src/routes/api/public/account/delete.ts`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  validateServiceKey,
  validateUsername,
  deleteGameAccount,
} from '@/server/services/publicSite'

export const Route = createFileRoute('/api/public/account/delete')({
  server: {
    handlers: {
      // POST /api/public/account/delete - Delete a game account
      POST: async ({ request }) => {
        try {
          // Validate service key
          if (!validateServiceKey(request)) {
            return json(
              { success: false, error: 'Invalid service key' },
              { status: 401 }
            )
          }

          // Parse request body
          let body: { username?: string }
          try {
            body = await request.json()
          } catch {
            return json(
              { success: false, error: 'Invalid JSON body' },
              { status: 400 }
            )
          }

          const { username } = body

          // Validate username
          const usernameValidation = validateUsername(username || '')
          if (!usernameValidation.valid) {
            return json(
              { success: false, error: usernameValidation.error },
              { status: 400 }
            )
          }

          // Get client IP for audit logging
          const clientIp =
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            undefined

          // Delete the account
          const result = await deleteGameAccount(username!, clientIp)

          if (!result.success) {
            // Determine appropriate status code based on error
            const status = result.error?.includes('not found') ? 404 : 500
            return json({ success: false, error: result.error }, { status })
          }

          return json({ success: true })
        } catch (error) {
          console.error('Public account delete error:', error)
          return json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
```

## Testing

### Manual Test with curl

```bash
# Test the endpoint (replace with actual values)
curl -X POST http://localhost:3000/api/public/account/delete \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: YOUR_SERVICE_KEY" \
  -d '{"username": "testaccount"}'
```

### Expected Responses

Success:
```json
{"success": true}
```

Account not found:
```json
{"success": false, "error": "Account not found"}
```

Invalid service key:
```json
{"success": false, "error": "Invalid service key"}
```

## Security Considerations

1. **Service Key Authentication**: The endpoint is protected by the `X-Service-Key` header, ensuring only the public site can call it.

2. **Audit Logging**: All deletion attempts (successful and failed) are logged with the action `public.account.delete`.

3. **Username Validation**: The username is validated and sanitized before being used in the SOAP command.

4. **No Password Required**: Since the user has already authenticated on the public site and confirmed the deletion by typing their username, no additional password verification is needed.

5. **Client IP Logging**: The client's IP is captured and stored in the audit log for traceability.

## Public Site Integration

The public site already has the client-side implementation in:
- `src/lib/game-account.ts` - `deleteGameAccount` server function
- `src/routes/account/game.tsx` - Delete button with confirmation dialog

The public site implementation:
1. Requires the user to type their game username to confirm
2. Calls the admin panel endpoint with the service key
3. On success, removes the `GameAccount` record from its local database
4. Shows success/error toast notification
