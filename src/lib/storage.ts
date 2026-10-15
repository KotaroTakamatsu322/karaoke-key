// localStorage の読み書き（実装手順書 4章）
import type { Settings, SingRecord, Song, VoiceProfile } from '../types'

export const STORAGE_KEY = 'karaoke-key:v1'
const VERSION = 1

export type AppData = {
  version: number
  profile: VoiceProfile | null
  songs: Song[]
  settings: Settings
  records: SingRecord[]
}

export function emptyData(): AppData {
  return { version: VERSION, profile: null, songs: [], settings: { alignMode: 'high' }, records: [] }
}

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

function defaultStore(): KeyValueStore | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** 保存したデータを読む。読めなければ空のデータを返す */
export function loadData(store = defaultStore()): AppData {
  try {
    const text = store?.getItem(STORAGE_KEY)
    if (!text) return emptyData()
    const saved = JSON.parse(text) as Partial<AppData>
    const empty = emptyData()
    return {
      version: VERSION,
      profile: saved.profile ?? null,
      songs: Array.isArray(saved.songs) ? saved.songs : [],
      settings: { ...empty.settings, ...saved.settings },
      records: Array.isArray(saved.records) ? saved.records : [],
    }
  } catch {
    return emptyData()
  }
}

/** データを保存する。成功したら true */
export function saveData(data: AppData, store = defaultStore()): boolean {
  try {
    if (!store) return false
    store.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}
