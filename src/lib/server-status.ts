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
  cached?: boolean
  cachedAt?: string
}

// Environment variables
const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL || 'http://localhost:3000'
const PUBLIC_SITE_SERVICE_KEY = process.env.PUBLIC_SITE_SERVICE_KEY

// Server-side cache for status (persists between requests)
let cachedStatus: ServerStatus | null = null
let cachedAt: Date | null = null
const CACHE_TTL_MS = 30 * 1000 // 30 seconds - how long to use cached data as primary
const CACHE_STALE_MS = 5 * 60 * 1000 // 5 minutes - how long to use cached data as fallback

// Get server status from admin panel with caching
export const getServerStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ServerStatusResult> => {
    const now = new Date()

    // Check if we have fresh cached data (within TTL)
    if (cachedStatus && cachedAt && (now.getTime() - cachedAt.getTime()) < CACHE_TTL_MS) {
      return {
        success: true,
        status: cachedStatus,
        cached: true,
        cachedAt: cachedAt.toISOString(),
      }
    }

    try {
      if (!PUBLIC_SITE_SERVICE_KEY) {
        console.warn('Missing PUBLIC_SITE_SERVICE_KEY - server status unavailable')
        // Return stale cache if available
        if (cachedStatus && cachedAt) {
          return {
            success: true,
            status: cachedStatus,
            cached: true,
            cachedAt: cachedAt.toISOString(),
          }
        }
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
        // Return stale cache if available and not too old
        if (cachedStatus && cachedAt && (now.getTime() - cachedAt.getTime()) < CACHE_STALE_MS) {
          return {
            success: true,
            status: cachedStatus,
            cached: true,
            cachedAt: cachedAt.toISOString(),
          }
        }
        return { success: false, error: 'Failed to fetch server status' }
      }

      const data = await response.json()

      const status: ServerStatus = {
        online: data.online ?? false,
        playerCount: data.playerCount,
        maxPlayers: data.maxPlayers,
        uptime: data.uptime,
      }

      // Update cache
      cachedStatus = status
      cachedAt = now

      return {
        success: true,
        status,
        cached: false,
      }
    } catch (error) {
      // Don't log full error in production - could be expected when admin panel is down
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.warn('Admin panel status request timed out')
      } else {
        console.error('Error fetching server status:', error)
      }

      // Return stale cache if available and not too old
      if (cachedStatus && cachedAt && (now.getTime() - cachedAt.getTime()) < CACHE_STALE_MS) {
        return {
          success: true,
          status: cachedStatus,
          cached: true,
          cachedAt: cachedAt.toISOString(),
        }
      }

      return { success: false, error: 'Unable to reach server' }
    }
  }
)
