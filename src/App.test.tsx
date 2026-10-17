// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './lib/storage'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

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

  it('選んだ音域をその場で図にする（改善案 ②）', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.queryByRole('figure', { name: '自分の音域の図' })).toBeNull()

    await user.selectOptions(screen.getByLabelText('最低音'), '43')
    await user.selectOptions(screen.getByLabelText('最高音'), '67')
    const chart = () => within(screen.getByRole('figure', { name: '自分の音域の図' }))
    expect(chart().getByText(/出せる音域 lowG 〜 mid2G（2オクターブ）/)).toBeTruthy()
    expect(chart().getByText('mid1')).toBeTruthy() // 目盛り
    expect(chart().queryByText(/楽に出せる音域/)).toBeNull()

    await user.selectOptions(screen.getByLabelText('楽に出せる最高音'), '65')
    expect(chart().getByText(/楽に出せる音域 lowG 〜 mid2F（1オクターブと10半音）/)).toBeTruthy()

    // 入力に問題があるあいだは出さない
    await user.selectOptions(screen.getByLabelText('最高音'), '43')
    expect(screen.queryByRole('figure', { name: '自分の音域の図' })).toBeNull()
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

describe('曲の登録・一覧（③）', () => {
  type User = ReturnType<typeof userEvent.setup>

  async function addSong(user: User, title: string, artist: string, low: number, high: number) {
    await user.type(screen.getByLabelText('曲名'), title)
    await user.type(screen.getByLabelText('アーティスト'), artist)
    await user.selectOptions(screen.getByLabelText('最低音'), String(low))
    await user.selectOptions(screen.getByLabelText('最高音'), String(high))
    await user.click(screen.getByRole('button', { name: '登録する' }))
  }

  // 高め（最高音に合わせる）のキー
  function keyOf(title: string) {
    return within(screen.getByRole('listitem', { name: title })).getAllByTestId('recommended-key')[0].textContent
  }

  beforeEach(() => {
    // 自分の音域 lowG(43)〜mid2G(67)（手順書 7章）
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: { low: 43, high: 67 } }))
  })

  it('3曲登録すると、それぞれ正しいおすすめキーが出て、再読み込みしても残る', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addSong(user, '曲1', '歌手A', 48, 71)
    await addSong(user, '曲2', '歌手B', 48, 64)
    await addSong(user, '曲3', '歌手C', 55, 76)

    expect(keyOf('曲1')).toBe('キー -4')
    expect(keyOf('曲2')).toBe('原曲キー')
    expect(keyOf('曲3')).toBe('1オクターブ下・キー +3')

    cleanup()
    render(<App />)
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(keyOf('曲1')).toBe('キー -4')
  })

  it('編集・削除・検索ができる', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(<App />)

    await addSong(user, '曲1', '歌手A', 48, 71)
    await addSong(user, '曲2', '歌手B', 48, 64)

    // 編集: 最高音を hiB(71) → hiA#(70) にすると -3 になる
    await user.click(within(screen.getByRole('listitem', { name: '曲1' })).getByRole('button', { name: '編集' }))
    expect((screen.getByLabelText('曲名') as HTMLInputElement).value).toBe('曲1')
    await user.selectOptions(screen.getByLabelText('最高音'), '70')
    await user.click(screen.getByRole('button', { name: '変更を保存' }))
    expect(keyOf('曲1')).toBe('キー -3')

    // 検索
    await user.type(screen.getByLabelText('曲名・アーティストで検索'), '歌手B')
    expect(screen.getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['曲2'])
    await user.clear(screen.getByLabelText('曲名・アーティストで検索'))

    // 削除
    await user.click(within(screen.getByRole('listitem', { name: '曲2' })).getByRole('button', { name: '削除' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).songs).toHaveLength(1)
  })

  it('音域が未登録なら、登録を促すメッセージを出す', async () => {
    localStorage.clear()
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '曲' }))

    expect(screen.getByText(/自分の音域が登録されていないため/)).toBeTruthy()
    await addSong(user, '曲1', '歌手A', 48, 71)
    expect(screen.queryByTestId('recommended-key')).toBeNull()

    await user.click(screen.getByRole('button', { name: '音域を登録する' }))
    expect(screen.getByRole('heading', { name: '自分の音域' })).toBeTruthy()
  })
})

