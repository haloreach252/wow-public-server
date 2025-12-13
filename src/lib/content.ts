import { createServerFn } from '@tanstack/react-start'
import { prisma } from '@/db'
import type { Content, ContentType } from '@/generated/prisma/client'

// ==========================================
// Types
// ==========================================

export interface ContentSummary {
  id: string
  type: ContentType
  slug: string
  title: string
  summary: string | null
  featuredImage: string | null
  authorName: string | null
  publishedAt: string | null
  createdAt: string
}

export interface ContentDetail extends ContentSummary {
  body: unknown // Tiptap JSON
  metadata: unknown
  updatedAt: string
}

export interface ContentListResult {
  success: boolean
  error?: string
  content?: ContentSummary[]
  total?: number
  hasMore?: boolean
}

export interface ContentDetailResult {
  success: boolean
  error?: string
  content?: ContentDetail
}

export interface ContentMutationResult {
  success: boolean
  error?: string
  content?: ContentDetail
}

// Helper to transform Prisma Content to our types
function toContentSummary(content: Content): ContentSummary {
  return {
    id: content.id,
    type: content.type,
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    featuredImage: content.featuredImage,
    authorName: content.authorName,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    createdAt: content.createdAt.toISOString(),
  }
}

function toContentDetail(content: Content): ContentDetail {
  return {
    ...toContentSummary(content),
    body: content.body,
    metadata: content.metadata,
    updatedAt: content.updatedAt.toISOString(),
  }
}

// ==========================================
// Public Query Functions (no auth required)
// ==========================================

