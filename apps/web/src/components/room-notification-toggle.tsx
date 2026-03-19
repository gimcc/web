import type { RoomNotificationLevel } from '@matrix-web/matrix-client'
import { getRoomNotificationLevel, setRoomNotificationLevel } from '@matrix-web/matrix-client'
import { Bell, BellMinus, BellOff } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'

interface RoomNotificationToggleProps {
  roomId: string
}

const LEVELS: { value: RoomNotificationLevel, icon: typeof Bell }[] = [
  { value: 'all', icon: Bell },
  { value: 'mentions', icon: BellMinus },
  { value: 'mute', icon: BellOff },
]

export function RoomNotificationToggle({ roomId }: RoomNotificationToggleProps) {
  const { t } = useTranslation()
  const [level, setLevel] = useState<RoomNotificationLevel>(() =>
    getRoomNotificationLevel(roomId),
  )
  const [open, setOpen] = useState(false)

  const handleChange = useCallback(async (newLevel: RoomNotificationLevel) => {
    setLevel(newLevel)
    setOpen(false)
    try {
      await setRoomNotificationLevel(roomId, newLevel)
    }
    catch {
      // Revert on failure
      setLevel(getRoomNotificationLevel(roomId))
    }
  }, [roomId])

  const CurrentIcon = LEVELS.find(l => l.value === level)?.icon ?? Bell

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={t('notification_level.title')}
        >
          <CurrentIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" side="bottom" align="end">
        {LEVELS.map(({ value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors ${
              level === value
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
            }`}
            onClick={() => void handleChange(value)}
          >
            <Icon className="h-4 w-4" />
            <span>{t(`notification_level.${value}`)}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
