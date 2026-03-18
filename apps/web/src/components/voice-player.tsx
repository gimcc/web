import { Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface VoicePlayerProps {
  url: string
  duration?: number
}

function formatDuration(sec: number): string {
  const min = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${min}:${s.toString().padStart(2, '0')}`
}

export function VoicePlayer({ url, duration: durationHint }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(durationHint ? durationHint / 1000 : 0)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    })

    audio.addEventListener('timeupdate', () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setProgress(audio.currentTime / audio.duration)
      }
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      setProgress(0)
    })

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [url])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio)
      return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    }
    else {
      void audio.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !audio.duration)
      return

    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * audio.duration
    setProgress(ratio)
  }, [])

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      {/* Progress bar */}
      <div
        className="h-1.5 flex-1 cursor-pointer rounded-full bg-muted"
        onClick={handleSeek}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {formatDuration(duration)}
      </span>
    </div>
  )
}
