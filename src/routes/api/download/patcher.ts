import { createFileRoute } from '@tanstack/react-router'

const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL || 'http://localhost:3000'
const PUBLIC_SITE_SERVICE_KEY = process.env.PUBLIC_SITE_SERVICE_KEY

export const Route = createFileRoute('/api/download/patcher')({
  server: {
    handlers: {
      // GET /api/download/patcher - Redirect to signed patcher download URL
      GET: async () => {
        try {
          if (!PUBLIC_SITE_SERVICE_KEY) {
            console.error('Missing PUBLIC_SITE_SERVICE_KEY for patcher download')
            return new Response('Service unavailable', { status: 503 })
          }

          // Request signed URL from admin panel
          const response = await fetch(
            `${ADMIN_PANEL_URL}/api/public/patcher-download`,
            {
              method: 'GET',
              headers: {
                'X-Service-Key': PUBLIC_SITE_SERVICE_KEY,
              },
              signal: AbortSignal.timeout(10000),
            }
          )

          if (!response.ok) {
            console.error(`Admin panel patcher download error: ${response.status}`)
            return new Response('Download temporarily unavailable', { status: 502 })
          }

          const data = await response.json()

          if (!data.url) {
            console.error('Admin panel returned no download URL')
            return new Response('Download temporarily unavailable', { status: 502 })
          }

          // Redirect to the signed URL
          return new Response(null, {
            status: 302,
            headers: {
              Location: data.url,
              // Prevent caching of the redirect since signed URLs expire
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          })
        } catch (error) {
          console.error('Error fetching patcher download URL:', error)
          return new Response('Download temporarily unavailable', { status: 502 })
        }
      },
    },
  },
})
