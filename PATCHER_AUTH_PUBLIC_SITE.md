# Patcher Authentication - Public Site Implementation

This document details the implementation required in the public site (`wow-public-server`) to support patcher authentication, user roles, and tester requests.

## Overview

The public site needs to:
1. Add a user roles system (user, tester, admin)
2. Expose authentication API endpoints for the patcher
3. Allow users to request tester access
4. Allow admins to manage user roles

---

## Phase 1: Database Schema Updates

### File: `prisma/schema.prisma`

Add the following models after the existing models:

```prisma
// User roles for patcher access control
enum Role {
  user    // Default - can only access live environment
  tester  // Can access assigned environments
  admin   // Can access all environments and manage roles
}

enum RequestStatus {
  pending
  approved
  denied
}

// Tracks user roles and environment access
model UserRole {
  id             String   @id @default(cuid())
  supabaseUserId String   @unique @map("supabase_user_id")
  role           Role     @default(user)
  allowedEnvs    String[] @default([]) // For testers: ["dev", "test"]
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("user_roles")
}

// Tester access requests
model TesterRequest {
  id             String        @id @default(cuid())
  supabaseUserId String        @unique @map("supabase_user_id")
  email          String
  reason         String?       @db.Text
  status         RequestStatus @default(pending)
  reviewedBy     String?       @map("reviewed_by") // Admin's supabase user ID
  reviewedAt     DateTime?     @map("reviewed_at")
  createdAt      DateTime      @default(now()) @map("created_at")

  @@index([status, createdAt])
  @@map("tester_requests")
}
```

After updating the schema, run:
```bash
npm run db:migrate
```

---

## Phase 2: User Role Service

### File: `src/lib/user-role.ts` (new file)

```typescript
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { createServerSupabaseClient } from './supabase'
import type { Role } from '@/generated/prisma'

export interface UserRoleInfo {
  role: Role
  allowedEnvs: string[]
}

// Get user role, creating default if not exists
export async function getUserRole(supabaseUserId: string): Promise<UserRoleInfo> {
  let userRole = await db.userRole.findUnique({
    where: { supabaseUserId },
  })

  if (!userRole) {
    // Create default user role
    userRole = await db.userRole.create({
      data: {
        supabaseUserId,
        role: 'user',
        allowedEnvs: [],
      },
    })
  }

  return {
    role: userRole.role,
    allowedEnvs: userRole.allowedEnvs,
  }
}

// Update user role (admin only)
export const updateUserRole = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    adminAccessToken: string
    targetUserId: string
    role: Role
    allowedEnvs?: string[]
  }) => data)
  .handler(async ({ data }) => {
    // Verify admin
    const serverClient = createServerSupabaseClient()
    const { data: adminData, error } = await serverClient.auth.getUser(data.adminAccessToken)

    if (error || !adminData.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminRole = await getUserRole(adminData.user.id)
    if (adminRole.role !== 'admin') {
      return { success: false, error: 'Admin access required' }
    }

    // Update target user's role
    const updated = await db.userRole.upsert({
      where: { supabaseUserId: data.targetUserId },
      update: {
        role: data.role,
        allowedEnvs: data.allowedEnvs ?? [],
      },
      create: {
        supabaseUserId: data.targetUserId,
        role: data.role,
        allowedEnvs: data.allowedEnvs ?? [],
      },
    })

    return { success: true, userRole: updated }
  })

// Get all users with their roles (admin only)
export const listUsersWithRoles = createServerFn({ method: 'POST' })
  .inputValidator((data: { adminAccessToken: string }) => data)
  .handler(async ({ data }) => {
    const serverClient = createServerSupabaseClient()
    const { data: adminData, error } = await serverClient.auth.getUser(data.adminAccessToken)

    if (error || !adminData.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminRole = await getUserRole(adminData.user.id)
    if (adminRole.role !== 'admin') {
      return { success: false, error: 'Admin access required' }
    }

    const users = await db.userRole.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, users }
  })
```

---

## Phase 3: Tester Request Service

### File: `src/lib/tester-request.ts` (new file)

