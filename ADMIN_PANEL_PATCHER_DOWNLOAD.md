# Admin Panel: Patcher Download Endpoint

This document describes the endpoint that needs to be implemented in the admin panel (`wow-web-manager`) to support patcher downloads from the public site.

## Overview

The public site needs to provide a download link for the patcher executable. To avoid exposing the R2 bucket URL directly, the public site requests a signed URL from the admin panel, then redirects the user to that URL.

This follows the same pattern used by the patcher itself when downloading patches via `/api/patch?action=download`.

## Endpoint Specification

### Route
```
GET /api/public/patcher-download
```

### Location
Create file: `src/routes/api/public/patcher-download.ts`

### Request
```typescript
// Headers
{
  "X-Service-Key": string // Required - shared secret for authentication
}

// No body - GET request
```

### Response
```typescript
// Success (200)
{
  "url": string,        // Signed download URL
  "expiresIn": number,  // Seconds until expiration (e.g., 3600)
  "filename": string    // Suggested filename (e.g., "AtlasPatcher.exe")
}

// Error (4xx/5xx)
{ "success": false, "error": string }
```

### Status Codes
- `200` - Signed URL generated successfully
- `401` - Invalid service key
- `404` - Patcher file not found in R2
- `500` - Server error / R2 error

## Implementation

### Option 1: Use Existing R2 Signed URL Logic

If you already have R2 signed URL generation (for the `/api/patch?action=download` endpoint), you can reuse that:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { validateServiceKey } from '@/server/services/publicSite'
import { getSignedDownloadUrl } from '@/server/services/r2' // Your existing R2 service

// Configure the patcher file location in R2
const PATCHER_R2_KEY = 'patcher/AtlasPatcher.exe'
const PATCHER_FILENAME = 'AtlasPatcher.exe'

export const Route = createFileRoute('/api/public/patcher-download')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Validate service key
          if (!validateServiceKey(request)) {
            return json(
              { success: false, error: 'Invalid service key' },
              { status: 401 }
            )
          }

          // Generate signed URL (reuse existing R2 logic)
          const signedUrl = await getSignedDownloadUrl(PATCHER_R2_KEY, {
            expiresIn: 3600, // 1 hour
          })

          if (!signedUrl) {
            return json(
              { success: false, error: 'Patcher file not found' },
              { status: 404 }
            )
          }

          return json({
            url: signedUrl.url,
            expiresIn: signedUrl.expiresIn,
            filename: PATCHER_FILENAME,
          })
        } catch (error) {
          console.error('Patcher download error:', error)
          return json(
            { success: false, error: 'Failed to generate download URL' },
            { status: 500 }
          )
        }
      },
    },
  },
})
```

### Option 2: Direct R2 Signed URL Generation

If you need to create the R2 logic from scratch:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { validateServiceKey } from '@/server/services/publicSite'

// R2 Configuration (from environment variables)
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

// Patcher file configuration
const PATCHER_R2_KEY = 'patcher/AtlasPatcher.exe'
const PATCHER_FILENAME = 'AtlasPatcher.exe'
const URL_EXPIRY_SECONDS = 3600 // 1 hour

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export const Route = createFileRoute('/api/public/patcher-download')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Validate service key
          if (!validateServiceKey(request)) {
            return json(
              { success: false, error: 'Invalid service key' },
              { status: 401 }
            )
          }

          // Generate presigned URL
          const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: PATCHER_R2_KEY,
            ResponseContentDisposition: `attachment; filename="${PATCHER_FILENAME}"`,
          })

          const signedUrl = await getSignedUrl(r2Client, command, {
            expiresIn: URL_EXPIRY_SECONDS,
          })

          return json({
            url: signedUrl,
            expiresIn: URL_EXPIRY_SECONDS,
            filename: PATCHER_FILENAME,
          })
        } catch (error) {
          console.error('Patcher download error:', error)

          // Check for "not found" errors
          if (error instanceof Error && error.name === 'NoSuchKey') {
            return json(
              { success: false, error: 'Patcher file not found' },
              { status: 404 }
            )
          }

          return json(
            { success: false, error: 'Failed to generate download URL' },
            { status: 500 }
          )
        }
      },
    },
  },
})
```

## Configuration

### Environment Variables (if not already configured)

```bash
# R2 credentials (same as used for patch files)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
```

### Patcher File Location in R2

The patcher executable should be uploaded to R2 at a consistent path:
```
patcher/AtlasPatcher.exe
```

This path can be changed in the code above (`PATCHER_R2_KEY` constant).

## Testing

### Manual Test with curl

```bash
# Test the endpoint
curl -X GET http://localhost:3000/api/public/patcher-download \
  -H "X-Service-Key: YOUR_SERVICE_KEY"
```

### Expected Response

```json
{
  "url": "https://your-bucket.r2.cloudflarestorage.com/patcher/AtlasPatcher.exe?X-Amz-Algorithm=...",
  "expiresIn": 3600,
  "filename": "AtlasPatcher.exe"
}
```

### Test the Full Flow

1. Visit the public site download page
2. Click "Download Patcher"
3. Should redirect to R2 and start downloading

## Security Considerations

1. **Service Key Authentication**: Only the public site can request download URLs via the shared service key.

2. **Signed URLs**: The R2 URL is signed and expires after 1 hour, preventing hotlinking and abuse.

3. **No Direct R2 Exposure**: The R2 bucket URL is never exposed to users - they only see the signed URL which contains limited access.

4. **Content Disposition**: The response header forces the browser to download the file with the correct filename rather than displaying it.

## Public Site Integration

The public site has already been updated with:
- `src/routes/api/download/patcher.ts` - API route that redirects to the signed URL
- `src/routes/download.tsx` - Download button links to `/api/download/patcher`

Flow:
1. User clicks "Download Patcher" on `/download` page
2. Browser requests `/api/download/patcher`
3. Public site server requests signed URL from admin panel
4. Public site redirects (302) to the signed R2 URL
5. Browser downloads the patcher from R2

## Notes

- The signed URL expiry (1 hour) is generous since the redirect happens immediately
- If you want shorter expiry (e.g., 5 minutes), adjust `URL_EXPIRY_SECONDS` or `expiresIn`
- The same endpoint could be extended to support version queries if needed (e.g., `?version=latest`)
