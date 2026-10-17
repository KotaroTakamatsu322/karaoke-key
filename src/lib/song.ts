// 曲の入力チェック・検索・並べ替え・おすすめキーの表示
import type { KeyResult, KeyStatus, Song, VoiceProfile } from '../types'
import { calcKey, JOYSOUND_KEY_LIMIT, MACHINE_KEY_LIMIT, toMachineKey } from './key'

export type SongDraft = {
  title: string
  artist: string
  low?: number
  high?: number
  falsettoHigh?: number
  favorite?: boolean
  female?: boolean
}

// falsettoHigh は編集で消せるように、未入力でも undefined として持つ。
// 印（favorite・female）は undefined なら「わからない」として、上書きのときに元の値を残す（印の列がない CSV のため）
export type SongValues = Pick<Song, 'title' | 'artist' | 'low' | 'high' | 'falsettoHigh' | 'favorite' | 'female'>

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
  return {
    ok: true,
    values: {
      title,
      artist,
      low: d.low,
      high: d.high,
      falsettoHigh: d.falsettoHigh,
      favorite: d.favorite,
      female: d.female,
    },
  }
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
  return {
    ...song,
    ...values,
    // 裏声の最高音は、値に入っていなければ消す（編集や CSV で消せるように）
    falsettoHigh: values.falsettoHigh,
    // 印は、わからない（undefined）なら元の値を残す
    favorite: values.favorite ?? song.favorite,
    female: values.female ?? song.female,
    updatedAt: now.toISOString(),
  }
}

export type SongFilter = 'favorite' | 'female' | 'original'

export const SONG_FILTERS: { value: SongFilter; label: string }[] = [
  { value: 'favorite', label: '★十八番' },
  { value: 'female', label: '女性曲' },
  { value: 'original', label: '原曲キーで歌える' },
]

/** 印と「原曲キーで歌える」で絞り込む（複数選んだら、全部に当てはまる曲） */
export function applySongFilters(songs: Song[], filters: SongFilter[], profile: VoiceProfile | null): Song[] {
  return songs.filter((s) =>
    filters.every((f) => {
      if (f === 'favorite') return s.favorite === true
      if (f === 'female') return s.female === true
      // 原曲キーで歌えるかは、合わせ方によらず同じ
      return profile !== null && calcKey(profile, s, 'high').status === 'original'
    }),
  )
}

/** 曲名とアーティストで絞り込む（大文字・小文字、全角・半角は区別しない） */
export function filterSongs(songs: Song[], query: string): Song[] {
  const q = normalize(query)
  if (q === '') return songs
  return songs.filter((s) => normalize(s.title).includes(q) || normalize(s.artist).includes(q))
}

/** 比べるための文字の形（全角・半角、大文字・小文字をそろえ、前後の空白を取る） */
export function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().trim()
}

export type SongOrder = 'newest' | 'title' | 'artist'

export const SONG_ORDERS: { value: SongOrder; label: string }[] = [
  { value: 'artist', label: 'アーティスト順' },
  { value: 'title', label: '曲名順' },
  { value: 'newest', label: '新しく登録した順' },
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

/** 登録済みのアーティスト名（重なりと空欄を除き、五十音順） */
export function artistNames(songs: Song[]): string[] {
  const names = new Set(songs.map((s) => s.artist).filter((a) => a !== ''))
  return [...names].sort(collator.compare)
}

function signed(n: number): string {
  return n === 0 ? '±0' : `${n > 0 ? '+' : ''}${n}`
}

/** ずらし幅を、キー幅 ±limit のカラオケ機での設定として表示する（例: 「キー -4」「1オクターブ下・キー +3」「原曲キー」） */
export function formatShift(shift: number, limit = MACHINE_KEY_LIMIT): string {
  const { octave, machineKey } = toMachineKey(shift, limit)
  const key = `キー ${signed(machineKey)}`
  if (octave === -1) return `1オクターブ下・${key}`
  if (octave === 1) return `1オクターブ上・${key}`
  if (shift === 0) return '原曲キー'
  return key
}

/** おすすめキーの表示 */
export function formatKeyResult(r: KeyResult): string {
  return formatShift(r.shift)
}

/** JOYSOUND（キー幅 ±6）で設定が変わるとき（ずらし幅が ±7 のとき）だけ、その表示を返す */
export function formatJoysoundShift(shift: number): string | null {
  if (toMachineKey(shift, JOYSOUND_KEY_LIMIT).octave === toMachineKey(shift).octave) return null
  return formatShift(shift, JOYSOUND_KEY_LIMIT)
}

export function formatJoysoundKey(r: KeyResult): string | null {
  return formatJoysoundShift(r.shift)
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
