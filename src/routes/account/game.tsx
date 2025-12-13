import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Gamepad2, User, Lock, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { getGameAccount, createGameAccount, changeGamePassword, type GameAccountInfo } from '@/lib/game-account'
import { getSession } from '@/lib/auth'

export const Route = createFileRoute('/account/game')({
  component: GameAccountPage,
})

function GameAccountPage() {
  return (
    <ProtectedRoute>
      <GameAccountContent />
    </ProtectedRoute>
  )
}

function GameAccountContent() {
  const { user } = useAuth()
  const [gameAccount, setGameAccount] = useState<GameAccountInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchGameAccount = async () => {
    try {
      const session = await getSession()
      if (!session?.access_token) {
        setError('Not authenticated')
        return
      }

      const result = await getGameAccount({ data: { accessToken: session.access_token } })
      if (result.success) {
        setGameAccount(result.gameAccount || null)
      } else {
        setError(result.error || 'Failed to load game account')
      }
    } catch {
      setError('Failed to load game account')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGameAccount()
  }, [])

  const hasGameAccount = !!gameAccount
  const gameUsername = gameAccount?.gameUsername || ''

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/account"
          className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Game Account</h1>
        <p className="text-muted-foreground">
          Manage your in-game credentials
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md mb-6 max-w-2xl">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {!hasGameAccount ? (
          <CreateGameAccountSection onSuccess={fetchGameAccount} />
        ) : (
          <>
            {/* Game Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Game Account
                </CardTitle>
                <CardDescription>Your in-game login credentials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Username:</span>
                    <span className="font-medium">{gameUsername}</span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Your username cannot be changed after creation. This is the name you'll use to log into the game client.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Game Password */}
            <ChangeGamePasswordSection username={gameUsername} />

            {/* Danger Zone */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect your game account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" disabled>
                  Delete Game Account (Coming Soon)
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  This will permanently delete your game account and all characters.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function CreateGameAccountSection({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validateForm = () => {
    if (!username || !password || !confirmPassword) {
      setError('All fields are required')
      return false
    }

    // AzerothCore username restrictions
    if (username.length < 3 || username.length > 17) {
      setError('Username must be between 3 and 17 characters')
      return false
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setError('Username can only contain letters and numbers')
      return false
    }

    // AzerothCore password restrictions
    if (password.length < 6 || password.length > 16) {
      setError('Password must be between 6 and 16 characters')
      return false
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      const session = await getSession()
      if (!session?.access_token) {
        setError('Not authenticated')
        return
      }

      const result = await createGameAccount({
        data: {
          accessToken: session.access_token,
          username: username.toLowerCase(),
          password,
        },
      })

      if (result.success) {
        setSuccess(true)
        onSuccess()
      } else {
        setError(result.error || 'Failed to create game account')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          Create Game Account
        </CardTitle>
        <CardDescription>
          Set up your in-game login credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 text-sm text-green-500 bg-green-500/10 rounded-md">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>Game account created successfully!</span>
            </div>
          )}

          <div className="p-3 bg-muted/50 rounded-md mb-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Important</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Your username cannot be changed after creation</li>
                  <li>Username: 3-17 characters, letters and numbers only</li>
                  <li>Password: 6-16 characters</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Game Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                placeholder="Choose wisely - cannot be changed"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="pl-10"
                disabled={loading}
                maxLength={17}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {username.length}/17 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gamePassword">Game Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="gamePassword"
                type="password"
                placeholder="6-16 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
                maxLength={16}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Can be the same as your website password or different
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmGamePassword">Confirm Game Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmGamePassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
                maxLength={16}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Game Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ChangeGamePasswordSection({ username }: { username: string }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (newPassword.length < 6 || newPassword.length > 16) {
      setError('Password must be between 6 and 16 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const session = await getSession()
      if (!session?.access_token) {
        setError('Not authenticated')
        return
      }

      const result = await changeGamePassword({
        data: {
          accessToken: session.access_token,
          newPassword,
        },
      })

      if (result.success) {
        setSuccess(true)
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setError(result.error || 'Failed to change password')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Change Game Password
        </CardTitle>
        <CardDescription>Update your in-game login password</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 text-sm text-green-500 bg-green-500/10 rounded-md">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>Game password updated successfully!</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newGamePassword">New Game Password</Label>
            <Input
              id="newGamePassword"
              type="password"
              placeholder="6-16 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              maxLength={16}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmNewGamePassword">Confirm New Password</Label>
            <Input
              id="confirmNewGamePassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              maxLength={16}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Game Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
