import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Calendar, ChevronRight, FileText, Home, Scroll, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TiptapRenderer } from '@/components/content'
import { getPublishedContent, type ContentDetailResult } from '@/lib/content'
import { cn } from '@/lib/utils'
import { siteConfig } from '@/lib/config'
import type { ContentType } from '@/generated/prisma/client'

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
    return { type: params.type as ContentType, slug: params.slug }
  },
})

function ContentDetailPage() {
  const { slug, type } = Route.useParams()

  const { data, isLoading, error } = useQuery<ContentDetailResult>({
    queryKey: ['content', 'detail', slug],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => (getPublishedContent as any)({ data: { slug } }),
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-12 w-3/4 bg-muted rounded" />
          <div className="h-6 w-1/2 bg-muted rounded" />
          <div className="h-64 bg-muted rounded mt-8" />
        </div>
      </div>
    )
  }

  if (error || !data?.success || !data.content) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl text-center">
        <Scroll className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The content you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link to="/content" search={{ type: undefined, page: 1 }}>Browse Content</Link>
        </Button>
      </div>
    )
  }

  const content = data.content
  const contentType = type as ContentType
  const config = typeConfig[contentType]
  const Icon = config.icon

  const formattedDate = content.publishedAt
    ? new Date(content.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <article className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-8" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/content" search={{ type: undefined, page: 1 }} className="hover:text-foreground transition-colors">
          News
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          to="/content"
          search={{ type: contentType, page: 1 }}
          className="hover:text-foreground transition-colors"
        >
          {config.label}s
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium truncate max-w-[200px]" title={content.title}>
          {content.title}
        </span>
      </nav>

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
