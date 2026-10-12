import type { BmlCatalog } from '@/lib/bml/catalog'
import type { BmlModule, BmlResource, ResourceKind } from '@/lib/bml/resources'

const PROLOGUE = `<?xml version="1.0" encoding="EUC-JP" ?>
<!DOCTYPE bml PUBLIC "+//ARIB STD-B24:1999//DTD BML Document//JA" "http://www.arib.or.jp/bml/bml_1_0.dtd">
<?bml bml-version="100.0" ?>`

const STARTUP = `${PROLOGUE}
<bml>
<head>
<title>サンプル</title>
<link rel="stylesheet" href="sample.css" type="text/css"/>
<script><![CDATA[
function showProgramme() { browser.launchDocument('~/0001/news.bml', 'cut'); }
]]></script>
<bevent><beitem id="tick" type="TimerFired" onoccur="tick()" time_mode="absolute" time_value="0"/></bevent>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9; clut: url(sample.clt); background-color-index: 128; used-key-list: basic data-button">
<object type="video/X-arib-mpeg2" style="left: 560px; top: 60px; width: 360px; height: 203px"/>
<p id="title" style="left: 40px; top: 20px; width: 500px; height: 48px; font-size: 32px; line-height: 48px; color-index: 129">サンプル総合 データ放送</p>
<div style="left: 40px; top: 96px; width: 440px; height: 220px">
<p style="left: 0px; top: 0px; width: 440px; height: 60px"><a id="news" href="~/0001/news.bml" style="nav-index: 0; nav-down: 1">ニュース</a></p>
<p style="left: 0px; top: 72px; width: 440px; height: 60px"><a id="weather" href="weather.bml" style="nav-index: 1; nav-up: 0; nav-down: 2">天気・防災</a></p>
<p id="programme" class="menu" style="left: 0px; top: 144px; nav-index: 2; nav-up: 1" onclick="showProgramme()">番組の情報</p>
</div>
<object type="image/X-arib-png" data="sun.png" style="left: 856px; top: 290px; width: 64px; height: 64px"/>
<p id="panel" class="panel" style="left: 560px; top: 290px; width: 248px; height: 96px">東京地方 きょうの天気<br/>晴れ のち くもり</p>
<object type="audio/X-arib-mpeg2-aac" data="chime.aac"/>
<div class="colours" style="left: 40px; top: 430px; width: 480px; height: 40px">
<p style="left: 0px; background-color-index: 4">青</p>
<p style="left: 120px; background-color-index: 1">赤</p>
<p style="left: 240px; background-color-index: 2">緑</p>
<p style="left: 360px; background-color-index: 3; color-index: 0">黄</p>
</div>
<p id="ticker" style="left: 0px; top: 496px; width: 960px; height: 44px; background-color-index: 130; color-index: 129; font-size: 24px; line-height: 44px; padding-left: 40px">ニュース　ここに流れる文章は見本です</p>
</body>
</bml>`

const WEATHER = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
</head>
<body style="clut: url(sample.clt); background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 40px; top: 60px; width: 360px; height: 203px"/>
<p class="panel" style="left: 440px; top: 60px; width: 440px; height: 203px">週間天気<br/>水 晴れ　木 くもり<br/>金 雨　土 晴れ</p>
<p style="left: 440px; top: 300px; width: 440px; height: 60px"><a id="back" href="startup.bml" style="nav-index: 0">トップへ戻る</a></p>
</body>
</bml>`

const NEWS = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="/40/0000/sample.css" type="text/css"/>
</head>
<body style="clut: url(/40/0000/sample.clt); background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 600px; top: 300px; width: 320px; height: 180px"/>
<object type="image/jpeg" data="hills.jpg" style="left: 40px; top: 60px; width: 480px; height: 270px"/>
<p class="panel" style="left: 560px; top: 60px; width: 360px; height: 200px">ニュース<br/>見本の記事の見出し</p>
<p style="left: 40px; top: 380px; width: 440px; height: 60px"><a id="top" href="/40/0000/startup.bml" style="nav-index: 0">トップへ戻る</a></p>
</body>
</bml>`

const SAMPLE_CSS = `a { display: block; width: 416px; height: 52px; padding: 4px 12px; font-size: 28px; line-height: 52px; color-index: 132; background-color-index: 129; }
a:focus { background-color-index: 131; }
p.menu { width: 416px; height: 52px; padding: 4px 12px; font-size: 28px; line-height: 52px; color-index: 132; background-color-index: 129; }
p.menu:focus { background-color-index: 131; }
p.panel { padding: 12px 16px; font-size: 22px; line-height: 32px; color-index: 132; background-color-index: 129; }
div.colours p { top: 0px; width: 100px; height: 40px; font-size: 22px; line-height: 40px; text-align: center; color-index: 7; }`

