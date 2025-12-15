import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowLeft, Mail, Lock, AlertCircle, CheckCircle2, Loader2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { MfaEnrollment } from '@/components/settings/mfa-enrollment'
import { deleteUserAccount } from '@/lib/game-account'
import { getSession } from '@/lib/auth'
import { toast } from 'sonner'

export const Route = createFileRoute('/account/settings')({
  component: AccountSettingsPage,
})

function AccountSettingsPage() {
  return (
    <ProtectedRoute>
      <AccountSettingsContent />
    </ProtectedRoute>
  )
}

function AccountSettingsContent() {
  const { user, refreshUser } = useAuth()

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
        <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your website account settings
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Email Section */}
        <ChangeEmailSection email={user?.email || ''} onUpdate={refreshUser} />

        {/* Password Section */}
        <ChangePasswordSection email={user?.email || ''} />

        {/* Two-Factor Authentication */}
        <MfaEnrollment />

        {/* Danger Zone */}
        <DeleteAccountSection email={user?.email || ''} />
      </div>
    </div>
  )
}

function ChangeEmailSection({ email, onUpdate }: { email: string; onUpdate: () => void }) {
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!newEmail) {
      setError('Email is required')
      return
    }

    if (newEmail === email) {
      setError('New email must be different from current email')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
      setNewEmail('')
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
          <Mail className="h-5 w-5" />
          Email Address
        </CardTitle>
        <CardDescription>Current: {email}</CardDescription>
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
              <span>Verification email sent to {newEmail}. Check your inbox.</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newEmail">New Email Address</Label>
            <Input
              id="newEmail"
              type="email"
              placeholder="new@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Email'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ChangePasswordSection({ email }: { email: string }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password')
      return
    }

    setLoading(true)
    try {
      // First, verify the current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })

      if (verifyError) {
        setError('Current password is incorrect')
        return
      }

      // Now update to the new password
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
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
          Password
        </CardTitle>
        <CardDescription>Change your website account password</CardDescription>
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
              <span>Password updated successfully!</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="Your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function DeleteAccountSection({ email }: { email: string }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleDelete = async () => {
    if (confirmText !== email) {
      toast.error('Email does not match')
      return
    }

    setLoading(true)
    try {
      const session = await getSession()
      if (!session?.access_token) {
        toast.error('Not authenticated')
        return
      }

      const result = await deleteUserAccount({
        data: { accessToken: session.access_token },
      })

      if (result.success) {
        toast.success('Account deleted successfully')
        setDialogOpen(false)
        // Sign out and redirect to home
        await signOut()
        navigate({ to: '/' })
      } else {
        toast.error(result.error || 'Failed to delete account')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Irreversible actions that affect your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <span className="block">
                  This action is <strong>permanent and cannot be undone</strong>. This will:
                </span>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Delete your website account</li>
                  <li>Delete your game account (if you have one)</li>
                  <li>Delete all characters and progress</li>
                  <li>Remove all your data from our servers</li>
                </ul>
                <span className="block pt-2">
                  To confirm, type your email address: <strong>{email}</strong>
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                placeholder={`Type "${email}" to confirm`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={loading}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDelete()
                }}
                disabled={loading || confirmText !== email}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-sm text-muted-foreground">
          This will permanently delete your website account and game account.
        </p>
      </CardContent>
    </Card>
  )
}
