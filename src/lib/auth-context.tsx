import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import {
  getUser,
  getSession,
  onAuthStateChange,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  type AuthResult,
} from './auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  sessionExpiresAt: number | null // Unix timestamp
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)

  // Initialize auth state
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      try {
        // Check for existing session
        const session = await getSession()
        if (session?.user && mounted) {
          setUser(session.user)
          setSessionExpiresAt(session.expires_at ?? null)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Subscribe to auth changes
    const subscription = onAuthStateChange(async (newUser, event) => {
      if (mounted) {
        setUser(newUser)
        // Handle specific events if needed
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setSessionExpiresAt(null)
        } else if (newUser) {
          // Update session expiry on auth state change
          const session = await getSession()
          setSessionExpiresAt(session?.expires_at ?? null)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const result = await authSignIn(email, password)
      if (result.success && result.user) {
        // User will be set by the auth state change listener
      }
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const result = await authSignUp(email, password)
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await authSignOut()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    return authResetPassword(email)
  }, [])

  const refreshUser = useCallback(async () => {
    const currentUser = await getUser()
    setUser(currentUser)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionExpiresAt,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for checking if user is authenticated
export function useRequireAuth() {
  const { user, loading } = useAuth()
  return { user, loading, isAuthenticated: !!user }
}
