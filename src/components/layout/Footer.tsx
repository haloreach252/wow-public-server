import { Link } from '@tanstack/react-router'
import { Sword } from 'lucide-react'
import { siteConfig } from '@/lib/config'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo and Name */}
          <div className="flex items-center gap-2">
            <Sword className="h-6 w-6 text-primary" />
            <span className="font-semibold text-primary">{siteConfig.name}</span>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
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

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} {siteConfig.name}. Not affiliated with Blizzard Entertainment.
          </p>
        </div>
      </div>
    </footer>
  )
}
