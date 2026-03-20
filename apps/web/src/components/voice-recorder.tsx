import { Send, Square } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'

interface VoiceRecorderProps {
  onSend: (blob: Blob, durationMs: number) => void
  onCancel: () => void
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const { t } = useTranslation()
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [waveform, setWaveform] = useState<number[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const animFrameRef = useRef<number | undefined>(undefined)

  /** Release all hardware resources */
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = undefined
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = undefined
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    mediaRecorderRef.current = null
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      // Set up audio analyser for waveform
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0)
          chunksRef.current.push(e.data)
      }

      mediaRecorder.start(100)
      startTimeRef.current = Date.now()
      setIsRecording(true)
      setDuration(0)
      setWaveform([])

      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current)
      }, 100)

      function updateWaveform() {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed')
          return
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((sum, v) => sum + v, 0) / data.length
        const normalized = Math.min(1, avg / 128)
        setWaveform(prev => [...prev.slice(-30), normalized])
        animFrameRef.current = requestAnimationFrame(updateWaveform)
      }
      updateWaveform()
    }
    catch {
      cleanup()
      onCancel()
    }
  }, [onCancel, cleanup])

  const stopAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state !== 'recording')
      return

    const durationMs = Date.now() - startTimeRef.current

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
      cleanup()
      setIsRecording(false)
      onSend(blob, durationMs)
    }

    recorder.stop()
  }, [onSend, cleanup])

  const stopAndCancel = useCallback(() => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
    cleanup()
    setIsRecording(false)
    onCancel()
  }, [onCancel, cleanup])

  // Start recording on mount; cleanup everything on unmount
  useEffect(() => {
    void startRecording()
    return () => {
      const recorder = mediaRecorderRef.current
      if (recorder && recorder.state === 'recording') {
        recorder.stop()
      }
      cleanup()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3">
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={stopAndCancel}
        aria-label={t('voice.cancel')}
      >
        <Square className="h-5 w-5" />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isRecording && (
          <div className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
        )}

        <div className="flex h-8 flex-1 items-center gap-px">
          {waveform.map((val, i) => (
            <div
              key={i}
              className="w-1 rounded-full bg-primary/60"
              style={{ height: `${Math.max(4, val * 32)}px` }}
            />
          ))}
        </div>

        <span className="shrink-0 font-mono text-sm text-muted-foreground">
          {formatDuration(duration)}
        </span>
      </div>

      <Button
        size="icon-sm"
        onClick={stopAndSend}
        disabled={!isRecording}
        aria-label={t('voice.send')}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  )
}
