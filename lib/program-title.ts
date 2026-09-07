const ENCLOSED_MARK = /[\u{1F100}-\u{1F2FF}]/u

const SUBTITLED_MARK = '\u{1F211}'

export function saysSubtitled(title: string): boolean {
  return title.includes(SUBTITLED_MARK)
}

const LATIN = /[0-9A-Za-z]/

const LABEL_OPENING = '【〔［〖'

const LABEL_CLOSING = '】〕］〗'

const TITLE_OPENING = '「『〈《（('

const TITLE_CLOSING = '」』〉》）)'

const OPENING = LABEL_OPENING + TITLE_OPENING

const SECTION_MARKS = '▽▼△▲◆◇■□★☆♪♬※→←＜#＃♯'

const WAVES = '〜～'

const SPACES = ' 　'

const TAIL = ' 　!！?？、,。.・/／&＆-‐−—―’\'”"'

const SHORTEST_TERM = 2

const SHORTEST_MAIN = 4

export function mainTitleOf(title: string): string {
  const whole = title.trim()
  const chars = Array.from(whole)
  const [from, until] = regionOf(chars)
  const main = tailTrimmed(chars.slice(from, boundaryIn(chars, from, until)))

  return Array.from(main).length >= SHORTEST_TERM ? main : whole
}

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

    if (WAVES.includes(char) && waves >= 2) {
      return at
    }

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
