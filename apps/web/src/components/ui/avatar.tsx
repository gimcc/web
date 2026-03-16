import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const

type AvatarSize = keyof typeof sizeMap

export interface AvatarProps extends ComponentProps<'div'> {
  name: string
  src?: string
  size?: AvatarSize
}

const WHITESPACE_RE = /\s+/

function getInitials(name: string): string {
  return name
    .split(WHITESPACE_RE)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('')
}

function hashColor(name: string): string {
  let hash = 0
  for (const char of name) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `oklch(0.65 0.15 ${hue})`
}

export function Avatar({ name, src, size = 'md', className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white',
        sizeMap[size],
        className,
      )}
      style={src ? undefined : { backgroundColor: hashColor(name) }}
      {...props}
    >
      {src
        ? (
            <img
              src={src}
              alt={name}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )
        : (
            <span>{getInitials(name)}</span>
          )}
    </div>
  )
}
