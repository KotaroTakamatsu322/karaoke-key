// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { toFrequency } from './lib/note'
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

  it('最初はアーティスト順に並び、登録済みのアーティストを候補に出す', async () => {
    const user = userEvent.setup()
    render(<App />)

    await addSong(user, '曲A', 'ケツメイシ', 48, 64)
    await addSong(user, '曲B', 'あいみょん', 48, 64)

    expect((screen.getByLabelText('並べ替え') as HTMLSelectElement).value).toBe('artist')
    expect(screen.getAllByRole('listitem').map((li) => li.getAttribute('aria-label'))).toEqual(['曲B', '曲A'])

    const input = screen.getByLabelText('アーティスト') as HTMLInputElement
    const options = [...input.list!.querySelectorAll('option')].map((o) => o.value)
    expect(options).toEqual(['あいみょん', 'ケツメイシ'])
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

describe('地声と裏声を分ける（改善案 ③）', () => {
  beforeEach(() => {
    // 自分: 地声 lowG(43)〜mid2G(67)、裏声 〜 hiC(72)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: { low: 43, high: 67, falsettoHigh: 72 } }))
  })

  it('裏声の最高音を入れて登録でき、届かないときは注意を出し、編集で消せる', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(<App />)

    // 地声 mid1C(48)〜hiB(71)、裏声 〜 hiF(78): キー -4 で裏声は hiC#(74) になり、2半音 届かない
    await user.type(screen.getByLabelText('曲名'), '曲1')
    await user.selectOptions(screen.getByLabelText('最低音'), '48')
    await user.selectOptions(screen.getByLabelText('最高音'), '71')
    await user.selectOptions(screen.getByLabelText('裏声の最高音（任意）'), '78')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    const item = () => within(screen.getByRole('listitem', { name: '曲1' }))
    expect(item().getAllByTestId('recommended-key')[0].textContent).toBe('キー -4')
    expect(item().getAllByTestId('falsetto-warning')[0].textContent).toBe('裏声が 2半音 届きません')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).songs[0].falsettoHigh).toBe(78)

    // 編集で裏声の最高音を消すと、注意も消える
    await user.click(item().getByRole('button', { name: '編集' }))
    await user.selectOptions(screen.getAllByLabelText('裏声の最高音（任意）')[0], '')
    await user.click(screen.getByRole('button', { name: '変更を保存' }))
    expect(item().queryByTestId('falsetto-warning')).toBeNull()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).songs[0].falsettoHigh).toBeUndefined()
  })

  it('裏声の最高音が地声の最高音より低くても登録でき、図には文字だけで出す', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 地声 mid1C(48)〜hiB(71)、裏声 〜 mid2E(64)
    await user.type(screen.getByLabelText('曲名'), '曲1')
    await user.selectOptions(screen.getByLabelText('最低音'), '48')
    await user.selectOptions(screen.getByLabelText('最高音'), '71')
    await user.selectOptions(screen.getByLabelText('裏声の最高音（任意）'), '64')
    await user.click(screen.getByRole('button', { name: '登録する' }))

    const item = within(screen.getByRole('listitem', { name: '曲1' }))
    expect(item.getAllByTestId('recommended-key')[0].textContent).toBe('キー -4')
    expect(item.queryByTestId('falsetto-warning')).toBeNull()
    expect(item.getByText(/mid1C 〜 hiB（裏声 〜 mid2E）/)).toBeTruthy()
    // ピンクの棒は「自分」の行（裏声 hiC は地声 mid2G より高い）の1本だけ
    expect(screen.getByRole('listitem', { name: '曲1' }).querySelectorAll('.range-fill.falsetto')).toHaveLength(1)
  })
})

