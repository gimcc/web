import type { RoomMemberInfo, TimelineMessageItem } from '@matrix-web/matrix-client'
import type { CommandDefinition } from '../lib/commands'
import type { CustomEmoji, CustomEmojiPack } from './custom-emoji-types'
import type { PendingUpload } from './upload-preview'
import {
  editMessage,
  getAllEmojiPacks,
  getMatrixClient,
  getRoomMembers,
  getStickerMxcUrl,
  getStickerPacks,
  parseUserId,
  sendMockMessage,
  sendReply,
  sendSticker,
  sendTextMessage,
  uploadAndSendFile,
  uploadMockFile,
  useAuthStore,
  useDraftsStore,
  useMessagesStore,
} from '@matrix-web/matrix-client'
import { CornerUpLeft, Mic, Paperclip, Pencil, Send, Smile, Sticker, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addRecentEmoji } from '../hooks/use-recent-emojis'
import { useSendKey } from '../hooks/use-send-key'
import { filterCommands, findCommand, parseCommandInput } from '../lib/commands'
import { renderMarkdown } from '../lib/markdown'
import { CommandPanel } from './command-panel'
import { EmojiPicker } from './emoji-picker'
import { MentionPanel } from './mention-panel'
import { StickerPicker } from './sticker-picker'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { UploadPreview } from './upload-preview'
import { VoiceRecorder } from './voice-recorder'

interface MessageInputProps {
  roomId: string
  editingMessage?: TimelineMessageItem | null
  replyingTo?: TimelineMessageItem | null
  onCancelEdit?: () => void
  onCancelReply?: () => void
}

const RE_MENTION = /(^|\s)@(\S*)$/

let uploadIdCounter = 0

