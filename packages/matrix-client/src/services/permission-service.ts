import type { ISendEventResponse, MatrixClient } from 'matrix-js-sdk'

export interface PowerLevels {
  users: Record<string, number>
  usersDefault: number
  events: Record<string, number>
  eventsDefault: number
  stateDefault: number
  ban: number
  kick: number
  invite: number
  redact: number
}

export function getRoomPowerLevels(client: MatrixClient, roomId: string): PowerLevels {
  const room = client.getRoom(roomId)
  const event = room?.currentState.getStateEvents('m.room.power_levels', '')
  const content = event?.getContent() ?? {}

  return {
    users: (content.users as Record<string, number>) ?? {},
    usersDefault: (content.users_default as number) ?? 0,
    events: (content.events as Record<string, number>) ?? {},
    eventsDefault: (content.events_default as number) ?? 0,
    stateDefault: (content.state_default as number) ?? 50,
    ban: (content.ban as number) ?? 50,
    kick: (content.kick as number) ?? 50,
    invite: (content.invite as number) ?? 0,
    redact: (content.redact as number) ?? 50,
  }
}

export async function updatePowerLevels(
  client: MatrixClient,
  roomId: string,
  changes: Partial<Pick<PowerLevels, 'eventsDefault' | 'stateDefault' | 'ban' | 'kick' | 'invite' | 'redact'>>,
): Promise<void> {
  const room = client.getRoom(roomId)
  const event = room?.currentState.getStateEvents('m.room.power_levels', '')
  const current = event?.getContent() ?? {}

  const updated = { ...current }
  if (changes.eventsDefault !== undefined)
    updated.events_default = changes.eventsDefault
  if (changes.stateDefault !== undefined)
    updated.state_default = changes.stateDefault
  if (changes.ban !== undefined)
    updated.ban = changes.ban
  if (changes.kick !== undefined)
    updated.kick = changes.kick
  if (changes.invite !== undefined)
    updated.invite = changes.invite
  if (changes.redact !== undefined)
    updated.redact = changes.redact

  const sendStateFn = client.sendStateEvent.bind(client) as (
    roomId: string,
    eventType: string,
    content: Record<string, unknown>,
    stateKey?: string,
  ) => Promise<ISendEventResponse>
  await sendStateFn(roomId, 'm.room.power_levels', updated as Record<string, unknown>)
}

export async function setUserPowerLevel(
  client: MatrixClient,
  roomId: string,
  userId: string,
  level: number,
): Promise<void> {
  const room = client.getRoom(roomId)
  const event = room?.currentState.getStateEvents('m.room.power_levels', '')
  const current = event?.getContent() ?? {}

  const users = { ...(current.users as Record<string, number> ?? {}) }
  users[userId] = level

  const sendStateFn = client.sendStateEvent.bind(client) as (
    roomId: string,
    eventType: string,
    content: Record<string, unknown>,
    stateKey?: string,
  ) => Promise<ISendEventResponse>
  await sendStateFn(roomId, 'm.room.power_levels', { ...current, users } as Record<string, unknown>)
}
