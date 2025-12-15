import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, FileText, Scroll } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContentCard } from '@/components/content'
import { listPublishedContent, type ContentListResult } from '@/lib/content'
import { cn } from '@/lib/utils'
import { siteConfig } from '@/lib/config'
import type { ContentType } from '@/generated/prisma/client'

const contentTypes = [
  { value: undefined, label: 'All', icon: null },
  { value: 'release' as const, label: 'Releases', icon: Scroll, color: 'text-yellow-500' },
  { value: 'blog' as const, label: 'Blog', icon: FileText, color: 'text-blue-500' },
  { value: 'wiki' as const, label: 'Wiki', icon: BookOpen, color: 'text-green-500' },
]

export const Route = createFileRoute('/content/')({
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type as ContentType | undefined) ?? undefined,
    page: Number(search.page ?? 1),
  }),
  component: ContentListPage,
  head: () => ({
    meta: [
      { title: `News & Updates | ${siteConfig.name}` },
      {
        name: 'description',
        content: `Latest news, updates, and announcements from ${siteConfig.name}. Stay informed about new content, patches, and server updates.`,
      },
      { property: 'og:title', content: `News & Updates | ${siteConfig.name}` },
      {
        property: 'og:description',
        content: `Latest news, updates, and announcements from ${siteConfig.name}. Stay informed about new content, patches, and server updates.`,
      },
      { property: 'og:type', content: 'website' },
    ],
  }),
})

function ContentListPage() {
  const search = useSearch({ from: '/content/' })
  const navigate = Route.useNavigate()

  const limit = 12
  const offset = (search.page - 1) * limit

  const { data, isLoading } = useQuery<ContentListResult>({
    queryKey: ['content', 'list', search.type, search.page],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => (listPublishedContent as any)({ data: { type: search.type, limit, offset } }),
  })

  const content = data?.content ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">News & Updates</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Stay informed with the latest server announcements, patch notes, and community updates.
        </p>
      </div>

      {/* Type Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {contentTypes.map((type) => {
          const isActive = search.type === type.value
          const Icon = type.icon

          return (
            <Button
              key={type.label}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                navigate({
                  search: { type: type.value, page: 1 },
                })
              }}
              className={cn(
                'gap-2',
                isActive && type.color && type.color
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {type.label}
            </Button>
          )
        })}
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-lg bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : content.length === 0 ? (
        <div className="text-center py-16">
          <Scroll className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {search.type
              ? `No ${search.type} content published yet.`
              : 'No content published yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map((item) => (
              <ContentCard
                key={item.id}
                type={item.type}
                slug={item.slug}
                title={item.title}
                summary={item.summary}
                featuredImage={item.featuredImage}
                authorName={item.authorName}
                publishedAt={item.publishedAt}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={search.page <= 1}
                onClick={() => {
                  navigate({
                    search: { ...search, page: search.page - 1 },
                  })
                }}
              >
                Previous
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {search.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={search.page >= totalPages}
                onClick={() => {
                  navigate({
                    search: { ...search, page: search.page + 1 },
                  })
                }}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
