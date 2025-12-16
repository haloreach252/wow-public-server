# UI/UX Implementation Guide

This document contains all UI/UX improvements to be implemented on the public site.

## Overview

| Priority | Task | Effort |
|----------|------|--------|
| P1 | Session expiry warnings | Low |
| P1 | Admin user search/filter | Medium |
| P1 | Bulk admin actions | Medium |
| P2 | Mobile navigation improvements | Low |
| P2 | Standardize loading states (skeletons) | Medium |
| P2 | Inline form validation | Medium |
| P2 | Download SHA256 verification UI | Low |
| P2 | Theme support (dark/light mode) | Medium |
| P2 | Content summary truncation | Low |

**Note:** Email notifications for tester requests will be implemented on the admin panel side. See `ADMIN_PANEL_EMAIL_NOTIFICATIONS.md`.

---

## P1-1: Session Expiry Warnings

**Purpose:** Warn users before their session expires so they can take action.

### Create Session Warning Component

**New File:** `src/components/auth/SessionExpiryWarning.tsx`

```tsx
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Clock, RefreshCw } from 'lucide-react'

const WARNING_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes before expiry

export function SessionExpiryWarning() {
  const { sessionExpiresAt, refreshUser, user } = useAuth()
  const [hasWarned, setHasWarned] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!sessionExpiresAt || !user) return

    const checkExpiry = () => {
      const now = Math.floor(Date.now() / 1000)
      const timeRemaining = sessionExpiresAt - now
      const timeRemainingMs = timeRemaining * 1000

      // Warn when less than 5 minutes remaining
      if (timeRemainingMs <= WARNING_THRESHOLD_MS && timeRemainingMs > 0 && !hasWarned) {
        setHasWarned(true)
        toast.warning(
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Your session expires in {Math.ceil(timeRemaining / 60)} minutes</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Extend Session
            </Button>
          </div>,
          {
            duration: Infinity, // Don't auto-dismiss
            id: 'session-expiry-warning',
          }
        )
      }
    }

    // Check immediately and then every 30 seconds
    checkExpiry()
    const interval = setInterval(checkExpiry, 30000)

    return () => clearInterval(interval)
  }, [sessionExpiresAt, user, hasWarned])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshUser()
      toast.dismiss('session-expiry-warning')
      toast.success('Session extended')
      setHasWarned(false)
    } catch {
      toast.error('Failed to extend session. Please log in again.')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Reset warning state when session is refreshed
  useEffect(() => {
    if (sessionExpiresAt) {
      const now = Math.floor(Date.now() / 1000)
      const timeRemainingMs = (sessionExpiresAt - now) * 1000
      if (timeRemainingMs > WARNING_THRESHOLD_MS) {
        setHasWarned(false)
      }
    }
  }, [sessionExpiresAt])

  return null // This component only manages side effects
}
```

### Add to Root Layout

**File:** `src/routes/__root.tsx`

Add the component inside the auth provider:

```tsx
import { SessionExpiryWarning } from '@/components/auth/SessionExpiryWarning'

// In the component, add after AuthProvider opens:
<AuthProvider>
  <SessionExpiryWarning />
  {/* ... rest of layout */}
</AuthProvider>
```

---

## P1-2: Admin User Search/Filter

**File:** `src/routes/admin/users.tsx`

### Add Search State and Input

Add to the `AdminUsersContent` component:

```tsx
const [searchQuery, setSearchQuery] = useState('')
const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')

// Filter users based on search and role
const filteredUsers = users.filter(user => {
  const matchesSearch = searchQuery === '' ||
    user.supabaseUserId.toLowerCase().includes(searchQuery.toLowerCase())
  const matchesRole = roleFilter === 'all' || user.role === roleFilter
  return matchesSearch && matchesRole
})
```

### Add Search UI

Add this above the users table (around line 317):

```tsx
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

// In the CardHeader of the Users tab:
<CardHeader>
  <div className="flex flex-col sm:flex-row justify-between gap-4">
    <div>
      <CardTitle>User Roles</CardTitle>
      <CardDescription>
        View and manage user roles and environment access
      </CardDescription>
    </div>
    <div className="flex gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 w-64"
        />
      </div>
      <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | 'all')}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Filter role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="tester">Tester</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</CardHeader>
```

