import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Download,
  Monitor,
  HardDrive,
  Cpu,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileDown,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { siteConfig } from '@/lib/config'
import { toast } from 'sonner'

interface PatcherInfoResponse {
  success: boolean
  filename?: string
  size?: number
  sizeFormatted?: string
  sha256?: string
  lastModified?: string
  error?: string
}

export const Route = createFileRoute('/download')({
  component: DownloadPage,
  head: () => ({
    meta: [
      { title: `Download & Get Started | ${siteConfig.name}` },
      {
        name: 'description',
        content: `Download the ${siteConfig.name} patcher and get started playing. System requirements, setup instructions, and troubleshooting guide.`,
      },
      { property: 'og:title', content: `Download & Get Started | ${siteConfig.name}` },
      {
        property: 'og:description',
        content: `Download the ${siteConfig.name} patcher and get started playing. System requirements, setup instructions, and troubleshooting guide.`,
      },
      { property: 'og:type', content: 'website' },
    ],
  }),
})

function DownloadPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Download & <span className="text-primary">Get Started</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Follow these steps to connect to {siteConfig.name} and begin your adventure.
          </p>
        </div>
      </section>

      {/* System Requirements */}
      <section className="py-12 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">System Requirements</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                    Minimum
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RequirementRow icon={<Cpu className="h-4 w-4" />} label="CPU" value="Intel Core 2 Duo / AMD Athlon 64 X2" />
                  <RequirementRow icon={<HardDrive className="h-4 w-4" />} label="RAM" value="2 GB" />
                  <RequirementRow icon={<Monitor className="h-4 w-4" />} label="GPU" value="NVIDIA GeForce 8600 / ATI Radeon HD 2600" />
                  <RequirementRow icon={<HardDrive className="h-4 w-4" />} label="Storage" value="25 GB available space" />
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Recommended
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RequirementRow icon={<Cpu className="h-4 w-4" />} label="CPU" value="Intel Core i5 / AMD FX-6300" />
                  <RequirementRow icon={<HardDrive className="h-4 w-4" />} label="RAM" value="4 GB" />
                  <RequirementRow icon={<Monitor className="h-4 w-4" />} label="GPU" value="NVIDIA GeForce GTX 560 / ATI Radeon HD 7850" />
                  <RequirementRow icon={<HardDrive className="h-4 w-4" />} label="Storage" value="25 GB SSD" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Instructions */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-8 text-center">Setup Instructions</h2>

            <div className="space-y-6">
              {/* Step 1 */}
              <SetupStep
                number={1}
                title="Get the WoW Client"
                description="You'll need a WoW 3.3.5a (12340) client. We cannot distribute this ourselves."
              >
                <Card className="bg-muted/30 border-border">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground mb-3">
                          If you don't already have a WoW 3.3.5a client, ChromieCraft provides an unmodified client download.
                          Make sure you get version <strong>3.3.5a (build 12340)</strong>.
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href={siteConfig.links.clientDownload} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Download from ChromieCraft
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SetupStep>

              {/* Step 2 */}
              <SetupStep
                number={2}
                title="Create an Account"
                description="Register on our website and create your game account."
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild>
                    <Link to="/register">Create Account</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/login">Already have an account? Login</Link>
                  </Button>
                </div>
              </SetupStep>

              {/* Step 3 */}
              <SetupStep
                number={3}
                title="Download the Patcher"
                description="Our custom patcher will download and apply necessary updates to your client."
              >
                <PatcherDownloadCard />
                <p className="text-sm text-muted-foreground mt-3">
                  The patcher will automatically update your client with our custom patches and realmlist.
                </p>

                {/* Windows Security Note */}
                <Card className="bg-amber-500/10 border-amber-500/30 mt-4">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-amber-500 mb-1">Windows SmartScreen Warning</p>
                        <p className="text-sm text-muted-foreground">
                          Windows may show a security warning because the patcher isn't signed with a
                          certificate. This is normal for independent software. The patcher is safe to use -
                          click "More info" then "Run anyway" to proceed. The patcher only modifies files
                          within your WoW directory and connects to our update servers.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SetupStep>

              {/* Step 4 */}
              <SetupStep
                number={4}
                title="Run the Patcher"
                description="Place the patcher in your WoW folder and run it."
              >
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Move the patcher executable to your WoW 3.3.5a installation folder</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Run the patcher as Administrator (recommended)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Wait for the patcher to download and apply all updates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>The patcher will automatically configure your realmlist</span>
                  </div>
                </div>
              </SetupStep>

              {/* Step 5 */}
              <SetupStep
                number={5}
                title="Launch the Game"
                description="Start WoW and log in with your account credentials."
              >
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Launch <code className="px-1 py-0.5 bg-muted rounded text-foreground">Wow.exe</code> from your WoW folder</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Enter your game account username and password</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Select the realm and create your character</span>
                  </div>
                </div>
              </SetupStep>
            </div>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="py-16 bg-card/30 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Troubleshooting</h2>

            <div className="space-y-4">
              <TroubleshootItem
                question="Windows shows a security warning"
                answer="Windows SmartScreen may block the patcher because it's not signed with a certificate. Click 'More info' then 'Run anyway' to proceed. This is normal for independent software and the patcher is safe to use."
              />
              <TroubleshootItem
                question="The patcher won't start or is blocked by antivirus"
                answer="Some antivirus software may flag custom patchers. Try adding an exception for the patcher in your antivirus settings. Also make sure you're running it as Administrator."
              />
              <TroubleshootItem
                question="I'm getting 'Unable to connect' errors"
                answer="Verify that your realmlist.wtf file is correctly configured. The patcher should handle this automatically, but you can check it manually in your Data folder."
              />
              <TroubleshootItem
                question="The game crashes on startup"
                answer="Ensure you have a clean 3.3.5a (12340) client. Clients with other patches applied may cause conflicts."
              />
              <TroubleshootItem
                question="I forgot my password"
                answer="Use the password reset function on the website. Game account passwords can be reset from your account dashboard after logging in."
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function RequirementRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm text-muted-foreground w-16">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

function SetupStep({
  number,
  title,
  description,
  children,
}: {
  number: number
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="relative pl-12">
      <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-lg mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        {children}
      </div>
    </div>
  )
}

function TroubleshootItem({
  question,
  answer,
}: {
  question: string
  answer: string
}) {
  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{question}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{answer}</p>
      </CardContent>
    </Card>
  )
}

function PatcherDownloadCard() {
  const [copied, setCopied] = useState(false)

  const { data: patcherInfo } = useQuery<PatcherInfoResponse>({
    queryKey: ['patcher-info'],
    queryFn: async () => {
      const response = await fetch('/api/download/patcher-info')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  const copyChecksum = async () => {
    if (patcherInfo?.sha256) {
      await navigator.clipboard.writeText(patcherInfo.sha256)
      setCopied(true)
      toast.success('Checksum copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="py-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileDown className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">{siteConfig.name} Patcher</p>
              <p className="text-sm text-muted-foreground">
                Windows only
                {patcherInfo?.sizeFormatted && ` • ${patcherInfo.sizeFormatted}`}
              </p>
            </div>
          </div>
          <Button asChild>
            <a href="/api/download/patcher">
              <Download className="mr-2 h-4 w-4" />
              Download Patcher
            </a>
          </Button>
        </div>

        {/* Checksum verification */}
        {patcherInfo?.sha256 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Verify Download (SHA-256)</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-background/50 px-2 py-1.5 rounded border border-border overflow-x-auto">
                {patcherInfo.sha256}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyChecksum}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Compare this checksum with the downloaded file to verify integrity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
