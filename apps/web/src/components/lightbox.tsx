import { X } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export function Lightbox({ src, alt, onClose }: LightboxProps) {
  const { t } = useTranslation()
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90">
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        onClick={onClose}
        aria-label={t('lightbox.close')}
      >
        <X className="h-6 w-6" />
      </button>

      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label={t('lightbox.close_backdrop')}
      />

      <img
        src={src}
        alt={alt}
        className="relative max-h-[90vh] max-w-[90vw] object-contain"
      />
    </div>
  )
}
