import { createFileRoute } from '@tanstack/react-router'

const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL || 'http://localhost:3000'
const PUBLIC_SITE_SERVICE_KEY = process.env.PUBLIC_SITE_SERVICE_KEY

export interface PatcherInfo {
  filename: string
  size: number
  sizeFormatted: string
  sha256: string
  lastModified: string
}

export const Route = createFileRoute('/api/download/patcher-info')({
  server: {
    handlers: {
      // GET /api/download/patcher-info - Get patcher file metadata including checksum
      GET: async () => {
        try {
          if (!PUBLIC_SITE_SERVICE_KEY) {
            console.error('Missing PUBLIC_SITE_SERVICE_KEY for patcher info')
            return new Response(
              JSON.stringify({ success: false, error: 'Service unavailable' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Request patcher info from admin panel
          const response = await fetch(
            `${ADMIN_PANEL_URL}/api/public/patcher-info`,
            {
              method: 'GET',
              headers: {
                'X-Service-Key': PUBLIC_SITE_SERVICE_KEY,
              },
              signal: AbortSignal.timeout(10000), // 10s timeout
            }
          )

          if (!response.ok) {
            console.error(`Admin panel patcher info error: ${response.status}`)
            return new Response(
              JSON.stringify({ success: false, error: 'Info temporarily unavailable' }),
              { status: 502, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const data = await response.json()

          return new Response(
            JSON.stringify({ success: true, ...data }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
              },
            }
          )
        } catch (error) {
          console.error('Error fetching patcher info:', error)
          return new Response(
            JSON.stringify({ success: false, error: 'Info temporarily unavailable' }),
            { status: 502, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
