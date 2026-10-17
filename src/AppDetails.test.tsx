// @vitest-environment jsdom
// 画面の細かい操作（タブ・やめるボタン・CSV の書き出し・マイクの許可・図の目盛りなど）のテスト
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from './lib/storage'

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function song(id: string, low: number, high: number, extra: object = {}) {
  return { id, title: id, artist: '', low, high, createdAt: id, updatedAt: id, ...extra }
}

function saveInitial(data: object) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY)!)

describe('タブ', () => {
  it('音域が登録済みなら曲の画面から始まり、タブで切り替えられる', async () => {
    saveInitial({ profile: { low: 43, high: 67 } })
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('heading', { name: '曲' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '曲' }).getAttribute('aria-pressed')).toBe('true')

    await user.click(screen.getByRole('button', { name: '自分の音域' }))
    expect(screen.getByRole('heading', { name: '自分の音域' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '自分の音域' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('やめる・取り消す', () => {
  beforeEach(() => saveInitial({ profile: { low: 43, high: 67 }, songs: [song('曲1', 48, 71)] }))

  it('削除の確認で「キャンセル」なら、曲は消えない', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('listitem', { name: '曲1' })).getByRole('button', { name: '削除' }))
    expect(window.confirm).toHaveBeenCalledWith('「曲1」を削除しますか？')
    expect(screen.getByRole('listitem', { name: '曲1' })).toBeTruthy()
  })

  it('編集を「やめる」と、変えた内容は保存されず、登録のフォームに戻る', async () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('listitem', { name: '曲1' })).getByRole('button', { name: '編集' }))
    await user.selectOptions(screen.getByLabelText('最高音'), '70')
    await user.click(screen.getByRole('button', { name: 'やめる' }))

    expect(screen.getByRole('group', { name: '曲を登録' })).toBeTruthy()
    expect(within(screen.getByRole('listitem', { name: '曲1' })).getAllByTestId('recommended-key')[0].textContent).toBe(
      'キー -4',
    )
  })

  it('歌った記録の入力を「やめる」と、記録はつかない', async () => {
    const user = userEvent.setup()
    render(<App />)
    const item = within(screen.getByRole('listitem', { name: '曲1' }))

    await user.click(item.getByRole('button', { name: '歌った記録をつける' }))
    await user.click(item.getByLabelText('高すぎ'))
    await user.click(item.getByRole('button', { name: 'やめる' }))

    expect(item.queryByRole('form', { name: '歌った記録' })).toBeNull()
    expect(item.queryByTestId('record-key')).toBeNull()
    // 何も保存していないので、保存データは最初のまま（records の欄もない）
    expect(saved().records ?? []).toEqual([])
  })

  it('曲の登録で入力に問題があれば、エラーを出して登録しない', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '登録する' }))
    const alert = screen.getByRole('alert').textContent
    expect(alert).toContain('曲名を入力してください')
    expect(alert).toContain('最低音を選んでください')
    expect(screen.getAllByRole('listitem', { name: /^曲/ })).toHaveLength(1)
  })
})