### Update Table to Use Filtered Users

Change the table body to use `filteredUsers` instead of `users`:

```tsx
<TableBody>
  {filteredUsers.map((user) => (
    // ... existing row content
  ))}
</TableBody>
```

### Add No Results Message

```tsx
{filteredUsers.length === 0 ? (
  <p className="text-muted-foreground text-center py-8">
    {searchQuery || roleFilter !== 'all'
      ? 'No users match your filters'
      : 'No users found'}
  </p>
) : (
  <Table>
    {/* ... table content */}
  </Table>
)}
```

---

## P1-3: Bulk Admin Actions

**File:** `src/routes/admin/users.tsx`

### Add Selection State

```tsx
const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set())
const [bulkLoading, setBulkLoading] = useState(false)

const toggleRequestSelection = (id: string) => {
  setSelectedRequests(prev => {
    const next = new Set(prev)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    return next
  })
}

const toggleAllRequests = () => {
  if (selectedRequests.size === pendingRequests.length) {
    setSelectedRequests(new Set())
  } else {
    setSelectedRequests(new Set(pendingRequests.map(r => r.id)))
  }
}
```

### Add Bulk Action Handlers

```tsx
const handleBulkApprove = async (envs: string[]) => {
  if (selectedRequests.size === 0) return
  setBulkLoading(true)

  const session = await getSession()
  if (!session?.access_token) {
    toast.error('Not authenticated')
    setBulkLoading(false)
    return
  }

  let successCount = 0
  let failCount = 0

  for (const requestId of selectedRequests) {
    const result = await reviewTesterRequest({
      data: {
        adminAccessToken: session.access_token,
        requestId,
        approved: true,
        allowedEnvs: envs,
      },
    })
    if (result.success) {
      successCount++
    } else {
      failCount++
    }
  }

  if (successCount > 0) {
    toast.success(`Approved ${successCount} request(s)`)
  }
  if (failCount > 0) {
    toast.error(`Failed to approve ${failCount} request(s)`)
  }

  setSelectedRequests(new Set())
  await loadData()
  setBulkLoading(false)
}

const handleBulkDeny = async () => {
  if (selectedRequests.size === 0) return
  setBulkLoading(true)

  const session = await getSession()
  if (!session?.access_token) {
    toast.error('Not authenticated')
    setBulkLoading(false)
    return
  }

  let successCount = 0
  let failCount = 0

  for (const requestId of selectedRequests) {
    const result = await reviewTesterRequest({
      data: {
        adminAccessToken: session.access_token,
        requestId,
        approved: false,
      },
    })
    if (result.success) {
      successCount++
    } else {
      failCount++
    }
  }

  if (successCount > 0) {
    toast.success(`Denied ${successCount} request(s)`)
  }
  if (failCount > 0) {
    toast.error(`Failed to deny ${failCount} request(s)`)
  }

  setSelectedRequests(new Set())
  await loadData()
  setBulkLoading(false)
}
```

### Add Bulk Action UI

Add above the requests table:

```tsx
{pendingRequests.length > 0 && (
  <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
    <div className="flex items-center gap-2">
      <Checkbox
        checked={selectedRequests.size === pendingRequests.length && pendingRequests.length > 0}
        onCheckedChange={toggleAllRequests}
      />
      <span className="text-sm text-muted-foreground">
        {selectedRequests.size > 0
          ? `${selectedRequests.size} selected`
          : 'Select all'}
      </span>
    </div>
    {selectedRequests.size > 0 && (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkDeny}
          disabled={bulkLoading}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Deny Selected
        </Button>
        <Button
          size="sm"
          onClick={() => handleBulkApprove(['dev'])}
          disabled={bulkLoading}
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Approve Selected (dev)
        </Button>
      </div>
    )}
  </div>
)}
```

### Add Checkbox to Each Row

Update `RequestRow` to include selection checkbox:

