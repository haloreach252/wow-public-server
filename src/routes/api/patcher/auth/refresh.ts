import { createFileRoute } from '@tanstack/react-router'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserRole } from '@/server/services/user-role'

export const Route = createFileRoute('/api/patcher/auth/refresh')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { refreshToken } = body

          if (!refreshToken) {
            return new Response(
              JSON.stringify({ success: false, error: 'Refresh token required' }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const supabase = createServerSupabaseClient()

          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: refreshToken,
          })

          if (error || !data.session) {
            return new Response(
              JSON.stringify({ success: false, error: 'Token refresh failed' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Get updated role info
          const roleInfo = await getUserRole(data.user!.id)

          return new Response(
            JSON.stringify({
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
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (err) {
          console.error('Token refresh error:', err)
          return new Response(
            JSON.stringify({ success: false, error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
