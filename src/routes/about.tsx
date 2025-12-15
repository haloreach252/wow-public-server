import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Compass,
  Shield,
  Clock,
  Globe,
  BookOpen,
  Heart,
  Download,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { siteConfig } from '@/lib/config'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: `About | ${siteConfig.name}` },
      {
        name: 'description',
        content: `Learn about ${siteConfig.name}, a WotLK 3.3.5a Classic+ realm dedicated to charting the unknown and filling in the blank spaces on the map.`,
      },
      { property: 'og:title', content: `About | ${siteConfig.name}` },
      {
        property: 'og:description',
        content: `Learn about ${siteConfig.name}, a WotLK 3.3.5a Classic+ realm dedicated to charting the unknown and filling in the blank spaces on the map.`,
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
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto italic">
            Azeroth is bigger than you remember.
          </p>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Our Vision</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                {siteConfig.name} is a WotLK 3.3.5a realm dedicated to the "Classic+"
                philosophy. But for us, "Plus" doesn't just mean more raids or custom
                items—it means charting the unknown.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We believe the era before the Cataclysm held infinite potential that was
                left unexplored. Our goal is to fill in the blank spaces on the map. We
                are building new landmasses, opening locked gates, and telling the stories
                that Blizzard left unfinished, all while preserving the mechanics and feel
                of the 3.3.5a era.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Atlas Experience Section */}
      <section className="py-16 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">The Atlas Experience</h2>
            <p className="text-muted-foreground mb-10">
              We aren't rushing you to the endgame. {siteConfig.name} is designed for
              the player who misses the journey.
            </p>

            <div className="space-y-10">
              <ExperienceItem
                icon={<Compass className="h-6 w-6" />}
                title="Explore the Uncharted"
                description="We are actively developing new zones that fit seamlessly into the lore."
              >
                <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm font-semibold text-primary mb-1">
                    Coming Soon: The Fallowlands
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Venture north of Tirisfal Glades into a war-torn territory where the
                    Scarlet Crusade makes its desperate stand against the Scourge.
                  </p>
                </div>
              </ExperienceItem>

              <ExperienceItem
                icon={<Shield className="h-6 w-6" />}
                title="Respecting the Era"
                description="We use the standard 3.3.5a talent trees you know and love. However, we have tuned individual progression to ensure that Vanilla and TBC content feels distinct and challenging, rather than just a hurdle to jump over."
              />

              <ExperienceItem
                icon={<Clock className="h-6 w-6" />}
                title='The "Sweet Spot" Pace'
                description="We've set the Experience Rate to 2.5x. This is a deliberate choice. It is fast enough to respect your time, but slow enough that you still travel the world, upgrade your gear, and feel the weight of your journey."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <ValueCard
              icon={<Globe className="h-8 w-8" />}
              title="The World is the Main Character"
              description="Many servers focus entirely on what happens at Level 80. We focus on what happens between Level 1 and 80. We want Azeroth to feel alive, dangerous, and worth exploring again."
            />
            <ValueCard
              icon={<BookOpen className="h-8 w-8" />}
              title="Immersive Expansion"
              description="Every addition—from a new questline to a new continent—is checked against the lore. If it doesn't feel like it belongs in the WotLK era, it doesn't make the cut."
            />
            <ValueCard
              icon={<Heart className="h-8 w-8" />}
              title="Built for the Community"
              description={`Project Atlas started as a solo passion project by a lifelong fan who grew up in the shadow of the Lich King. It is built to be a cozy, stable home for players who want to escape the "pay-to-win" and "fun-server" mentality.`}
            />
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

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Begin Your Adventure?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Create your account today and explore a reimagined Azeroth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register">
                <Users className="mr-2 h-5 w-5" />
                Create Account
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/download">
                <Download className="mr-2 h-5 w-5" />
                Download
              </Link>
            </Button>
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

function ExperienceItem({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="text-primary flex-shrink-0 mt-1">{icon}</div>
      <div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        {children}
      </div>
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
