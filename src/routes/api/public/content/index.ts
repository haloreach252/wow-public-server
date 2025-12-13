import { createFileRoute } from '@tanstack/react-router'
import {
  adminCreateContent,
  adminListContent,
  validateServiceKey,
} from '@/lib/content'
import type { ContentType } from '@/generated/prisma/client'

// Helper to create JSON responses with proper status codes
// Using raw Response to work around TanStack Start json() helper issues with non-200 status codes
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/public/content/')({
  server: {
    handlers: {
      // GET /api/public/content - List all content (for admin panel)
      GET: async ({ request }) => {
        const serviceKey = request.headers.get('X-Service-Key')
        if (!validateServiceKey(serviceKey)) {
          return jsonResponse({ success: false, error: 'Invalid service key' }, 401)
        }

        const url = new URL(request.url)
        const type = url.searchParams.get('type') as ContentType | null
        const publishedParam = url.searchParams.get('published')
        const limit = parseInt(url.searchParams.get('limit') ?? '50', 10)
        const offset = parseInt(url.searchParams.get('offset') ?? '0', 10)

        const result = await adminListContent({
          type: type ?? undefined,
          published: publishedParam === 'true' ? true : publishedParam === 'false' ? false : undefined,
          limit,
          offset,
        })

        return jsonResponse(result)
      },

      // POST /api/public/content - Create new content
      POST: async ({ request }) => {
        const serviceKey = request.headers.get('X-Service-Key')
        if (!validateServiceKey(serviceKey)) {
          return jsonResponse({ success: false, error: 'Invalid service key' }, 401)
        }

        try {
          const body = await request.json()

          // Validate required fields
          if (!body.type || !body.slug || !body.title || body.body === undefined) {
            return jsonResponse(
              { success: false, error: 'Missing required fields: type, slug, title, body' },
              400
            )
          }

          // Validate content type
          if (!['release', 'blog', 'wiki'].includes(body.type)) {
            return jsonResponse(
              { success: false, error: 'Invalid content type. Must be: release, blog, or wiki' },
              400
            )
          }

          const result = await adminCreateContent({
            type: body.type,
            slug: body.slug,
            title: body.title,
            summary: body.summary,
            body: body.body,
            featuredImage: body.featuredImage,
            published: body.published,
            authorId: body.authorId,
            authorName: body.authorName,
            metadata: body.metadata,
          })

          if (result.success) {
            return jsonResponse(result, 201)
          } else {
            return jsonResponse(result, 400)
          }
        } catch {
          return jsonResponse({ success: false, error: 'Invalid request body' }, 400)
        }
      },
    },
  },
})
