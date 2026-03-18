import { resolveUserId } from '@matrix-web/matrix-client'
import { sanitizeHtml } from './markdown'

const WHITESPACE_RE = /\s+/
const RE_AMP = /&/g
const RE_LT = /</g
const RE_GT = />/g
const RE_QUOT = /"/g

export interface CommandDefinition {
  name: string
  description: string
  args: string
  execute: (ctx: CommandContext) => Promise<CommandResult>
}

export interface CommandContext {
  roomId: string
  args: string
  client: { setDisplayName: (name: string) => Promise<unknown>, setRoomTopic: (roomId: string, topic: string) => Promise<unknown>, invite: (roomId: string, userId: string) => Promise<unknown>, kick: (roomId: string, userId: string, reason?: string) => Promise<unknown>, ban: (roomId: string, userId: string, reason?: string) => Promise<unknown>, joinRoom: (roomIdOrAlias: string) => Promise<unknown>, leave: (roomId: string) => Promise<unknown> } | null
  serverName: string
  sendMessage: (body: string, options?: { formattedBody?: string, msgtype?: string }) => Promise<void>
}

export interface CommandResult {
  success: boolean
  error?: string
}

function ok(): CommandResult {
  return { success: true }
}

function fail(error: string): CommandResult {
  return { success: false, error }
}

const commands: CommandDefinition[] = [
  {
    name: '/me',
    description: 'Send an action message',
    args: '<action>',
    execute: async (ctx) => {
      if (!ctx.args.trim())
        return fail('Usage: /me <action>')
      await ctx.sendMessage(ctx.args.trim(), { msgtype: 'm.emote' })
      return ok()
    },
  },
  {
    name: '/nick',
    description: 'Change your display name in this room',
    args: '<name>',
    execute: async (ctx) => {
      if (!ctx.client)
        return fail('Not connected')
      const name = ctx.args.trim()
      if (!name)
        return fail('Usage: /nick <name>')
      try {
        await ctx.client.setDisplayName(name)
        return ok()
      }
      catch {
        return fail('Failed to change display name')
      }
    },
  },
  {
    name: '/topic',
    description: 'Set the room topic',
    args: '<text>',
    execute: async (ctx) => {
      if (!ctx.client)
        return fail('Not connected')
      const topic = ctx.args.trim()
      if (!topic)
        return fail('Usage: /topic <text>')
      try {
        await ctx.client.setRoomTopic(ctx.roomId, topic)
        return ok()
      }
      catch {
        return fail('Failed to set topic')
      }
    },
  },
  {
    name: '/invite',
    description: 'Invite a user to this room',
    args: '<user>',
    execute: async (ctx) => {
      if (!ctx.client)
        return fail('Not connected')
      const input = ctx.args.trim()
      if (!input)
        return fail('Usage: /invite <user>')
      const userId = resolveUserId(input, ctx.serverName)
      try {
        await ctx.client.invite(ctx.roomId, userId)
        return ok()
      }
      catch {
        return fail(`Failed to invite ${userId}`)
      }
    },
  },
  {
    name: '/kick',
    description: 'Kick a user from this room',
    args: '<user> [reason]',
    execute: async (ctx) => {
      if (!ctx.client)
        return fail('Not connected')
      const parts = ctx.args.trim().split(WHITESPACE_RE)
      const input = parts[0]
      if (!input)
        return fail('Usage: /kick <user> [reason]')
      const userId = resolveUserId(input, ctx.serverName)
      const reason = parts.slice(1).join(' ') || undefined
      try {
        await ctx.client.kick(ctx.roomId, userId, reason)
        return ok()
      }
      catch {
        return fail(`Failed to kick ${userId}`)
      }
    },
  },
  {
    name: '/ban',
    description: 'Ban a user from this room',
    args: '<user> [reason]',
    execute: async (ctx) => {
      if (!ctx.client)
        return fail('Not connected')
      const parts = ctx.args.trim().split(WHITESPACE_RE)
      const input = parts[0]
      if (!input)
        return fail('Usage: /ban <user> [reason]')
      const userId = resolveUserId(input, ctx.serverName)
      const reason = parts.slice(1).join(' ') || undefined
      try {
        await ctx.client.ban(ctx.roomId, userId, reason)
        return ok()
      }
      catch {
        return fail(`Failed to ban ${userId}`)
      }
    },
  },
  {
    name: '/join',
    description: 'Join a room',
    args: '<room>',
    execute: async (ctx) => {
      if (!ctx.client)
        return fail('Not connected')
      const roomIdOrAlias = ctx.args.trim()
      if (!roomIdOrAlias)
        return fail('Usage: /join <room>')
      try {
        await ctx.client.joinRoom(roomIdOrAlias)
        return ok()
      }
      catch {
        return fail(`Failed to join ${roomIdOrAlias}`)
      }
    },
  },
  {
    name: '/leave',
    description: 'Leave this room',
    args: '',
    execute: async (ctx) => {
      if (!ctx.client)
        return fail('Not connected')
      try {
        await ctx.client.leave(ctx.roomId)
        return ok()
      }
      catch {
        return fail('Failed to leave room')
      }
    },
  },
  {
    name: '/plain',
    description: 'Send as plain text (no Markdown)',
    args: '<text>',
    execute: async (ctx) => {
      const text = ctx.args.trim()
      if (!text)
        return fail('Usage: /plain <text>')
      await ctx.sendMessage(text)
      return ok()
    },
  },
  {
    name: '/spoiler',
    description: 'Send a spoiler message (hidden until clicked)',
    args: '<text>',
    execute: async (ctx) => {
      const text = ctx.args.trim()
      if (!text)
        return fail('Usage: /spoiler <text>')
      const escaped = text.replace(RE_AMP, '&amp;').replace(RE_LT, '&lt;').replace(RE_GT, '&gt;').replace(RE_QUOT, '&quot;')
      const formattedBody = `<span data-mx-spoiler>${escaped}</span>`
      await ctx.sendMessage(text, { formattedBody })
      return ok()
    },
  },
  {
    name: '/html',
    description: 'Send a message with raw HTML formatting',
    args: '<html>',
    execute: async (ctx) => {
      const text = ctx.args.trim()
      if (!text)
        return fail('Usage: /html <html>')
      const safeHtml = sanitizeHtml(text)
      await ctx.sendMessage(text, { formattedBody: safeHtml })
      return ok()
    },
  },
]

export function getCommands(): CommandDefinition[] {
  return commands
}

export function findCommand(name: string): CommandDefinition | undefined {
  return commands.find(c => c.name === name)
}

export function filterCommands(query: string): CommandDefinition[] {
  const lower = query.toLowerCase()
  return commands.filter(c => c.name.startsWith(lower))
}

export function parseCommandInput(input: string): { command: string, args: string } | null {
  if (!input.startsWith('/'))
    return null

  const spaceIndex = input.indexOf(' ')
  if (spaceIndex === -1) {
    return { command: input.toLowerCase(), args: '' }
  }

  return {
    command: input.slice(0, spaceIndex).toLowerCase(),
    args: input.slice(spaceIndex + 1),
  }
}
