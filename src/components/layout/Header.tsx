import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Menu, X, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/lib/config'
import { useAuth } from '@/lib/auth-context'
import { AtlasLogo } from '@/components/icons/AtlasLogo'
import { ServerStatusWidget } from '@/components/widgets'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, loading, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <AtlasLogo size={32} className="text-primary" />
          <span className="text-xl font-bold text-primary">
            {siteConfig.name}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {siteConfig.nav.main.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              activeProps={{
                className: 'text-sm font-medium text-primary',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop: Server Status + Theme + Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {/* Server Status */}
          <ServerStatusWidget compact showPlayerCount={true} />

          <div className="h-4 w-px bg-border" />

          {/* Theme Toggle */}
          <ThemeToggle />

          <div className="h-4 w-px bg-border" />

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-9 w-20 bg-muted/50 rounded-md animate-pulse" />
          ) : user ? (
            <>
              <Button variant="ghost" asChild>
                <Link to="/account">
                  <User className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden border-t border-border bg-background overflow-hidden transition-all duration-200',
          mobileMenuOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
          {/* Mobile Server Status */}
          <div className="py-2 mb-2 border-b border-border">
            <ServerStatusWidget compact showPlayerCount={true} />
          </div>

          {siteConfig.nav.main.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="py-2 text-sm font-medium text-muted-foreground hover:text-primary"
              activeProps={{
                className: 'py-2 text-sm font-medium text-primary',
              }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          {/* Theme Toggle in Mobile */}
          <div className="flex items-center justify-between py-2 border-t border-border mt-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>

          <div className="flex flex-col gap-2 pt-4 border-t border-border">
            {loading ? (
              <div className="h-9 w-full bg-muted/50 rounded-md animate-pulse" />
            ) : user ? (
              <>
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/account" onClick={() => setMobileMenuOpen(false)}>
                    <User className="mr-2 h-4 w-4" />
                    Account
                  </Link>
                </Button>
                <Button variant="outline" onClick={handleSignOut} className="justify-start">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                    Login
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    Register
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
