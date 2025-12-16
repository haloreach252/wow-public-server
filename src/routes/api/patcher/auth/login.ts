import { createFileRoute } from '@tanstack/react-router'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserRole } from '@/server/services/user-role'

export const Route = createFileRoute('/api/patcher/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { email, password } = body

          if (!email || !password) {
            return new Response(
              JSON.stringify({ success: false, error: 'Email and password required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const supabase = createServerSupabaseClient()

          // Authenticate with Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            return new Response(
              JSON.stringify({ success: false, error: error.message }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          }

          if (!data.user || !data.session) {
            return new Response(
              JSON.stringify({ success: false, error: 'Authentication failed' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Get user role
          const roleInfo = await getUserRole(data.user.id)

          return new Response(
            JSON.stringify({
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
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (err) {
          console.error('Patcher auth error:', err)
          return new Response(
            JSON.stringify({ success: false, error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
