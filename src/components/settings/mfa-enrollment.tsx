import * as React from 'react'
import { toast } from 'sonner'
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { MfaRecoveryCodes } from './mfa-recovery-codes'

type MfaState =
  | { status: 'loading' }
  | { status: 'idle' }
  | { status: 'enrolling'; qrCodeUri: string; secret: string; factorId: string }
  | { status: 'verifying'; factorId: string }
  | { status: 'show-recovery'; recoveryCodes: string[] }
  | { status: 'enrolled'; factorId: string; createdAt: string }
  | { status: 'unenrolling'; factorId: string }

export function MfaEnrollment() {
  const [state, setState] = React.useState<MfaState>({ status: 'loading' })
  const [verifyCode, setVerifyCode] = React.useState('')
  const [error, setError] = React.useState('')

  // Load MFA status on mount
  React.useEffect(() => {
    loadMfaStatus()
  }, [])

  const loadMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()

      if (error) throw error

      const verifiedFactor = data.totp.find((f) => f.status === 'verified')

      if (verifiedFactor) {
        setState({
          status: 'enrolled',
          factorId: verifiedFactor.id,
          createdAt: verifiedFactor.created_at,
        })
      } else {
        setState({ status: 'idle' })
      }
    } catch (err) {
      console.error('Failed to load MFA status:', err)
      setState({ status: 'idle' })
    }
  }

  const startEnrollment = async () => {
    setError('')
    setState({ status: 'loading' })

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      })

      if (error) throw error

      setState({
        status: 'enrolling',
        qrCodeUri: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start MFA enrollment'
      setError(message)
      toast.error(message)
      setState({ status: 'idle' })
    }
  }

  const verifyEnrollment = async () => {
    if (state.status !== 'enrolling' || verifyCode.length !== 6) return

    setError('')

    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: state.factorId })

      if (challengeError) throw challengeError

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: state.factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      })

      if (verifyError) throw verifyError

      // Generate recovery codes (displayed to user)
      const recoveryCodes = generateRecoveryCodes()

      setState({
        status: 'show-recovery',
        recoveryCodes,
      })

      setVerifyCode('')
      toast.success('Two-factor authentication enabled!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid verification code'
      setError(message)
      setVerifyCode('')
    }
  }

  const completeEnrollment = async () => {
    await loadMfaStatus()
  }

  const disableMfa = async () => {
    if (state.status !== 'enrolled') return

    setState({ status: 'unenrolling', factorId: state.factorId })

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: state.factorId,
      })

      if (error) throw error

      setState({ status: 'idle' })
      toast.success('Two-factor authentication disabled')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable MFA'
      toast.error(message)
      await loadMfaStatus()
    }
  }

  const cancelEnrollment = async () => {
    if (state.status === 'enrolling') {
      // Unenroll the pending factor
      try {
        await supabase.auth.mfa.unenroll({ factorId: state.factorId })
      } catch {
        // Ignore errors when canceling
      }
    }
    setState({ status: 'idle' })
    setVerifyCode('')
    setError('')
  }

  // Auto-verify when code is complete
  React.useEffect(() => {
    if (verifyCode.length === 6 && state.status === 'enrolling') {
      verifyEnrollment()
    }
  }, [verifyCode])

  if (state.status === 'loading') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (state.status === 'show-recovery') {
    return (
      <MfaRecoveryCodes
        codes={state.recoveryCodes}
        onComplete={completeEnrollment}
      />
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
            {state.status === 'enrolled' && (
              <Badge variant="default" className="ml-2 bg-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using a TOTP authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.status === 'idle' && (
            <div className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication adds an additional layer of security to your account
                  by requiring both your password and an authentication code from your phone.
                  We recommend enabling this for better account protection.
                </AlertDescription>
              </Alert>
              <Button onClick={startEnrollment}>
                <Shield className="h-4 w-4 mr-2" />
                Enable Two-Factor Authentication
              </Button>
            </div>
          )}

          {state.status === 'enrolled' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <ShieldCheck className="h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium">Two-factor authentication is enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Enabled on {new Date(state.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="destructive" onClick={disableMfa}>
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable Two-Factor Authentication
              </Button>
            </div>
          )}

          {state.status === 'unenrolling' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog
        open={state.status === 'enrolling'}
        onOpenChange={(open) => !open && cancelEnrollment()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code below with your authenticator app (like Google Authenticator,
              Authy, or 1Password), then enter the verification code.
            </DialogDescription>
          </DialogHeader>

          {state.status === 'enrolling' && (
            <div className="space-y-6 py-4">
              {/* QR Code */}
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg bg-white p-4">
                  <img
                    src={state.qrCodeUri}
                    alt="MFA QR Code"
                    className="h-48 w-48"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Or enter this code manually:
                  </p>
                  <code className="rounded bg-muted px-2 py-1 text-sm font-mono select-all">
                    {state.secret}
                  </code>
                </div>
              </div>

              {/* Verification Code Input */}
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verifyCode}
                    onChange={setVerifyCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p className="text-sm text-destructive text-center">{error}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelEnrollment}>
              Cancel
            </Button>
            <Button
              onClick={verifyEnrollment}
              disabled={verifyCode.length !== 6}
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Generate 10 cryptographically secure recovery codes
function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  for (let i = 0; i < 10; i++) {
    const randomBytes = new Uint8Array(8)
    crypto.getRandomValues(randomBytes)

    const code = Array.from(randomBytes, (byte) =>
      charset[byte % charset.length]
    ).join('')

    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}
