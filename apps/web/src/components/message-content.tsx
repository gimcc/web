import type { TimelineMessage } from '@matrix-web/matrix-client'
import { useCallback, useMemo } from 'react'
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

  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.hasAttribute('data-mx-spoiler')) {
      target.classList.toggle('revealed')
    }
  }, [])

  return (
    <div
      className="prose prose-sm max-w-none break-words text-inherit prose-p:my-0.5 prose-pre:my-1 prose-pre:bg-black/10 prose-code:rounded prose-code:bg-black/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-inherit prose-code:before:content-none prose-code:after:content-none prose-a:text-inherit prose-a:underline prose-blockquote:border-l-current prose-blockquote:text-inherit prose-blockquote:opacity-70"
      // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
    />
  )
}
