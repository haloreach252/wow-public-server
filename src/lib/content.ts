import { createServerFn } from '@tanstack/react-start'
import * as contentService from '@/server/services/content'
import type { ContentType } from '@/generated/prisma/client'

// Re-export types from the service
export type {
  ContentSummary,
  ContentDetail,
  ContentListResult,
  ContentDetailResult,
  ContentMutationResult,
} from '@/server/services/content'

// ==========================================
// Server Functions (for client-side usage)
// These wrap the service functions for use with TanStack Query
// ==========================================

// List published content with optional filtering
export const listPublishedContent = createServerFn({ method: 'POST' })
  .handler(async (input) => {
    const data = (input as { data?: { type?: ContentType; limit?: number; offset?: number } }).data ?? {}
    return contentService.listPublishedContent({
      type: data.type,
      limit: data.limit,
      offset: data.offset,
    })
  })

// Get a single published content item by slug
export const getPublishedContent = createServerFn({ method: 'POST' })
  // @ts-expect-error - TanStack Start type inference doesn't handle dynamic inputs well
  .handler(async (input) => {
    const { slug } = (input as unknown as { data: { slug: string } }).data
    return contentService.getPublishedContent(slug)
  })

// Get latest published content for homepage
export const getLatestContent = createServerFn({ method: 'POST' })
  .handler(async (input) => {
    const data = (input as { data?: { limit?: number; types?: ContentType[] } }).data ?? {}
    return contentService.getLatestContent({
      limit: data.limit,
      types: data.types,
    })
  })
