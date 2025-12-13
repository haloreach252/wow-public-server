import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})

function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function handleCallback() {
      try {
        // Get the hash fragment from the URL (Supabase puts tokens there)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        // Also check query params (some flows use these)
        const queryParams = new URLSearchParams(window.location.search)
        const errorDescription = queryParams.get('error_description')

        if (errorDescription) {
          setStatus('error')
          setMessage(decodeURIComponent(errorDescription))
          return
        }

        if (accessToken && refreshToken) {
          // Set the session
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            setStatus('error')
            setMessage(error.message)
            return
          }

          setStatus('success')

          if (type === 'recovery') {
            setMessage('Password reset verified. Redirecting to set new password...')
            setTimeout(() => {
              navigate({ to: '/auth/reset-password' })
            }, 1500)
          } else {
            setMessage('Email verified successfully! Redirecting...')
            setTimeout(() => {
              navigate({ to: '/account' })
            }, 1500)
          }
        } else {
          // Try to get session from URL (Supabase handles this automatically sometimes)
          const { data, error } = await supabase.auth.getSession()

          if (error) {
            setStatus('error')
            setMessage('Failed to verify your email. Please try again.')
            return
          }

          if (data.session) {
            setStatus('success')
            setMessage('Email verified successfully! Redirecting...')
            setTimeout(() => {
              navigate({ to: '/account' })
            }, 1500)
          } else {
            setStatus('error')
            setMessage('Invalid or expired verification link. Please try again.')
          }
        }
      } catch (err) {
        setStatus('error')
        setMessage('An unexpected error occurred.')
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            {status === 'loading' && (
              <>
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
                <CardTitle>Verifying...</CardTitle>
                <CardDescription>Please wait while we verify your email.</CardDescription>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <CardTitle>Success!</CardTitle>
                <CardDescription>{message}</CardDescription>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="flex justify-center mb-4">
                  <AlertCircle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle>Verification Failed</CardTitle>
                <CardDescription>{message}</CardDescription>
              </>
            )}
          </CardHeader>

          {status === 'error' && (
            <CardContent className="text-center">
              <Button onClick={() => navigate({ to: '/login' })}>Go to Login</Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
