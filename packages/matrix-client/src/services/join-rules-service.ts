import type { MatrixClient } from 'matrix-js-sdk'

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
  await client.sendStateEvent(roomId, 'm.room.join_rules' as any, { join_rule: rule })
}