describe('歌った記録（⑤）', () => {
  beforeEach(() => {
    // 自分 lowG(43)〜mid2G(67)。曲5 mid1D(50)〜hiA#(70) は 高め -3・低め -5
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { low: 43, high: 67 },
        songs: [{ id: '曲5', title: '曲5', artist: '', low: 50, high: 70, createdAt: '1', updatedAt: '1' }],
      }),
    )
  })

  const item = () => within(screen.getByRole('listitem', { name: '曲5' }))
  const recordKey = () => item().queryByTestId('record-key')?.textContent

  it('記録すると「記録から」が出て、再読み込みしても残り、削除できる', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(recordKey()).toBeUndefined()

    // 最初は「高め」のキー（-3）が選ばれている
    await user.click(item().getByRole('button', { name: '歌った記録をつける' }))
    const form = within(item().getByRole('form', { name: '歌った記録' }))
    expect((form.getByLabelText('歌ったキー') as HTMLSelectElement).value).toBe('-3')
    expect(form.getByRole('button', { name: '記録する' })).toHaveProperty('disabled', true)

    // キー -3 が高すぎた → 次は -4
    await user.click(form.getByLabelText('高すぎ'))
    await user.click(form.getByRole('button', { name: '記録する' }))
    expect(recordKey()).toBe('キー -4')
    expect(item().getByText(/前回 \d+\/\d+ キー -3：高すぎ/)).toBeTruthy()
    expect(item().getByText('記録から')).toBeTruthy()

    // 再読み込みしても残る
    cleanup()
    render(<App />)
    expect(recordKey()).toBe('キー -4')

    // 次の記録は「記録から」のキーが選ばれていて、新しい記録が優先される
    await user.click(item().getByRole('button', { name: '歌った記録をつける' }))
    const form2 = within(item().getByRole('form', { name: '歌った記録' }))
    expect((form2.getByLabelText('歌ったキー') as HTMLSelectElement).value).toBe('-4')
    await user.click(form2.getByLabelText('ちょうどいい'))
    await user.click(form2.getByRole('button', { name: '記録する' }))
    expect(recordKey()).toBe('キー -4')
    expect(item().getByText('歌った記録（2件）')).toBeTruthy()

    // 記録を全部消すと「記録から」も消える
    for (const button of item().getAllByRole('button', { name: /の記録を削除/ })) await user.click(button)
    expect(recordKey()).toBeUndefined()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records).toEqual([])
  })

  it('曲を消すと、その曲の記録も消える', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    await user.click(item().getByRole('button', { name: '歌った記録をつける' }))
    await user.click(item().getByLabelText('ちょうどいい'))
    await user.click(item().getByRole('button', { name: '記録する' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records).toHaveLength(1)

    await user.click(item().getByRole('button', { name: '削除' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records).toEqual([])
  })
})

describe('CSV の取り込み（⑥）', () => {
  it('ファイルを選ぶと曲が増え、同じ曲は上書きされ、読めない行が出る', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { low: 43, high: 67 },
        songs: [{ id: 'id-1', title: '曲1', artist: '歌手A', low: 48, high: 71, createdAt: '1', updatedAt: '1' }],
        records: [{ id: 'r1', songId: 'id-1', shift: -4, rating: 'good', date: '2026-10-17T00:00:00.000Z' }],
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    const csv = '曲名,アーティスト,最低音,最高音\n曲1,歌手A,mid1C,hiA#\n曲2,歌手B,C3,E4\n曲3,,mid1C,hiZ\n'
    await user.upload(screen.getByLabelText('CSVファイルを選ぶ'), new File([csv], 'songs.csv', { type: 'text/csv' }))

    expect((await screen.findByText('1曲を追加、1曲を上書きしました')).getAttribute('role')).toBe('status')
    expect(screen.getByRole('alert').textContent).toBe('4行目: 最高音「hiZ」が読めません')

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.songs.map((s: { title: string }) => s.title)).toEqual(['曲1', '曲2'])
    expect(saved.songs[0]).toMatchObject({ id: 'id-1', high: 70 }) // 上書き（ID はそのまま）
    expect(saved.records).toHaveLength(1) // 歌った記録は残る
    expect(screen.getAllByRole('listitem', { name: /曲\d/ })).toHaveLength(2)
  })
})

describe('試聴（⑤）', () => {
  // audio.ts は最初に作った AudioContext を使い回すので、このグループでは同じ偽物を使い続ける
  // 鳴らした「のどの音」（sawtooth）の周波数だけを記録する（ビブラート用の sine は除く）
  const frequencies: number[] = []
  const param = () => ({ value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} })
  const node = () => {
    const n = {
      type: '',
      frequency: param(),
      Q: param(),
      gain: param(),
      connect: (next: unknown) => next,
      start: () => n.type === 'sawtooth' && frequencies.push(n.frequency.value),
      stop: () => {},
    }
    return n
  }
  class FakeAudioContext {
    state = 'running'
    currentTime = 0
    destination = {}
    createOscillator = node
    createGain = node
    createBiquadFilter = node
  }

  beforeEach(() => {
    frequencies.length = 0
    vi.stubGlobal('AudioContext', FakeAudioContext)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('音を選ぶと ▶ が押せるようになり、押すと Web Audio で鳴らす', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getAllByRole('button', { name: '音を鳴らす' })[0]).toHaveProperty('disabled', true)
    await user.selectOptions(screen.getByLabelText('最高音'), '67')
    await user.click(screen.getByRole('button', { name: 'mid2Gを鳴らす' }))
    expect(frequencies).toEqual([toFrequency(67)])
  })

  it('キーの行の ▶ で、そのキーで歌ったときの最高音を鳴らす（⑦）', async () => {
    // 自分 lowG(43)〜mid2G(67)。曲5 mid1D(50)〜hiA#(70) は 高め -3・低め -5
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profile: { low: 43, high: 67 },
        songs: [{ id: '曲5', title: '曲5', artist: '', low: 50, high: 70, createdAt: '1', updatedAt: '1' }],
      }),
    )
    const user = userEvent.setup()
    render(<App />)

    const item = within(screen.getByRole('listitem', { name: '曲5' }))
    await user.click(item.getByRole('button', { name: 'キー -3 の最高音 mid2G を鳴らす' }))
    await user.click(item.getByRole('button', { name: 'キー -5 の最高音 mid2F を鳴らす' }))
    expect(frequencies).toEqual([toFrequency(67), toFrequency(65)])
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
