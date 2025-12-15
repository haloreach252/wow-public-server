import { createFileRoute } from '@tanstack/react-router'
import {
  adminDeleteContent,
  adminGetContent,
  adminUpdateContent,
  validateServiceKey,
} from '@/lib/content'

// Helper to create JSON responses with proper status codes
// In dev mode, Nitro intercepts 404s and shows HTML error page - return 200 instead
// Client should check the `success` field. See: https://github.com/TanStack/router/issues/5877
function jsonResponse(data: unknown, status = 200): Response {
  const safeStatus = process.env.NODE_ENV === 'development' && status === 404 ? 200 : status
  return new Response(JSON.stringify(data), {
    status: safeStatus,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/public/content/$id')({
  server: {
    handlers: {
      // GET /api/public/content/:id - Get single content by ID or slug
      GET: async ({ request, params }) => {
        const serviceKey = request.headers.get('X-Service-Key')
        if (!validateServiceKey(serviceKey)) {
          return jsonResponse({ success: false, error: 'Invalid service key' }, 401)
        }

        const { id } = params
        if (!id) {
          return jsonResponse({ success: false, error: 'Missing content ID' }, 400)
        }

        const result = await adminGetContent(id)

        if (!result.success) {
          return jsonResponse(result, 404)
        }

        return jsonResponse(result)
      },

      // PUT /api/public/content/:id - Update content
      PUT: async ({ request, params }) => {
        const serviceKey = request.headers.get('X-Service-Key')
        if (!validateServiceKey(serviceKey)) {
          return jsonResponse({ success: false, error: 'Invalid service key' }, 401)
        }

        const { id } = params
        if (!id) {
          return jsonResponse({ success: false, error: 'Missing content ID' }, 400)
        }

        try {
          const body = await request.json()

          // Validate content type if provided
          if (body.type && !['release', 'blog', 'wiki'].includes(body.type)) {
            return jsonResponse(
              { success: false, error: 'Invalid content type. Must be: release, blog, or wiki' },
              400
            )
          }

          const result = await adminUpdateContent(id, {
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

          if (!result.success) {
            return jsonResponse(result, result.error === 'Content not found' ? 404 : 400)
          }

          return jsonResponse(result)
        } catch {
          return jsonResponse({ success: false, error: 'Invalid request body' }, 400)
        }
      },

      // DELETE /api/public/content/:id - Delete content
      DELETE: async ({ request, params }) => {
        const serviceKey = request.headers.get('X-Service-Key')
        if (!validateServiceKey(serviceKey)) {
          return jsonResponse({ success: false, error: 'Invalid service key' }, 401)
        }

        const { id } = params
        if (!id) {
          return jsonResponse({ success: false, error: 'Missing content ID' }, 400)
        }

        const result = await adminDeleteContent(id)

        if (!result.success) {
          return jsonResponse(result, result.error === 'Content not found' ? 404 : 500)
        }

        return jsonResponse(result)
      },
    },
  },
})
