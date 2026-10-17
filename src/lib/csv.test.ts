import { describe, expect, it } from 'vitest'
import type { Song } from '../types'
import { mergeSongs, parseCsv, parseSongsCsv, songsToCsv } from './csv'

function song(id: string, title: string, artist: string, low: number, high: number, falsettoHigh?: number): Song {
  return { id, title, artist, low, high, falsettoHigh, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
}

describe('parseCsv', () => {
  it('カンマで欄、改行で行に分ける（CRLF・最後の改行なしも読む）', () => {
    expect(parseCsv('a,b\r\nc,d\ne,f')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
    ])
  })

  it('"…" の中のカンマ・改行・"" を読む', () => {
    expect(parseCsv('"Hello, World","say ""hi""","1行目\n2行目"\n')).toEqual([
      ['Hello, World', 'say "hi"', '1行目\n2行目'],
    ])
  })

  it('BOM と空の欄・空行', () => {
    expect(parseCsv('﻿a,,c\n\n')).toEqual([['a', '', 'c'], ['']])
  })
})

describe('songsToCsv / parseSongsCsv', () => {
  const songs = [
    { ...song('1', '喜劇', '星野源', 45, 71), favorite: true, female: false },
    { ...song('2', 'Hello, World', '"歌手" A', 50, 70, 76), favorite: false, female: true },
    { ...song('3', 'ray', 'BUMP OF CHICKEN', 47, 68), favorite: false, female: false },
  ]

  it('書き出した CSV をそのまま取り込み直すと、元と同じ曲の値になる（⑥ の完了の条件）', () => {
    const csv = songsToCsv(songs)
    expect(csv.startsWith('﻿曲名,アーティスト,最低音,最高音,裏声の最高音,十八番,女性曲\r\n')).toBe(true)

    const { values, errors } = parseSongsCsv(csv)
    expect(errors).toEqual([])
    const pick = ({ title, artist, low, high, falsettoHigh, favorite, female }: Song) => ({
      title,
      artist,
      low,
      high,
      falsettoHigh,
      favorite,
      female,
    })
    const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title)
    expect([...values].sort(byTitle)).toEqual(songs.map(pick).sort(byTitle))
  })

  it('音名は日本式、印は ○ で書き出す', () => {
    expect(songsToCsv([song('1', '曲', '', 45, 71, 76)])).toContain('曲,,mid1A,hiB,hiE,,\r\n')
    expect(songsToCsv([{ ...song('1', '曲', '', 45, 71), favorite: true, female: true }])).toContain(
      '曲,,mid1A,hiB,,○,○\r\n',
    )
  })

  it('国際表記・英語の見出し・裏声と印の列なしでも読める（印はわからない＝undefined）', () => {
    const { values, errors } = parseSongsCsv('title,artist,low,high\n曲A,歌手A,C3,B4\n')
    expect(errors).toEqual([])
    expect(values).toEqual([
      { title: '曲A', artist: '歌手A', low: 48, high: 71, falsettoHigh: undefined, favorite: undefined, female: undefined },
    ])
  })

  it('印の欄は ○・1・true・はい などで付き、空なら付かない', () => {
    const { values } = parseSongsCsv(['曲A,,C3,B4,,○,', '曲B,,C3,B4,,1,TRUE', '曲C,,C3,B4,,はい,◯', '曲D,,C3,B4,,,'].join('\n'))
    expect(values.map((v) => [v.favorite, v.female])).toEqual([
      [true, false],
      [true, true],
      [true, true],
      [false, false],
    ])
  })

  it('読めない行は行番号つきのエラーにして、ほかの行は読む', () => {
    const csv = ['曲名,アーティスト,最低音,最高音', '曲A,,mid1C,hiB', '曲B,,mid1C,hiZ', ',,mid1C,hiB', '', '曲C,,hiB,mid1C'].join('\n')
    const { values, errors } = parseSongsCsv(csv)
    expect(values.map((v) => v.title)).toEqual(['曲A'])
    expect(errors).toEqual([
      { line: 3, message: '最高音「hiZ」が読めません' },
      { line: 4, message: '曲名を入力してください' },
      { line: 6, message: '最低音は最高音より低くしてください' },
    ])
  })

  it('音名の欄が空なら「入れてください」', () => {
    expect(parseSongsCsv('曲A,,,hiB').errors).toEqual([{ line: 1, message: '最低音を入れてください' }])
  })
})

