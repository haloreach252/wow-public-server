import { createServerFn } from '@tanstack/react-start'

// Types
export interface ServerStatus {
  online: boolean
  playerCount?: number
  maxPlayers?: number
  uptime?: string
}

export interface ServerStatusResult {
  success: boolean
  error?: string
  status?: ServerStatus
}

// Environment variables
const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL || 'http://localhost:3000'
const PUBLIC_SITE_SERVICE_KEY = process.env.PUBLIC_SITE_SERVICE_KEY

// Get server status from admin panel
export const getServerStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ServerStatusResult> => {
    try {
      if (!PUBLIC_SITE_SERVICE_KEY) {
        console.warn('Missing PUBLIC_SITE_SERVICE_KEY - server status unavailable')
        return { success: false, error: 'Server configuration error' }
      }

      const response = await fetch(`${ADMIN_PANEL_URL}/api/public/status`, {
        method: 'GET',
        headers: {
          'X-Service-Key': PUBLIC_SITE_SERVICE_KEY,
        },
        // Short timeout for status checks
        signal: AbortSignal.timeout(5000),
      })

      if (!response.ok) {
        console.error(`Admin panel status error: ${response.status}`)
        return { success: false, error: 'Failed to fetch server status' }
      }

      const data = await response.json()

      return {
        success: true,
        status: {
          online: data.online ?? false,
          playerCount: data.playerCount,
          maxPlayers: data.maxPlayers,
          uptime: data.uptime,
        },
      }
    } catch (error) {
      // Don't log full error in production - could be expected when admin panel is down
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.warn('Admin panel status request timed out')
      } else {
        console.error('Error fetching server status:', error)
      }
      return { success: false, error: 'Unable to reach server' }
    }
  }
)