const SAMPLE_CLUT = [
  0xa8, 128, 133, 22, 44, 70, 255, 240, 236, 226, 255, 63, 100, 97, 255, 232,
  196, 92, 255, 40, 36, 48, 255, 255, 255, 255, 255,
]

const SUN_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAvklEQVR42u2XSw6AMAhEu+y5OxfXRFI/QGkyTdTqrEzLvC4ggCmTStMDsOoHvA2AHgB8gI6GeeQBcA0votwISu5lOcl9JGWbUJRs/zULEiAeiCpC+1UadwNO2o+iOpBgKMlpXEiOXwgdlej5N0IM8P02wQIADUIEaPotwmhA4DcITwOEfk0YAzjedgDq90yA+7MwUyk/oB/wLY1vqnRbpwcLO9rY4cqOd3bBYFecIUsWtebxi+a/rU8K+MS/8wL64B+er6fJswAAAABJRU5ErkJggg=='

const HILLS_JPEG =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIf' +
  'IiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7' +
  'Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCACHAPADASIA' +
  'AhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQA' +
  'AAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3' +
  'ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWm' +
  'p6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEA' +
  'AwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSEx' +
  'BhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElK' +
  'U1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3' +
  'uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDg6KKK' +
  '6jlCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooo' +
  'oAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigDS0LQrrXr4W9uNsa' +
  '4MsxHyxj+p9B3+mSO9svAGi28eLlZbtyBku5UA98BcYz7k1qeHtMXSNEtrXy9kmwNNnBO88tkjrj' +
  'p9AK06+dxOOqTm1B2R6lLDxiryV2cpqHw90m5UmzeWzfAAAO9OvJIPPTjqK8/wBT0y60i+ezvI9s' +
  'i8gj7rjswPcf5617XXPeN9MXUPD0sqx7prT96hGAQB97k9tuTj1Aq8JjZqahN3TJrUIuN4qzPKqK' +
  'KK9880KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA9wtLlL' +
  'yzhuowwSeNZFDdQCMjP51NXnfgzxYlgqaVqDKlsSfJm6eWSc4b2JPXt346ehRyJLGskbq6OAyspy' +
  'CD0INfKYihKjNp7dD2aVRVI3Q6srxNcpa+GtQkkDENA0fy+rfKP1IrRnnhtoWmuJUhjX7zyMFUdu' +
  'przLxd4p/tyYWtqMWUL7lYj5pG5G72HJwPfn0F4ShKrUVtluTWqKEX3Oaooor6g8gKKKKACiiigA' +
  'ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiinxwvKcKOPU9KQDKKne0lXkYYe1QkFTg' +
  'gg+hoTT2ASp7W/vLLd9ku57ffjd5UhXdjpnH1NQUUNJqzGnYmubu5vJBJdXEs7gbQ0rliB6ZP1qG' +
  'iihJLRAFFFFMQUUUUAFFFFABRRRQAUUVJHBJL90YHqelJuwEdOEblN4U7fXFXY7SNOW+c+/Sp6zd' +
  'TsK5k0VpSQRy/eGD6jrVWSzdBlTvH61SmmFyvRQQQcEYIoqxhRRRQAUUUUAFABJwBkmpYrd5eRwv' +
  'qauxQJEOBk9zUSkkDZXisz1l49gatgBRgAAegpaKxbbJuFNZFcYZQfrTqKQis9kh+6Sv61A9rKn8' +
  'O4f7NaFFWptDuZNFabxpJ95QfeoHslPKMR7GrU0O5ToqSS3kj6rkeo5qOrTuMKKKKYBRRUkcEkv3' +
  'Rgep6Um7AR1JHBJL90YHqelW47SNOW+c+/Sp6zdTsK5BHaRpy3zn36VPRRWbbe5IUUUUgCiiigBr' +
  'xpIMOoNVZLLAzG2fY1copqTQ7mWyMhwykfWm1qkBhggEehqu9kh+6Sv61qqi6juU1UuwVRkmrcNo' +
  'BhpOT/dqeOJIhhR9T60+plO+wmxAABgDAFLRRWYgooooAKKKKACiiigAooooAKY8Mcn3kBPrT6KA' +
  'Kj2Q/gf8Gqu8Mkf3kIHrWnRVqbQ7kEdpGnLfOffpU9FFS23uIKKKKQBRRTxDKTgRt+IxQAyip1s5' +
  'SOdq/U08WPTdJ9QBSugKtFXls4gedzfU1IIYgMCNfxGaXMBm0VpGKNs5ReevFMa0hI4BX6GjmAoU' +
  'VbNiM8SED3FRmzlAyNp9gad0BBRUjW8q9Yz+HNRkFTggg+hpgFFFFABRRRQAUUUUAFFFKqM33VJx' +
  '6CgBKKkW3mYZCH8eKetnKRztX6mldAQUVaFiccyAH2FOFkmOWYn2ougKdFXxawgfdz+Jp4hiAx5a' +
  '/lS5gKYtJicFQPcmnrYtj5nAPsM1copczAriyjGMlj6+9SLbwqchB+PNSUUrsAACjAAA9BRRRSAK' +
  'KKKACiiigAooooAKKKKACiiigCNoImGDGv4DFMaziJ43L9DU9FO7AqmxGeJOPpQLEZ5kJHsKtUUX' +
  'YEC2cQPO5vqaetvCpyEH481JRRdgIqKv3VAz6CloopAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAF' +
  'FFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/9k='

