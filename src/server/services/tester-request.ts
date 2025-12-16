import { prisma } from '@/db'
import { getUserRole, updateUserRoleData } from './user-role'

// Submit a tester request
export async function createTesterRequest(userId: string, email: string, reason?: string) {
  // Check if already a tester or admin
  const currentRole = await getUserRole(userId)
  if (currentRole.role !== 'user') {
    return { success: false, error: 'You already have elevated access' }
  }

  // Check for existing pending request
  const existing = await prisma.testerRequest.findUnique({
    where: { supabaseUserId: userId },
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
      supabaseUserId: userId,
      email,
      reason,
    },
  })

  return { success: true }
}

// Get pending tester requests
export async function getPendingTesterRequests() {
  return prisma.testerRequest.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
  })
}

// Get all tester requests
export async function getAllTesterRequests() {
  return prisma.testerRequest.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

// Get user's own request
export async function getUserTesterRequest(userId: string) {
  return prisma.testerRequest.findUnique({
    where: { supabaseUserId: userId },
  })
}

// Review a tester request (approve or deny)
export async function reviewRequest(
  requestId: string,
  adminId: string,
  approved: boolean,
  allowedEnvs?: string[]
) {
  const request = await prisma.testerRequest.findUnique({
    where: { id: requestId },
  })

  if (!request) {
    return { success: false, error: 'Request not found' }
  }

  // Update request status
  await prisma.testerRequest.update({
    where: { id: requestId },
    data: {
      status: approved ? 'approved' : 'denied',
      reviewedBy: adminId,
      reviewedAt: new Date(),
    },
  })

  // If approved, update user role
  if (approved) {
    await updateUserRoleData(
      request.supabaseUserId,
      'tester',
      allowedEnvs ?? ['dev']
    )
  }

  return { success: true }
}
