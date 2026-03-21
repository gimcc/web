import { create } from 'zustand'

export interface ReceiptInfo {
  userId: string
  userName: string
  eventId: string
  ts: number
  isPrivate?: boolean
}

export interface ReceiptsState {
  /** roomId -> userId -> ReceiptInfo (latest read position per user) */
  receipts: Map<string, Map<string, ReceiptInfo>>

  setReceipts: (roomId: string, userReceipts: Map<string, ReceiptInfo>) => void
  updateReceipt: (roomId: string, info: ReceiptInfo) => void
  getReceipts: (roomId: string) => Map<string, ReceiptInfo>
  /** Get receipts grouped by eventId for efficient rendering */
  getReceiptsByEvent: (roomId: string) => Map<string, ReceiptInfo[]>
  clearRoom: (roomId: string) => void
  reset: () => void
}

const initialState = {
  receipts: new Map<string, Map<string, ReceiptInfo>>(),
}

export const useReceiptsStore = create<ReceiptsState>((set, get) => ({
  ...initialState,

  setReceipts: (roomId, userReceipts) => {
    const receipts = new Map(get().receipts)
    receipts.set(roomId, userReceipts)
    set({ receipts })
  },

  updateReceipt: (roomId, info) => {
    const receipts = new Map(get().receipts)
    const roomReceipts = new Map(receipts.get(roomId) ?? new Map())
    roomReceipts.set(info.userId, info)
    receipts.set(roomId, roomReceipts)
    set({ receipts })
  },

  getReceipts: (roomId) => {
    return get().receipts.get(roomId) ?? new Map()
  },

  getReceiptsByEvent: (roomId) => {
    const roomReceipts = get().receipts.get(roomId)
    if (!roomReceipts)
      return new Map()

    const byEvent = new Map<string, ReceiptInfo[]>()
    for (const info of roomReceipts.values()) {
      const list = byEvent.get(info.eventId) ?? []
      list.push(info)
      byEvent.set(info.eventId, list)
    }
    return byEvent
  },

  clearRoom: (roomId) => {
    const receipts = new Map(get().receipts)
    receipts.delete(roomId)
    set({ receipts })
  },

  reset: () => set(initialState),
}))