function bytesOf(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (letter) => letter.charCodeAt(0))
}

function resource(
  path: string,
  kind: ResourceKind,
  body: string | Uint8Array,
): BmlResource {
  return {
    path,
    kind,
    body: typeof body === 'string' ? new TextEncoder().encode(body) : body,
  }
}

export const DATA_BROADCAST_CATALOG: BmlCatalog = {
  service: 1024,
  entryTag: 0x40,
  autoStart: false,
  startup: '/40/0000/startup.bml',
  carousels: [
    {
      tag: 0x40,
      downloadId: 1,
      modules: [
        {
          id: 0x0000,
          version: 1,
          size: 0,
          resources: [
            { path: 'startup.bml', type: 'text/X-arib-bml' },
            { path: 'weather.bml', type: 'text/X-arib-bml' },
            { path: 'sample.css', type: 'text/css' },
            { path: 'sample.clt', type: 'application/octet-stream' },
            { path: 'sun.png', type: 'image/X-arib-png' },
          ],
        },
        {
          id: 0x0001,
          version: 1,
          size: 0,
          resources: [
            { path: 'news.bml', type: 'text/X-arib-bml' },
            { path: 'hills.jpg', type: 'image/jpeg' },
          ],
        },
      ],
    },
  ],
}

/** The modules of a self-made data broadcast: a start page with a video hole, a menu and images, a weather page beside it, and a news page in a second module. */
export function dataBroadcastModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', STARTUP),
        resource('weather.bml', 'bml', WEATHER),
        resource('sample.css', 'css', SAMPLE_CSS),
        resource('sample.clt', 'binary', Uint8Array.from(SAMPLE_CLUT)),
        resource('sun.png', 'png', bytesOf(SUN_PNG)),
      ],
    },
    {
      tag: 0x40,
      id: 0x0001,
      version: 1,
      resources: [
        resource('news.bml', 'bml', NEWS),
        resource('hills.jpg', 'jpeg', bytesOf(HILLS_JPEG)),
      ],
    },
  ]
}

/** A script that tries, from inside the runtime's frame, what a document must not reach, and tells the player what happened. */
export const SANDBOX_PROBE = `
const report = { violations: [] }
document.addEventListener('securitypolicyviolation', (event) => report.violations.push(event.violatedDirective))
async function attempt(name, reach) {
  try {
    report[name] = 'reached ' + String(await reach())
  } catch (error) {
    report[name] = error && error.name ? error.name : 'refused'
  }
}
window.addEventListener('message', async () => {
  await attempt('cookie', () => document.cookie)
  await attempt('storage', () => localStorage.length)
  await attempt('parent', () => parent.document.title)
  await attempt('fetch', () => fetch('/').then((answer) => answer.status))
  await attempt('image', () => new Promise((done, fail) => {
    const image = new Image()
    image.onload = () => done('loaded')
    image.onerror = () => fail({ name: 'refused' })
    image.src = '/fonts/broadcast-marks.woff2'
  }))
  report.origin = self.origin
  parent.postMessage({ probe: report }, '*')
})
`
