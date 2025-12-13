import { createFileRoute, Link } from '@tanstack/react-router'
import { Sword, Download, Users, Scroll, Shield, Map, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServerStatusWidget } from '@/components/widgets'
import { siteConfig } from '@/lib/config'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

        <div className="container relative mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <Sword className="h-16 w-16 md:h-20 md:w-20 text-primary" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-primary">{siteConfig.name}</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            {siteConfig.tagline}
          </p>

          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {siteConfig.description}. Explore new content, reimagined zones, and
            a fresh take on the classic WotLK experience.
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

      {/* Server Status Widget */}
      <section className="py-8 border-y border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4">
            <ServerStatusWidget showPlayerCount={true} showUptime={false} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Play Here?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're building a unique Classic+ experience with new content while
              preserving the spirit of WotLK.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="New Content"
              description="Custom quests, items, and zones that expand the world you love while staying true to the original vision."
            />
            <FeatureCard
              icon={<Map className="h-8 w-8" />}
              title="Reimagined Zones"
              description="Familiar places with new secrets to discover. Explore Azeroth like never before."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Balanced Gameplay"
              description="Careful tuning ensures a challenging but fair experience for all players."
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Active Community"
              description="Join a dedicated community of players who share your passion for classic WoW."
            />
            <FeatureCard
              icon={<Scroll className="h-8 w-8" />}
              title="Regular Updates"
              description="New content and improvements are released regularly to keep the experience fresh."
            />
            <FeatureCard
              icon={<Sword className="h-8 w-8" />}
              title="WotLK 3.3.5a"
              description="Built on the beloved Wrath of the Lich King expansion, the pinnacle of classic WoW."
            />
          </div>
        </div>
      </section>

      {/* Latest News Section */}
      <section className="py-16 md:py-24 bg-card/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Latest News</h2>
            <p className="text-muted-foreground">
              Stay up to date with server announcements and development updates.
            </p>
          </div>

          {/* Placeholder for news - will be dynamic later */}
          <div className="max-w-3xl mx-auto">
            <Card className="bg-muted/50">
              <CardContent className="py-12 text-center">
                <Scroll className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  News and announcements will appear here once the content system is ready.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Begin?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Create your account today and start your adventure in our reimagined Azeroth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Card className="bg-card/50 hover:bg-card/80 transition-colors">
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
