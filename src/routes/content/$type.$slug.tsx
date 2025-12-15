import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft, BookOpen, Calendar, FileText, Scroll, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TiptapRenderer } from '@/components/content'
import { cn } from '@/lib/utils'
import { siteConfig } from '@/lib/config'
import * as contentService from '@/server/services/content'
import type { ContentType } from '@/generated/prisma/client'
import type { ContentDetail } from '@/server/services/content'

const typeConfig: Record<ContentType, { icon: typeof Scroll; label: string; color: string }> = {
  release: { icon: Scroll, label: 'Release', color: 'text-yellow-500' },
  blog: { icon: FileText, label: 'Blog', color: 'text-blue-500' },
  wiki: { icon: BookOpen, label: 'Wiki', color: 'text-green-500' },
}

export const Route = createFileRoute('/content/$type/$slug')({
  component: ContentDetailPage,
  loader: async ({ params }) => {
    // Validate type parameter
    if (!['release', 'blog', 'wiki'].includes(params.type)) {
      throw notFound()
    }

    // Fetch content server-side for SEO
    const result = await contentService.getPublishedContent(params.slug)

    if (!result.success || !result.content) {
      throw notFound()
    }

    // Verify the content type matches the URL
    if (result.content.type !== params.type) {
      throw notFound()
    }

    return {
      type: params.type as ContentType,
      slug: params.slug,
      content: result.content,
    }
  },
  head: ({ loaderData }) => {
    const content = loaderData?.content as ContentDetail | undefined
    if (!content) {
      return {
        meta: [{ title: `Content Not Found | ${siteConfig.name}` }],
      }
    }

    const title = `${content.title} | ${siteConfig.name}`
    const description = content.summary || siteConfig.description
    const image = content.featuredImage || undefined

    return {
      meta: [
        { title },
        { name: 'description', content: description },
        // Open Graph
        { property: 'og:type', content: 'article' },
        { property: 'og:title', content: content.title },
        { property: 'og:description', content: description },
        { property: 'og:site_name', content: siteConfig.name },
        ...(image ? [{ property: 'og:image', content: image }] : []),
        ...(content.publishedAt
          ? [{ property: 'article:published_time', content: content.publishedAt }]
          : []),
        ...(content.authorName
          ? [{ property: 'article:author', content: content.authorName }]
          : []),
        // Twitter Card
        { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
        { name: 'twitter:title', content: content.title },
        { name: 'twitter:description', content: description },
        ...(image ? [{ name: 'twitter:image', content: image }] : []),
      ],
    }
  },
})

function ContentDetailPage() {
  const loaderData = Route.useLoaderData()
  const contentType = loaderData?.type as ContentType
  const content = loaderData?.content
  const config = typeConfig[contentType]
  const Icon = config?.icon || Scroll

  // This shouldn't happen since loader throws notFound, but satisfy TypeScript
  if (!content) {
    return null
  }

  const formattedDate = content.publishedAt
    ? new Date(content.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <article className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Back Link */}
      <Link
        to="/content"
        search={{ type: contentType, page: 1 }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {config.label}s
      </Link>

      {/* Header */}
      <header className="mb-8">
        {/* Type Badge */}
        <div className="flex items-center gap-2 mb-4">
          <Icon className={cn('h-5 w-5', config.color)} />
          <span className={cn('text-sm font-medium uppercase tracking-wide', config.color)}>
            {config.label}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-4">{content.title}</h1>

        {/* Summary */}
        {content.summary && (
          <p className="text-xl text-muted-foreground mb-6">{content.summary}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground border-b border-border pb-6">
          {content.authorName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{content.authorName}</span>
            </div>
          )}
          {formattedDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time dateTime={content.publishedAt ?? undefined}>{formattedDate}</time>
            </div>
          )}
        </div>
      </header>

      {/* Featured Image */}
      {content.featuredImage && (
        <figure className="mb-8">
          <img
            src={content.featuredImage}
            alt={content.title}
            className="w-full rounded-lg"
          />
        </figure>
      )}

      {/* Body */}
      <div className="prose prose-invert prose-lg max-w-none">
        <TiptapRenderer content={content.body} />
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-border">
        <Button variant="outline" asChild>
          <Link to="/content" search={{ type: contentType, page: 1 }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            More {config.label}s
          </Link>
        </Button>
      </footer>
    </article>
  )
}
