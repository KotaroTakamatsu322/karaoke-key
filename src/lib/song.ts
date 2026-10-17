// 曲の入力チェック・検索・並べ替え・おすすめキーの表示
import type { KeyResult, KeyStatus, Song } from '../types'
import { JOYSOUND_KEY_LIMIT, toMachineKey } from './key'

export type SongDraft = {
  title: string
  artist: string
  low?: number
  high?: number
}

export type SongValues = Pick<Song, 'title' | 'artist' | 'low' | 'high'>

/** 入力に問題がなければ曲の値を、あればエラーメッセージの一覧を返す */
export function validateSong(
  d: SongDraft,
): { ok: true; values: SongValues } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const title = d.title.trim()
  const artist = d.artist.trim()

  if (title === '') errors.push('曲名を入力してください')
  if (d.low === undefined) errors.push('最低音を選んでください')
  if (d.high === undefined) errors.push('最高音を選んでください')
  if (d.low !== undefined && d.high !== undefined && d.low >= d.high) {
    errors.push('最低音は最高音より低くしてください')
  }

  if (errors.length > 0 || d.low === undefined || d.high === undefined) {
    return { ok: false, errors }
  }
  return { ok: true, values: { title, artist, low: d.low, high: d.high } }
}

/** 重ならない ID を作る（crypto.randomUUID は http のスマホ確認では使えないため予備を用意する） */
export function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
  }
}

export function createSong(values: SongValues, now = new Date()): Song {
  const at = now.toISOString()
  return { id: newId(), ...values, createdAt: at, updatedAt: at }
}

export function updateSong(song: Song, values: SongValues, now = new Date()): Song {
  return { ...song, ...values, updatedAt: now.toISOString() }
}

/** 曲名とアーティストで絞り込む（大文字・小文字、全角・半角は区別しない） */
export function filterSongs(songs: Song[], query: string): Song[] {
  const q = normalize(query)
  if (q === '') return songs
  return songs.filter((s) => normalize(s.title).includes(q) || normalize(s.artist).includes(q))
}

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().trim()
}

export type SongOrder = 'newest' | 'title' | 'artist'

export const SONG_ORDERS: { value: SongOrder; label: string }[] = [
  { value: 'newest', label: '新しく登録した順' },
  { value: 'title', label: '曲名順' },
  { value: 'artist', label: 'アーティスト順' },
]

const collator = new Intl.Collator('ja')

export function sortSongs(songs: Song[], order: SongOrder): Song[] {
  const sorted = [...songs]
  if (order === 'newest') {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  } else if (order === 'title') {
    sorted.sort((a, b) => collator.compare(a.title, b.title))
  } else {
    sorted.sort((a, b) => collator.compare(a.artist, b.artist) || collator.compare(a.title, b.title))
  }
  return sorted
}

function signed(n: number): string {
  return n === 0 ? '±0' : `${n > 0 ? '+' : ''}${n}`
}

/** おすすめキーの表示（例: 「キー -4」「1オクターブ下・キー +3」「原曲キー」） */
export function formatKeyResult(r: KeyResult): string {
  const key = `キー ${signed(r.machineKey)}`
  if (r.octave === -1) return `1オクターブ下・${key}`
  if (r.octave === 1) return `1オクターブ上・${key}`
  if (r.shift === 0) return '原曲キー'
  return key
}

/** JOYSOUND（キー幅 ±6）で設定が変わるとき（ずらし幅が ±7 のとき）だけ、その表示を返す */
export function formatJoysoundKey(r: KeyResult): string | null {
  const j = toMachineKey(r.shift, JOYSOUND_KEY_LIMIT)
  if (j.octave === r.octave) return null
  return formatKeyResult({ ...r, ...j })
}

/** 判定ラベル */
export const STATUS_LABELS: Record<KeyStatus, string> = {
  original: '原曲キーで歌える',
  adjusted: 'キー調整で歌える',
  octaveDown: 'オクターブ下推奨',
  octaveUp: 'オクターブ上推奨',
  tooWide: '音域が足りない',
}

/** 歌い方の説明（例: 「1オクターブ下で歌い、キーは +3」） */
export function describeKeyResult(r: KeyResult): string {
  if (r.status === 'tooWide') {
    return `高い音に合わせると${formatKeyResult(r)}。低い音が ${r.missingLow}半音 出ません`
  }
  if (r.octave === -1) return `1オクターブ下で歌い、キーは ${signed(r.machineKey)}`
  if (r.octave === 1) return `1オクターブ上で歌い、キーは ${signed(r.machineKey)}`
  if (r.shift === 0) return '原曲キーのまま歌えます'
  return `キーを ${signed(r.machineKey)} にすると歌えます`
}
