import { createServerFn } from '@tanstack/react-start'
import { supabase, createServerSupabaseClient } from './supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

// Types
export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
  createdAt: string
  role?: 'user' | 'tester' | 'admin'
  allowedEnvs?: string[]
}

export interface AuthResult {
  success: boolean
  error?: string
  user?: AuthUser
  needsEmailVerification?: boolean
  needsMFA?: boolean
}

// Transform Supabase user to our AuthUser type
function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    emailVerified: !!user.email_confirmed_at,
    createdAt: user.created_at,
  }
}

// Handle Supabase auth errors
function handleAuthError(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password'
    case 'Email not confirmed':
      return 'Please verify your email before logging in'
    case 'User already registered':
      return 'An account with this email already exists'
    default:
      return error.message
  }
}

// ==========================================
// Client-side auth functions
// ==========================================

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: handleAuthError(error) }
  }

  // If email confirmation is required, user will be returned but not confirmed
  if (data.user && !data.user.email_confirmed_at) {
    return {
      success: true,
      needsEmailVerification: true,
      user: toAuthUser(data.user),
    }
  }

  return {
    success: true,
    user: data.user ? toAuthUser(data.user) : undefined,
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: handleAuthError(error) }
  }

  // Check if MFA is required
  // Note: This is a simplified check - actual MFA flow is more complex
  if (data.user) {
    return {
      success: true,
      user: toAuthUser(data.user),
    }
  }

  return { success: false, error: 'Authentication failed' }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message)
  }
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error.message)
    return null
  }
  return data.session
}

export async function getUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    return null
  }
  return data.user
}

export async function resetPassword(email: string): Promise<AuthResult> {
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/reset-password`,
  })

  if (error) {
    return { success: false, error: handleAuthError(error) }
  }

  return { success: true }
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { success: false, error: handleAuthError(error) }
  }

  return { success: true }
}

export async function resendVerificationEmail(email: string): Promise<AuthResult> {
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { success: false, error: handleAuthError(error) }
  }

  return { success: true }
}

// Subscribe to auth state changes
export function onAuthStateChange(callback: (user: User | null, event: string) => void) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null, event)
  })
  return subscription
}

// ==========================================
// Server-side auth functions
// ==========================================

// Verify a token and get user info (for protected API routes)
export const verifyToken = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      const serverClient = createServerSupabaseClient()
      const { data: userData, error } = await serverClient.auth.getUser(data.accessToken)

      if (error || !userData.user) {
        return { valid: false, user: null }
      }

      return {
        valid: true,
        user: toAuthUser(userData.user),
      }
    } catch {
      return { valid: false, user: null }
    }
  })

// Get current user from session (server-side)
export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  // This is called without a token - for SSR we'd need to pass cookies
  // For now, return null and rely on client-side auth state
  return null
})
