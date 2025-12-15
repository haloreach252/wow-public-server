import { createFileRoute } from '@tanstack/react-router'
import { Sword, Target, Heart, Lightbulb } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { siteConfig } from '@/lib/config'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: `About | ${siteConfig.name}` },
      {
        name: 'description',
        content: `Learn about ${siteConfig.name}, a WotLK 3.3.5a Classic+ private server with custom content and reimagined zones.`,
      },
      { property: 'og:title', content: `About | ${siteConfig.name}` },
      {
        property: 'og:description',
        content: `Learn about ${siteConfig.name}, a WotLK 3.3.5a Classic+ private server with custom content and reimagined zones.`,
      },
      { property: 'og:type', content: 'website' },
    ],
  }),
})

function AboutPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            About <span className="text-primary">{siteConfig.name}</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A passion project dedicated to reimagining the classic World of Warcraft experience.
          </p>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-8 w-8 text-primary" />
              <h2 className="text-2xl font-bold">Our Vision</h2>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                {siteConfig.name} is a WotLK 3.3.5a private server with a simple goal:
                create a "Classic+" experience that expands on the original game while
                respecting what made it great.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We believe that World of Warcraft's Wrath of the Lich King expansion
                represents the pinnacle of the classic era. The game mechanics were refined,
                the storytelling reached new heights, and the world felt alive with possibility.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our server takes this foundation and builds upon it with new content:
                custom quests that tell untold stories, reimagined zones that breathe new
                life into familiar places, and carefully balanced additions that enhance
                without overwhelming.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground">
              The principles that guide our development
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <ValueCard
              icon={<Heart className="h-8 w-8" />}
              title="Respect the Original"
              description="Every addition is carefully considered to ensure it feels like a natural extension of the game, not a departure from it."
            />
            <ValueCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="Quality Over Quantity"
              description="We focus on creating meaningful content rather than rushing to add features. Every quest, item, and zone receives attention to detail."
            />
            <ValueCard
              icon={<Sword className="h-8 w-8" />}
              title="Community First"
              description="Player feedback shapes our development. This server exists for the community, and the community drives its direction."
            />
          </div>
        </div>
      </section>

      {/* What to Expect Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">What to Expect</h2>

            <div className="space-y-6">
              <ExpectationItem
                title="Custom Content"
                description="New quests, items, and experiences that expand the world. Discover stories that were never told and secrets that were never revealed."
              />
              <ExpectationItem
                title="Reimagined Zones"
                description="Familiar locations with new content to explore. We're adding depth to existing zones rather than creating entirely separate experiences."
              />
              <ExpectationItem
                title="Balanced Progression"
                description="New content is balanced to fit within the existing progression path. We're not looking to make the game easier or create power creep."
              />
              <ExpectationItem
                title="Active Development"
                description="Regular updates bring new content and improvements. We're committed to long-term development and responding to community feedback."
              />
              <ExpectationItem
                title="Stable Experience"
                description="Built on AzerothCore, a proven and well-maintained emulator. We prioritize stability and a smooth playing experience."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Technical Info */}
      <section className="py-16 bg-card/30 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Technical Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard label="Game Version" value="WotLK 3.3.5a (12340)" />
              <InfoCard label="Server Core" value="AzerothCore" />
              <InfoCard label="Experience Rate" value="2.5x" />
              <InfoCard label="Server Location" value="Western US" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="bg-card/50">
      <CardHeader>
        <div className="text-primary mb-2">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

function ExpectationItem({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="border-l-2 border-primary/50 pl-4">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  )
}
