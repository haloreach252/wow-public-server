# Public Site API Issues

## Problem

The content management API endpoints in `server/api/public/content/` are returning 404 errors. When the admin panel tries to call these endpoints, it receives an HTML error page instead of JSON:

```
Cannot GET /api/public/content
HTTP Status: 404
Content-Type: text/html; charset=utf-8
```

## Root Cause

The Nitro API routes in `server/api/` are not being registered by the server. The files exist:

```
server/api/public/content/
├── index.get.ts      - GET /api/public/content (list)
├── index.post.ts     - POST /api/public/content (create)
├── [id].get.ts       - GET /api/public/content/:id
├── [id].put.ts       - PUT /api/public/content/:id
└── [id].delete.ts    - DELETE /api/public/content/:id
```

However, Nitro is not recognizing these as API routes.

## Possible Solutions

### 1. Add Nitro Configuration File

Create `nitro.config.ts` in the project root:

```typescript
import { defineNitroConfig } from 'nitropack/config'

export default defineNitroConfig({
  // Ensure API routes are scanned
  scanDirs: ['server'],

  // Or explicitly set the server handlers directory
  serverAssets: [],
})
```

### 2. Check TanStack Start Nitro Integration

The `vite.config.ts` includes `nitro()` plugin, but there may be additional configuration needed for TanStack Start to properly integrate Nitro's file-based API routing.

Check if TanStack Start requires a specific directory structure or configuration for Nitro API routes. The documentation may indicate a different approach.

### 3. Restart/Rebuild the Dev Server

After adding new API routes, the dev server may need to be fully restarted (not just hot-reloaded):

```bash
# Stop the dev server (Ctrl+C)
# Clear any cache
rm -rf .nitro .output node_modules/.vite

# Restart
npm run dev
```

### 4. Alternative: Use TanStack Start Server Functions as API

If Nitro file-based routing doesn't work with TanStack Start, consider using TanStack Start's built-in API route mechanism instead. Create API routes using `createAPIFileRoute`:

```typescript
// src/routes/api/public/content.ts
import { createAPIFileRoute } from '@tanstack/react-start/api'

export const Route = createAPIFileRoute('/api/public/content')({
  GET: async ({ request }) => {
    // Handle GET request
    const serviceKey = request.headers.get('X-Service-Key')
    // ... implementation
    return Response.json({ success: true, content: [] })
  },
  POST: async ({ request }) => {
    // Handle POST request
  },
})
```

This approach uses TanStack Start's native API routing instead of Nitro's file-based routing.

## Testing

Once fixed, test with:

```bash
curl -X GET "http://localhost:3001/api/public/content" \
  -H "X-Service-Key: 2fec22bf96ebddbefb5c9336d5c1073c0c058a616071710df9369fd3d308631e"
```

Expected response:
```json
{
  "success": true,
  "content": [],
  "total": 0,
  "hasMore": false
}
```

## Environment Variables

Ensure these are set in `.env.local`:

```
PUBLIC_SITE_SERVICE_KEY=2fec22bf96ebddbefb5c9336d5c1073c0c058a616071710df9369fd3d308631e
```

This key must match the one configured in the admin panel.

## References

- [TanStack Start API Routes Documentation](https://tanstack.com/start/latest/docs/framework/react/api-routes)
- [Nitro Server Routes](https://nitro.unjs.io/guide/routing)
