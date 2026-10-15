import { describe, expect, it } from 'vitest'
import { validateProfile } from './profile'

describe('validateProfile', () => {
  it('最低音と最高音だけで登録できる', () => {
    expect(validateProfile({ low: 43, high: 67 })).toEqual({ ok: true, profile: { low: 43, high: 67 } })
  })

  it('楽に出せる音域も登録できる', () => {
    const r = validateProfile({ low: 43, high: 67, comfortableLow: 45, comfortableHigh: 65 })
    expect(r).toEqual({ ok: true, profile: { low: 43, high: 67, comfortableLow: 45, comfortableHigh: 65 } })
  })

  it('最低音・最高音は必須', () => {
    const r = validateProfile({})
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toHaveLength(2)
  })

  it('最低音 < 最高音 でなければエラー', () => {
    expect(validateProfile({ low: 67, high: 67 }).ok).toBe(false)
    expect(validateProfile({ low: 68, high: 67 }).ok).toBe(false)
  })

  it('楽に出せる音域が限界の音域の外ならエラー', () => {
    expect(validateProfile({ low: 43, high: 67, comfortableLow: 42 }).ok).toBe(false)
    expect(validateProfile({ low: 43, high: 67, comfortableHigh: 68 }).ok).toBe(false)
  })

  it('限界の音域と同じ音なら楽に出せる音域にできる', () => {
    expect(validateProfile({ low: 43, high: 67, comfortableLow: 43, comfortableHigh: 67 }).ok).toBe(true)
  })

  it('楽に出せる最低音 < 楽に出せる最高音 でなければエラー', () => {
    expect(validateProfile({ low: 43, high: 67, comfortableLow: 60, comfortableHigh: 60 }).ok).toBe(false)
  })
})
