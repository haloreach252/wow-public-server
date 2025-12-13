import { createServerFn } from '@tanstack/react-start'
import { prisma } from '@/db'
import { createServerSupabaseClient } from './supabase'

// Types
export interface GameAccountInfo {
  id: string
  gameUsername: string
  createdAt: string
}

export interface GameAccountResult {
  success: boolean
  error?: string
  gameAccount?: GameAccountInfo
}

// Environment variables
const ADMIN_PANEL_URL = process.env.ADMIN_PANEL_URL || 'http://localhost:3000'
const PUBLIC_SITE_SERVICE_KEY = process.env.PUBLIC_SITE_SERVICE_KEY

// Helper to get authenticated user ID
async function getAuthenticatedUserId(accessToken: string): Promise<string | null> {
  const serverClient = createServerSupabaseClient()
  const { data, error } = await serverClient.auth.getUser(accessToken)

  if (error || !data.user) {
    return null
  }

  return data.user.id
}

// Get the current user's game account
export const getGameAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string }) => data)
  .handler(async ({ data }): Promise<GameAccountResult> => {
    try {
      const userId = await getAuthenticatedUserId(data.accessToken)

      if (!userId) {
        return { success: false, error: 'Not authenticated' }
      }

      const gameAccount = await prisma.gameAccount.findUnique({
        where: { supabaseUserId: userId },
      })

      if (!gameAccount) {
        return { success: true, gameAccount: undefined }
      }

      return {
        success: true,
        gameAccount: {
          id: gameAccount.id,
          gameUsername: gameAccount.gameUsername,
          createdAt: gameAccount.createdAt.toISOString(),
        },
      }
    } catch (error) {
      console.error('Error getting game account:', error)
      return { success: false, error: 'Failed to get game account' }
    }
  })

// Create a new game account
export const createGameAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; username: string; password: string }) => data)
  .handler(async ({ data }): Promise<GameAccountResult> => {
    try {
      const userId = await getAuthenticatedUserId(data.accessToken)

      if (!userId) {
        return { success: false, error: 'Not authenticated' }
      }

      // Check if user already has a game account
      const existingAccount = await prisma.gameAccount.findUnique({
        where: { supabaseUserId: userId },
      })

      if (existingAccount) {
        return { success: false, error: 'You already have a game account' }
      }

      // Check if username is already taken (in our database)
      const existingUsername = await prisma.gameAccount.findUnique({
        where: { gameUsername: data.username.toLowerCase() },
      })

      if (existingUsername) {
        return { success: false, error: 'Username is already taken' }
      }

      // Validate username and password
      const username = data.username.toLowerCase()
      if (username.length < 3 || username.length > 17) {
        return { success: false, error: 'Username must be between 3 and 17 characters' }
      }
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
        return { success: false, error: 'Username can only contain letters and numbers' }
      }
      if (data.password.length < 6 || data.password.length > 16) {
        return { success: false, error: 'Password must be between 6 and 16 characters' }
      }

      // Call admin panel to create the game account via SOAP
      if (!PUBLIC_SITE_SERVICE_KEY) {
        return { success: false, error: 'Server configuration error: missing service key' }
      }

      const adminResponse = await fetch(`${ADMIN_PANEL_URL}/api/public/account/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': PUBLIC_SITE_SERVICE_KEY,
        },
        body: JSON.stringify({
          username: username,
          password: data.password,
        }),
      })

      if (!adminResponse.ok) {
        const errorData = await adminResponse.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error || `Admin panel error: ${adminResponse.status}`
        }
      }

      const adminResult = await adminResponse.json()

      if (!adminResult.success) {
        return { success: false, error: adminResult.error || 'Failed to create game account' }
      }

      // Store the game account link in our database
      const gameAccount = await prisma.gameAccount.create({
        data: {
          supabaseUserId: userId,
          gameUsername: username,
        },
      })

      return {
        success: true,
        gameAccount: {
          id: gameAccount.id,
          gameUsername: gameAccount.gameUsername,
          createdAt: gameAccount.createdAt.toISOString(),
        },
      }
    } catch (error) {
      console.error('Error creating game account:', error)
      return { success: false, error: 'Failed to create game account' }
    }
  })

// Change game account password
export const changeGamePassword = createServerFn({ method: 'POST' })
  .inputValidator((data: { accessToken: string; newPassword: string }) => data)
  .handler(async ({ data }): Promise<GameAccountResult> => {
    try {
      const userId = await getAuthenticatedUserId(data.accessToken)

      if (!userId) {
        return { success: false, error: 'Not authenticated' }
      }

      // Get the user's game account
      const gameAccount = await prisma.gameAccount.findUnique({
        where: { supabaseUserId: userId },
      })

      if (!gameAccount) {
        return { success: false, error: 'You do not have a game account' }
      }

      // Validate password
      if (data.newPassword.length < 6 || data.newPassword.length > 16) {
        return { success: false, error: 'Password must be between 6 and 16 characters' }
      }

      // Call admin panel to change the password via SOAP
      if (!PUBLIC_SITE_SERVICE_KEY) {
        return { success: false, error: 'Server configuration error: missing service key' }
      }

      const adminResponse = await fetch(`${ADMIN_PANEL_URL}/api/public/account/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': PUBLIC_SITE_SERVICE_KEY,
        },
        body: JSON.stringify({
          username: gameAccount.gameUsername,
          password: data.newPassword,
        }),
      })

      if (!adminResponse.ok) {
        const errorData = await adminResponse.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.error || `Admin panel error: ${adminResponse.status}`
        }
      }

      const adminResult = await adminResponse.json()

      if (!adminResult.success) {
        return { success: false, error: adminResult.error || 'Failed to change password' }
      }

      return {
        success: true,
        gameAccount: {
          id: gameAccount.id,
          gameUsername: gameAccount.gameUsername,
          createdAt: gameAccount.createdAt.toISOString(),
        },
      }
    } catch (error) {
      console.error('Error changing game password:', error)
      return { success: false, error: 'Failed to change password' }
    }
  })
