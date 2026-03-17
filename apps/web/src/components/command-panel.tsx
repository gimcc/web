import type { CommandDefinition } from '../lib/commands'
import { useEffect, useRef } from 'react'
import { cn } from '../lib/utils'

interface CommandPanelProps {
  commands: CommandDefinition[]
  selectedIndex: number
  onSelect: (command: CommandDefinition) => void
}

export function CommandPanel({ commands, selectedIndex, onSelect }: CommandPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const selected = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (commands.length === 0)
    return null

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
    >
      {commands.map((cmd, i) => (
        <button
          key={cmd.name}
          type="button"
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
            i === selectedIndex && 'bg-accent',
          )}
          onClick={() => onSelect(cmd)}
          onMouseDown={e => e.preventDefault()}
        >
          <span className="font-mono font-medium text-primary">{cmd.name}</span>
          <span className="truncate text-muted-foreground">{cmd.description}</span>
          {cmd.args && (
            <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
              {cmd.args}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
