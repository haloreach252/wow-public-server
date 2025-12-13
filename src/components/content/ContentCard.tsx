import { Link } from '@tanstack/react-router'
import { BookOpen, Calendar, FileText, Scroll, User } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ContentType } from '@/generated/prisma/client'

interface ContentCardProps {
  type: ContentType
  slug: string
  title: string
  summary: string | null
  featuredImage: string | null
  authorName: string | null
  publishedAt: string | null
  className?: string
}

const typeConfig: Record<ContentType, { icon: typeof Scroll; label: string; color: string }> = {
  release: { icon: Scroll, label: 'Release', color: 'text-yellow-500' },
  blog: { icon: FileText, label: 'Blog', color: 'text-blue-500' },
  wiki: { icon: BookOpen, label: 'Wiki', color: 'text-green-500' },
}

export function ContentCard({
  type,
  slug,
  title,
  summary,
  featuredImage,
  authorName,
  publishedAt,
  className,
}: ContentCardProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <Link to="/content/$type/$slug" params={{ type, slug }}>
      <Card
        className={cn(
          'group overflow-hidden bg-card/50 hover:bg-card/80 transition-all duration-200 hover:shadow-lg',
          className
        )}
      >
        {/* Featured Image */}
        {featuredImage && (
          <div className="aspect-video overflow-hidden">
            <img
              src={featuredImage}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </div>
        )}

        <CardHeader className="pb-2">
          {/* Type Badge */}
          <div className="flex items-center gap-2 mb-2">
            <Icon className={cn('h-4 w-4', config.color)} />
            <span className={cn('text-xs font-medium uppercase tracking-wide', config.color)}>
              {config.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
            {title}
          </h3>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Summary */}
          {summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {summary}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {authorName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{authorName}</span>
              </div>
            )}
            {formattedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
