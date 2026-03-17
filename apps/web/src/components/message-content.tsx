import type { TimelineMessage } from '@matrix-web/matrix-client'
import { useMemo } from 'react'
import { renderFormattedBody, renderMarkdown } from '../lib/markdown'

interface MessageContentProps {
  message: TimelineMessage
}

export function MessageContent({ message }: MessageContentProps) {
  const html = useMemo(() => {
    if (message.formattedBody) {
      return renderFormattedBody(message.formattedBody)
    }
    return renderMarkdown(message.body)
  }, [message.body, message.formattedBody])

  return (
    <div
      className="prose prose-sm max-w-none break-words text-foreground prose-p:my-0.5 prose-pre:my-1 prose-pre:bg-muted prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-a:text-primary prose-a:underline prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
