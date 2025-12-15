import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { User, Settings, Gamepad2, Shield, Mail, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { getGameAccount, type GameAccountInfo } from '@/lib/game-account'
import { getSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

function formatTimeRemaining(expiresAt: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = expiresAt - now

  if (diff <= 0) return 'Expired'

  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h remaining`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }
  return `${minutes}m remaining`
}

export const Route = createFileRoute('/account/')({
  component: AccountDashboard,
})

function AccountDashboard() {
  return (
    <ProtectedRoute>
      <AccountDashboardContent />
    </ProtectedRoute>
  )
}

function AccountDashboardContent() {
  const { user, sessionExpiresAt } = useAuth()
  const [gameAccount, setGameAccount] = useState<GameAccountInfo | null>(null)
  const [loadingGameAccount, setLoadingGameAccount] = useState(true)
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [loadingMfa, setLoadingMfa] = useState(true)

  useEffect(() => {
    async function fetchGameAccount() {
      try {
        const session = await getSession()
        if (session?.access_token) {
          const result = await getGameAccount({ data: { accessToken: session.access_token } })
          if (result.success && result.gameAccount) {
            setGameAccount(result.gameAccount)
          }
        }
      } catch {
        // Silently fail - game account section will show "not created"
      } finally {
        setLoadingGameAccount(false)
      }
    }

    async function fetchMfaStatus() {
      try {
        const { data } = await supabase.auth.mfa.listFactors()
        const hasVerifiedFactor = data?.totp.some(f => f.status === 'verified')
        setMfaEnabled(hasVerifiedFactor || false)
      } catch {
        // Silently fail
      } finally {
        setLoadingMfa(false)
      }
    }

    fetchGameAccount()
    fetchMfaStatus()
  }, [])

  const hasGameAccount = !!gameAccount

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Account Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your website and game accounts
        </p>
      </div>

      {/* Account Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Website Account Card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Website Account</CardTitle>
              <CardDescription>Your login credentials</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {user?.email_confirmed_at ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Email verified</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-500">Email not verified</span>
                  </>
                )}
              </div>
              {sessionExpiresAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Session: {formatTimeRemaining(sessionExpiresAt)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Game Account Card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Gamepad2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Game Account</CardTitle>
              <CardDescription>Your in-game credentials</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loadingGameAccount ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : hasGameAccount ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Account created</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Username:</span>
                  <span className="font-medium">{gameAccount?.gameUsername}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  You haven't created a game account yet.
                </p>
                <Button asChild size="sm">
                  <Link to="/account/game">Create Game Account</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Security</CardTitle>
              <CardDescription>Account protection</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {loadingMfa ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : mfaEnabled ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">Two-factor authentication enabled</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/account/settings">Manage MFA</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500">MFA not enabled</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/account/settings">Enable MFA</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="hover:border-primary/50 transition-colors">
          <Link to="/account/settings" className="block">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Account Settings</CardTitle>
              </div>
              <CardDescription>
                Change your email, password, and other account settings
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link to="/account/game" className="block">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Game Account</CardTitle>
              </div>
              <CardDescription>
                Create or manage your game account credentials
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  )
}
