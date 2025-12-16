import { createServerFn } from '@tanstack/react-start'
import { prisma } from '@/db'
import { createServerSupabaseClient } from './supabase'
import type { Role } from './user-role'

// Helper to get authenticated user
async function getAuthenticatedUser(accessToken: string): Promise<{ id: string; email: string } | null> {
  const serverClient = createServerSupabaseClient()
  const { data, error } = await serverClient.auth.getUser(accessToken)

  if (error || !data.user || !data.user.email) {
    return null
  }

  return { id: data.user.id, email: data.user.email }
}

// Get user role internal helper
async function getUserRoleInternal(supabaseUserId: string): Promise<{ role: Role; allowedEnvs: string[] }> {
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

// Submit a tester request
export const submitTesterRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; reason?: string }) => data)
  .handler(async ({ data }) => {
    try {
      const user = await getAuthenticatedUser(data.accessToken)
      if (!user) {
        return { success: false, error: 'Unauthorized' }
      }

      // Check if already a tester or admin
      const currentRole = await getUserRoleInternal(user.id)
      if (currentRole.role !== 'user') {
        return { success: false, error: 'You already have elevated access' }
      }

      // Check for existing pending request
      const existing = await prisma.testerRequest.findUnique({
        where: { supabaseUserId: user.id },
      })

      if (existing) {
        if (existing.status === 'pending') {
          return { success: false, error: 'You already have a pending request' }
        }
        if (existing.status === 'denied') {
          // Allow resubmission after denial - delete the old request
          await prisma.testerRequest.delete({ where: { id: existing.id } })
        }
      }

      await prisma.testerRequest.create({
        data: {
          supabaseUserId: user.id,
          email: user.email,
          reason: data.reason,
        },
      })

      return { success: true }
    } catch (error) {
      console.error('Error submitting tester request:', error)
      return { success: false, error: 'Failed to submit request' }
    }
  })

// Get pending tester requests (admin only)
export const getPendingRequests = createServerFn({ method: 'POST' })
  .inputValidator((data: { adminAccessToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      const serverClient = createServerSupabaseClient()
      const { data: adminData, error } = await serverClient.auth.getUser(data.adminAccessToken)

      if (error || !adminData.user) {
        return { success: false, error: 'Unauthorized' }
      }

      const adminRole = await getUserRoleInternal(adminData.user.id)
      if (adminRole.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
      }

      const requests = await prisma.testerRequest.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
      })

      return { success: true, requests }
    } catch (error) {
      console.error('Error getting pending requests:', error)
      return { success: false, error: 'Failed to get pending requests' }
    }
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
    try {
      const serverClient = createServerSupabaseClient()
      const { data: adminData, error } = await serverClient.auth.getUser(data.adminAccessToken)

      if (error || !adminData.user) {
        return { success: false, error: 'Unauthorized' }
      }

      const adminRole = await getUserRoleInternal(adminData.user.id)
      if (adminRole.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
      }

      const request = await prisma.testerRequest.findUnique({
        where: { id: data.requestId },
      })

      if (!request) {
        return { success: false, error: 'Request not found' }
      }

      // Update request status
      await prisma.testerRequest.update({
        where: { id: data.requestId },
        data: {
          status: data.approved ? 'approved' : 'denied',
          reviewedBy: adminData.user.id,
          reviewedAt: new Date(),
        },
      })

      // If approved, update user role
      if (data.approved) {
        await prisma.userRole.upsert({
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
    } catch (error) {
      console.error('Error reviewing tester request:', error)
      return { success: false, error: 'Failed to review request' }
    }
  })

// Get user's own request status
export const getMyTesterRequest = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      const serverClient = createServerSupabaseClient()
      const { data: userData, error } = await serverClient.auth.getUser(data.accessToken)

      if (error || !userData.user) {
        return { success: false, error: 'Unauthorized' }
      }

      const request = await prisma.testerRequest.findUnique({
        where: { supabaseUserId: userData.user.id },
      })

      return { success: true, request }
    } catch (error) {
      console.error('Error getting tester request:', error)
      return { success: false, error: 'Failed to get request status' }
    }
  })

// Get all tester requests (admin only) - for viewing history
export const getAllRequests = createServerFn({ method: 'POST' })
  .inputValidator((data: { adminAccessToken: string }) => data)
  .handler(async ({ data }) => {
    try {
      const serverClient = createServerSupabaseClient()
      const { data: adminData, error } = await serverClient.auth.getUser(data.adminAccessToken)

      if (error || !adminData.user) {
        return { success: false, error: 'Unauthorized' }
      }

      const adminRole = await getUserRoleInternal(adminData.user.id)
      if (adminRole.role !== 'admin') {
        return { success: false, error: 'Admin access required' }
      }

      const requests = await prisma.testerRequest.findMany({
        orderBy: { createdAt: 'desc' },
      })

      return { success: true, requests }
    } catch (error) {
      console.error('Error getting all requests:', error)
      return { success: false, error: 'Failed to get requests' }
    }
  })
