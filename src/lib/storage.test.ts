import { describe, expect, it } from 'vitest'
import { emptyData, loadData, saveData, STORAGE_KEY } from './storage'

function fakeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

describe('storage', () => {
  it('保存したものを読み直せる', () => {
    const store = fakeStore()
    const data = { ...emptyData(), profile: { low: 43, high: 67, comfortableHigh: 65 } }
    expect(saveData(data, store)).toBe(true)
    expect(loadData(store)).toEqual(data)
  })

  it('何も保存されていなければ空のデータ', () => {
    expect(loadData(fakeStore())).toEqual(emptyData())
  })

  it('壊れたデータなら空のデータで起動する', () => {
    expect(loadData(fakeStore({ [STORAGE_KEY]: '{壊れた' }))).toEqual(emptyData())
  })

  it('読み書きで例外が出ても止まらない', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('full')
      },
    }
    expect(loadData(broken)).toEqual(emptyData())
    expect(saveData(emptyData(), broken)).toBe(false)
  })
})
