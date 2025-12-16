import { redirect } from '@tanstack/react-router'
import { createServerSupabaseClient } from './supabase'
import { prisma } from '@/db'

export interface AuthGuardResult {
  userId: string
  email: string
}

/**
 * Server-side authentication guard for protected routes.
 * Throws a redirect to /login if not authenticated.
 */
export async function requireAuth(accessToken?: string): Promise<AuthGuardResult> {
  if (!accessToken) {
    throw redirect({ to: '/login' })
  }

  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser(accessToken)

  if (error || !data.user) {
    throw redirect({ to: '/login' })
  }

  return {
    userId: data.user.id,
    email: data.user.email!,
  }
}

/**
 * Server-side admin guard for admin-only routes.
 * Throws a redirect if not authenticated or not admin.
 */
export async function requireAdmin(accessToken?: string): Promise<AuthGuardResult> {
  const user = await requireAuth(accessToken)

  // Check admin role
  const userRole = await prisma.userRole.findUnique({
    where: { supabaseUserId: user.userId },
  })

  if (userRole?.role !== 'admin') {
    throw redirect({ to: '/account' })
  }

  return user
}
