// 曲データの CSV 取り込み・書き出し（実装手順書 ⑥）
import type { Song } from '../types'
import { parseNote, toJapanese } from './note'
import { createSong, normalize, sortSongs, updateSong, validateSong, type SongValues } from './song'

const HEADER = ['曲名', 'アーティスト', '最低音', '最高音', '裏声の最高音', '十八番', '女性曲']
const BOM = '﻿'
const MARK = '○'
const MARK_VALUES = ['○', '◯', '〇', '●', '★', '1', 'true', 'yes', 'y', 'はい']

/** 印の欄を読む。列がなければ undefined（わからない）、空なら false */
function readMark(cell: string | undefined): boolean | undefined {
  if (cell === undefined) return undefined
  const v = normalize(cell)
  return v !== '' && MARK_VALUES.includes(v)
}

/** CSV を行と欄に分ける（"…" で囲んだ欄の中のカンマ・改行・"" に対応。BOM・CRLF を許す） */
export function parseCsv(text: string): string[][] {
  const s = text.startsWith(BOM) ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (quoted) {
      if (c !== '"') field += c
      else if (s[i + 1] === '"') {
        field += '"'
        i++
      } else quoted = false
    } else if (c === '"') {
      quoted = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  // 最後の行に改行がないとき
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** 曲を CSV にする（Excel で文字化けしないよう BOM を付け、改行は CRLF） */
export function songsToCsv(songs: Song[]): string {
  const lines = [HEADER, ...sortSongs(songs, 'artist').map((s) => [
    s.title,
    s.artist,
    toJapanese(s.low),
    toJapanese(s.high),
    s.falsettoHigh === undefined ? '' : toJapanese(s.falsettoHigh),
    s.favorite ? MARK : '',
    s.female ? MARK : '',
  ])]
  return BOM + lines.map((cells) => cells.map(escapeField).join(',')).join('\r\n') + '\r\n'
}

export type CsvError = { line: number; message: string }

/** CSV から曲の値を読む。読めない行はエラーの一覧に入れ、ほかの行は読む */
export function parseSongsCsv(text: string): { values: SongValues[]; errors: CsvError[] } {
  const values: SongValues[] = []
  const errors: CsvError[] = []

  parseCsv(text).forEach((cells, i) => {
    const line = i + 1
    if (cells.every((c) => c.trim() === '')) return // 空行
    if (i === 0 && ['曲名', 'title'].includes(normalize(cells[0]))) return // 見出し

    const [title = '', artist = '', low = '', high = '', falsettoHigh = ''] = cells
    const readErrors: string[] = []
    const note = (label: string, text: string) => {
      const t = text.trim()
      if (t === '') return undefined
      try {
        return parseNote(t)
      } catch {
        readErrors.push(`${label}「${t}」が読めません`)
        return undefined
      }
    }
    const draft = {
      title,
      artist,
      low: note('最低音', low),
      high: note('最高音', high),
      falsettoHigh: note('裏声の最高音', falsettoHigh),
      favorite: readMark(cells[5]),
      female: readMark(cells[6]),
    }
    if (readErrors.length > 0) {
      errors.push({ line, message: readErrors.join('、') })
      return
    }

    const result = validateSong(draft)
    if (result.ok) values.push(result.values)
    else errors.push({ line, message: result.errors.map((e) => e.replace('選んでください', '入れてください')).join('、') })
  })

  return { values, errors }
}

/**
 * 取り込んだ曲を足す。曲名とアーティストが同じ曲は上書きする（ID はそのままなので、歌った記録も残る）。
 * CSV の中に同じ曲が2回あれば、後の行を使う
 */
export function mergeSongs(
  songs: Song[],
  values: SongValues[],
  now = new Date(),
): { songs: Song[]; added: number; updated: number } {
  const key = (s: Pick<Song, 'title' | 'artist'>) => `${normalize(s.title)}\n${normalize(s.artist)}`
  const merged = [...songs]
  const index = new Map(merged.map((s, i) => [key(s), i]))
  const added = new Set<string>()
  const updated = new Set<string>()

  for (const v of values) {
    const k = key(v)
    const i = index.get(k)
    if (i === undefined) {
      index.set(k, merged.length)
      merged.push(createSong(v, now))
      added.add(k)
    } else {
      merged[i] = updateSong(merged[i], v, now)
      if (!added.has(k)) updated.add(k)
    }
  }
  return { songs: merged, added: added.size, updated: updated.size }
}
