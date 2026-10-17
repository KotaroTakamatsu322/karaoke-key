import { describe, expect, it } from 'vitest'
import { toFrequency } from './note'
import { BUFFER_SIZE, detectPitch, NoteTracker, rms, toMidiFloat } from './pitch'

const SAMPLE_RATE = 48000
const SIZE = BUFFER_SIZE // 画面（VoiceMeter）と同じ長さで調べる

function wave(midi: number, shape: (phase: number) => number, amplitude = 0.5, sampleRate = SAMPLE_RATE): Float32Array {
  const f = toFrequency(midi)
  const buf = new Float32Array(SIZE)
  for (let i = 0; i < SIZE; i++) buf[i] = amplitude * shape(((i * f) / sampleRate) % 1)
  return buf
}
const sine = (p: number) => Math.sin(2 * Math.PI * p)
const saw = (p: number) => 2 * p - 1 // 倍音の多い音（人の声に近い）

// 手順書 ⑧ の完了の条件: ±1半音以内で検出できる
describe('detectPitch', () => {
  // lowC#(37) 〜 hihiC(84) の、男性の声で出しうる範囲
  const notes = [37, 43, 48, 55, 60, 67, 72, 76, 84]

  it.each(notes)('きれいな音（sine）: MIDI %i を ±1半音以内で見つける', (midi) => {
    const f = detectPitch(wave(midi, sine), SAMPLE_RATE)
    expect(f).not.toBeNull()
    expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
  })

  it.each(notes)('倍音の多い音（sawtooth）: MIDI %i を ±1半音以内で見つける（倍・半分の高さと間違えない）', (midi) => {
    const f = detectPitch(wave(midi, saw), SAMPLE_RATE)
    expect(f).not.toBeNull()
    expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
  })

  it('G6 (91) まで、1オクターブ下とまちがえずに見つける', () => {
    for (const midi of [88, 91, 92]) {
      for (const shape of [sine, saw]) {
        const f = detectPitch(wave(midi, shape), SAMPLE_RATE)
        expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
      }
    }
  })

  // スマホのスピーカーや鍵盤アプリの低い音は、基音がほとんど鳴らず、2倍・4倍の音（偶数の倍音）ばかりが鳴ることがある
  const weakFundamental = (p: number) =>
    0.05 * Math.sin(2 * Math.PI * p) +
    0.6 * Math.sin(4 * Math.PI * p) +
    0.08 * Math.sin(6 * Math.PI * p) +
    0.3 * Math.sin(8 * Math.PI * p)

  function withNoise(buf: Float32Array, amount: number): Float32Array {
    let seed = 7
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
    return buf.map((x) => x + amount * random())
  }

  it.each([38, 40, 43, 45, 48])('基音が弱い低い音: MIDI %i を1オクターブ上とまちがえない', (midi) => {
    const f = detectPitch(withNoise(wave(midi, weakFundamental), 0.02), SAMPLE_RATE)
    expect(f).not.toBeNull()
    expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
  })

  it.each(notes)('少し雑音があっても、MIDI %i を1オクターブ下とまちがえない', (midi) => {
    for (const shape of [sine, saw]) {
      const f = detectPitch(withNoise(wave(midi, shape), 0.02), SAMPLE_RATE)
      expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
    }
  })

  // 選べる音（〜hihiG# = 92）より高い音も、正しい高さで見つける（1オクターブ下の、選べる音とまちがえないため）
  it.each([95, 98, 100, 103])('選べる音より高い MIDI %i（B6〜G7）を、1オクターブ下とまちがえない', (midi) => {
    for (const shape of [sine, saw]) {
      const f = detectPitch(wave(midi, shape), SAMPLE_RATE)
      expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
    }
  })

  it('雑音が多めでも、くり返しがあれば見つける', () => {
    for (const midi of [45, 60, 72]) {
      const f = detectPitch(withNoise(wave(midi, saw, 0.3), 0.15), SAMPLE_RATE)
      expect(f).not.toBeNull()
      expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
    }
  })

  it('小さめの音（離れたスマホの鍵盤アプリなど）でも見つける', () => {
    const f = detectPitch(wave(60, saw, 0.012), SAMPLE_RATE)
    expect(Math.abs(toMidiFloat(f!) - 60)).toBeLessThan(1)
  })

  // F2 (41) 以下の低い音: lowA(33) 〜 F2(41)
  const lowNotes = [33, 35, 36, 38, 40, 41]
  // 小さなスピーカーは、低い音の基音も2倍の音もほとんど出せず、3〜5倍の音ばかりが鳴る
  const smallSpeaker = (p: number) =>
    0.02 * Math.sin(2 * Math.PI * p) +
    0.1 * Math.sin(4 * Math.PI * p) +
    0.5 * Math.sin(6 * Math.PI * p) +
    0.4 * Math.sin(8 * Math.PI * p) +
    0.3 * Math.sin(10 * Math.PI * p)

  it.each(lowNotes)('低い音 MIDI %i を、きれいな音・声に近い音で ±1半音以内で見つける', (midi) => {
    for (const shape of [sine, saw]) {
      const f = detectPitch(withNoise(wave(midi, shape), 0.02), SAMPLE_RATE)
      expect(f).not.toBeNull()
      expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
    }
  })

  it.each(lowNotes)('低い音 MIDI %i を、基音が弱いスピーカーの音でもまちがえない', (midi) => {
    for (const shape of [weakFundamental, smallSpeaker]) {
      const f = detectPitch(withNoise(wave(midi, shape), 0.02), SAMPLE_RATE)
      expect(f).not.toBeNull()
      expect(Math.abs(toMidiFloat(f!) - midi)).toBeLessThan(1)
    }
  })

  it('44.1kHz のマイクでも見つける', () => {
    const f = detectPitch(wave(60, saw, 0.5, 44100), 44100)
    expect(Math.abs(toMidiFloat(f!) - 60)).toBeLessThan(1)
  })

  it('小さい音・無音は調べない', () => {
    expect(detectPitch(new Float32Array(SIZE), SAMPLE_RATE)).toBeNull()
    expect(detectPitch(wave(60, sine, 0.005), SAMPLE_RATE)).toBeNull()
  })

  it('雑音（くり返しのない音）では見つけない', () => {
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
    const noise = Float32Array.from({ length: SIZE }, () => 0.5 * random())
    expect(detectPitch(noise, SAMPLE_RATE)).toBeNull()
  })
})

