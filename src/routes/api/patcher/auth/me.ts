import { createFileRoute } from '@tanstack/react-router'
import { createServerSupabaseClient } from '@/lib/supabase'
import { getUserRole } from '@/server/services/user-role'

export const Route = createFileRoute('/api/patcher/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const authHeader = request.headers.get('Authorization')

          if (!authHeader?.startsWith('Bearer ')) {
            return new Response(
              JSON.stringify({ success: false, error: 'Authorization required' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          }

          const accessToken = authHeader.slice(7)
          const supabase = createServerSupabaseClient()

          const { data, error } = await supabase.auth.getUser(accessToken)

          if (error || !data.user) {
            return new Response(
              JSON.stringify({ success: false, error: 'Invalid token' }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          }

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
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } catch (err) {
          console.error('Auth me error:', err)
          return new Response(
            JSON.stringify({ success: false, error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    },
  },
})
