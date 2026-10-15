// キー計算（実装手順書 3章）
import type { AlignMode, KeyResult, KeyStatus, VoiceProfile } from '../types'

export const MACHINE_KEY_LIMIT = 7 // DAM・JOYSOUND のキー幅 ±7

type SongRange = { low: number; high: number }

export function calcKey(profile: VoiceProfile, song: SongRange, alignMode: AlignMode): KeyResult {
  const uLow = profile.comfortableLow ?? profile.low
  const uHigh = profile.comfortableHigh ?? profile.high

  // 1. 曲が自分の音域に収まるずらし幅
  const minShift = uLow - song.low
  const maxShift = uHigh - song.high
  const tooWide = minShift > maxShift

  // 2〜4. ずらし幅を決める
  let shift: number
  if (tooWide) {
    shift = maxShift // 高音側を優先
  } else if (minShift <= 0 && 0 <= maxShift) {
    shift = 0
  } else if (alignMode === 'high') {
    shift = maxShift
  } else {
    const ideal = Math.round((uLow + uHigh) / 2 - (song.low + song.high) / 2)
    shift = Math.min(Math.max(ideal, minShift), maxShift)
  }

  // 5. カラオケ機での設定値に直す
  let octave: KeyResult['octave'] = 0
  if (shift < -MACHINE_KEY_LIMIT) octave = -1
  else if (shift > MACHINE_KEY_LIMIT) octave = 1
  const machineKey = shift - 12 * octave

  let status: KeyStatus
  if (tooWide) status = 'tooWide'
  else if (shift === 0) status = 'original'
  else if (octave === -1) status = 'octaveDown'
  else if (octave === 1) status = 'octaveUp'
  else status = 'adjusted'

  const shiftedLow = song.low + shift
  const shiftedHigh = song.high + shift

  return {
    shift,
    machineKey,
    octave,
    status,
    shiftedLow,
    shiftedHigh,
    missingLow: Math.max(0, uLow - shiftedLow),
  }
}