```typescript
import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { createServerSupabaseClient } from './supabase'
import { getUserRole } from './user-role'

// Submit a tester request
export const submitTesterRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    const serverClient = createServerSupabaseClient()
    const { data: userData, error } = await serverClient.auth.getUser(data.accessToken)

    if (error || !userData.user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if already a tester or admin
    const currentRole = await getUserRole(userData.user.id)
    if (currentRole.role !== 'user') {
      return { success: false, error: 'You already have elevated access' }
    }

    // Check for existing pending request
    const existing = await db.testerRequest.findUnique({
      where: { supabaseUserId: userData.user.id },
    })

    if (existing) {
      if (existing.status === 'pending') {
        return { success: false, error: 'You already have a pending request' }
      }
      if (existing.status === 'denied') {
        // Allow resubmission after denial
        await db.testerRequest.delete({ where: { id: existing.id } })
      }
    }

    await db.testerRequest.create({
      data: {
        supabaseUserId: userData.user.id,
        email: userData.user.email!,
        reason: data.reason,
      },
    })

    return { success: true }
  })

// Get pending tester requests (admin only)
export const getPendingRequests = createServerFn({ method: 'POST' })
  .inputValidator((data: { adminAccessToken: string }) => data)
  .handler(async ({ data }) => {
    const serverClient = createServerSupabaseClient()
    const { data: adminData, error } = await serverClient.auth.getUser(data.adminAccessToken)

    if (error || !adminData.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminRole = await getUserRole(adminData.user.id)
    if (adminRole.role !== 'admin') {
      return { success: false, error: 'Admin access required' }
    }

    const requests = await db.testerRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })

    return { success: true, requests }
  })

// Approve or deny tester request (admin only)
export const reviewTesterRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    adminAccessToken: string
    requestId: string
    approved: boolean
    allowedEnvs?: string[]
  }) => data)
  .handler(async ({ data }) => {
    const serverClient = createServerSupabaseClient()
    const { data: adminData, error } = await serverClient.auth.getUser(data.adminAccessToken)

    if (error || !adminData.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminRole = await getUserRole(adminData.user.id)
    if (adminRole.role !== 'admin') {
      return { success: false, error: 'Admin access required' }
    }

    const request = await db.testerRequest.findUnique({
      where: { id: data.requestId },
    })

    if (!request) {
      return { success: false, error: 'Request not found' }
    }

    // Update request status
    await db.testerRequest.update({
      where: { id: data.requestId },
      data: {
        status: data.approved ? 'approved' : 'denied',
        reviewedBy: adminData.user.id,
        reviewedAt: new Date(),
      },
    })

    // If approved, update user role
    if (data.approved) {
      await db.userRole.upsert({
        where: { supabaseUserId: request.supabaseUserId },
        update: {
          role: 'tester',
          allowedEnvs: data.allowedEnvs ?? ['dev'],
        },
        create: {
          supabaseUserId: request.supabaseUserId,
          role: 'tester',
          allowedEnvs: data.allowedEnvs ?? ['dev'],
        },
      })
    }

    return { success: true }
  })

// Get user's own request status
export const getMyTesterRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    const serverClient = createServerSupabaseClient()
    const { data: userData, error } = await serverClient.auth.getUser(data.accessToken)

    if (error || !userData.user) {
      return { success: false, error: 'Unauthorized' }
    }

    const request = await db.testerRequest.findUnique({
      where: { supabaseUserId: userData.user.id },
    })

    return { success: true, request }
  })
```

---

## Phase 4: Patcher Auth API Endpoints

### File: `src/routes/api/patcher/auth/login.ts` (new file)

```typescript
import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserRole } from '@/lib/user-role'

export const APIRoute = createAPIFileRoute('/api/patcher/auth/login')({
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const { email, password } = body

      if (!email || !password) {
        return json({ success: false, error: 'Email and password required' }, { status: 400 })
      }

      const supabase = createServerSupabaseClient()

      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return json({ success: false, error: error.message }, { status: 401 })
      }

      if (!data.user || !data.session) {
        return json({ success: false, error: 'Authentication failed' }, { status: 401 })
      }

      // Get user role
      const roleInfo = await getUserRole(data.user.id)

      return json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: roleInfo.role,
          allowedEnvs: roleInfo.allowedEnvs,
        },
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      })
    } catch (err) {
      console.error('Patcher auth error:', err)
      return json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  },
})
```

### File: `src/routes/api/patcher/auth/refresh.ts` (new file)

```typescript
import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserRole } from '@/lib/user-role'

export const APIRoute = createAPIFileRoute('/api/patcher/auth/refresh')({
  POST: async ({ request }) => {
    try {
      const body = await request.json()
      const { refreshToken } = body

      if (!refreshToken) {
        return json({ success: false, error: 'Refresh token required' }, { status: 400 })
      }

      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      })

      if (error || !data.session) {
        return json({ success: false, error: 'Token refresh failed' }, { status: 401 })
      }

      // Get updated role info
      const roleInfo = await getUserRole(data.user!.id)

      return json({
        success: true,
        user: {
          id: data.user!.id,
          email: data.user!.email,
          role: roleInfo.role,
          allowedEnvs: roleInfo.allowedEnvs,
        },
        session: {
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at,
        },
      })
    } catch (err) {
      console.error('Token refresh error:', err)
      return json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  },
})
```

### File: `src/routes/api/patcher/auth/me.ts` (new file)