describe('rms', () => {
  it('無音は 0、振れ幅 a のきれいな音は a/√2', () => {
    expect(rms(new Float32Array(SIZE))).toBe(0)
    expect(rms(wave(60, sine, 0.5))).toBeCloseTo(0.5 / Math.SQRT2, 2)
  })
})

describe('toMidiFloat', () => {
  it('440Hz は 69、1オクターブ下は 57', () => {
    expect(toMidiFloat(440)).toBe(69)
    expect(toMidiFloat(220)).toBe(57)
  })
})

describe('NoteTracker', () => {
  it('同じ音が 0.5秒続いたら、その音を返す', () => {
    const t = new NoteTracker(500)
    expect(t.update(60, 0)).toBeNull()
    expect(t.update(60.2, 300)).toBeNull()
    expect(t.update(59.9, 500)).toBe(60)
  })

  it('ビブラート（0.7半音未満のゆれ）では途切れない', () => {
    const t = new NoteTracker(500)
    t.update(60, 0)
    t.update(60.5, 200)
    t.update(59.6, 400)
    expect(t.update(60.3, 600)).toBe(60)
  })

  it('音が変わったり、しばらく途切れたりしたら数え直す', () => {
    const t = new NoteTracker(500)
    t.update(60, 0)
    expect(t.update(62, 400)).toBeNull() // 音が変わった
    expect(t.update(62, 800)).toBeNull() // 400ms しか続いていない
    expect(t.update(62, 900)).toBe(62)
    expect(t.update(null, 1000)).toBeNull() // 途切れた
    expect(t.update(null, 1300)).toBeNull() // 300ms 途切れたまま
    expect(t.update(62, 1350)).toBeNull() // 数え直し
  })

  it('一瞬（200ms 以内）途切れただけなら、数え直さない', () => {
    const t = new NoteTracker(500)
    t.update(60, 0)
    t.update(60, 200)
    expect(t.update(null, 250)).toBeNull()
    expect(t.update(null, 350)).toBeNull()
    expect(t.update(60, 400)).toBeNull()
    expect(t.update(60, 500)).toBe(60)
  })
})
