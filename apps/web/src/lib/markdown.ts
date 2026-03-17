import DOMPurify from 'dompurify'
import { marked } from 'marked'

// Configure marked for chat-style rendering
marked.setOptions({
  breaks: true,
  gfm: true,
})

const ALLOWED_TAGS = [
  'b',
  'i',
  'em',
  'strong',
  'a',
  'p',
  'br',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'hr',
  'del',
  'sup',
  'sub',
  'span',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]

const ALLOWED_ATTR = ['href', 'target', 'rel', 'class']

// Prevent reverse tabnapping: force rel="noopener noreferrer" on all links
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer')
    node.setAttribute('target', '_blank')
  }
})

export function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string
  return sanitizeHtml(html)
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
  })
}

// For messages that already have formatted_body in HTML
export function renderFormattedBody(formattedBody: string): string {
  return sanitizeHtml(formattedBody)
}
