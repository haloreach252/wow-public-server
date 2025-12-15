import { Link } from '@tanstack/react-router'
import { Home, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AtlasLogo } from '@/components/icons/AtlasLogo'
import { siteConfig } from '@/lib/config'

export function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
      <AtlasLogo size={64} className="text-primary mb-6 opacity-50" />

      <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>

      <p className="text-muted-foreground text-center max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved.
        Perhaps you took a wrong turn in the Twisting Nether?
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/content" search={{ type: undefined, page: 1 }}>
            <Search className="mr-2 h-4 w-4" />
            Browse Content
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mt-8">
        Need help? Check out our{' '}
        <Link to="/download" className="text-primary hover:underline">
          download page
        </Link>{' '}
        or{' '}
        <Link to="/about" className="text-primary hover:underline">
          learn more about {siteConfig.name}
        </Link>
        .
      </p>
    </div>
  )
}
