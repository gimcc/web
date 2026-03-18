import type { RoomMemberInfo, TimelineMessage } from '@matrix-web/matrix-client'
import type { CommandDefinition } from '../lib/commands'
import type { PendingUpload } from './upload-preview'
import {
  editMessage,
  getMatrixClient,
  getRoomMembers,
  parseUserId,
  sendMockMessage,
  sendReply,
  sendTextMessage,
  uploadAndSendFile,
  uploadMockFile,
  useAuthStore,
  useDraftsStore,
  useMessagesStore,
} from '@matrix-web/matrix-client'
import { CornerUpLeft, Paperclip, Pencil, Send, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { filterCommands, findCommand, parseCommandInput } from '../lib/commands'
import { renderMarkdown } from '../lib/markdown'
import { CommandPanel } from './command-panel'
import { MentionPanel } from './mention-panel'
import { UploadPreview } from './upload-preview'

interface MessageInputProps {
  roomId: string
  editingMessage?: TimelineMessage | null
  replyingTo?: TimelineMessage | null
  onCancelEdit?: () => void
  onCancelReply?: () => void
}

const RE_MENTION = /(^|\s)@(\S*)$/

let uploadIdCounter = 0

export function MessageInput({ roomId, editingMessage, replyingTo, onCancelEdit, onCancelReply }: MessageInputProps) {
  const { t } = useTranslation()
  const mockMode = useAuthStore(s => s.mockMode)
  const session = useAuthStore(s => s.session)
  const setDraft = useDraftsStore(s => s.setDraft)
  const getDraft = useDraftsStore(s => s.getDraft)
  const clearDraft = useDraftsStore(s => s.clearDraft)

  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [commandError, setCommandError] = useState<string | null>(null)
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])
  const [matchedCommands, setMatchedCommands] = useState<CommandDefinition[]>([])
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [_mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [matchedMembers, setMatchedMembers] = useState<RoomMemberInfo[]>([])
  const [selectedMemberIndex, setSelectedMemberIndex] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevRoomIdRef = useRef(roomId)

  const serverName = session?.userId ? parseUserId(session.userId).serverName : ''

  // Cache room members for mention autocomplete
  const roomMembers = useMemo(() => {
    const client = getMatrixClient()
    if (!client)
      return []
    return getRoomMembers(client, roomId)
  }, [roomId])

  // Keep a ref to current text for cleanup
  const textRef = useRef(text)
  textRef.current = text

  // Drafts: save on room switch, restore on enter
  useEffect(() => {
    if (prevRoomIdRef.current !== roomId) {
      // Save draft for previous room
      if (prevRoomIdRef.current && !editingMessage) {
        setDraft(prevRoomIdRef.current, textRef.current)
      }
      prevRoomIdRef.current = roomId
    }
    // Restore draft for new room
    if (!editingMessage && !replyingTo) {
      const draft = getDraft(roomId)
      setText(draft)
    }
    // Save draft on unmount
    return () => {
      if (textRef.current.trim()) {
        setDraft(roomId, textRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  // Populate edit text
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.body)
      textareaRef.current?.focus()
    }
  }, [editingMessage])

  // Focus on reply
  useEffect(() => {
    if (replyingTo) {
      textareaRef.current?.focus()
    }
  }, [replyingTo])

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el)
      return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  const handleTextChange = useCallback((value: string, cursorPos?: number) => {
    setText(value)
    setCommandError(null)

    // Command autocomplete
    if (value.startsWith('/') && !value.includes(' ')) {
      const matches = filterCommands(value)
      setMatchedCommands(matches)
      setSelectedCommandIndex(0)
      setMentionQuery(null)
      setMatchedMembers([])
      return
    }
    else {
      setMatchedCommands([])
    }

    // Mention autocomplete: detect @query at cursor position
    const pos = cursorPos ?? value.length
    const textBefore = value.slice(0, pos)
    const mentionMatch = textBefore.match(RE_MENTION)

    if (mentionMatch) {
      const query = mentionMatch[2]!.toLowerCase()
      setMentionQuery(query)
      const filtered = roomMembers
        .filter(m =>
          m.displayName.toLowerCase().includes(query)
          || m.userId.toLowerCase().includes(query),
        )
        .slice(0, 8)
      setMatchedMembers(filtered)
      setSelectedMemberIndex(0)
    }
    else {
      setMentionQuery(null)
      setMatchedMembers([])
    }
  }, [roomMembers])

  const sendCurrentMessage = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed && pendingUploads.length === 0)
      return

    setIsSending(true)
    setCommandError(null)

    try {
      // Handle edit mode
      if (editingMessage && trimmed) {
        if (!mockMode) {
          const htmlBody = renderMarkdown(trimmed)
          const hasFormatting = htmlBody !== `<p>${trimmed}</p>\n` && htmlBody !== `<p>${trimmed}</p>`
          await editMessage(roomId, editingMessage.eventId, trimmed, hasFormatting ? { formattedBody: htmlBody } : undefined)
        }
        else {
          useMessagesStore.getState().updateMessage(roomId, editingMessage.eventId, { body: trimmed, edited: true })
        }
        setText('')
        onCancelEdit?.()
        return
      }

      // Handle pending uploads
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
        setPendingUploads(prev => prev.filter(u => !completedIds.includes(u.id)))
        setCommandError(t('chat.upload_failed'))
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
            setCommandError(result.error ?? t('chat.command_failed'))
            return
          }
        }
        else {
          setCommandError(t('chat.unknown_command', { command: parsed.command }))
          return
        }
      }
      else if (replyingTo) {
        // Reply mode
        const htmlBody = renderMarkdown(trimmed)
        const hasFormatting = htmlBody !== `<p>${trimmed}</p>\n` && htmlBody !== `<p>${trimmed}</p>`

        if (mockMode) {
          await sendMockMessage(roomId, trimmed, hasFormatting ? { formattedBody: htmlBody } : undefined)
        }
        else {
          await sendReply(
            roomId,
            replyingTo.eventId,
            replyingTo.senderId,
            replyingTo.body,
            trimmed,
            hasFormatting ? { formattedBody: htmlBody } : undefined,
          )
        }
        onCancelReply?.()
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
      clearDraft(roomId)
      setMatchedCommands([])
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
    finally {
      setIsSending(false)
    }
  }, [text, pendingUploads, mockMode, roomId, serverName, t, editingMessage, replyingTo, onCancelEdit, onCancelReply, clearDraft])

  const insertMention = useCallback((member: RoomMemberInfo) => {
    const el = textareaRef.current
    const pos = el?.selectionStart ?? text.length
    const textBefore = text.slice(0, pos)
    const mentionMatch = textBefore.match(RE_MENTION)
    if (!mentionMatch)
      return

    const matchStart = textBefore.length - mentionMatch[0]!.length + mentionMatch[1]!.length
    const before = text.slice(0, matchStart)
    const after = text.slice(pos)
    const mention = `@${member.displayName} `
    const newText = before + mention + after
    setText(newText)
    setMentionQuery(null)
    setMatchedMembers([])

    // Restore cursor position after mention
    requestAnimationFrame(() => {
      if (el) {
        const newPos = matchStart + mention.length
        el.selectionStart = newPos
        el.selectionEnd = newPos
        el.focus()
      }
    })
  }, [text])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Mention panel navigation
    if (matchedMembers.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMemberIndex(i => Math.max(0, i - 1))
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMemberIndex(i => Math.min(matchedMembers.length - 1, i + 1))
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        insertMention(matchedMembers[selectedMemberIndex]!)
        return
      }
      if (e.key === 'Escape') {
        setMentionQuery(null)
        setMatchedMembers([])
        return
      }
    }

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

    // Cancel edit/reply on Escape
    if (e.key === 'Escape') {
      if (editingMessage) {
        onCancelEdit?.()
        setText('')
        return
      }
      if (replyingTo) {
        onCancelReply?.()
        return
      }
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendCurrentMessage()
    }
  }, [matchedMembers, selectedMemberIndex, insertMention, matchedCommands, selectedCommandIndex, sendCurrentMessage, editingMessage, replyingTo, onCancelEdit, onCancelReply])

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

  // Paste handler
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

  // Drag and drop handler
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
          <p className="text-sm text-primary">{t('chat.drop_files')}</p>
        </div>
      )}

      {/* Edit mode indicator */}
      {editingMessage && (
        <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-2">
          <Pencil className="h-4 w-4 text-primary" />
          <span className="flex-1 truncate text-sm text-muted-foreground">
            {t('message.editing_message')}
          </span>
          <button
            type="button"
            onClick={() => {
              onCancelEdit?.()
              setText('')
            }}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Reply mode indicator */}
      {replyingTo && !editingMessage && (
        <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-2">
          <CornerUpLeft className="h-4 w-4 text-primary" />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-primary">{replyingTo.senderName}</span>
            <p className="truncate text-sm text-muted-foreground">{replyingTo.body}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
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
        {/* Mention panel */}
        <MentionPanel
          members={matchedMembers}
          selectedIndex={selectedMemberIndex}
          onSelect={insertMention}
        />

        {/* Command panel */}
        <CommandPanel
          commands={matchedCommands}
          selectedIndex={selectedCommandIndex}
          onSelect={handleCommandSelect}
        />

        {/* File upload button */}
        {!editingMessage && (
          <button
            type="button"
            onClick={handleFileSelect}
            className="mb-0.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={t('chat.attach_file')}
          >
            <Paperclip className="h-5 w-5" />
          </button>
        )}

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
            handleTextChange(e.target.value, e.target.selectionStart)
            adjustHeight()
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={editingMessage ? t('message.edit_placeholder') : t('chat.message_placeholder')}
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
          aria-label={editingMessage ? t('common.save') : t('chat.send_message')}
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