```tsx
function RequestRow({
  request,
  onReview,
  isLoading,
  isSelected,
  onToggleSelect,
}: {
  request: TesterRequest
  onReview: (id: string, approved: boolean, envs?: string[]) => void
  isLoading: boolean
  isSelected: boolean
  onToggleSelect: () => void
}) {
  // ... existing state

  return (
    <TableRow>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          disabled={isLoading}
        />
      </TableCell>
      {/* ... rest of cells */}
    </TableRow>
  )
}
```

---

## P2-1: Mobile Navigation Improvements

**File:** `src/components/layout/Header.tsx`

### Add Smooth Transitions

Update the mobile menu to have better transitions:

```tsx
import { cn } from '@/lib/utils'

// Replace the mobile menu conditional render with:
<div
  className={cn(
    'md:hidden border-t border-border bg-background overflow-hidden transition-all duration-200',
    mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
  )}
>
  <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
    {/* ... menu content */}
  </nav>
</div>
```

### Keep Menu State on Route Change (Optional)

If you want the menu to stay open during navigation within certain sections:

```tsx
import { useLocation } from '@tanstack/react-router'

const location = useLocation()

// Close menu only when navigating to a different section
useEffect(() => {
  // Only auto-close when leaving certain routes
  if (!location.pathname.startsWith('/account')) {
    setMobileMenuOpen(false)
  }
}, [location.pathname])
```

---

## P2-2: Standardize Loading States (Skeletons)

### Create Reusable Skeleton Components

**New File:** `src/components/ui/skeletons.tsx`

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </CardContent>
    </Card>
  )
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}

export function ContentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}
```

### Update Components to Use Skeletons

**Example: Account Dashboard (`src/routes/account/index.tsx`)**

Replace spinner loading states with skeletons:

```tsx
import { CardSkeleton, DashboardSkeleton } from '@/components/ui/skeletons'

// In the component:
if (loadingGameAccount) {
  return <CardSkeleton />
}
```

**Example: Admin Users Page**

```tsx
if (loading) {
  return (
    <div className="container mx-auto px-4 py-8">
      <DashboardSkeleton />
    </div>
  )
}
```

### Files to Update

Replace spinner loading states with appropriate skeletons in:
- `src/routes/account/index.tsx`
- `src/routes/account/settings.tsx`
- `src/routes/account/game.tsx`
- `src/routes/admin/users.tsx`
- `src/routes/content/index.tsx`
- `src/components/widgets/ServerStatusWidget.tsx`

---

## P2-3: Inline Form Validation

### Create Validation Hook

**New File:** `src/hooks/useFormValidation.ts`

```tsx
import { useState, useCallback } from 'react'

interface ValidationRule {
  validate: (value: string) => boolean
  message: string
}

interface FieldValidation {
  rules: ValidationRule[]
  validateOnBlur?: boolean
  validateOnChange?: boolean
}

interface UseFormValidationOptions {
  fields: Record<string, FieldValidation>
}

export function useFormValidation({ fields }: UseFormValidationOptions) {
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback((name: string, value: string): string | null => {
    const field = fields[name]
    if (!field) return null

    for (const rule of field.rules) {
      if (!rule.validate(value)) {
        return rule.message
      }
    }
    return null
  }, [fields])

  const handleBlur = useCallback((name: string, value: string) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }, [validateField])

  const handleChange = useCallback((name: string, value: string) => {
    const field = fields[name]
    if (field?.validateOnChange || touched[name]) {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error }))
    }
  }, [fields, touched, validateField])

  const validateAll = useCallback((values: Record<string, string>): boolean => {
    const newErrors: Record<string, string | null> = {}
    let isValid = true

    for (const [name, value] of Object.entries(values)) {
      const error = validateField(name, value)
      newErrors[name] = error
      if (error) isValid = false
    }

    setErrors(newErrors)
    setTouched(Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}))
    return isValid
  }, [validateField])

  const clearErrors = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  return {
    errors,
    touched,
    handleBlur,
    handleChange,
    validateAll,
    clearErrors,
    getFieldError: (name: string) => touched[name] ? errors[name] : null,
  }
}
```

### Create Inline Error Component

**New File:** `src/components/ui/form-error.tsx`

```tsx
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface FormErrorProps {
  error?: string | null
  className?: string
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-destructive mt-1', className)}>
      <AlertCircle className="h-3 w-3" />
      <span>{error}</span>
    </div>
  )
}
```

### Example Usage in Game Account Page

**File:** `src/routes/account/game.tsx`

```tsx
import { useFormValidation } from '@/hooks/useFormValidation'
import { FormError } from '@/components/ui/form-error'

