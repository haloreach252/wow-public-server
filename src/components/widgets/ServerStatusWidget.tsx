import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Circle, Clock, Users } from 'lucide-react'
import { getServerStatus } from '@/lib/server-status'
import { cn } from '@/lib/utils'

interface ServerStatusWidgetProps {
  className?: string
  showPlayerCount?: boolean
  showUptime?: boolean
  refetchInterval?: number
}

export function ServerStatusWidget({
  className,
  showPlayerCount = true,
  showUptime = false,
  refetchInterval = 60000, // 1 minute default
}: ServerStatusWidgetProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['serverStatus'],
    queryFn: () => getServerStatus(),
    refetchInterval,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 1,
  })

  const status = data?.status
  const isOnline = status?.online ?? false

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 border border-border', className)}>
        <div className="flex items-center gap-2">
          <Circle className="h-3 w-3 text-muted-foreground animate-pulse" fill="currentColor" />
          <span className="text-sm text-muted-foreground">Server Status</span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">Checking...</span>
      </div>
    )
  }

  if (isError || !data?.success) {
    return (
      <div className={cn('flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 border border-border', className)}>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Server Status</span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">Unknown</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-4 px-4 py-2 rounded-full bg-muted/50 border border-border', className)}>
      {/* Online/Offline Status */}
      <div className="flex items-center gap-2">
        <Circle
          className={cn(
            'h-3 w-3',
            isOnline ? 'text-green-500' : 'text-red-500'
          )}
          fill="currentColor"
        />
        <span className="text-sm text-muted-foreground">Server</span>
        <span className={cn(
          'text-sm font-semibold',
          isOnline ? 'text-green-500' : 'text-red-500'
        )}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Player Count */}
      {showPlayerCount && isOnline && status?.playerCount !== undefined && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold">{status.playerCount}</span>
              {status.maxPlayers && (
                <span className="text-muted-foreground">/{status.maxPlayers}</span>
              )}
              <span className="text-muted-foreground ml-1">online</span>
            </span>
          </div>
        </>
      )}

      {/* Uptime */}
      {showUptime && isOnline && status?.uptime && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Uptime: <span className="font-medium text-foreground">{status.uptime}</span>
            </span>
          </div>
        </>
      )}
    </div>
  )
}
