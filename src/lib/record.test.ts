import { describe, expect, it } from 'vitest'
import type { SingRecord } from '../types'
import { createRecord, formatDate, songRecords, suggestShift } from './record'

function record(songId: string, shift: number, rating: SingRecord['rating'], date: string): SingRecord {
  return { id: `${songId}-${date}`, songId, shift, rating, date }
}

describe('createRecord', () => {
  it('曲・ずらし幅・感想・日時を持つ', () => {
    const r = createRecord('曲1', -5, 'tooHigh', new Date('2026-10-17T12:00:00Z'))
    expect(r).toMatchObject({ songId: '曲1', shift: -5, rating: 'tooHigh', date: '2026-10-17T12:00:00.000Z' })
    expect(r.id).not.toBe('')
  })
})

describe('songRecords', () => {
  it('その曲の記録だけを、新しい順に返す', () => {
    const records = [
      record('曲1', -5, 'tooHigh', '2026-10-01'),
      record('曲2', -3, 'good', '2026-10-05'),
      record('曲1', -6, 'good', '2026-10-17'),
    ]
    expect(songRecords(records, '曲1').map((r) => r.shift)).toEqual([-6, -5])
  })
})

describe('suggestShift', () => {
  it('高すぎなら1つ下げ、低すぎなら1つ上げ、ちょうどいいならそのまま', () => {
    expect(suggestShift(record('曲1', -5, 'tooHigh', '1'))).toBe(-6)
    expect(suggestShift(record('曲1', -9, 'tooLow', '1'))).toBe(-8)
    expect(suggestShift(record('曲1', -5, 'good', '1'))).toBe(-5)
  })
})

describe('formatDate', () => {
  it('月/日 で表示する', () => {
    expect(formatDate(new Date(2026, 9, 17, 20, 0).toISOString())).toBe('10/17')
  })
})
