import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Clock, RefreshCw } from 'lucide-react'

const WARNING_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes before expiry

export function SessionExpiryWarning() {
  const { sessionExpiresAt, refreshUser, user } = useAuth()
  const [hasWarned, setHasWarned] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshUser()
      toast.dismiss('session-expiry-warning')
      toast.success('Session extended')
      setHasWarned(false)
    } catch {
      toast.error('Failed to extend session. Please log in again.')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!sessionExpiresAt || !user) return

    const checkExpiry = () => {
      const now = Math.floor(Date.now() / 1000)
      const timeRemaining = sessionExpiresAt - now
      const timeRemainingMs = timeRemaining * 1000

      // Warn when less than 5 minutes remaining
      if (timeRemainingMs <= WARNING_THRESHOLD_MS && timeRemainingMs > 0 && !hasWarned) {
        setHasWarned(true)
        toast.warning(
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Your session expires in {Math.ceil(timeRemaining / 60)} minutes</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Extend Session
            </Button>
          </div>,
          {
            duration: Infinity, // Don't auto-dismiss
            id: 'session-expiry-warning',
          }
        )
      }
    }

    // Check immediately and then every 30 seconds
    checkExpiry()
    const interval = setInterval(checkExpiry, 30000)

    return () => clearInterval(interval)
  }, [sessionExpiresAt, user, hasWarned, isRefreshing])

  // Reset warning state when session is refreshed
  useEffect(() => {
    if (sessionExpiresAt) {
      const now = Math.floor(Date.now() / 1000)
      const timeRemainingMs = (sessionExpiresAt - now) * 1000
      if (timeRemainingMs > WARNING_THRESHOLD_MS) {
        setHasWarned(false)
      }
    }
  }, [sessionExpiresAt])

  return null // This component only manages side effects
}
