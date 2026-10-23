import { isPostalCode } from '@/lib/bml/receiver-info'
import { signedOut } from '@/lib/signed-out'
import { couldNot } from '@/lib/try-again'
import type { ResidenceRefusal } from '@/repository/data-broadcast-settings'

export const RESIDENCE_HEADING = '設置場所'

export const POSTAL_CODE_LABEL = '郵便番号'

export const PREFECTURE_LABEL = '都道府県'

export const NOT_REGISTERED = '未登録'

export const POSTAL_CODE_PROBLEM = '郵便番号は 7 桁の数字です。'

/** The prefectures as the receiver names them to the documents, by their place in the prefecture designation of ARIB STD-B10 table G-2 counted from 0, in the order they are offered: the islands of Tokyo and of Kagoshima after their prefecture. */
export const PREFECTURES: readonly { value: number; label: string }[] = [
  { value: 0, label: '東北海道' },
  { value: 1, label: '西北海道' },
  { value: 2, label: '青森県' },
  { value: 3, label: '岩手県' },
  { value: 4, label: '宮城県' },
  { value: 5, label: '秋田県' },
  { value: 6, label: '山形県' },
  { value: 7, label: '福島県' },
  { value: 8, label: '茨城県' },
  { value: 9, label: '栃木県' },
  { value: 10, label: '群馬県' },
  { value: 11, label: '埼玉県' },
  { value: 12, label: '千葉県' },
  { value: 13, label: '東京都(島部を除く)' },
  { value: 48, label: '東京都島部(伊豆・小笠原諸島)' },
  { value: 14, label: '神奈川県' },
  { value: 15, label: '新潟県' },
  { value: 16, label: '富山県' },
  { value: 17, label: '石川県' },
  { value: 18, label: '福井県' },
  { value: 19, label: '山梨県' },
  { value: 20, label: '長野県' },
  { value: 21, label: '岐阜県' },
  { value: 22, label: '静岡県' },
  { value: 23, label: '愛知県' },
  { value: 24, label: '三重県' },
  { value: 25, label: '滋賀県' },
  { value: 26, label: '京都府' },
  { value: 27, label: '大阪府' },
  { value: 28, label: '兵庫県' },
  { value: 29, label: '奈良県' },
  { value: 30, label: '和歌山県' },
  { value: 31, label: '鳥取県' },
  { value: 32, label: '島根県' },
  { value: 33, label: '岡山県' },
  { value: 34, label: '広島県' },
  { value: 35, label: '山口県' },
  { value: 36, label: '徳島県' },
  { value: 37, label: '香川県' },
  { value: 38, label: '愛媛県' },
  { value: 39, label: '高知県' },
  { value: 40, label: '福岡県' },
  { value: 41, label: '佐賀県' },
  { value: 42, label: '長崎県' },
  { value: 43, label: '熊本県' },
  { value: 44, label: '大分県' },
  { value: 45, label: '宮崎県' },
  { value: 46, label: '鹿児島県(南西諸島を除く)' },
  { value: 49, label: '鹿児島県島部(南西諸島の鹿児島県域)' },
  { value: 47, label: '沖縄県' },
]

export function prefectureShown(prefecture: number | null): string {
  return (
    PREFECTURES.find(({ value }) => value === prefecture)?.label ??
    NOT_REGISTERED
  )
}

/** A postal code as it is written, with the hyphen after the third digit. */
export function postalCodeShown(postalCode: string | null): string {
  return postalCode === null
    ? NOT_REGISTERED
    : `${postalCode.slice(0, 3)}-${postalCode.slice(3)}`
}

const WRITTEN = /^〒?\s*([0-9]{3})-?([0-9]{4})$/

/** What was typed as the postal code is sent as seven digits, written with or without the hyphen, in full or half width; empty is none. Undefined when it is neither. */
function typedPostalCode(typed: string): string | null | undefined {
  const trimmed = typed.normalize('NFKC').trim()

  if (trimmed === '') {
    return null
  }

  const written = WRITTEN.exec(trimmed)
  const digits = written ? `${written[1]}${written[2]}` : undefined

  return isPostalCode(digits) ? digits : undefined
}

export function postalCodeProblem(typed: string): string | undefined {
  return typedPostalCode(typed) === undefined ? POSTAL_CODE_PROBLEM : undefined
}

/** The postal code to send for what was typed, null for none. It is one `postalCodeProblem` says nothing about. */
export function postalCodeToSend(typed: string): string | null {
  return typedPostalCode(typed) ?? null
}

/** What was typed when the row turned into a field: the postal code as it is written, or nothing. */
export function postalCodeTyped(postalCode: string | null): string {
  return postalCode === null ? '' : postalCodeShown(postalCode)
}

export function residenceRefusalOf(refusal: ResidenceRefusal): string {
  if (refusal === 'invalid') {
    return POSTAL_CODE_PROBLEM
  }

  return refusal === 'unauthenticated'
    ? signedOut('保存')
    : couldNot('保存できませんでした')
}
