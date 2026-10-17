import { describe, expect, it } from 'vitest'
import type { KeyResult, Song } from '../types'
import { calcKey } from './key'
import {
  artistNames,
  createSong,
  describeKeyResult,
  filterSongs,
  formatJoysoundKey,
  formatKeyResult,
  sortSongs,
  STATUS_LABELS,
  updateSong,
  validateSong,
} from './song'

function song(title: string, artist: string, createdAt: string): Song {
  return { id: title, title, artist, low: 48, high: 64, createdAt, updatedAt: createdAt }
}

describe('validateSong', () => {
  it('曲名・最低音・最高音があれば登録できる（前後の空白は取る）', () => {
    expect(validateSong({ title: ' 曲A ', artist: ' 歌手A ', low: 48, high: 71 })).toEqual({
      ok: true,
      values: { title: '曲A', artist: '歌手A', low: 48, high: 71 },
    })
  })

  it('アーティストは空でもよい', () => {
    expect(validateSong({ title: '曲A', artist: '', low: 48, high: 71 }).ok).toBe(true)
  })

  it('曲名・最低音・最高音は必須', () => {
    const r = validateSong({ title: '  ', artist: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toHaveLength(3)
  })

  it('最低音 < 最高音 でなければエラー', () => {
    expect(validateSong({ title: '曲A', artist: '', low: 64, high: 64 }).ok).toBe(false)
  })
})

describe('createSong / updateSong', () => {
  it('登録日時と更新日時を付ける', () => {
    const s = createSong({ title: '曲A', artist: '', low: 48, high: 71 }, new Date('2026-01-01T00:00:00Z'))
    expect(s.id).not.toBe('')
    expect(s.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(s.updatedAt).toBe(s.createdAt)

    const u = updateSong(s, { title: '曲B', artist: '', low: 50, high: 70 }, new Date('2026-02-01T00:00:00Z'))
    expect(u).toMatchObject({ id: s.id, title: '曲B', low: 50, high: 70, createdAt: s.createdAt })
    expect(u.updatedAt).toBe('2026-02-01T00:00:00.000Z')
  })
})

describe('filterSongs', () => {
  const songs = [song('Lemon', '米津玄師', '1'), song('マリーゴールド', 'あいみょん', '2')]

  it('曲名とアーティストで絞り込む', () => {
    expect(filterSongs(songs, 'lemon').map((s) => s.title)).toEqual(['Lemon'])
    expect(filterSongs(songs, '米津').map((s) => s.title)).toEqual(['Lemon'])
    expect(filterSongs(songs, 'ゴールド').map((s) => s.title)).toEqual(['マリーゴールド'])
  })

  it('全角・半角を区別しない', () => {
    expect(filterSongs(songs, 'ＬＥＭＯＮ').map((s) => s.title)).toEqual(['Lemon'])
  })

  it('空なら全部', () => {
    expect(filterSongs(songs, ' ')).toHaveLength(2)
  })
})

describe('sortSongs', () => {
  const songs = [
    song('さくら', 'ケツメイシ', '2026-01-02'),
    song('あいのうた', 'ケツメイシ', '2026-01-03'),
    song('かえる', 'あいみょん', '2026-01-01'),
  ]

  it('新しく登録した順', () => {
    expect(sortSongs(songs, 'newest').map((s) => s.title)).toEqual(['あいのうた', 'さくら', 'かえる'])
  })

  it('曲名順', () => {
    expect(sortSongs(songs, 'title').map((s) => s.title)).toEqual(['あいのうた', 'かえる', 'さくら'])
  })

  it('アーティスト順（同じなら曲名順）', () => {
    expect(sortSongs(songs, 'artist').map((s) => s.title)).toEqual(['かえる', 'あいのうた', 'さくら'])
  })

  it('元の配列は変えない', () => {
    sortSongs(songs, 'title')
    expect(songs[0].title).toBe('さくら')
  })
})

describe('artistNames', () => {
  it('重なりと空欄を除き、五十音順に並べる', () => {
    const songs = [
      song('曲1', 'ケツメイシ', '1'),
      song('曲2', 'あいみょん', '2'),
      song('曲3', 'ケツメイシ', '3'),
      song('曲4', '', '4'),
    ]
    expect(artistNames(songs)).toEqual(['あいみょん', 'ケツメイシ'])
  })
})

describe('formatKeyResult', () => {
  const me = { low: 43, high: 67 }

  it('手順書 7章の表の曲', () => {
    expect(formatKeyResult(calcKey(me, { low: 48, high: 71 }, 'high'))).toBe('キー -4')
    expect(formatKeyResult(calcKey(me, { low: 48, high: 64 }, 'high'))).toBe('原曲キー')
    expect(formatKeyResult(calcKey(me, { low: 55, high: 76 }, 'high'))).toBe('1オクターブ下・キー +3')
  })

  it('オクターブ上・キー ±0', () => {
    const r: KeyResult = {
      shift: 12, machineKey: 0, octave: 1, status: 'octaveUp', shiftedLow: 0, shiftedHigh: 0, missingLow: 0,
    }
    expect(formatKeyResult(r)).toBe('1オクターブ上・キー ±0')
    expect(formatKeyResult({ ...r, shift: 3, machineKey: 3, octave: 0, status: 'adjusted' })).toBe('キー +3')
  })
})

describe('formatJoysoundKey（JOYSOUND はキー幅 ±6）', () => {
  const me = { low: 43, high: 67 }
  const joy = (low: number, high: number) => formatJoysoundKey(calcKey(me, { low, high }, 'high'))

  it('ずらし幅 -7 なら、JOYSOUND では 1オクターブ下・キー +5', () => {
    const r = calcKey(me, { low: 50, high: 74 }, 'high')
    expect(formatKeyResult(r)).toBe('キー -7')
    expect(formatJoysoundKey(r)).toBe('1オクターブ下・キー +5')
  })

  it('ずらし幅 +7 なら、JOYSOUND では 1オクターブ上・キー -5', () => {
    expect(formatJoysoundKey(calcKey({ low: 55, high: 79 }, { low: 48, high: 72 }, 'high'))).toBe(
      '1オクターブ上・キー -5',
    )
  })

  it('DAM と同じ設定になるときは出さない', () => {
    expect(joy(50, 73)).toBeNull() // -6
    expect(joy(52, 75)).toBeNull() // -8（どちらも 1オクターブ下・キー +4）
    expect(joy(48, 64)).toBeNull() // 原曲キー
  })
})

describe('判定ラベルと説明（④）', () => {
  const me = { low: 43, high: 67 }
  const label = (low: number, high: number) => STATUS_LABELS[calcKey(me, { low, high }, 'high').status]
  const describe_ = (low: number, high: number) => describeKeyResult(calcKey(me, { low, high }, 'high'))

  it('手順書 7章の表の曲', () => {
    expect(label(48, 71)).toBe('キー調整で歌える')
    expect(label(48, 64)).toBe('原曲キーで歌える')
    expect(label(55, 76)).toBe('オクターブ下推奨')
    expect(label(41, 72)).toBe('音域が足りない')

    expect(describe_(48, 71)).toBe('キーを -4 にすると歌えます')
    expect(describe_(48, 64)).toBe('原曲キーのまま歌えます')
    expect(describe_(55, 76)).toBe('1オクターブ下で歌い、キーは +3')
    expect(describe_(41, 72)).toBe('高い音に合わせるとキー -5。低い音が 7半音 出ません')
  })
})