describe('一覧と編集のそのほかの操作', () => {
  it('並べ替えを変えると、その順に並ぶ', async () => {
    saveInitial({
      profile: { low: 43, high: 67 },
      songs: [
        song('さくら', 48, 64, { artist: 'あ', createdAt: '2026-01-03' }),
        song('あいのうた', 48, 64, { artist: 'い', createdAt: '2026-01-01' }),
        song('かえる', 48, 64, { artist: 'う', createdAt: '2026-01-02' }),
      ],
    })
    const user = userEvent.setup()
    render(<App />)
    const titles = () => screen.getAllByRole('listitem', { name: /./ }).map((li) => li.getAttribute('aria-label'))

    expect(titles()).toEqual(['さくら', 'あいのうた', 'かえる']) // 最初はアーティスト順
    await user.selectOptions(screen.getByLabelText('並べ替え'), 'title')
    expect(titles()).toEqual(['あいのうた', 'かえる', 'さくら'])
    await user.selectOptions(screen.getByLabelText('並べ替え'), 'newest')
    expect(titles()).toEqual(['さくら', 'かえる', 'あいのうた'])
  })

  it('編集中の曲を削除すると、編集フォームも閉じる', async () => {
    saveInitial({ profile: { low: 43, high: 67 }, songs: [song('曲1', 48, 71), song('曲2', 48, 64)] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<App />)

    await user.click(within(screen.getByRole('listitem', { name: '曲1' })).getByRole('button', { name: '編集' }))
    expect(screen.getByRole('group', { name: '曲を編集' })).toBeTruthy()
    await user.click(within(screen.getByRole('listitem', { name: '曲1' })).getByRole('button', { name: '削除' }))

    expect(screen.queryByRole('group', { name: '曲を編集' })).toBeNull()
    expect(screen.getByRole('group', { name: '曲を登録' })).toBeTruthy()
  })

  it('歌った記録で、歌ったキーを選び直して記録できる', async () => {
    saveInitial({ profile: { low: 43, high: 67 }, songs: [song('曲1', 48, 71)] }) // 高め -4
    const user = userEvent.setup()
    render(<App />)
    const item = within(screen.getByRole('listitem', { name: '曲1' }))

    await user.click(item.getByRole('button', { name: '歌った記録をつける' }))
    await user.selectOptions(item.getByLabelText('歌ったキー'), '-9') // 1オクターブ下・キー +3
    await user.click(item.getByLabelText('ちょうどいい'))
    await user.click(item.getByRole('button', { name: '記録する' }))

    expect(saved().records[0]).toMatchObject({ songId: '曲1', shift: -9, rating: 'good' })
    expect(item.getByTestId('record-key').textContent).toBe('1オクターブ下・キー +3')
  })

  it('楽に出せる音域を登録していると、曲の図に「楽に出せる …（限界 …）」と出る', async () => {
    // 曲 mid1D(50)〜hiA#(70) は、楽に出せる音域 lowG〜mid2F に収まり、高め -5・低め -6 の2つが出る
    saveInitial({ profile: { low: 43, high: 67, comfortableHigh: 65 }, songs: [song('曲1', 50, 70)] })
    const user = userEvent.setup()
    render(<App />)
    const item = within(screen.getByRole('listitem', { name: '曲1' }))

    await user.click(item.getByText('音域の図'))
    expect(item.getByText('楽に出せる lowG 〜 mid2F（限界 lowG 〜 mid2G）')).toBeTruthy()
  })
})

describe('自分の音域の保存', () => {
  it('ブラウザに保存できなかったら、そう伝える', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const user = userEvent.setup()
    render(<App />)

    await user.selectOptions(screen.getByLabelText('最低音'), '43')
    await user.selectOptions(screen.getByLabelText('最高音'), '67')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(screen.getByRole('status').textContent).toBe('保存できませんでした（ブラウザの設定を確認してください）')
  })
})

describe('判定ラベルの色', () => {
  it('判定ごとに色分けのクラスが付く', () => {
    saveInitial({
      profile: { low: 43, high: 67 },
      songs: [song('原曲', 48, 64), song('調整', 48, 71), song('オク下', 55, 76), song('足りない', 41, 72)],
    })
    render(<App />)
    const statusClass = (title: string) =>
      within(screen.getByRole('listitem', { name: title })).getAllByTestId('status')[0].className

    expect(statusClass('原曲')).toContain('status-original')
    expect(statusClass('調整')).toContain('status-adjusted')
    expect(statusClass('オク下')).toContain('status-octaveDown')
    expect(statusClass('足りない')).toContain('status-tooWide')
  })
})

describe('CSV', () => {
  it('「CSVを書き出す」で、日付入りの名前のファイルに曲を書き出す', async () => {
    saveInitial({ profile: { low: 43, high: 67 }, songs: [song('曲1', 48, 71, { artist: '歌手A', favorite: true })] })
    let blob: Blob | undefined
    const createObjectURL = vi.fn((b: Blob) => {
      blob = b
      return 'blob:test'
    })
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    let downloaded = ''
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('CSVで取り込み・書き出し'))
    await user.click(screen.getByRole('button', { name: 'CSVを書き出す' }))

    expect(downloaded).toMatch(/^karaoke-key-songs-\d{8}\.csv$/)
    const text = await blob!.text()
    expect(text).toContain('曲名,アーティスト,最低音,最高音,裏声の最高音,十八番,女性曲')
    expect(text).toContain('曲1,歌手A,mid1C,hiB,,○,')
  })

  it('曲が0曲なら「CSVを書き出す」は押せない', async () => {
    saveInitial({ profile: { low: 43, high: 67 } })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('CSVで取り込み・書き出し'))
    expect(screen.getByRole('button', { name: 'CSVを書き出す' })).toHaveProperty('disabled', true)
  })

  it('読める行が1つもない CSV なら、何も変えずにそう伝える', async () => {
    saveInitial({ profile: { low: 43, high: 67 }, songs: [song('曲1', 48, 71)] })
    const user = userEvent.setup()
    render(<App />)

    const csv = '曲名,アーティスト,最低音,最高音\n曲2,,mid1C,hiZ\n'
    await user.upload(screen.getByLabelText('CSVファイルを選ぶ'), new File([csv], 'bad.csv', { type: 'text/csv' }))

    expect(await screen.findByText('取り込める曲がありませんでした')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('2行目: 最高音「hiZ」が読めません')
    expect(saved().songs).toHaveLength(1)
  })
})

