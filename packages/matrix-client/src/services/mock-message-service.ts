import type { TimelineMessage } from '../stores/messages-store'
import { useMessagesStore } from '../stores/messages-store'

const MOCK_USERS = [
  { id: '@alice:localhost', name: 'Alice' },
  { id: '@bob:localhost', name: 'Bob' },
  { id: '@charlie:localhost', name: 'Charlie' },
  { id: '@mock-user:localhost', name: 'You' },
]

const MOCK_MESSAGES: Record<string, Array<{ sender: number, body: string, msgtype?: string, formattedBody?: string }>> = {
  '!mock-general:localhost': [
    { sender: 0, body: 'Hey everyone! Welcome to the general channel.' },
    { sender: 1, body: 'Thanks Alice! Glad to be here.' },
    { sender: 2, body: 'Has anyone tried the new **Markdown** rendering?', formattedBody: 'Has anyone tried the new <strong>Markdown</strong> rendering?' },
    { sender: 0, body: 'Yes! It supports `code blocks` too.' },
    { sender: 3, body: 'This is great, let me test some formatting.' },
    { sender: 1, body: 'Check out this link: https://matrix.org' },
    { sender: 2, body: 'I love the virtual scrolling implementation.' },
    { sender: 0, body: 'The timeline feels really smooth now.' },
    { sender: 3, body: 'Agreed! Even with lots of messages.' },
    { sender: 1, body: 'Can we test image uploads next?' },
    { sender: 2, body: '```typescript\nconst hello = "world";\nconsole.log(hello);\n```', formattedBody: '<pre><code class="language-typescript">const hello = &quot;world&quot;;\nconsole.log(hello);\n</code></pre>' },
    { sender: 0, body: 'Nice code block!' },
    { sender: 1, body: 'The command system is working too. Try /me or /topic.' },
    { sender: 2, body: 'does a happy dance', msgtype: 'm.emote' },
    { sender: 0, body: 'Hello everyone!' },
  ],
  '!mock-random:localhost': [
    { sender: 1, body: 'Anyone up for lunch?' },
    { sender: 0, body: 'Sure! Where should we go?' },
    { sender: 2, body: 'How about the new place downtown?' },
    { sender: 1, body: 'Sounds good to me!' },
    { sender: 0, body: 'Check this out!' },
  ],
  '!mock-dm-alice:localhost': [
    { sender: 0, body: 'Hey, are you free tomorrow?' },
    { sender: 3, body: 'Yes, what time works for you?' },
    { sender: 0, body: 'How about 3pm?' },
    { sender: 3, body: 'Perfect, see you then!' },
    { sender: 0, body: 'See you tomorrow!' },
  ],
  '!mock-dm-bob:localhost': [
    { sender: 1, body: 'Did you get the files I sent?' },
    { sender: 3, body: 'Yes, looking at them now.' },
    { sender: 1, body: 'Let me know if you have questions.' },
    { sender: 3, body: 'Got it, thanks!' },
  ],
  '!mock-dev:localhost': [
    { sender: 2, body: 'PR #42 is ready for review.' },
    { sender: 0, body: 'I\'ll take a look this afternoon.' },
    { sender: 1, body: 'The CI pipeline is green now.' },
    { sender: 2, body: 'PR merged successfully' },
  ],
}

let tempIdCounter = 0

function generateMockEventId(): string {
  return `$mock-event-${++tempIdCounter}-${Date.now()}`
}

export function getMockTimeline(roomId: string): TimelineMessage[] {
  const messages = MOCK_MESSAGES[roomId] ?? []
  const now = Date.now()

  return messages.map((msg, i) => {
    const user = MOCK_USERS[msg.sender]!
    return {
      eventId: generateMockEventId(),
      roomId,
      senderId: user.id,
      senderName: user.name,
      type: 'm.room.message',
      msgtype: msg.msgtype ?? 'm.text',
      body: msg.body,
      formattedBody: msg.formattedBody,
      timestamp: now - (messages.length - i) * 60_000,
      status: 'sent' as const,
    }
  })
}

export function loadMockTimeline(roomId: string): void {
  const messages = getMockTimeline(roomId)
  const store = useMessagesStore.getState()

  const existing = store.getTimeline(roomId)
  if (existing.length > 0)
    return

  const timelines = new Map(store.timelines)
  timelines.set(roomId, messages)
  const hasMore = new Map(store.hasMore)
  hasMore.set(roomId, false)

  useMessagesStore.setState({ timelines, hasMore })
}

export async function sendMockMessage(roomId: string, body: string, options?: {
  formattedBody?: string
  msgtype?: string
}): Promise<void> {
  const store = useMessagesStore.getState()
  const tempId = generateMockEventId()

  const optimistic: TimelineMessage = {
    eventId: tempId,
    roomId,
    senderId: '@mock-user:localhost',
    senderName: 'You',
    type: 'm.room.message',
    msgtype: options?.msgtype ?? 'm.text',
    body,
    formattedBody: options?.formattedBody,
    timestamp: Date.now(),
    status: 'sending',
  }

  store.addOptimisticMessage(optimistic)

  // Simulate network delay
  await new Promise<void>(resolve => setTimeout(resolve, 300))

  const confirmedId = generateMockEventId()
  useMessagesStore.getState().confirmMessage(roomId, tempId, confirmedId)

  // Simulate reply after a short delay
  simulateMockReply(roomId)
}

function simulateMockReply(roomId: string): void {
  const replies = [
    'That\'s interesting!',
    'I see what you mean.',
    'Good point!',
    'Let me think about that...',
    'Thanks for sharing!',
  ]

  setTimeout(() => {
    const user = MOCK_USERS[Math.floor(Math.random() * 3)]!
    const body = replies[Math.floor(Math.random() * replies.length)]!

    const msg: TimelineMessage = {
      eventId: generateMockEventId(),
      roomId,
      senderId: user.id,
      senderName: user.name,
      type: 'm.room.message',
      msgtype: 'm.text',
      body,
      timestamp: Date.now(),
      status: 'sent',
    }

    useMessagesStore.getState().appendMessages(roomId, [msg])
  }, 1500 + Math.random() * 2000)
}

export async function uploadMockFile(roomId: string, file: File, caption?: string): Promise<void> {
  const store = useMessagesStore.getState()
  const tempId = generateMockEventId()

  const msgtype = file.type.startsWith('image/')
    ? 'm.image'
    : file.type.startsWith('video/')
      ? 'm.video'
      : 'm.file'

  const localUrl = URL.createObjectURL(file)

  const optimistic: TimelineMessage = {
    eventId: tempId,
    roomId,
    senderId: '@mock-user:localhost',
    senderName: 'You',
    type: 'm.room.message',
    msgtype,
    body: caption ?? file.name,
    timestamp: Date.now(),
    status: 'sending',
    url: localUrl,
    info: { size: file.size, mimetype: file.type },
    filename: file.name,
  }

  store.addOptimisticMessage(optimistic)

  // Simulate upload delay
  await new Promise<void>(resolve => setTimeout(resolve, 800))

  const confirmedId = generateMockEventId()
  useMessagesStore.getState().confirmMessage(roomId, tempId, confirmedId)
  URL.revokeObjectURL(localUrl)
}
