/**
 * Custom emoji from a Matrix emoji pack (im.ponies.user_emotes / im.ponies.room_emotes).
 */
export interface CustomEmoji {
  shortcode: string
  url: string // resolved HTTP URL (not mxc://)
  body?: string
}

/**
 * An emoji pack containing multiple custom emojis.
 */
export interface CustomEmojiPack {
  id: string
  name: string
  avatarUrl?: string
  emojis: CustomEmoji[]
  /** Whether this pack contains sticker-sized images */
  isSticker?: boolean
}
