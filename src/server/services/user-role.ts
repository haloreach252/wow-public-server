import { prisma } from '@/db'
import type { Role } from '@/generated/prisma/client'

export interface UserRoleInfo {
  role: Role
  allowedEnvs: string[]
}

// Get user role, creating default if not exists
export async function getUserRole(supabaseUserId: string): Promise<UserRoleInfo> {
  let userRole = await prisma.userRole.findUnique({
    where: { supabaseUserId },
  })

  if (!userRole) {
    // Create default user role
    userRole = await prisma.userRole.create({
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

// Update user role
export async function updateUserRoleData(
  targetUserId: string,
  role: Role,
  allowedEnvs: string[]
) {
  return prisma.userRole.upsert({
    where: { supabaseUserId: targetUserId },
    update: {
      role,
      allowedEnvs,
    },
    create: {
      supabaseUserId: targetUserId,
      role,
      allowedEnvs,
    },
  })
}

// List all users with roles
export async function listAllUsersWithRoles() {
  return prisma.userRole.findMany({
    orderBy: { createdAt: 'desc' },
  })
}