describe('マイクで測る（許可・やり直し）', () => {
  it('マイクの使用を断られたら、そう伝える', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: { getUserMedia: () => Promise.reject(new Error('NotAllowedError')) },
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('マイクで測る'))
    await user.click(screen.getByRole('button', { name: '測りはじめる' }))
    expect((await screen.findByRole('alert')).textContent).toContain('マイクを許可してください')
    // 測りはじめていないので、ボタンはそのまま
    expect(screen.getByRole('button', { name: '測りはじめる' })).toBeTruthy()
  })

  it('「やり直す」を押すと、測った最低音・最高音が消える', async () => {
    // 偽のマイク: mid2C(60) をずっと「あー」と出している
    const f = 440 * 2 ** ((60 - 69) / 12)
    vi.stubGlobal(
      'AudioContext',
      class {
        sampleRate = 48000
        createAnalyser() {
          return {
            fftSize: 0,
            getFloatTimeDomainData(buf: Float32Array) {
              for (let i = 0; i < buf.length; i++) buf[i] = 0.5 * (2 * (((i * f) / 48000) % 1) - 1)
            },
          }
        }
        createMediaStreamSource() {
          return { connect: () => {} }
        }
        close() {
          return Promise.resolve()
        }
      },
    )
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop: () => {} }] }) },
    })
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByText('マイクで測る'))
    await user.click(screen.getByRole('button', { name: '測りはじめる' }))
    expect(await screen.findByText('mid2C（C4）', { selector: '[data-testid="measured-low"]' }, { timeout: 3000 })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '止める' }))

    await user.click(screen.getByRole('button', { name: 'やり直す' }))
    expect(screen.getByTestId('measured-low').textContent).toBe('―')
    expect(screen.getByTestId('measured-high').textContent).toBe('―')
    expect(screen.queryByRole('button', { name: '出せる音域に入れる' })).toBeNull()
  }, 10000)

  it('まだ何も測っていなければ、「やり直す」は押せず、入れるボタンも出ない', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByText('マイクで測る'))

    expect(screen.getByRole('button', { name: 'やり直す' })).toHaveProperty('disabled', true)
    expect(screen.queryByRole('button', { name: '出せる音域に入れる' })).toBeNull()
    expect(screen.getByTestId('measured-low').textContent).toBe('―')
  })
})

describe('自分の音域の図', () => {
  const chart = () => within(screen.getByRole('figure', { name: '自分の音域の図' }))
  const scaleLabels = () =>
    [...screen.getByRole('figure', { name: '自分の音域の図' }).querySelectorAll('.voice-chart-scale span')].map(
      (s) => s.textContent,
    )

  it('目盛りは少なくとも mid1A〜hiA を見せ、音域がはみ出せば広げる', async () => {
    saveInitial({ profile: { low: 50, high: 64 } }) // mid1D〜mid2E（せまい）
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '自分の音域' }))
    expect(scaleLabels()).toEqual(['mid1', 'mid2'])

    // 最低音を lowG(43) にすると、low の目盛りが増える
    await user.selectOptions(screen.getByLabelText('最低音'), '43')
    expect(scaleLabels()).toEqual(['low', 'mid1', 'mid2'])

    // 裏声 hiE(76) を入れると、hi の目盛りが増え、ピンクの裏声の部分が出る
    await user.selectOptions(screen.getByLabelText('裏声の最高音'), '76')
    expect(scaleLabels()).toEqual(['low', 'mid1', 'mid2', 'hi'])
    expect(chart().getByText(/裏声 〜 hiE/)).toBeTruthy()
    expect(screen.getByRole('figure', { name: '自分の音域の図' }).querySelector('.range-fill.falsetto')).not.toBeNull()
  })

  it('音域の広さが1オクターブ未満なら「○半音」と出す', async () => {
    saveInitial({ profile: { low: 55, high: 65 } }) // mid1G〜mid2F は 10半音
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '自分の音域' }))
    expect(chart().getByText(/出せる音域 mid1G 〜 mid2F（10半音）/)).toBeTruthy()
  })

  it('裏声の最高音が地声より低ければ、ピンクの部分は描かず、文字だけ出す', async () => {
    saveInitial({ profile: { low: 43, high: 67, falsettoHigh: 64 } })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: '自分の音域' }))

    expect(chart().getByText(/裏声 〜 mid2E/)).toBeTruthy()
    expect(screen.getByRole('figure', { name: '自分の音域の図' }).querySelector('.falsetto')).toBeNull()
  })
})
