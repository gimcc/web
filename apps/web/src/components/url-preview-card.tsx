import type { UrlPreview } from '@matrix-web/matrix-client'
import { extractUrls, fetchUrlPreview } from '@matrix-web/matrix-client'
import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface UrlPreviewCardProps {
  body: string
}

function PreviewCard({ preview }: { preview: UrlPreview }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1.5 flex max-w-sm gap-3 rounded-md border border-border bg-accent/30 p-2 transition-colors hover:bg-accent/50"
    >
      {preview.imageUrl && (
        <img
          src={preview.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded object-cover"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        {preview.siteName && (
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {preview.siteName}
          </p>
        )}
        {preview.title && (
          <p className="truncate text-xs font-medium text-foreground">
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className="line-clamp-2 text-[11px] text-muted-foreground">
            {preview.description}
          </p>
        )}
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <ExternalLink className="h-2.5 w-2.5" />
          <span className="truncate">{new URL(preview.url).hostname}</span>
        </div>
      </div>
    </a>
  )
}

export function UrlPreviewCards({ body }: UrlPreviewCardProps) {
  const urls = useMemo(() => extractUrls(body), [body])
  const [previews, setPreviews] = useState<UrlPreview[]>([])

  useEffect(() => {
    if (urls.length === 0)
      return

    let cancelled = false

    // Only fetch first 3 URLs to avoid spam
    const fetchAll = async () => {
      const results = await Promise.all(
        urls.slice(0, 3).map(url => fetchUrlPreview(url)),
      )
      if (!cancelled) {
        setPreviews(results.filter((p): p is UrlPreview => p !== null))
      }
    }

    void fetchAll()
    return () => {
      cancelled = true
    }
  }, [urls])

  if (previews.length === 0)
    return null

  return (
    <div className="space-y-1">
      {previews.map(preview => (
        <PreviewCard key={preview.url} preview={preview} />
      ))}
    </div>
  )
}