```typescript
import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserRole } from '@/lib/user-role'

export const APIRoute = createAPIFileRoute('/api/patcher/auth/me')({
  GET: async ({ request }) => {
    try {
      const authHeader = request.headers.get('Authorization')

      if (!authHeader?.startsWith('Bearer ')) {
        return json({ success: false, error: 'Authorization required' }, { status: 401 })
      }

      const accessToken = authHeader.slice(7)
      const supabase = createServerSupabaseClient()

      const { data, error } = await supabase.auth.getUser(accessToken)

      if (error || !data.user) {
        return json({ success: false, error: 'Invalid token' }, { status: 401 })
      }

      const roleInfo = await getUserRole(data.user.id)

      return json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          role: roleInfo.role,
          allowedEnvs: roleInfo.allowedEnvs,
        },
      })
    } catch (err) {
      console.error('Auth me error:', err)
      return json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
  },
})
```

---

## Phase 5: User Interface Components

### File: `src/routes/account/tester-request.tsx` (new file)

```typescript
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, FlaskConical, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { getSession } from '@/lib/auth'
import { submitTesterRequest, getMyTesterRequest } from '@/lib/tester-request'
import { toast } from 'sonner'

export const Route = createFileRoute('/account/tester-request')({
  component: TesterRequestPage,
})

function TesterRequestPage() {
  return (
    <ProtectedRoute>
      <TesterRequestContent />
    </ProtectedRoute>
  )
}

function TesterRequestContent() {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingRequest, setExistingRequest] = useState<{
    status: string
    createdAt: string
  } | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    async function checkExisting() {
      const session = await getSession()
      if (session?.access_token) {
        const result = await getMyTesterRequest({ data: { accessToken: session.access_token } })
        if (result.success && result.request) {
          setExistingRequest(result.request)
        }
      }
      setCheckingStatus(false)
    }
    checkExisting()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const session = await getSession()
      if (!session?.access_token) {
        toast.error('Please log in again')
        return
      }

      const result = await submitTesterRequest({
        data: { accessToken: session.access_token, reason },
      })

      if (result.success) {
        toast.success('Request submitted! An admin will review it soon.')
        setExistingRequest({ status: 'pending', createdAt: new Date().toISOString() })
      } else {
        toast.error(result.error || 'Failed to submit request')
      }
    } finally {
      setLoading(false)
    }
  }

  if (checkingStatus) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          to="/account"
          className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-2">Request Tester Access</h1>
        <p className="text-muted-foreground">
          Get access to development and test environments
        </p>
      </div>

      <div className="max-w-2xl">
        {existingRequest ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {existingRequest.status === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
                {existingRequest.status === 'approved' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {existingRequest.status === 'denied' && <XCircle className="h-5 w-5 text-red-500" />}
                Request {existingRequest.status.charAt(0).toUpperCase() + existingRequest.status.slice(1)}
              </CardTitle>
              <CardDescription>
                Submitted on {new Date(existingRequest.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {existingRequest.status === 'pending' && (
                <p>Your request is being reviewed. You'll be notified when it's processed.</p>
              )}
              {existingRequest.status === 'approved' && (
                <p>Your request was approved! You can now access development environments in the patcher.</p>
              )}
              {existingRequest.status === 'denied' && (
                <p>Your request was denied. You may submit a new request if you'd like to try again.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Request Tester Access
              </CardTitle>
              <CardDescription>
                Testers get early access to new features and can help find bugs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Why do you want tester access? (optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Tell us about your experience with WoW private servers, testing, or why you'd be a good tester..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    disabled={loading}
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
```

### File: `src/routes/admin/users.tsx` (new file - for admin role management)

This file should create an admin page at `/admin/users` that:
1. Lists all users with their current roles
2. Allows admins to change user roles
3. Shows pending tester requests and allows approval/denial
4. Allows assigning specific environments to testers

---

## Phase 6: Update Existing Files

### File: `src/lib/auth.ts` - Add role to auth result

Update the `toAuthUser` function and `AuthUser` interface:

```typescript
export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
  createdAt: string
  role?: 'user' | 'tester' | 'admin'
  allowedEnvs?: string[]
}
```

### File: `src/routes/account/index.tsx` - Add link to tester request

Add a card or link to the account dashboard that allows users to request tester access.

---

## Environment Variables

No new environment variables are required for this phase. The existing Supabase configuration is sufficient.

---

## Testing Checklist

- [ ] Database migrations run successfully
- [ ] New users get default 'user' role
- [ ] Tester request submission works
- [ ] Admin can view pending requests
- [ ] Admin can approve/deny requests
- [ ] Approved users get tester role
- [ ] Patcher auth login endpoint works
- [ ] Patcher auth refresh endpoint works
- [ ] Patcher auth me endpoint returns correct role
- [ ] Role changes reflect immediately in patcher

---

## Security Notes

1. All auth endpoints validate tokens server-side
2. Role changes require admin authentication
3. Rate limiting should be added to prevent brute force (use middleware or API gateway)
4. Tokens are never logged or exposed in error messages
