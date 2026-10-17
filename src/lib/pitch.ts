// マイクの音から声の高さを調べる（実装手順書 ⑧）
// YIN という方法（自己相関の仲間）で、波の形がくり返す間隔（周期）を探す

// 一度に調べるサンプル数（48kHz で約 0.085秒）。低い音は1回のゆれ（周期）が長いので、3回分以上入る長さにする
export const BUFFER_SIZE = 4096
export const MIN_FREQUENCY = 50 // Hz（lowA = 55Hz より少し下まで）
// 選べるいちばん高い音は hihiG#（約1661Hz）だが、それより高い音を1オクターブ下とまちがえないよう、C8 あたりまで調べる。
// 選べる音の外かどうかは、画面の側で判断する
export const MAX_FREQUENCY = 4200 // Hz
const MIN_RMS = 0.005 // これより小さい音（雑音・無音）は調べない
const THRESHOLD = 0.15 // 周期らしさの基準（小さいほど厳しい）
// 基準を下回る谷がないとき（雑音が多い・スピーカーの音がにごっているとき）に使う、ゆるい基準
const LOOSE_THRESHOLD = 0.35
// 周期の2倍ずらしたときの形のちがいが、この割合より小さければ、そちらを本当の周期とする（1オクターブ上とまちがえない）。
// 見つけた周期でもともと形がほぼ合っている（きれいにくり返している）なら、比べない
const OCTAVE_RATIO = 0.3
const CLEAN_MISMATCH = 0.02

/** 音の大きさ（RMS） */
export function rms(buf: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
  return Math.sqrt(sum / buf.length)
}

/** 声の高さ（Hz）を調べる。音が小さいときや、声らしいくり返しがないときは null */
export function detectPitch(buf: Float32Array, sampleRate: number): number | null {
  if (rms(buf) < MIN_RMS) return null

  const minLag = Math.floor(sampleRate / MAX_FREQUENCY)
  const maxLag = Math.min(Math.ceil(sampleRate / MIN_FREQUENCY), Math.floor(buf.length / 2))
  const width = buf.length - maxLag

  // ずらした波との差（周期のところで小さくなる）
  const diff = new Float32Array(maxLag + 1)
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < width; i++) {
      const d = buf[i] - buf[i + lag]
      sum += d * d
    }
    diff[lag] = sum
  }

  // 差を、それまでの平均で割ってならす（周期の半分や倍を選びにくくする）
  const norm = new Float32Array(maxLag + 1)
  norm[0] = 1
  let running = 0
  for (let lag = 1; lag <= maxLag; lag++) {
    running += diff[lag]
    norm[lag] = running === 0 ? 1 : (diff[lag] * lag) / running
  }

  // 基準を下回った最初の谷を、周期とする（なければ、ゆるい基準で探し直す）
  const lag = firstDip(norm, minLag, maxLag, THRESHOLD) ?? firstDip(norm, minLag, maxLag, LOOSE_THRESHOLD)
  if (lag === null) return null

  // 谷の前後の3点から、より正確な位置（サンプルとサンプルのあいだ）を求める（放物線で補う）
  let period = lag
  if (lag > 1 && lag < maxLag) {
    const a = norm[lag - 1]
    const b = norm[lag]
    const c = norm[lag + 1]
    const denominator = a - 2 * b + c
    if (denominator !== 0) period = lag + (a - c) / (2 * denominator)
  }

  // 基音が弱い音（スマホのスピーカーの低い音など）は、2倍・3倍の音のくり返しを先に見つけて、
  // 1オクターブ上（2倍）や、1オクターブと5度上（3倍）とまちがえやすい。
  // 周期の2倍・3倍ずらしたほうが、はっきり形が合うなら、そちらを本当の周期とする
  for (;;) {
    const here = mismatch(buf, period)
    if (here <= CLEAN_MISMATCH) break
    const longer = [2, 3]
      .map((k) => period * k)
      .find((p) => p <= maxLag && mismatch(buf, p) < here * OCTAVE_RATIO)
    if (longer === undefined) break
    period = longer
  }
  return sampleRate / period
}

/** threshold を下回った最初の谷の底の位置。なければ null */
function firstDip(norm: Float32Array, minLag: number, maxLag: number, threshold: number): number | null {
  let lag = minLag
  while (lag <= maxLag && norm[lag] >= threshold) lag++
  if (lag > maxLag) return null
  while (lag + 1 <= maxLag && norm[lag + 1] < norm[lag]) lag++
  return lag
}

/**
 * 波を lag（小数でもよい）だけずらしたとき、元の波とどれだけ形がちがうかの割合（0 ならぴったり同じ）。
 * 周期はサンプルとサンプルのあいだに来ることが多いので、あいだの値は前後のサンプルから直線で補う
 */
function mismatch(buf: Float32Array, lag: number): number {
  const whole = Math.floor(lag)
  const frac = lag - whole
  const n = buf.length - whole - 1
  let diff = 0
  let energy = 0
  for (let i = 0; i < n; i++) {
    const shifted = buf[i + whole] * (1 - frac) + buf[i + whole + 1] * frac
    const d = buf[i] - shifted
    diff += d * d
    energy += buf[i] * buf[i] + shifted * shifted
  }
  return energy === 0 ? 1 : diff / energy
}

/** 周波数を MIDI 番号（小数）に直す。hiA (A4) = 440Hz = 69 */
export function toMidiFloat(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440)
}

/**
 * 同じ音が一定時間（holdMs）続いたときだけ、その音を「出せた音」として返す。
 * ビブラートで音の境目をまたいでも途切れないよう、今の音から 0.7半音以内なら同じ音とみなす。
 * 一瞬（gapMs 以内）高さがわからなくなっただけなら、数え直さない
 */
export class NoteTracker {
  private note: number | null = null
  private since = 0
  private lastHeard = 0
  private readonly holdMs: number
  private readonly gapMs: number

  constructor(holdMs = 500, gapMs = 200) {
    this.holdMs = holdMs
    this.gapMs = gapMs
  }

  /** 調べた高さ（MIDI 番号の小数、なければ null）と時刻（ミリ秒）を渡す。続いた音なら、その音（整数）を返す */
  update(midi: number | null, now: number): number | null {
    if (midi === null) {
      if (this.note !== null && now - this.lastHeard > this.gapMs) this.note = null
      return null
    }
    if (this.note === null || Math.abs(midi - this.note) >= 0.7) {
      this.note = Math.round(midi)
      this.since = now
    }
    this.lastHeard = now
    return now - this.since >= this.holdMs ? this.note : null
  }
}