describe('判定ラベルと音域の図（④）', () => {
  function song(id: string, low: number, high: number) {
    return { id, title: id, artist: '', low, high, createdAt: id, updatedAt: id }
  }

  function statusOf(title: string) {
    return within(screen.getByRole('listitem', { name: title })).getAllByTestId('status')[0].textContent
  }

  beforeEach(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { low: 43, high: 67 },
        songs: [song('曲1', 48, 71), song('曲2', 48, 64), song('曲3', 55, 76), song('曲4', 41, 72), song('曲5', 50, 70)],
      }),
    )
  })

  it('判定ラベルと歌い方の説明が出る', () => {
    render(<App />)
    expect(statusOf('曲1')).toBe('キー調整で歌える')
    expect(statusOf('曲2')).toBe('原曲キーで歌える')
    expect(statusOf('曲3')).toBe('オクターブ下推奨')
    expect(statusOf('曲4')).toBe('音域が足りない')

    // キーが1つにまとまる曲は、歌い方の説明を出す
    const item4 = within(screen.getByRole('listitem', { name: '曲4' }))
    expect(item4.getByText('高い音に合わせるとキー -5。低い音が 7半音 出ません')).toBeTruthy()
  })

  it('音域の図で、自分・原曲・調整後の音域と出せない低音を表示する', () => {
    render(<App />)
    const item4 = within(screen.getByRole('listitem', { name: '曲4' }))
    expect(item4.getByText('lowG 〜 mid2G')).toBeTruthy() // 自分
    expect(item4.getByText('lowF 〜 hiC')).toBeTruthy() // 原曲
    expect(item4.getByText(/低い音が 7半音 出ない/)).toBeTruthy()
  })

})

describe('2つの合わせ方のキーを並べる（改善案 ①）', () => {
  function song(id: string, low: number, high: number) {
    return { id, title: id, artist: '', low, high, createdAt: id, updatedAt: id }
  }

  function keysOf(title: string) {
    const item = within(screen.getByRole('listitem', { name: title }))
    return item.getAllByTestId('recommended-key').map((el) => el.textContent)
  }

  beforeEach(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { low: 43, high: 67 },
        songs: [song('曲5', 50, 70), song('曲2', 48, 64), song('曲4', 41, 72), song('曲6', 50, 74)],
      }),
    )
  })

  it('高め（最高音に合わせる）と低め（真ん中に合わせる）を並べて出す', () => {
    render(<App />)
    const item5 = within(screen.getByRole('listitem', { name: '曲5' }))
    expect(keysOf('曲5')).toEqual(['キー -3', 'キー -5'])
    expect(item5.getAllByText('高め')).toHaveLength(2) // キーの行と音域の図
    expect(item5.getAllByText('低め')).toHaveLength(2)
    expect(screen.queryByLabelText('真ん中に合わせる')).toBeNull() // 切り替えはなくなった
  })

  it('同じキーになるときは1つだけ出す', () => {
    render(<App />)
    expect(keysOf('曲2')).toEqual(['原曲キー'])
    expect(keysOf('曲4')).toEqual(['キー -5'])
    expect(within(screen.getByRole('listitem', { name: '曲2' })).queryByText('高め')).toBeNull()
  })

  it('ずらし幅 -7 のときは ±6 の機種の設定も添える', () => {
    render(<App />)
    const item6 = within(screen.getByRole('listitem', { name: '曲6' }))
    expect(keysOf('曲6')).toEqual(['キー -7'])
    expect(item6.getByTestId('joysound-key').textContent).toBe('±6: 1オクターブ下・キー +5')
  })
})
