# Public Site Integration for Admin Panel

This document describes the API endpoints that the admin panel needs to implement to support the public website's game account management features.

## Overview

The public website allows users to:
1. Create game accounts (linked to their website account)
2. Change their game account password

These operations require executing SOAP commands against AzerothCore. The public site proxies these requests through the admin panel, which has direct SOAP access.

## Authentication

All requests from the public site include a shared secret key in the `X-Service-Key` header. The admin panel must verify this key before processing any request.

```
X-Service-Key: <PUBLIC_SITE_SERVICE_KEY>
```

**Environment Variable (Admin Panel):**
```env
PUBLIC_SITE_SERVICE_KEY=your-secure-service-key-here
```

Generate a secure key: `openssl rand -hex 32`

**IMPORTANT:** This same key must be configured in both the public site and admin panel.

## Endpoints to Implement

### 1. Create Game Account

**Endpoint:** `POST /api/public/account/create`

**Headers:**
- `Content-Type: application/json`
- `X-Service-Key: <service_key>`

**Request Body:**
```json
{
  "username": "playername",
  "password": "playerpassword"
}
```

**Validation:**
- `username`: 3-17 characters, alphanumeric only, case-insensitive (store lowercase)
- `password`: 6-16 characters

**SOAP Command:**
```
account create <username> <password>
```

**Success Response (200):**
```json
{
  "success": true
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Possible Errors:**
- `Invalid service key` (401)
- `Username already exists` (400)
- `Invalid username format` (400)
- `Invalid password format` (400)
- `SOAP connection failed` (500)
- `SOAP command failed: <reason>` (500)

---

### 2. Change Game Account Password

**Endpoint:** `POST /api/public/account/password`

**Headers:**
- `Content-Type: application/json`
- `X-Service-Key: <service_key>`

**Request Body:**
```json
{
  "username": "playername",
  "password": "newpassword"
}
```

**Validation:**
- `username`: Must be an existing account
- `password`: 6-16 characters

**SOAP Command:**
```
account set password <username> <password>
```

**Success Response (200):**
```json
{
  "success": true
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

**Possible Errors:**
- `Invalid service key` (401)
- `Account not found` (400)
- `Invalid password format` (400)
- `SOAP connection failed` (500)
- `SOAP command failed: <reason>` (500)

---

## Implementation Notes

### Service Key Validation

Create a middleware or helper function to validate the service key:

```typescript
function validateServiceKey(request: Request): boolean {
  const serviceKey = request.headers.get('X-Service-Key')
  return serviceKey === process.env.PUBLIC_SITE_SERVICE_KEY
}
```

### SOAP Command Execution

You likely already have SOAP command execution logic for the admin console. Reuse that for these endpoints.

Example using your existing SOAP infrastructure:

```typescript
// Pseudocode - adapt to your actual SOAP implementation
async function createGameAccount(username: string, password: string) {
  const command = `account create ${username} ${password}`
  const result = await executeSoapCommand(command)

  // Parse SOAP response for success/failure
  if (result.includes('Account created')) {
    return { success: true }
  } else {
    return { success: false, error: result }
  }
}
```

### Security Considerations

1. **Network Security:** These endpoints should only be accessible from localhost (the public site runs on the same server). Consider using nginx to restrict access by IP.

2. **Rate Limiting:** Consider adding rate limiting to prevent abuse.

3. **Logging:** Log all account creation/password change attempts for audit purposes.

4. **Input Sanitization:** Always validate and sanitize inputs before passing to SOAP commands to prevent injection attacks.

### Example nginx Configuration

```nginx
# Only allow access to public API endpoints from localhost
location /api/public/ {
    allow 127.0.0.1;
    deny all;

    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Testing

### Manual Testing with curl

**Create Account:**
```bash
curl -X POST http://localhost:3000/api/public/account/create \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-service-key" \
  -d '{"username": "testuser", "password": "testpass123"}'
```

**Change Password:**
```bash
curl -X POST http://localhost:3000/api/public/account/password \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: your-service-key" \
  -d '{"username": "testuser", "password": "newpass456"}'
```

## Flow Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│ Public Site  │────▶│ Admin Panel  │────▶│  AzerothCore │
│              │     │  (Port 3001) │     │  (Port 3000) │     │    (SOAP)    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                    │
                            │                    │
                     1. User submits      2. Validates key
                        form                 Executes SOAP
                                            Returns result
                            │                    │
                            ▼                    ▼
                     3. Stores link       4. Account created
                        in PostgreSQL        in MySQL
```

## Questions?

If you need clarification on any of these requirements, please reach out before implementing.