export function MessageInput({ roomId, editingMessage, replyingTo, onCancelEdit, onCancelReply }: MessageInputProps) {
  const { t } = useTranslation()
  const { sendKey } = useSendKey()
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
  const [isRecording, setIsRecording] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const stickerPickerRef = useRef<HTMLDivElement>(null)
  const stickerButtonRef = useRef<HTMLButtonElement>(null)
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

      // Handle pending uploads — clear from input immediately, show progress in timeline
      if (pendingUploads.length > 0) {
        const uploadsToSend = [...pendingUploads]
        setPendingUploads([])
        for (const upload of uploadsToSend) {
          URL.revokeObjectURL(upload.previewUrl)
          if (mockMode) {
            void uploadMockFile(roomId, upload.file, upload.caption || undefined)
          }
          else {
            void uploadAndSendFile({
              roomId,
              file: upload.file,
              caption: upload.caption || undefined,
            })
          }
        }
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
    // Skip all Enter handling during IME composition
    if (e.nativeEvent.isComposing || e.keyCode === 229)
      return

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

    // Send message based on send key preference
    if (e.key === 'Enter') {
      if (sendKey === 'enter') {
        // Enter sends, Shift+Enter newline
        if (!e.shiftKey) {
          e.preventDefault()
          void sendCurrentMessage()
        }
      }
      else {
        // Cmd/Ctrl+Enter sends, Enter is newline
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          void sendCurrentMessage()
        }
      }
    }
  }, [matchedMembers, selectedMemberIndex, insertMention, matchedCommands, selectedCommandIndex, sendCurrentMessage, editingMessage, replyingTo, onCancelEdit, onCancelReply, sendKey])

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

  const handleReplaceFile = useCallback((id: string, file: File) => {
    setPendingUploads(prev =>
      prev.map((u) => {
        if (u.id !== id)
          return u
        URL.revokeObjectURL(u.previewUrl)
        return { ...u, file, previewUrl: URL.createObjectURL(file) }
      }),
    )
  }, [])

  const handleVoiceSend = useCallback(async (blob: Blob, durationMs: number) => {
    setIsRecording(false)
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type })
      if (mockMode) {
        await uploadMockFile(roomId, file)
      }
      else {
        await uploadAndSendFile({
          roomId,
          file,
          msgtype: 'm.audio',
          info: { duration: durationMs, mimetype: blob.type, size: blob.size },
        })
      }
    }
    catch {
      setCommandError(t('chat.upload_failed'))
    }
  }, [roomId, mockMode, t])

  const handleVoiceCancel = useCallback(() => {
    setIsRecording(false)
  }, [])

  // Emoji picker handlers
  const handleEmojiSelect = useCallback((emoji: string) => {
    addRecentEmoji(emoji)
    const el = textareaRef.current
    const pos = el?.selectionStart ?? text.length
    const before = text.slice(0, pos)
    const after = text.slice(pos)
    const newText = before + emoji + after
    setText(newText)
    setShowEmojiPicker(false)
    requestAnimationFrame(() => {
      if (el) {
        const newPos = pos + emoji.length
        el.selectionStart = newPos
        el.selectionEnd = newPos
        el.focus()
      }
    })
  }, [text])

  const handleCustomEmojiSelect = useCallback((emoji: CustomEmoji) => {
    const shortcode = `:${emoji.shortcode}: `
    const el = textareaRef.current
    const pos = el?.selectionStart ?? text.length
    const before = text.slice(0, pos)
    const after = text.slice(pos)
    const newText = before + shortcode + after
    setText(newText)
    setShowEmojiPicker(false)
    requestAnimationFrame(() => {
      if (el) {
        const newPos = pos + shortcode.length
        el.selectionStart = newPos
        el.selectionEnd = newPos
        el.focus()
      }
    })
  }, [text])

  // Sticker sending handler
  const handleStickerSelect = useCallback(async (sticker: { shortcode: string, url: string, body?: string }) => {
    setShowStickerPicker(false)
    if (mockMode)
      return
    try {
      const mxcUrl = getStickerMxcUrl(sticker.shortcode, roomId)
      if (mxcUrl) {
        await sendSticker({ roomId, url: mxcUrl, body: sticker.body ?? sticker.shortcode })
      }
    }
    catch {
      setCommandError(t('chat.upload_failed'))
    }
  }, [roomId, mockMode, t])

  // Close emoji/sticker picker on outside click
  useEffect(() => {
    if (!showEmojiPicker && !showStickerPicker)
      return

    function handleClickOutside(e: MouseEvent) {
      if (showEmojiPicker) {
        if (
          emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)
          && emojiButtonRef.current && !emojiButtonRef.current.contains(e.target as Node)
        ) {
          setShowEmojiPicker(false)
        }
      }
      if (showStickerPicker) {
        if (
          stickerPickerRef.current && !stickerPickerRef.current.contains(e.target as Node)
          && stickerButtonRef.current && !stickerButtonRef.current.contains(e.target as Node)
        ) {
          setShowStickerPicker(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker, showStickerPicker])

  // Get custom emoji packs
  const customEmojiPacks = useMemo((): CustomEmojiPack[] => {
    if (mockMode)
      return []
    try {
      const packs = getAllEmojiPacks(roomId)
      return packs.map(pack => ({
        id: pack.id,
        name: pack.name,
        avatarUrl: pack.avatarUrl,
        emojis: pack.images
          .filter(img => !img.isSticker)
          .map(img => ({ shortcode: img.shortcode, url: img.url, body: img.body })),
      }))
    }
    catch { return [] }
  }, [roomId, mockMode])

  const stickerPacks = useMemo((): CustomEmojiPack[] => {
    if (mockMode)
      return []
    try {
      const packs = getStickerPacks(roomId)
      return packs.map(pack => ({
        id: pack.id,
        name: pack.name,
        avatarUrl: pack.avatarUrl,
        emojis: pack.images.map(img => ({ shortcode: img.shortcode, url: img.url, body: img.body })),
        isSticker: true,
      }))
    }
    catch { return [] }
  }, [roomId, mockMode])

  if (isRecording) {
    return <VoiceRecorder onSend={(blob, dur) => void handleVoiceSend(blob, dur)} onCancel={handleVoiceCancel} />
  }

  return (
    <div
      className="px-4 py-3"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="mb-2 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 px-4 py-3">
          <p className="text-sm text-primary">{t('chat.drop_files')}</p>
        </div>
      )}

      {/* Card wrapper - relative for picker positioning */}
      <div className="relative">
        {/* Emoji picker - outside overflow-hidden card to avoid clipping */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full left-0 z-50 mb-2">
            <EmojiPicker
              onSelect={handleEmojiSelect}
              onClose={() => setShowEmojiPicker(false)}
              customPacks={customEmojiPacks}
              onSelectCustom={handleCustomEmojiSelect}
            />
          </div>
        )}
        {/* Sticker picker - outside overflow-hidden card to avoid clipping */}
        {showStickerPicker && (
          <div ref={stickerPickerRef} className="absolute bottom-full left-0 z-50 mb-2">
            <StickerPicker
              packs={stickerPacks}
              onSelect={sticker => void handleStickerSelect(sticker)}
              onClose={() => setShowStickerPicker(false)}
            />
          </div>
        )}
        {/* Card container */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          {/* Edit mode indicator */}
          {editingMessage && (
            <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-2">
              <Pencil className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate text-sm text-muted-foreground">
                {t('message.editing_message')}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6"
                onClick={() => {
                  onCancelEdit?.()
                  setText('')
                }}
              >
                <X className="h-4 w-4" />
              </Button>
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
              <Button
                variant="ghost"
                size="icon-xs"
                className="h-6 w-6"
                onClick={onCancelReply}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Command error */}
          {commandError && (
            <div className="px-4 py-1">
              <p className="text-xs text-destructive">{commandError}</p>
            </div>
          )}

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

          {/* Text input area */}
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
            className="max-h-[200px] min-h-[80px] w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Upload previews (inside card) */}
          {pendingUploads.length > 0 && (
            <UploadPreview
              uploads={pendingUploads}
              onRemove={handleRemoveUpload}
              onCaptionChange={handleCaptionChange}
              onReplaceFile={handleReplaceFile}
            />
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-2">
            {/* Left: action buttons */}
            <div className="flex items-center gap-0.5">
              {/* File upload button */}
              {!editingMessage && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleFileSelect}
                      aria-label={t('chat.attach_file')}
                    >
                      <Paperclip className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('chat.attach_file')}</TooltipContent>
                </Tooltip>
              )}

              {/* Emoji picker button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    ref={emojiButtonRef}
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setShowEmojiPicker(v => !v)
                      setShowStickerPicker(false)
                    }}
                    aria-label={t('emoji.picker')}
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('emoji.picker')}</TooltipContent>
              </Tooltip>

              {/* Sticker picker button */}
              {!editingMessage && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      ref={stickerButtonRef}
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setShowStickerPicker(v => !v)
                        setShowEmojiPicker(false)
                      }}
                      aria-label={t('sticker.picker')}
                    >
                      <Sticker className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('sticker.picker')}</TooltipContent>
                </Tooltip>
              )}

              {/* Voice record button (shown when input is empty) */}
              {!editingMessage && text.trim() === '' && pendingUploads.length === 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setIsRecording(true)}
                      aria-label={t('voice.record')}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('voice.record')}</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Right: send button */}
            <Button
              size="sm"
              onClick={() => void sendCurrentMessage()}
              disabled={isSending || (text.trim() === '' && pendingUploads.length === 0)}
              aria-label={editingMessage ? t('common.save') : t('chat.send_message')}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
