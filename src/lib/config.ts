/**
 * Site Configuration
 * Easy to change branding and site settings
 */

export const siteConfig = {
  // Server name - change this when you decide on a name
  name: 'Server Name TBD',
  // Short description for meta tags
  description: 'A WotLK 3.3.5a Classic+ Private Server',
  // Tagline for the homepage hero
  tagline: 'Experience Azeroth Reimagined',
  // Navigation links
  nav: {
    main: [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Download', href: '/download' },
    ],
    auth: [
      { label: 'Login', href: '/login' },
      { label: 'Register', href: '/register' },
    ],
  },
  // External links
  links: {
    // Where to direct users for the WoW client
    clientDownload: 'https://example.com/wow-client',
  },
  // Feature flags
  features: {
    // Enable/disable features as they're built
    forums: false,
    armory: false,
  },
} as const

export type SiteConfig = typeof siteConfig
