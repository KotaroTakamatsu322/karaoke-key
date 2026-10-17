// キー計算（実装手順書 3章）
import type { AlignMode, KeyResult, KeyStatus, VoiceProfile } from '../types'

export const MACHINE_KEY_LIMIT = 7 // DAM のキー幅 ±7
export const JOYSOUND_KEY_LIMIT = 6 // JOYSOUND のキー幅 ±6

// low・high は地声の音域。裏声の最高音はキーの計算には使わず、届くかどうかだけを調べる
type SongRange = { low: number; high: number; falsettoHigh?: number }

/** ずらし幅を、キー幅 ±limit のカラオケ機での設定値（オクターブとキー）に直す */
export function toMachineKey(
  shift: number,
  limit = MACHINE_KEY_LIMIT,
): Pick<KeyResult, 'octave' | 'machineKey'> {
  let octave: KeyResult['octave'] = 0
  if (shift < -limit) octave = -1
  else if (shift > limit) octave = 1
  return { octave, machineKey: shift - 12 * octave }
}

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
  const { octave, machineKey } = toMachineKey(shift)

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
    falsettoShortage:
      song.falsettoHigh !== undefined && profile.falsettoHigh !== undefined
        ? Math.max(0, song.falsettoHigh + shift - profile.falsettoHigh)
        : 0,
  }
}
