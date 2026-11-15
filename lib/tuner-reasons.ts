export const NOT_TOLD_WHY = '理由はまだ分からない。'

export const DEVICE_FAILED =
  '使用中にデバイスが応答しなくなった。開き直せた時点で割り当てが戻る。'

export const DEVICE_FAILED_AGAIN =
  '戻した直後にデバイスがまた応答しなくなった。間を延ばして開き直し、開けた時点で割り当てが戻る。'

export const REPEATED_TUNE_FAILURE =
  '違うチャンネルで続けて選局できなかった。開き直せた時点で割り当てが戻る。'

export const TUNE_FAILING =
  '選局に失敗したチャンネルがある。違うチャンネルでも続けて失敗すると割り当てが止まる。'

export const KINDS_DISAGREE =
  '一覧の種別を、このチューナーは受信できない。一致するまで割り当てられない。'

export function kindsDisagree(declared: string, receivable: string[]): string {
  return `一覧では${declared}、このチューナーが受信できるのは${receivable.join('・')}。一致するまで割り当てられない。`
}