// List published content with optional filtering
export const listPublishedContent = createServerFn({ method: 'POST' })
  .handler(async (input): Promise<ContentListResult> => {
    const data = (input as { data?: { type?: ContentType; limit?: number; offset?: number } }).data ?? {}
    try {
      const limit = Math.min(data.limit ?? 20, 100)
      const offset = data.offset ?? 0

      const where = {
        published: true,
        publishedAt: { not: null },
        ...(data.type && { type: data.type }),
      }

      const [content, total] = await Promise.all([
        prisma.content.findMany({
          where,
          orderBy: { publishedAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.content.count({ where }),
      ])

      return {
        success: true,
        content: content.map(toContentSummary),
        total,
        hasMore: offset + content.length < total,
      }
    } catch (error) {
      console.error('Error listing content:', error)
      return { success: false, error: 'Failed to fetch content' }
    }
  })

// Get a single published content item by slug
export const getPublishedContent = createServerFn({ method: 'POST' })
  // @ts-expect-error - TanStack Start type inference doesn't handle dynamic inputs well
  .handler(async (input): Promise<ContentDetailResult> => {
    const { slug } = (input as unknown as { data: { slug: string } }).data
    try {
      const content = await prisma.content.findUnique({
        where: { slug },
      })

      if (!content) {
        return { success: false, error: 'Content not found' }
      }

      // Only return published content for public queries
      if (!content.published || !content.publishedAt) {
        return { success: false, error: 'Content not found' }
      }

      return {
        success: true,
        content: toContentDetail(content),
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      return { success: false, error: 'Failed to fetch content' }
    }
  })

// Get latest published content for homepage
export const getLatestContent = createServerFn({ method: 'POST' })
  .handler(async (input): Promise<ContentListResult> => {
    const data = (input as { data?: { limit?: number; types?: ContentType[] } }).data ?? {}
    try {
      const limit = Math.min(data.limit ?? 5, 20)

      const content = await prisma.content.findMany({
        where: {
          published: true,
          publishedAt: { not: null },
          ...(data.types && data.types.length > 0 && { type: { in: data.types } }),
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
      })

      return {
        success: true,
        content: content.map(toContentSummary),
      }
    } catch (error) {
      console.error('Error fetching latest content:', error)
      return { success: false, error: 'Failed to fetch content' }
    }
  })

// ==========================================
// Admin API Functions (service key required)
// These are called by the admin panel via HTTP API
// ==========================================

// Environment variable for service key validation
const PUBLIC_SITE_SERVICE_KEY = process.env.PUBLIC_SITE_SERVICE_KEY

export function validateServiceKey(serviceKey: string | null): boolean {
  if (!PUBLIC_SITE_SERVICE_KEY) {
    console.error('PUBLIC_SITE_SERVICE_KEY not configured')
    return false
  }
  return serviceKey === PUBLIC_SITE_SERVICE_KEY
}

// List all content (including unpublished) for admin
export async function adminListContent(options: {
  type?: ContentType
  published?: boolean
  limit?: number
  offset?: number
}): Promise<ContentListResult> {
  try {
    const limit = Math.min(options.limit ?? 50, 100)
    const offset = options.offset ?? 0

    const where = {
      ...(options.type && { type: options.type }),
      ...(options.published !== undefined && { published: options.published }),
    }

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.content.count({ where }),
    ])

    return {
      success: true,
      content: content.map(toContentSummary),
      total,
      hasMore: offset + content.length < total,
    }
  } catch (error) {
    console.error('Error listing content (admin):', error)
    return { success: false, error: 'Failed to fetch content' }
  }
}

// Get single content by ID or slug (including unpublished) for admin
export async function adminGetContent(
  idOrSlug: string
): Promise<ContentDetailResult> {
  try {
    // Try to find by ID first, then by slug
    let content = await prisma.content.findUnique({
      where: { id: idOrSlug },
    })

    if (!content) {
      content = await prisma.content.findUnique({
        where: { slug: idOrSlug },
      })
    }

    if (!content) {
      return { success: false, error: 'Content not found' }
    }

    return {
      success: true,
      content: toContentDetail(content),
    }
  } catch (error) {
    console.error('Error fetching content (admin):', error)
    return { success: false, error: 'Failed to fetch content' }
  }
}

// Create new content
export async function adminCreateContent(data: {
  type: ContentType
  slug: string
  title: string
  summary?: string
  body: unknown
  featuredImage?: string
  published?: boolean
  authorId?: string
  authorName?: string
  metadata?: unknown
}): Promise<ContentMutationResult> {
  try {
    // Validate slug format
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
      return {
        success: false,
        error: 'Slug must be lowercase alphanumeric with hyphens only',
      }
    }

    // Check if slug already exists
    const existing = await prisma.content.findUnique({
      where: { slug: data.slug },
    })

    if (existing) {
      return { success: false, error: 'A content item with this slug already exists' }
    }

    const content = await prisma.content.create({
      data: {
        type: data.type,
        slug: data.slug,
        title: data.title,
        summary: data.summary ?? null,
        body: data.body as object,
        featuredImage: data.featuredImage ?? null,
        published: data.published ?? false,
        publishedAt: data.published ? new Date() : null,
        authorId: data.authorId ?? null,
        authorName: data.authorName ?? null,
        metadata: (data.metadata as object) ?? {},
      },
    })

    return {
      success: true,
      content: toContentDetail(content),
    }
  } catch (error) {
    console.error('Error creating content:', error)
    return { success: false, error: 'Failed to create content' }
  }
}

// Update existing content
export async function adminUpdateContent(
  id: string,
  data: {
    type?: ContentType
    slug?: string
    title?: string
    summary?: string | null
    body?: unknown
    featuredImage?: string | null
    published?: boolean
    authorId?: string | null
    authorName?: string | null
    metadata?: unknown
  }
): Promise<ContentMutationResult> {
  try {
    // Check if content exists
    const existing = await prisma.content.findUnique({
      where: { id },
    })

    if (!existing) {
      return { success: false, error: 'Content not found' }
    }

    // If slug is being changed, validate it
    if (data.slug && data.slug !== existing.slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
        return {
          success: false,
          error: 'Slug must be lowercase alphanumeric with hyphens only',
        }
      }

      const slugExists = await prisma.content.findUnique({
        where: { slug: data.slug },
      })

      if (slugExists) {
        return { success: false, error: 'A content item with this slug already exists' }
      }
    }

    // Handle publishedAt logic
    let publishedAt = existing.publishedAt
    if (data.published !== undefined) {
      if (data.published && !existing.published) {
        // Being published for the first time
        publishedAt = new Date()
      } else if (!data.published) {
        // Being unpublished - keep the original publishedAt for reference
        // Or set to null if you prefer: publishedAt = null
      }
    }

    const content = await prisma.content.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.body !== undefined && { body: data.body as object }),
        ...(data.featuredImage !== undefined && { featuredImage: data.featuredImage }),
        ...(data.published !== undefined && { published: data.published }),
        publishedAt,
        ...(data.authorId !== undefined && { authorId: data.authorId }),
        ...(data.authorName !== undefined && { authorName: data.authorName }),
        ...(data.metadata !== undefined && { metadata: data.metadata as object }),
      },
    })

    return {
      success: true,
      content: toContentDetail(content),
    }
  } catch (error) {
    console.error('Error updating content:', error)
    return { success: false, error: 'Failed to update content' }
  }
}

// Delete content
export async function adminDeleteContent(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.content.findUnique({
      where: { id },
    })

    if (!existing) {
      return { success: false, error: 'Content not found' }
    }

    await prisma.content.delete({
      where: { id },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting content:', error)
    return { success: false, error: 'Failed to delete content' }
  }
}