describe('parseSongsCsv（そのほか）', () => {
  it('空のファイル・見出しだけのファイルは、曲もエラーもなし', () => {
    expect(parseSongsCsv('')).toEqual({ values: [], errors: [] })
    expect(parseSongsCsv('﻿曲名,アーティスト,最低音,最高音\r\n')).toEqual({ values: [], errors: [] })
  })

  it('2行目以降に「曲名」という曲があっても、見出しとして飛ばさない', () => {
    const { values } = parseSongsCsv('曲名,アーティスト,最低音,最高音\n曲名,歌手,mid1C,hiA\n')
    expect(values.map((v) => v.title)).toEqual(['曲名'])
  })

  it('曲名に改行が入っていても、書き出し→取り込みで元に戻る', () => {
    const songs = [song('1', '1行目\n2行目', 'A', 48, 64)]
    expect(parseSongsCsv(songsToCsv(songs)).values[0].title).toBe('1行目\n2行目')
  })

  it('曲名・アーティストの前後の空白は取る', () => {
    expect(parseSongsCsv(' 曲A , 歌手A ,mid1C,hiA').values[0]).toMatchObject({ title: '曲A', artist: '歌手A' })
  })
})

describe('mergeSongs', () => {
  const now = new Date('2026-10-17T00:00:00Z')
  const existing = [song('id-1', '喜劇', '星野源', 45, 71)]

  it('曲名とアーティストが同じ曲は上書きし（ID はそのまま）、ほかは足す', () => {
    const r = mergeSongs(
      existing,
      [
        { title: '喜劇', artist: '星野源', low: 45, high: 70, falsettoHigh: 74 },
        { title: '新しい曲', artist: '', low: 48, high: 64 },
      ],
      now,
    )
    expect(r).toMatchObject({ added: 1, updated: 1 })
    expect(r.songs).toHaveLength(2)
    expect(r.songs[0]).toMatchObject({ id: 'id-1', high: 70, falsettoHigh: 74, createdAt: '2026-01-01' })
    expect(r.songs[1]).toMatchObject({ title: '新しい曲', createdAt: now.toISOString() })
  })

  it('全角・半角、大文字・小文字の違いは同じ曲として扱う', () => {
    const r = mergeSongs([song('id-1', 'Lemon', '米津玄師', 45, 71)], [{ title: 'ＬＥＭＯＮ', artist: '米津玄師', low: 45, high: 69 }], now)
    expect(r).toMatchObject({ added: 0, updated: 1 })
    expect(r.songs[0]).toMatchObject({ id: 'id-1', high: 69 })
  })

  it('CSV の中に同じ曲が2回あれば、後の行を使う', () => {
    const r = mergeSongs(
      [],
      [
        { title: '曲A', artist: '', low: 48, high: 64 },
        { title: '曲A', artist: '', low: 48, high: 66 },
      ],
      now,
    )
    expect(r).toMatchObject({ added: 1, updated: 0 })
    expect(r.songs).toHaveLength(1)
    expect(r.songs[0].high).toBe(66)
  })

  it('印の列がない CSV で上書きしても、今の印は残る。列があれば CSV の値になる', () => {
    const marked = [{ ...song('id-1', '曲A', '', 48, 71), favorite: true, female: true }]
    const old = mergeSongs(marked, parseSongsCsv('曲A,,mid1C,hiA').values, now)
    expect(old.songs[0]).toMatchObject({ high: 69, favorite: true, female: true })

    const cleared = mergeSongs(marked, parseSongsCsv('曲A,,mid1C,hiA,,,○').values, now)
    expect(cleared.songs[0]).toMatchObject({ favorite: false, female: true })
  })

  it('上書きで裏声の最高音を消せる', () => {
    const r = mergeSongs([song('id-1', '曲A', '', 48, 71, 76)], [{ title: '曲A', artist: '', low: 48, high: 71 }], now)
    expect(r.songs[0].falsettoHigh).toBeUndefined()
  })
})
