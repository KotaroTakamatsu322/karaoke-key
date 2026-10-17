import { describe, expect, it } from 'vitest'
import { formatNote, noteName, noteOptions, parseNote, toFrequency, toInternational, toJapanese } from './note'

describe('parseNote', () => {
  it('日本式の表記を読む', () => {
    expect(parseNote('hiA')).toBe(69)
    expect(parseNote('mid2C')).toBe(60)
    expect(parseNote('lowG')).toBe(43)
    expect(parseNote('mid1G#')).toBe(56)
    expect(parseNote('lowlowA')).toBe(21)
    expect(parseNote('hihiG#')).toBe(92)
  })

  it('国際表記を読む', () => {
    expect(parseNote('C4')).toBe(60)
    expect(parseNote('A4')).toBe(69)
    expect(parseNote('G2')).toBe(43)
    expect(parseNote('Bb3')).toBe(58)
  })

  it('不正な文字列はエラーにする', () => {
    expect(() => parseNote('midX')).toThrow()
    expect(() => parseNote('')).toThrow()
    expect(() => parseNote('H4')).toThrow()
  })

  it('ない音名（E#・B# など）はエラーにする', () => {
    expect(() => parseNote('mid2E#')).toThrow('音名が読めません')
    expect(() => parseNote('B#3')).toThrow('音名が読めません')
  })
})

describe('MIDI番号から表記へ', () => {
  it('日本式・国際表記に変換する', () => {
    expect(toJapanese(69)).toBe('hiA')
    expect(toJapanese(60)).toBe('mid2C')
    expect(toJapanese(43)).toBe('lowG')
    expect(toInternational(67)).toBe('G4')
    expect(formatNote(67)).toBe('mid2G（G4）')
  })

  it('範囲外はエラーにする', () => {
    expect(() => toJapanese(20)).toThrow()
    expect(() => toJapanese(93)).toThrow()
    expect(() => toInternational(-1)).toThrow('範囲外の音です')
    expect(() => toInternational(128)).toThrow('範囲外の音です')
  })

  it('変換して戻すと同じ値になる', () => {
    for (const { value } of noteOptions()) {
      expect(parseNote(toJapanese(value))).toBe(value)
      expect(parseNote(toInternational(value))).toBe(value)
    }
  })
})

describe('noteName（短い表示）', () => {
  it('選べる範囲は日本式、外（キーをずらした後など）は国際表記', () => {
    expect(noteName(67)).toBe('mid2G')
    expect(noteName(21)).toBe('lowlowA')
    expect(noteName(92)).toBe('hihiG#')
    expect(noteName(20)).toBe('G#0')
    expect(noteName(98)).toBe('D7')
  })
})

describe('parseNote（そのほかの書き方）', () => {
  it('大文字・小文字、前後の空白、フラットを受け付ける', () => {
    expect(parseNote(' MID2G ')).toBe(67)
    expect(parseNote('hiBb')).toBe(70)
    expect(parseNote('c#4')).toBe(61)
  })
})

describe('toFrequency', () => {
  it('hiA (A4) は 440Hz、1オクターブ下がると半分', () => {
    expect(toFrequency(69)).toBe(440)
    expect(toFrequency(57)).toBe(220)
    expect(toFrequency(60)).toBeCloseTo(261.63, 2) // mid2C（ド）
  })
})

describe('noteOptions', () => {
  it('lowlowA〜hihiG# の72音', () => {
    const options = noteOptions()
    expect(options).toHaveLength(72)
    expect(options[0].label).toBe('lowlowA（A0）')
    expect(options.at(-1)?.label).toBe('hihiG#（G#6）')
  })
})
