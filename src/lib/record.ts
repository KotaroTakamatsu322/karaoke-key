// 歌った記録と、記録をもとにした次のおすすめ（実装手順書 ⑤）
import type { Rating, SingRecord } from '../types'
import { newId } from './song'

export const RATING_LABELS: Record<Rating, string> = {
  tooHigh: '高すぎ',
  good: 'ちょうどいい',
  tooLow: '低すぎ',
}

/** 感想の選択肢（画面に並べる順） */
export const RATINGS: Rating[] = ['tooHigh', 'good', 'tooLow']

export function createRecord(songId: string, shift: number, rating: Rating, now = new Date()): SingRecord {
  return { id: newId(), songId, shift, rating, date: now.toISOString() }
}

/** その曲の記録（新しい順） */
export function songRecords(records: SingRecord[], songId: string): SingRecord[] {
  return records.filter((r) => r.songId === songId).sort((a, b) => b.date.localeCompare(a.date))
}

/** 記録をもとにした次のずらし幅（高すぎなら1つ下げ、低すぎなら1つ上げる） */
export function suggestShift(record: SingRecord): number {
  if (record.rating === 'tooHigh') return record.shift - 1
  if (record.rating === 'tooLow') return record.shift + 1
  return record.shift
}

/** 日付の表示（例: 10/17） */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
