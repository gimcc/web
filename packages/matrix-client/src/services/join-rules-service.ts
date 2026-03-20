import type { ISendEventResponse, MatrixClient } from 'matrix-js-sdk'
import { EventType } from 'matrix-js-sdk'

export type JoinRule = 'public' | 'invite' | 'knock' | 'restricted' | 'knock_restricted'

/**
 * Get the current join rule for a room.
 */
export function getRoomJoinRule(client: MatrixClient, roomId: string): JoinRule {
  const room = client.getRoom(roomId)
  const event = room?.currentState.getStateEvents('m.room.join_rules', '')
  const rule = event?.getContent()?.join_rule
  if (rule === 'public' || rule === 'invite' || rule === 'knock' || rule === 'restricted' || rule === 'knock_restricted')
    return rule
  return 'invite'
}

/**
 * Set the join rule for a room.
 * Requires sufficient power level (usually state_default or higher).
 */
export async function setRoomJoinRule(
  client: MatrixClient,
  roomId: string,
  rule: JoinRule,
): Promise<void> {
  // Our JoinRule type includes 'knock_restricted' which isn't in the SDK's JoinRule enum,
  // so we cast the method to accept our broader string union.
  const sendStateEventFn = client.sendStateEvent.bind(client) as (
    roomId: string,
    eventType: string,
    content: Record<string, unknown>,
    stateKey?: string,
  ) => Promise<ISendEventResponse>
  await sendStateEventFn(roomId, EventType.RoomJoinRules, { join_rule: rule })
}
