import type { CommandDefinition } from '../lib/commands'
import type { PendingUpload } from './upload-preview'
import {
  getMatrixClient,
  parseUserId,
  sendMockMessage,
  sendTextMessage,
  uploadAndSendFile,
  uploadMockFile,
  useAuthStore,
} from '@matrix-web/matrix-client'
import { Paperclip, Send } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { filterCommands, findCommand, parseCommandInput } from '../lib/commands'
import { renderMarkdown } from '../lib/markdown'
import { CommandPanel } from './command-panel'
import { UploadPreview } from './upload-preview'

interface MessageInputProps {
  roomId: string
}

let uploadIdCounter = 0

export function MessageInput({ roomId }: MessageInputProps) {
  const mockMode = useAuthStore(s => s.mockMode)
  const session = useAuthStore(s => s.session)

  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [commandError, setCommandError] = useState<string | null>(null)
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const [matchedCommands, setMatchedCommands] = useState<CommandDefinition[]>([])
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const serverName = session?.userId ? parseUserId(session.userId).serverName : ''

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el)
      return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  const handleTextChange = useCallback((value: string) => {
    setText(value)
    setCommandError(null)

    // Command autocomplete
    if (value.startsWith('/') && !value.includes(' ')) {
      const matches = filterCommands(value)
      setMatchedCommands(matches)
      setSelectedCommandIndex(0)
    }
    else {
      setMatchedCommands([])
    }
  }, [])

  const sendCurrentMessage = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed && pendingUploads.length === 0)
      return

    setIsSending(true)
    setCommandError(null)

    try {
      // Handle pending uploads — track completed ones for cleanup
      const completedIds: string[] = []
      try {
        for (const upload of pendingUploads) {
          if (mockMode) {
            await uploadMockFile(roomId, upload.file, upload.caption || undefined)
          }
          else {
            await uploadAndSendFile({
              roomId,
              file: upload.file,
              caption: upload.caption || undefined,
            })
          }
          URL.revokeObjectURL(upload.previewUrl)
          completedIds.push(upload.id)
        }
        setPendingUploads([])
      }
      catch {
        // Remove only completed uploads, keep failed ones for retry
        setPendingUploads(prev => prev.filter(u => !completedIds.includes(u.id)))
        setCommandError('Failed to upload file. You can retry.')
        return
      }

      // Handle text message
      if (!trimmed) {
        setText('')
        return
      }

      // Check if it's a command
      const parsed = parseCommandInput(trimmed)
      if (parsed) {
        const cmd = findCommand(parsed.command)
        if (cmd) {
          const sendMessage = async (body: string, options?: { formattedBody?: string, msgtype?: string }) => {
            if (mockMode) {
              await sendMockMessage(roomId, body, options)
            }
            else {
              await sendTextMessage(roomId, body, options)
            }
          }

          const result = await cmd.execute({
            roomId,
            args: parsed.args,
            client: getMatrixClient(),
            serverName,
            sendMessage,
          })

          if (!result.success) {
            setCommandError(result.error ?? 'Command failed')
            return
          }
        }
        else {
          setCommandError(`Unknown command: ${parsed.command}`)
          return
        }
      }
      else {
        // Regular text message with Markdown
        const htmlBody = renderMarkdown(trimmed)
        const hasFormatting = htmlBody !== `<p>${trimmed}</p>\n` && htmlBody !== `<p>${trimmed}</p>`

        if (mockMode) {
          await sendMockMessage(roomId, trimmed, hasFormatting ? { formattedBody: htmlBody } : undefined)
        }
        else {
          await sendTextMessage(roomId, trimmed, hasFormatting ? { formattedBody: htmlBody } : undefined)
        }
      }

      setText('')
      setMatchedCommands([])
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
    finally {
      setIsSending(false)
    }
  }, [text, pendingUploads, mockMode, roomId, serverName])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Command panel navigation
    if (matchedCommands.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedCommandIndex(i => Math.max(0, i - 1))
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedCommandIndex(i => Math.min(matchedCommands.length - 1, i + 1))
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        const cmd = matchedCommands[selectedCommandIndex]!
        setText(`${cmd.name} `)
        setMatchedCommands([])
        return
      }
      if (e.key === 'Escape') {
        setMatchedCommands([])
        return
      }
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendCurrentMessage()
    }
  }, [matchedCommands, selectedCommandIndex, sendCurrentMessage])

  const handleCommandSelect = useCallback((cmd: CommandDefinition) => {
    setText(`${cmd.name} `)
    setMatchedCommands([])
    textareaRef.current?.focus()
  }, [])

  // File handling
  const addFiles = useCallback((files: FileList | File[]) => {
    const newUploads: PendingUpload[] = Array.from(files, file => ({
      id: `upload-${++uploadIdCounter}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
    }))
    setPendingUploads(prev => [...prev, ...newUploads])
  }, [])

  const handleFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }, [addFiles])

  // Paste handler (FEAT-011)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const imageFiles: File[] = []

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file)
          imageFiles.push(file)
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault()
      addFiles(imageFiles)
    }
  }, [addFiles])

  // Drag and drop handler (FEAT-011)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const handleRemoveUpload = useCallback((id: string) => {
    setPendingUploads((prev) => {
      const removed = prev.find(u => u.id === id)
      if (removed)
        URL.revokeObjectURL(removed.previewUrl)
      return prev.filter(u => u.id !== id)
    })
  }, [])

  const handleCaptionChange = useCallback((id: string, caption: string) => {
    setPendingUploads(prev =>
      prev.map(u => u.id === id ? { ...u, caption } : u),
    )
  }, [])

  return (
    <div
      className="border-t border-border"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Upload previews */}
      <UploadPreview
        uploads={pendingUploads}
        onRemove={handleRemoveUpload}
        onCaptionChange={handleCaptionChange}
      />

      {/* Drag overlay */}
      {isDragging && (
        <div className="flex items-center justify-center border-2 border-dashed border-primary bg-primary/5 px-4 py-3">
          <p className="text-sm text-primary">Drop files here to upload</p>
        </div>
      )}

      {/* Command error */}
      {commandError && (
        <div className="px-4 py-1">
          <p className="text-xs text-destructive">{commandError}</p>
        </div>
      )}

      {/* Input area */}
      <div className="relative flex items-end gap-2 px-4 py-3">
        {/* Command panel */}
        <CommandPanel
          commands={matchedCommands}
          selectedIndex={selectedCommandIndex}
          onSelect={handleCommandSelect}
        />

        {/* File upload button */}
        <button
          type="button"
          onClick={handleFileSelect}
          className="mb-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Attach file"
        >
          <Paperclip className="h-5 w-5" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            handleTextChange(e.target.value)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message..."
          rows={1}
          disabled={isSending}
          className="max-h-[200px] min-h-[36px] flex-1 resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />

        {/* Send button */}
        <button
          type="button"
          onClick={() => void sendCurrentMessage()}
          disabled={isSending || (text.trim() === '' && pendingUploads.length === 0)}
          className="mb-0.5 shrink-0 rounded-md bg-primary p-1.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
