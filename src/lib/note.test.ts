import { describe, expect, it } from 'vitest'
import { formatNote, noteOptions, parseNote, toFrequency, toInternational, toJapanese } from './note'

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
  })

  it('変換して戻すと同じ値になる', () => {
    for (const { value } of noteOptions()) {
      expect(parseNote(toJapanese(value))).toBe(value)
      expect(parseNote(toInternational(value))).toBe(value)
    }
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
