// 自分の音域の入力チェック
import type { VoiceProfile } from '../types'

export type ProfileDraft = {
  low?: number
  high?: number
  comfortableLow?: number
  comfortableHigh?: number
  falsettoHigh?: number
}

/** 入力に問題がなければ VoiceProfile を、あればエラーメッセージの一覧を返す */
export function validateProfile(
  d: ProfileDraft,
): { ok: true; profile: VoiceProfile } | { ok: false; errors: string[] } {
  const errors: string[] = []

  if (d.low === undefined) errors.push('最低音を選んでください')
  if (d.high === undefined) errors.push('最高音を選んでください')
  if (d.low !== undefined && d.high !== undefined && d.low >= d.high) {
    errors.push('最低音は最高音より低くしてください')
  }

  if (d.comfortableLow !== undefined && d.low !== undefined && d.comfortableLow < d.low) {
    errors.push('楽に出せる最低音は、最低音と同じかそれより高くしてください')
  }
  if (d.comfortableHigh !== undefined && d.high !== undefined && d.comfortableHigh > d.high) {
    errors.push('楽に出せる最高音は、最高音と同じかそれより低くしてください')
  }
  if (
    d.comfortableLow !== undefined &&
    d.comfortableHigh !== undefined &&
    d.comfortableLow >= d.comfortableHigh
  ) {
    errors.push('楽に出せる最低音は、楽に出せる最高音より低くしてください')
  }

  if (errors.length > 0 || d.low === undefined || d.high === undefined) {
    return { ok: false, errors }
  }

  const profile: VoiceProfile = { low: d.low, high: d.high }
  if (d.comfortableLow !== undefined) profile.comfortableLow = d.comfortableLow
  if (d.comfortableHigh !== undefined) profile.comfortableHigh = d.comfortableHigh
  if (d.falsettoHigh !== undefined) profile.falsettoHigh = d.falsettoHigh
  return { ok: true, profile }
}
