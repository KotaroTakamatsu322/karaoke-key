// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './lib/storage'

beforeEach(() => localStorage.clear())
afterEach(cleanup)

describe('自分の音域の登録（②）', () => {
  it('入力 → 再読み込み → 値が残っている', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 音域が未登録なら、最初は音域の画面が開く
    await user.selectOptions(screen.getByLabelText('最低音'), '43')
    await user.selectOptions(screen.getByLabelText('最高音'), '67')
    await user.selectOptions(screen.getByLabelText('楽に出せる最高音'), '65')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(screen.getByRole('status').textContent).toBe('保存しました')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profile).toEqual({
      low: 43,
      high: 67,
      comfortableHigh: 65,
    })

    // 再読み込みの代わりに、画面を作り直す
    cleanup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '自分の音域' }))

    expect(screen.getByText(/登録中: lowG（G2） 〜 mid2G（G4）/)).toBeTruthy()
    expect((screen.getByLabelText('最低音') as HTMLSelectElement).value).toBe('43')
    expect((screen.getByLabelText('最高音') as HTMLSelectElement).value).toBe('67')
    expect((screen.getByLabelText('楽に出せる最高音') as HTMLSelectElement).value).toBe('65')
    expect((screen.getByLabelText('楽に出せる最低音') as HTMLSelectElement).value).toBe('')
  })

  it('入力に問題があれば保存しない', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('最低音'), '67')
    await user.selectOptions(screen.getByLabelText('最高音'), '43')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(screen.getByRole('alert').textContent).toContain('最低音は最高音より低くしてください')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
