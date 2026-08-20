const ENCLOSED_MARK = /[\u{1F100}-\u{1F2FF}]/u

const LATIN = /[0-9A-Za-z]/

/** 先頭に付く時は番組の区分を表す札で、主題ではない。 */
const LABEL_OPENING = '【〔［〖'

const LABEL_CLOSING = '】〕］〗'

/** 先頭に付く時は作品名そのもの。 */
const TITLE_OPENING = '「『〈《（('

const TITLE_CLOSING = '」』〉》）)'

const OPENING = LABEL_OPENING + TITLE_OPENING

const SECTION_MARKS = '▽▼△▲◆◇■□★☆♪♬※→←＜#＃♯'

const WAVES = '〜～'

const SPACES = ' 　'

const TAIL = ' 　!！?？、,。.・/／&＆-‐−—―’\'”"'

/** API がキーワードとして受け付ける最小の長さ。 */
const SHORTEST_TERM = 2

/**
 * ここに満たない位置の記号は区切りとみなさない。`映画「作品名」` の `映画` や
 * `北海道 いまの風景` の `北海道` だけを残しても、番組を絞り込む語にならない。
 */
const SHORTEST_MAIN = 4

/**
 * 番組名は「主題 + 副題 + 話数 + 記号」を1つの文字列に詰めて送られてくる。全文を
 * キーワードにするとその回しか当たらないので、区切りとして働く記号の手前までを
 * 主題とみなし、同じ番組の他の回を探せる語にする。
 */
export function mainTitleOf(title: string): string {
  const whole = title.trim()
  const chars = Array.from(whole)
  const [from, until] = regionOf(chars)
  const main = tailTrimmed(chars.slice(from, boundaryIn(chars, from, until)))

  return Array.from(main).length >= SHORTEST_TERM ? main : whole
}

/**
 * 主題を探す範囲。先頭の記号・空白・区分の札を落とし、`『作品名』出演者` のように
 * 作品名の括弧で始まるものはその中身を範囲にする。
 */
function regionOf(chars: string[]): [number, number] {
  let from = 0

  for (;;) {
    while (from < chars.length && isLeadIn(chars[from] ?? '')) {
      from++
    }

    if (from >= chars.length) {
      return [from, chars.length]
    }

    const label = LABEL_OPENING.indexOf(chars[from] ?? '')

    if (label < 0) {
      break
    }

    const closed = chars.indexOf(LABEL_CLOSING.charAt(label), from + 1)

    if (closed < 0) {
      break
    }

    from = closed + 1
  }

  if (from >= chars.length) {
    return [from, chars.length]
  }

  const title = TITLE_OPENING.indexOf(chars[from] ?? '')

  if (title >= 0) {
    const until = chars.indexOf(TITLE_CLOSING.charAt(title), from + 1)

    if (until > from + 1) {
      return [from + 1, until]
    }
  }

  return [from, chars.length]
}

function isLeadIn(char: string): boolean {
  return (
    SPACES.includes(char) ||
    SECTION_MARKS.includes(char) ||
    ENCLOSED_MARK.test(char)
  )
}

function boundaryIn(chars: string[], from: number, until: number): number {
  const waves = chars
    .slice(from, until)
    .filter((char) => WAVES.includes(char)).length

  for (let at = from + SHORTEST_MAIN; at < until; at++) {
    const char = chars[at] ?? ''

    if (
      ENCLOSED_MARK.test(char) ||
      OPENING.includes(char) ||
      SECTION_MARKS.includes(char)
    ) {
      return at
    }

    // 単独の `〜` は `ら〜めん` のように主題の一部でありうる。対で囲む時だけ副題。
    if (WAVES.includes(char) && waves >= 2) {
      return at
    }

    // 欧文の語間は副題の始まりではない。
    if (
      SPACES.includes(char) &&
      !(LATIN.test(chars[at - 1] ?? '') && LATIN.test(chars[at + 1] ?? ''))
    ) {
      return at
    }
  }

  return until
}

function tailTrimmed(chars: string[]): string {
  let until = chars.length

  while (until > 0) {
    const char = chars[until - 1] ?? ''

    if (!TAIL.includes(char) && !ENCLOSED_MARK.test(char)) {
      break
    }

    until--
  }

  return chars.slice(0, until).join('')
}
