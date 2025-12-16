import { createServerFn } from '@tanstack/react-start'
import { prisma } from '@/db'
import { createServerSupabaseClient } from './supabase'

// Re-define types here to avoid importing from Prisma
export type Role = 'user' | 'tester' | 'admin'

export interface UserRoleInfo {
  role: Role
  allowedEnvs: string[]
}

// Helper to get authenticated user ID from access token
async function getAuthenticatedUserId(accessToken: string): Promise<string | null> {
  const serverClient = createServerSupabaseClient()
  const { data, error } = await serverClient.auth.getUser(accessToken)

  if (error || !data.user) {
    return null
  }

  return data.user.id
}

// Get user role, creating default if not exists (internal helper)
async function getUserRoleInternal(supabaseUserId: string): Promise<UserRoleInfo> {
  let userRole = await prisma.userRole.findUnique({
    where: { supabaseUserId },
  })

  if (!userRole) {
    userRole = await prisma.userRole.create({
      data: {
        supabaseUserId,
        role: 'user',
        allowedEnvs: [],
      },
    })
  }

  return {
    role: userRole.role as Role,
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
    try {
      const adminUserId = await getAuthenticatedUserId(data.adminAccessToken)
      if (!adminUserId) {
        return { success: false, error: 'Unauthorized' }
      }

      const adminRole = await getUserRoleInternal(adminUserId)
      if (adminRole.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
      }

      const updated = await prisma.userRole.upsert({
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
    } catch (error) {
      console.error('Error updating user role:', error)
      return { success: false, error: 'Failed to update user role' }
    }
  })

// Get all users with their roles (admin only)
export const listUsersWithRoles = createServerFn({ method: 'POST' })
  .inputValidator((data: { adminAccessToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      const adminUserId = await getAuthenticatedUserId(data.adminAccessToken)
      if (!adminUserId) {
        return { success: false, error: 'Unauthorized' }
      }

      const adminRole = await getUserRoleInternal(adminUserId)
      if (adminRole.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
      }

      const users = await prisma.userRole.findMany({
        orderBy: { createdAt: 'desc' },
      })

      return { success: true, users }
    } catch (error) {
      console.error('Error listing users with roles:', error)
      return { success: false, error: 'Failed to list users' }
    }
  })

// Get current user's role info
export const getMyRole = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      const userId = await getAuthenticatedUserId(data.accessToken)
      if (!userId) {
        return { success: false, error: 'Unauthorized' }
      }

      const roleInfo = await getUserRoleInternal(userId)
      return { success: true, ...roleInfo }
    } catch (error) {
      console.error('Error getting user role:', error)
      return { success: false, error: 'Failed to get user role' }
    }
  })