// In component:
const { errors, handleBlur, handleChange, validateAll, getFieldError } = useFormValidation({
  fields: {
    username: {
      rules: [
        { validate: v => v.length >= 3, message: 'Username must be at least 3 characters' },
        { validate: v => v.length <= 17, message: 'Username must be at most 17 characters' },
        { validate: v => /^[a-zA-Z0-9]+$/.test(v), message: 'Only letters and numbers allowed' },
      ],
    },
    password: {
      rules: [
        { validate: v => v.length >= 6, message: 'Password must be at least 6 characters' },
        { validate: v => v.length <= 16, message: 'Password must be at most 16 characters' },
      ],
    },
  },
})

// In the form:
<div className="space-y-2">
  <Label htmlFor="username">Username</Label>
  <Input
    id="username"
    value={username}
    onChange={(e) => {
      setUsername(e.target.value)
      handleChange('username', e.target.value)
    }}
    onBlur={() => handleBlur('username', username)}
    className={getFieldError('username') ? 'border-destructive' : ''}
  />
  <FormError error={getFieldError('username')} />
</div>
```

---

## P2-4: Download SHA256 Verification UI

**File:** `src/routes/download.tsx`

### Add Verification Feature

Update the `PatcherDownloadCard` component:

```tsx
function PatcherDownloadCard() {
  const [copied, setCopied] = useState(false)
  const [userHash, setUserHash] = useState('')
  const [verificationResult, setVerificationResult] = useState<'match' | 'mismatch' | null>(null)

  // ... existing query code ...

  const copyChecksum = async () => {
    if (patcherInfo?.sha256) {
      await navigator.clipboard.writeText(patcherInfo.sha256)
      setCopied(true)
      toast.success('Checksum copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const verifyHash = () => {
    if (!patcherInfo?.sha256 || !userHash.trim()) return

    const normalizedUser = userHash.trim().toLowerCase()
    const normalizedExpected = patcherInfo.sha256.toLowerCase()

    if (normalizedUser === normalizedExpected) {
      setVerificationResult('match')
      toast.success('Checksum verified! File is authentic.')
    } else {
      setVerificationResult('mismatch')
      toast.error('Checksum mismatch! File may be corrupted or tampered with.')
    }
  }

  return (
    <Card className="bg-muted/30 border-border">
      <CardContent className="py-4 space-y-4">
        {/* ... existing download button section ... */}

        {/* Checksum verification */}
        {patcherInfo?.sha256 && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Verify Download (SHA-256)</span>
            </div>

            {/* Expected hash display */}
            <div className="flex items-center gap-2 mb-3">
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

            {/* Verification input */}
            <div className="space-y-2">
              <Label htmlFor="verify-hash" className="text-xs">
                Paste your file's SHA-256 hash to verify:
              </Label>
              <div className="flex gap-2">
                <Input
                  id="verify-hash"
                  placeholder="Paste hash here..."
                  value={userHash}
                  onChange={(e) => {
                    setUserHash(e.target.value)
                    setVerificationResult(null)
                  }}
                  className={cn(
                    'font-mono text-xs',
                    verificationResult === 'match' && 'border-green-500',
                    verificationResult === 'mismatch' && 'border-destructive'
                  )}
                />
                <Button
                  size="sm"
                  onClick={verifyHash}
                  disabled={!userHash.trim()}
                >
                  Verify
                </Button>
              </div>
              {verificationResult === 'match' && (
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  File verified - checksum matches!
                </p>
              )}
              {verificationResult === 'mismatch' && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Checksum mismatch - do not run this file!
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              To get your file's hash on Windows, run in PowerShell: <code className="bg-muted px-1 rounded">Get-FileHash filename.exe</code>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## P2-5: Theme Support (Dark/Light Mode)

### Step 1: Create Theme Provider

**New File:** `src/lib/theme-context.tsx`

```tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'dark' | 'light'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'atlas-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const root = window.document.documentElement

    const updateTheme = () => {
      let resolved: 'dark' | 'light'

      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } else {
        resolved = theme
      }

      setResolvedTheme(resolved)
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
    }

    updateTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', updateTheme)

    return () => mediaQuery.removeEventListener('change', updateTheme)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme)
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
```

### Step 2: Create Theme Toggle Component

**New File:** `src/components/ui/theme-toggle.tsx`

```tsx
import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/lib/theme-context'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          {resolvedTheme === 'dark' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          Light
          {theme === 'light' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
          {theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          System
          {theme === 'system' && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Step 3: Add to Root Layout

**File:** `src/routes/__root.tsx`

```tsx
import { ThemeProvider } from '@/lib/theme-context'

// Wrap the app:
<ThemeProvider>
  <AuthProvider>
    {/* ... */}
  </AuthProvider>
</ThemeProvider>
```

### Step 4: Add Toggle to Header

**File:** `src/components/layout/Header.tsx`

```tsx
import { ThemeToggle } from '@/components/ui/theme-toggle'

// In the desktop auth buttons area (around line 51):
<div className="h-4 w-px bg-border" />
<ThemeToggle />
<div className="h-4 w-px bg-border" />

// In the mobile menu (around line 115):
<div className="flex items-center justify-between py-2">
  <span className="text-sm text-muted-foreground">Theme</span>
  <ThemeToggle />
</div>
```

### Step 5: Update Tailwind Config

**File:** `tailwind.config.ts`

Ensure dark mode is set to 'class':

```typescript
export default {
  darkMode: 'class',
  // ... rest of config
}
```

---

## P2-6: Content Summary Truncation

**File:** `src/components/content/ContentCard.tsx`

### Add Proper Text Truncation

```tsx
import { cn } from '@/lib/utils'

// In the component:
<p className={cn(
  'text-sm text-muted-foreground',
  'line-clamp-2' // Tailwind's built-in line clamping
)}>
  {summary}
</p>
```

If `line-clamp` isn't working, ensure the Tailwind plugin is enabled or use:

```tsx
<p className="text-sm text-muted-foreground overflow-hidden" style={{
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
}}>
  {summary}
</p>
```

### Alternative: Custom Truncate Component

**New File:** `src/components/ui/truncate.tsx`

```tsx
interface TruncateProps {
  children: string
  lines?: number
  className?: string
}

export function Truncate({ children, lines = 2, className }: TruncateProps) {
  return (
    <p
      className={className}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: lines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {children}
    </p>
  )
}
```

---

## Testing Checklist

After implementing all changes:

- [ ] Session expiry warning appears 5 minutes before expiry
- [ ] Session can be extended via warning toast
- [ ] Admin user search filters correctly
- [ ] Admin role filter works
- [ ] Bulk select/deselect works for tester requests
- [ ] Bulk approve/deny processes all selected requests
- [ ] Mobile menu animates smoothly
- [ ] All loading states use skeletons (not spinners)
- [ ] Form fields show inline validation errors on blur
- [ ] Download page hash verification works
- [ ] Theme toggle switches between light/dark/system
- [ ] Theme preference persists across page loads
- [ ] Content summaries are properly truncated

---

## File Summary

### New Files to Create
- `src/components/auth/SessionExpiryWarning.tsx`
- `src/components/ui/skeletons.tsx`
- `src/components/ui/form-error.tsx`
- `src/components/ui/theme-toggle.tsx`
- `src/components/ui/truncate.tsx`
- `src/hooks/useFormValidation.ts`
- `src/lib/theme-context.tsx`

### Files to Modify
- `src/routes/__root.tsx` - Add SessionExpiryWarning and ThemeProvider
- `src/routes/admin/users.tsx` - Add search, filter, bulk actions
- `src/routes/download.tsx` - Add hash verification UI
- `src/routes/account/index.tsx` - Use skeletons
- `src/routes/account/settings.tsx` - Use skeletons
- `src/routes/account/game.tsx` - Use skeletons, inline validation
- `src/components/layout/Header.tsx` - Add theme toggle
- `src/components/content/ContentCard.tsx` - Fix truncation
- `tailwind.config.ts` - Ensure darkMode: 'class'
