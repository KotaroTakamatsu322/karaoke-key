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

  it('一部だけ保存されているデータ（古い版など）は、足りないところを空で補う', () => {
    const store = fakeStore({ [STORAGE_KEY]: JSON.stringify({ profile: { low: 43, high: 67 } }) })
    expect(loadData(store)).toEqual({ ...emptyData(), profile: { low: 43, high: 67 } })
  })

  it('形のおかしい欄（配列でない songs・records）は空にする', () => {
    const store = fakeStore({ [STORAGE_KEY]: JSON.stringify({ songs: 'x', records: { a: 1 }, settings: null }) })
    const data = loadData(store)
    expect(data.songs).toEqual([])
    expect(data.records).toEqual([])
    expect(data.settings).toEqual({ alignMode: 'high' })
  })

  it('曲と歌った記録も、保存して読み直せる', () => {
    const store = fakeStore()
    const data = {
      ...emptyData(),
      songs: [{ id: 's1', title: '曲', artist: '', low: 48, high: 64, favorite: true, createdAt: '1', updatedAt: '1' }],
      records: [{ id: 'r1', songId: 's1', shift: -3, rating: 'good' as const, date: '2026-10-17T00:00:00.000Z' }],
    }
    saveData(data, store)
    expect(loadData(store)).toEqual(data)
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
