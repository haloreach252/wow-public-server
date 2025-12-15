import { Link } from '@tanstack/react-router'
import { siteConfig } from '@/lib/config'
import { AtlasLogo } from '@/components/icons/AtlasLogo'

// Discord icon component (Lucide doesn't have Discord)
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  )
}

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <AtlasLogo size={32} className="text-primary" />
              <span className="text-xl font-bold text-primary">{siteConfig.name}</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {siteConfig.description}. Explore new content, reimagined zones, and a fresh take on
              the classic WotLK experience.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="p-2 rounded-md bg-muted/50 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                title="Join our Discord (Coming Soon)"
              >
                <DiscordIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <nav className="flex flex-col gap-2">
              {siteConfig.nav.main.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Get Started */}
          <div>
            <h3 className="font-semibold mb-4">Get Started</h3>
            <nav className="flex flex-col gap-2">
              <Link
                to="/register"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Create Account
              </Link>
              <Link
                to="/download"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Download Patcher
              </Link>
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Sign In
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            &copy; {currentYear} {siteConfig.name}. Not affiliated with Blizzard Entertainment.
          </p>
          <p className="text-xs text-muted-foreground/60">
            World of Warcraft and Blizzard Entertainment are trademarks of Blizzard Entertainment, Inc.
          </p>
        </div>
      </div>
    </footer>
  )
}
