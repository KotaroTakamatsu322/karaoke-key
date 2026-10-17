import { describe, expect, it } from 'vitest'
import { calcKey, toMachineKey } from './key'
import type { VoiceProfile } from '../types'

// 実装手順書 7章: 自分の音域は lowG(43)〜mid2G(67)
const me: VoiceProfile = { low: 43, high: 67 }

describe('calcKey（7章のテストケース）', () => {
  it('#1 mid1C〜hiB: キー -4 で歌える', () => {
    const r = calcKey(me, { low: 48, high: 71 }, 'high')
    expect(r).toMatchObject({ shift: -4, machineKey: -4, octave: 0, status: 'adjusted' })
    expect(r.shiftedHigh).toBe(67)
  })

  it('#2 mid1C〜mid2E: 原曲キーで歌える', () => {
    const r = calcKey(me, { low: 48, high: 64 }, 'high')
    expect(r).toMatchObject({ shift: 0, machineKey: 0, octave: 0, status: 'original' })
  })

  it('#3 mid1G〜hiE: オクターブ下で キー +3', () => {
    const r = calcKey(me, { low: 55, high: 76 }, 'high')
    expect(r).toMatchObject({ shift: -9, machineKey: 3, octave: -1, status: 'octaveDown' })
  })

  it('#4 lowF〜hiC: 音域が足りない。出せない低音が7半音', () => {
    const r = calcKey(me, { low: 41, high: 72 }, 'high')
    expect(r).toMatchObject({ shift: -5, machineKey: -5, status: 'tooWide', missingLow: 7 })
  })

  it('#5 mid1D〜hiA#、center: shift -5', () => {
    const r = calcKey(me, { low: 50, high: 70 }, 'center')
    expect(r).toMatchObject({ shift: -5, status: 'adjusted' })
  })

  it('#6 mid1D〜hiB、楽に出せる最高音 mid2F: shift -6', () => {
    const r = calcKey({ ...me, comfortableHigh: 65 }, { low: 50, high: 71 }, 'high')
    expect(r).toMatchObject({ shift: -6, status: 'adjusted' })
  })
})

describe('calcKey（その他）', () => {
  it('曲が低すぎるときはキーを上げる', () => {
    const r = calcKey(me, { low: 40, high: 60 }, 'high')
    expect(r).toMatchObject({ shift: 7, machineKey: 7, octave: 0, status: 'adjusted' })
  })

  it('+7 を超えるときはオクターブ上', () => {
    const r = calcKey(me, { low: 30, high: 50 }, 'high')
    expect(r).toMatchObject({ shift: 17, machineKey: 5, octave: 1, status: 'octaveUp' })
  })

  it('収まる曲では missingLow は 0', () => {
    expect(calcKey(me, { low: 48, high: 71 }, 'high').missingLow).toBe(0)
  })

  it('center でも原曲キーで歌えるなら 0', () => {
    expect(calcKey(me, { low: 48, high: 64 }, 'center').shift).toBe(0)
  })
})

describe('toMachineKey（カラオケ機の設定値に直す）', () => {
  it('キー幅 ±7: -7〜+7 はそのまま、外は1オクターブずらす', () => {
    expect(toMachineKey(-7)).toEqual({ octave: 0, machineKey: -7 })
    expect(toMachineKey(-8)).toEqual({ octave: -1, machineKey: 4 })
    expect(toMachineKey(7)).toEqual({ octave: 0, machineKey: 7 })
    expect(toMachineKey(8)).toEqual({ octave: 1, machineKey: -4 })
    expect(toMachineKey(0)).toEqual({ octave: 0, machineKey: 0 })
  })

  it('キー幅 ±6（JOYSOUND）: ±7 から1オクターブずらす', () => {
    expect(toMachineKey(-6, 6)).toEqual({ octave: 0, machineKey: -6 })
    expect(toMachineKey(-7, 6)).toEqual({ octave: -1, machineKey: 5 })
    expect(toMachineKey(7, 6)).toEqual({ octave: 1, machineKey: -5 })
  })
})

describe('calcKey（±7 の境目）', () => {
  it('ずらし幅 -7 はキー調整、-8 はオクターブ下推奨', () => {
    expect(calcKey(me, { low: 50, high: 74 }, 'high')).toMatchObject({ shift: -7, status: 'adjusted', octave: 0 })
    expect(calcKey(me, { low: 52, high: 75 }, 'high')).toMatchObject({ shift: -8, status: 'octaveDown', machineKey: 4 })
  })

  it('音域が足りない曲は、ずらし幅が -8 より下でも「音域が足りない」を優先する', () => {
    // 曲 mid1C(48)〜hihiC(84): 高音に合わせると -17、低音が 22半音 出ない
    const r = calcKey(me, { low: 48, high: 84 }, 'high')
    expect(r).toMatchObject({ shift: -17, status: 'tooWide', octave: -1, machineKey: -5 })
    expect(r.missingLow).toBe(43 - (48 - 17))
  })

  it('音域が足りない曲は、合わせ方 center でも高音側に合わせる', () => {
    expect(calcKey(me, { low: 41, high: 72 }, 'center').shift).toBe(-5)
  })

  it('楽に出せる最低音だけ登録したときも、そちらを使う', () => {
    // 楽に出せる最低音 mid1C(48)。曲 lowA#(46)〜mid2E(64) は低音が足りないので上げる
    expect(calcKey({ ...me, comfortableLow: 48 }, { low: 46, high: 64 }, 'high')).toMatchObject({ shift: 3 })
  })
})

describe('calcKey（裏声）', () => {
  const withFalsetto: VoiceProfile = { ...me, falsettoHigh: 72 } // 裏声は hiC まで

  it('キーは地声の音域で決め、裏声の最高音はキーに使わない', () => {
    const r = calcKey(withFalsetto, { low: 48, high: 71, falsettoHigh: 78 }, 'high')
    expect(r).toMatchObject({ shift: -4, machineKey: -4 })
  })

  it('ずらした後の裏声の最高音が、自分の裏声の最高音を超える分を返す', () => {
    expect(calcKey(withFalsetto, { low: 48, high: 71, falsettoHigh: 76 }, 'high').falsettoShortage).toBe(0)
    expect(calcKey(withFalsetto, { low: 48, high: 71, falsettoHigh: 78 }, 'high').falsettoShortage).toBe(2)
  })

  it('曲か自分のどちらかの裏声が未登録なら 0', () => {
    expect(calcKey(me, { low: 48, high: 71, falsettoHigh: 90 }, 'high').falsettoShortage).toBe(0)
    expect(calcKey(withFalsetto, { low: 48, high: 71 }, 'high').falsettoShortage).toBe(0)
  })
})
