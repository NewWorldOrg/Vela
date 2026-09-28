export const NOT_TOLD_WHY = '理由はまだ分からない。'

const UNTIL_THE_DRIVER_RESTARTS = 'driver を起動し直すまで割り当てられない。'

export const DEVICE_FAILED =
  '使用中にデバイスが応答しなくなった。開き直せた時点で割り当てが戻る。'

export const DEVICE_FAILED_AGAIN = `戻した直後にデバイスがまた応答しなくなった。${UNTIL_THE_DRIVER_RESTARTS}`

export const REPEATED_TUNE_FAILURE = `同じチャンネルで続けて選局できなかった。${UNTIL_THE_DRIVER_RESTARTS}`

export const TUNE_FAILING =
  '選局に失敗したチャンネルがある。同じチャンネルで続けて失敗すると割り当てが止まる。'

export const KINDS_DISAGREE =
  '一覧の種別を、このチューナーは受信できない。一致するまで割り当てられない。'

export function kindsDisagree(declared: string, receivable: string[]): string {
  return `一覧では${declared}、このチューナーが受信できるのは${receivable.join('・')}。一致するまで割り当てられない。`
}
