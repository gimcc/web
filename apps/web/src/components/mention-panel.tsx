import type { RoomMemberInfo } from '@matrix-web/matrix-client'
import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'

interface MentionPanelProps {
  members: RoomMemberInfo[]
  selectedIndex: number
  onSelect: (member: RoomMemberInfo) => void
}

export function MentionPanel({ members, selectedIndex, onSelect }: MentionPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (members.length === 0)
    return null

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
    >
      {members.map((member, i) => (
        <button
          key={member.userId}
          type="button"
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
            i === selectedIndex && 'bg-accent',
          )}
          onClick={() => onSelect(member)}
          onMouseDown={e => e.preventDefault()}
        >
          <span className="font-medium text-foreground">{member.displayName}</span>
          <span className="truncate text-xs text-muted-foreground">{member.userId}</span>
        </button>
      ))}
    </div>
  )
}
