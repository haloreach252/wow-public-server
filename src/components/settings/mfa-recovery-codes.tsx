import * as React from 'react'
import { Copy, Download, Check, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { siteConfig } from '@/lib/config'

interface MfaRecoveryCodesProps {
  codes: string[]
  onComplete: () => void
}

export function MfaRecoveryCodes({ codes, onComplete }: MfaRecoveryCodesProps) {
  const [copied, setCopied] = React.useState(false)
  const [confirmed, setConfirmed] = React.useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
      toast.success('Recovery codes copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const downloadCodes = () => {
    const content = [
      `${siteConfig.name} - Recovery Codes`,
      '================================',
      '',
      'Keep these codes in a safe place. Each code can only be used once.',
      '',
      ...codes.map((code, i) => `${i + 1}. ${code}`),
      '',
      `Generated: ${new Date().toISOString()}`,
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recovery-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Recovery codes downloaded')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Save Your Recovery Codes
        </CardTitle>
        <CardDescription>
          These codes can be used to access your account if you lose your authenticator device.
          Each code can only be used once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-200">
            Store these codes in a secure location. You won't be able to see them again after leaving this page.
          </AlertDescription>
        </Alert>

        {/* Recovery Codes Grid */}
        <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-muted font-mono text-sm">
          {codes.map((code, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-muted-foreground w-4">{index + 1}.</span>
              <span>{code}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={copyToClipboard}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? 'Copied!' : 'Copy All'}
          </Button>
          <Button variant="outline" onClick={downloadCodes}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        {/* Confirmation */}
        <div className="flex items-center space-x-2 pt-4 border-t">
          <Checkbox
            id="confirm-codes"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <Label
            htmlFor="confirm-codes"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            I have saved these recovery codes in a secure location
          </Label>
        </div>

        <Button onClick={onComplete} disabled={!confirmed} className="w-full">
          Continue
        </Button>
      </CardContent>
    </Card>
  )
}
