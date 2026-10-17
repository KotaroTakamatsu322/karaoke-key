// 音名 ⇔ MIDI番号の変換
// 日本式の表記は A から次の G# までを1つのグループとして扱う

export const GROUPS = ['lowlow', 'low', 'mid1', 'mid2', 'hi', 'hihi'] as const

// A からの半音数の順に並べた音名
const NAMES_FROM_A = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'] as const

// C からの半音数の順に並べた音名（国際表記用）
const NAMES_FROM_C = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

export const MIN_NOTE = 21 // lowlowA (A0)
export const MAX_NOTE = 92 // hihiG# (G#6)

function semitonesFromC(name: string): number {
  const i = NAMES_FROM_C.indexOf(name as (typeof NAMES_FROM_C)[number])
  if (i >= 0) return i
  // フラット表記も受け付ける（例: Bb → A#）
  const m = /^([A-G])b$/.exec(name)
  if (m) return (NAMES_FROM_C.indexOf(m[1] as (typeof NAMES_FROM_C)[number]) + 11) % 12
  throw new Error(`音名が読めません: ${name}`)
}

/** 日本式の表記（例: mid2G）に変換する */
export function toJapanese(midi: number): string {
  const group = Math.floor((midi - MIN_NOTE) / 12)
  if (!Number.isInteger(midi) || group < 0 || group >= GROUPS.length) {
    throw new Error(`範囲外の音です: ${midi}`)
  }
  return GROUPS[group] + NAMES_FROM_A[(midi - MIN_NOTE) % 12]
}

/** 国際表記（例: G4）に変換する */
export function toInternational(midi: number): string {
  if (!Number.isInteger(midi) || midi < 0 || midi > 127) {
    throw new Error(`範囲外の音です: ${midi}`)
  }
  return NAMES_FROM_C[midi % 12] + (Math.floor(midi / 12) - 1)
}

/** 短い表示用。キーをずらした後の音は日本式の表記の範囲（lowlowA〜hihiG#）を出ることがあるので、そのときは国際表記にする */
export function noteName(midi: number): string {
  return midi >= MIN_NOTE && midi <= MAX_NOTE ? toJapanese(midi) : toInternational(midi)
}

/** 画面表示用（例: mid2G（G4）） */
export function formatNote(midi: number): string {
  return `${toJapanese(midi)}（${toInternational(midi)}）`
}

/** 日本式・国際表記のどちらでも MIDI 番号に変換する。読めなければエラー */
export function parseNote(text: string): number {
  const s = text.trim()

  const jp = /^(lowlow|low|mid1|mid2|hihi|hi)([A-G](?:#|b)?)$/i.exec(s)
  if (jp) {
    const group = GROUPS.indexOf(jp[1].toLowerCase() as (typeof GROUPS)[number])
    const name = jp[2][0].toUpperCase() + jp[2].slice(1)
    const fromA = (semitonesFromC(name) - 9 + 12) % 12
    return MIN_NOTE + 12 * group + fromA
  }

  const intl = /^([A-G](?:#|b)?)(-?\d)$/i.exec(s)
  if (intl) {
    const name = intl[1][0].toUpperCase() + intl[1].slice(1)
    // B#・Cb のようにオクターブをまたぐ表記は扱わない
    return 12 * (Number(intl[2]) + 1) + semitonesFromC(name)
  }

  throw new Error(`音名が読めません: ${text}`)
}

/** 音の周波数（Hz）。hiA (A4) = 440Hz */
export function toFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/** 選択肢の一覧（lowlowA〜hihiG#） */
export function noteOptions(): { value: number; label: string }[] {
  const options = []
  for (let n = MIN_NOTE; n <= MAX_NOTE; n++) {
    options.push({ value: n, label: formatNote(n) })
  }
  return options
}
