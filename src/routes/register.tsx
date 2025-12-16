import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { Mail, Lock, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormError } from '@/components/ui/form-error'
import { useFormValidation } from '@/hooks/useFormValidation'
import { siteConfig } from '@/lib/config'
import { useAuth } from '@/lib/auth-context'
import { resendVerificationEmail } from '@/lib/auth'
import { toast } from 'sonner'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: `Create Account | ${siteConfig.name}` },
      {
        name: 'description',
        content: `Create your ${siteConfig.name} account and start your adventure in our WotLK 3.3.5a Classic+ server.`,
      },
    ],
  }),
})

function RegisterPage() {
  const navigate = useNavigate()
  const { signUp, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [resending, setResending] = useState(false)

  // Inline validation rules
  const validationFields = useMemo(() => ({
    email: {
      rules: [
        { validate: (v: string) => v.length > 0, message: 'Email is required' },
        { validate: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: 'Please enter a valid email address' },
      ],
    },
    password: {
      rules: [
        { validate: (v: string) => v.length > 0, message: 'Password is required' },
        { validate: (v: string) => v.length >= 12, message: 'Password must be at least 12 characters' },
        { validate: (v: string) => /[A-Z]/.test(v), message: 'Password must contain an uppercase letter' },
        { validate: (v: string) => /[a-z]/.test(v), message: 'Password must contain a lowercase letter' },
        { validate: (v: string) => /[0-9]/.test(v), message: 'Password must contain a number' },
      ],
    },
    confirmPassword: {
      rules: [
        { validate: (v: string) => v.length > 0, message: 'Please confirm your password' },
      ],
    },
  }), [])

  const { handleBlur, handleChange, validateAll, getFieldError, clearErrors } = useFormValidation({
    fields: validationFields,
  })

  const handleResendEmail = async () => {
    setResending(true)
    try {
      const result = await resendVerificationEmail(email)
      if (result.success) {
        toast.success('Verification email sent!')
      } else {
        toast.error(result.error || 'Failed to resend email')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setResending(false)
    }
  }

  // Redirect if already logged in
  if (user) {
    navigate({ to: '/account' })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    clearErrors()

    // Validate all fields
    const isValid = validateAll({ email, password, confirmPassword })
    if (!isValid) return

    // Check password match separately since it depends on another field
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const result = await signUp(email, password)

      if (!result.success) {
        setError(result.error || 'Registration failed')
        return
      }

      if (result.needsEmailVerification) {
        setSuccess(true)
      } else {
        // If no email verification needed, redirect to account
        navigate({ to: '/account' })
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle>Check Your Email</CardTitle>
              <CardDescription>
                We've sent a verification link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in the email to verify your account and complete registration.
                The link will expire in 24 hours.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Email
                    </>
                  )}
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/login">Back to Login</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Join {siteConfig.name} and start your adventure
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

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      handleChange('email', e.target.value)
                    }}
                    onBlur={() => handleBlur('email', email)}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
                <FormError error={getFieldError('email')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      handleChange('password', e.target.value)
                    }}
                    onBlur={() => handleBlur('password', password)}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
                <FormError error={getFieldError('password')} />
                {!getFieldError('password') && (
                  <p className="text-xs text-muted-foreground">
                    At least 12 characters with uppercase, lowercase, and a number
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      handleChange('confirmPassword', e.target.value)
                    }}
                    onBlur={() => handleBlur('confirmPassword', confirmPassword)}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
                <FormError error={getFieldError('confirmPassword')} />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
