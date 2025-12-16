import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Compass,
  Download,
  Globe,
  Heart,
  Map,
  MapPin,
  Scroll,
  Shield,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ContentCard } from '@/components/content'
import { ContentCardSkeleton } from '@/components/ui/skeletons'
import { getLatestContent, type ContentListResult } from '@/lib/content'
import { AtlasLogo } from '@/components/icons/AtlasLogo'

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
            <AtlasLogo size={80} className="text-primary" />
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Azeroth is Bigger Than You Remember.
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-2">
            A WotLK 3.3.5a Classic+ Server.
          </p>

          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Chart new lands, survive the Fallowlands, and rediscover the joy of
            the journey.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register">
                <Compass className="mr-2 h-5 w-5" />
                Join the Expedition
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/download">
                <Download className="mr-2 h-5 w-5" />
                Download Client
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Play Here?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A New Horizon for Classic WoW
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Map className="h-8 w-8" />}
              title="Uncharted Territories"
              description="We don't just retread old ground. Explore entirely new zones like The Fallowlands—a war-torn expansion to Tirisfal Glades where the Scarlet Crusade makes its last stand."
            />
            <FeatureCard
              icon={<MapPin className="h-8 w-8" />}
              title="The Missing Pieces"
              description={`Our "Reimagined Zones" aren't total overhauls—they are restorations. We fill in the blank spaces on the map with lore-accurate quests and locations that Blizzard left unfinished.`}
            />
            <FeatureCard
              icon={<Compass className="h-8 w-8" />}
              title="The 2.5x Sweet Spot"
              description="Experience rates are tuned to 2.5x. It's fast enough to respect your time, but slow enough that you'll still need to explore the world, upgrade your gear, and learn your class."
            />
            <FeatureCard
              icon={<Globe className="h-8 w-8" />}
              title="Western US Hosting"
              description="Say goodbye to high latency. Project Atlas is hosted in the Western United States, providing a smooth, lag-free connection for North American adventurers."
            />
            <FeatureCard
              icon={<Heart className="h-8 w-8" />}
              title="Passion Over Profit"
              description={`Project Atlas is a labor of love, not a business. We are a community-focused project dedicated to preserving the "World" in World of Warcraft, free from pay-to-win mechanics.`}
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="The 3.3.5a Foundation"
              description="Built on the rock-solid AzerothCore and the beloved Wrath of the Lich King client (12340). You get the polished mechanics of the golden era with fresh adventures."
            />
          </div>
        </div>
      </section>

      {/* Latest News Section */}
      <LatestNewsSection />

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            The Map is Waiting to be Drawn.
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Your character is ready. The world is new. Are you?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/register">
                <Users className="mr-2 h-5 w-5" />
                Create Account
              </Link>
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

function LatestNewsSection() {
  const { data, isLoading } = useQuery<ContentListResult>({
    queryKey: ['content', 'latest'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => (getLatestContent as any)({ data: { limit: 3, types: ['blog', 'release'] } }),
    staleTime: 60000, // Consider fresh for 1 minute
  })

  const content = data?.content ?? []
  const hasContent = content.length > 0

  return (
    <section className="py-16 md:py-24 bg-card/30 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">The Captain's Log</h2>
          <p className="text-muted-foreground">
            Blog posts, release notes, and wiki updates.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <ContentCardSkeleton key={i} />
            ))}
          </div>
        ) : hasContent ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {content.map((item) => (
                <ContentCard
                  key={item.id}
                  type={item.type}
                  slug={item.slug}
                  title={item.title}
                  summary={item.summary}
                  featuredImage={item.featuredImage}
                  authorName={item.authorName}
                  publishedAt={item.publishedAt}
                />
              ))}
            </div>
            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <Link to="/content" search={{ type: undefined, page: 1 }}>
                  View All Updates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="max-w-3xl mx-auto">
            <Card className="bg-muted/50">
              <CardContent className="py-12 text-center">
                <Scroll className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No news yet. Check back soon for updates!
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </section>
  )
}
