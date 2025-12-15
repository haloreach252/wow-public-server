import { createFileRoute } from '@tanstack/react-router'

const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL || 'http://localhost:3000'
const PUBLIC_SITE_SERVICE_KEY = process.env.PUBLIC_SITE_SERVICE_KEY

export const Route = createFileRoute('/api/download/patcher')({
  server: {
    handlers: {
      // GET /api/download/patcher - Proxy patcher download from admin panel
      GET: async () => {
        try {
          if (!PUBLIC_SITE_SERVICE_KEY) {
            console.error('Missing PUBLIC_SITE_SERVICE_KEY for patcher download')
            return new Response('Service unavailable', { status: 503 })
          }

          // Request file from admin panel (it now returns the binary directly)
          const response = await fetch(
            `${ADMIN_PANEL_URL}/api/public/patcher-download`,
            {
              method: 'GET',
              headers: {
                'X-Service-Key': PUBLIC_SITE_SERVICE_KEY,
              },
              signal: AbortSignal.timeout(60000), // 60s timeout for file download
            }
          )

          if (!response.ok) {
            // Check if it's a JSON error response
            const contentType = response.headers.get('Content-Type')
            if (contentType?.includes('application/json')) {
              const error = await response.json()
              console.error('Admin panel patcher download error:', error)
            } else {
              console.error(`Admin panel patcher download error: ${response.status}`)
            }
            return new Response('Download temporarily unavailable', { status: 502 })
          }

          // Proxy the binary response with headers from admin panel
          return new Response(response.body, {
            status: 200,
            headers: {
              'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
              'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment; filename="AtlasPatcher.exe"',
              'Content-Length': response.headers.get('Content-Length') || '',
              'Cache-Control': 'public, max-age=300',
            },
          })
        } catch (error) {
          console.error('Error fetching patcher download:', error)
          return new Response('Download temporarily unavailable', { status: 502 })
        }
      },
    },
  },
})
