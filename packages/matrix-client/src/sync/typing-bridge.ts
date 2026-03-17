import type { MatrixClient, MatrixEvent, RoomMember } from 'matrix-js-sdk'
import { RoomMemberEvent } from 'matrix-js-sdk'
import { useTypingStore } from '../stores/typing-store'

export function createTypingBridge(client: MatrixClient): () => void {
  function onTyping(_event: MatrixEvent, member: RoomMember): void {
    const room = client.getRoom(member.roomId)
    if (!room)
      return

    const typingUserIds = room
      .getMembers()
      .filter(m => m.typing)
      .map(m => m.userId)

    useTypingStore.getState().setTyping(member.roomId, typingUserIds)
  }

  client.on(RoomMemberEvent.Typing, onTyping)

  return () => {
    client.removeListener(RoomMemberEvent.Typing, onTyping)
  }
}
