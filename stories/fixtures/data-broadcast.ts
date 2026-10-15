import type { BmlCatalog } from '@/lib/bml/catalog'
import type { BmlModule, BmlResource, ResourceKind } from '@/lib/bml/resources'
import { SIGNAL_COLOURS, SIGNAL_LAMPS, signalMng } from '@/stories/fixtures/mng'

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

const ENTRY = `${PROLOGUE}
<bml>
<head>
<title>入口</title>
<bevent><beitem id="pressed" type="DataButtonPressed" subscribe="subscribe" onoccur="browser.launchDocument('/60/0000/startup.bml', 'cut')"/></bevent>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9; visibility: hidden">
<p id="nothing">入口</p>
</body>
</bml>`

const FACE = `${PROLOGUE}
<bml>
<head>
<title>見本</title>
<link rel="stylesheet" href="/40/0000/sample.css" type="text/css"/>
<script><![CDATA[
var shown = "news";
var visits = 0;
function show(id) {
  document.getElementById(shown).normalStyle.visibility = "hidden";
  shown = id;
  document.getElementById(id).normalStyle.visibility = "visible";
}
function onKey() {
  var code = document.currentEvent.keyCode;
  if (code == 21) { show("news"); }
  if (code == 22) { show("weather"); }
  if (code == 23) { browser.transmitTextDataOverIP("https://example.invalid/", "", ""); }
  if (code == 24) { remember(); }
}
function remember() {
  var kept = browser.readPersistentArray("visits", "U:2B");
  visits = (kept ? kept[0] : 0) + 1;
  browser.writePersistentArray("visits", "U:2B", [visits]);
  document.getElementById("visits").firstChild.data = "きょう " + visits + " 回目";
}
function ticked() {
  var count = document.getElementById("count");
  count.firstChild.data = String(Number(count.firstChild.data) + 1);
}
function spin() {
  var until = new Date().getTime() + 2600;
  while (new Date().getTime() < until) {}
}
browser.setInterval("ticked()", 1000, 60);
]]></script>
</head>
<body style="clut: url(/40/0000/sample.clt); background-color-index: 128; used-key-list: basic data-button">
<object type="video/X-arib-mpeg2" style="left: 560px; top: 60px; width: 360px; height: 203px"/>
<p id="title" style="left: 40px; top: 20px; width: 500px; height: 48px; font-size: 32px; line-height: 48px; color-index: 129">見本テレビ データ放送</p>
<div style="left: 40px; top: 96px; width: 440px; height: 220px">
<p id="more" class="menu" style="left: 0px; top: 0px; nav-index: 0; nav-down: 1" onkeydown="onKey()" onclick="browser.launchDocument('~/0001/second.bml', 'cut')">つづきのページへ</p>
<p id="slow" class="menu" style="left: 0px; top: 72px; nav-index: 1; nav-up: 0" onkeydown="onKey()" onclick="spin()">時間のかかる処理</p>
</div>
<p id="news" class="panel" style="left: 560px; top: 290px; width: 360px; height: 96px">ニュース<br/>青で表示</p>
<p id="weather" class="panel" style="left: 560px; top: 290px; width: 360px; height: 96px; visibility: hidden">天気<br/>赤で表示</p>
<p id="visits" style="left: 40px; top: 400px; width: 440px; height: 40px; font-size: 24px; line-height: 40px; color-index: 129">黄で数える</p>
<p id="count" style="left: 40px; top: 440px; width: 100px; height: 40px; font-size: 24px; line-height: 40px; color-index: 129">0</p>
</body>
</bml>`

const SECOND = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="/40/0000/sample.css" type="text/css"/>
</head>
<body style="clut: url(/40/0000/sample.clt); background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 40px; top: 300px; width: 320px; height: 180px"/>
<p class="panel" style="left: 40px; top: 60px; width: 880px; height: 200px">つづきのページ<br/>スクリプトで移ってきた</p>
<p id="back" class="menu" style="left: 440px; top: 300px; nav-index: 0" onclick="browser.launchDocument('/60/0000/startup.bml', 'cut')">もどる</p>
</body>
</bml>`

export const SCRIPTED_CATALOG: BmlCatalog = {
  service: 1025,
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
            { path: 'sample.css', type: 'text/css' },
            { path: 'sample.clt', type: 'application/octet-stream' },
          ],
        },
      ],
    },
    {
      tag: 0x60,
      downloadId: 2,
      modules: [
        {
          id: 0x0000,
          version: 1,
          size: 0,
          resources: [{ path: 'startup.bml', type: 'text/X-arib-bml' }],
        },
        {
          id: 0x0001,
          version: 1,
          size: 0,
          resources: [{ path: 'second.bml', type: 'text/X-arib-bml' }],
        },
      ],
    },
  ],
}

/** The modules of a self-made data broadcast built the way a broadcaster's is: an entry document that cannot be seen and moves to the face when the data button is pressed, a face whose scripts switch panels on the colour keys, count in the persistent memory, tick a timer, call a function that is not supported and move to a second page, and that second page. */
export function scriptedModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', ENTRY),
        resource('sample.css', 'css', SAMPLE_CSS),
        resource('sample.clt', 'binary', Uint8Array.from(SAMPLE_CLUT)),
      ],
    },
    {
      tag: 0x60,
      id: 0x0000,
      version: 1,
      resources: [resource('startup.bml', 'bml', FACE)],
    },
    {
      tag: 0x60,
      id: 0x0001,
      version: 1,
      resources: [resource('second.bml', 'bml', SECOND)],
    },
  ]
}

const HISTORY_TOP = `${PROLOGUE}
<bml>
<head>
<title>見本</title>
<link rel="stylesheet" href="sample.css" type="text/css"/>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9; clut: url(sample.clt); background-color-index: 128; used-key-list: basic data-button">
<object type="video/X-arib-mpeg2" style="left: 560px; top: 60px; width: 360px; height: 203px"/>
<p id="title" style="left: 40px; top: 20px; width: 500px; height: 48px; font-size: 32px; line-height: 48px; color-index: 129">見本テレビ データ放送</p>
<p style="left: 40px; top: 96px; width: 440px; height: 60px"><a id="traffic" href="traffic.bml" style="nav-index: 0">交通情報</a></p>
</body>
</bml>`

const TRAFFIC = `${PROLOGUE}
<bml>
<head>
<title>交通情報</title>
<link rel="stylesheet" href="sample.css" type="text/css"/>
<script><![CDATA[
var history = new Array();
var shown = 0;
]]></script>
<script><![CDATA[
function show(page) {
  document.getElementById("page" + shown).normalStyle.visibility = "hidden";
  shown = page;
  document.getElementById("page" + page).normalStyle.visibility = "visible";
  browser.writePersistentArray("page", "U:1B", [page]);
}
function open() {
  if (shown < 2) {
    history.push(shown);
    show(shown + 1);
  }
}
function okd() {
  if (history.length > 0) {
    show(history.pop());
  } else {
    browser.launchDocument("startup.bml", "cut");
  }
}
]]></script>
</head>
<body style="clut: url(sample.clt); background-color-index: 128; used-key-list: basic data-button">
<object type="video/X-arib-mpeg2" style="left: 40px; top: 300px; width: 320px; height: 180px"/>
<p id="page0" class="panel" style="left: 40px; top: 60px; width: 880px; height: 200px">交通情報<br/>地方を選ぶ</p>
<p id="page1" class="panel" style="left: 40px; top: 60px; width: 880px; height: 200px; visibility: hidden">交通情報<br/>道路を選ぶ</p>
<p id="page2" class="panel" style="left: 40px; top: 60px; width: 880px; height: 200px; visibility: hidden">交通情報<br/>道路の様子</p>
<p id="next" class="menu" style="left: 440px; top: 300px; nav-index: 0" onclick="open()" onkeydown="if (document.currentEvent.keyCode == 19) { okd(); }">つぎへ</p>
</body>
</bml>`

export const HISTORY_CATALOG: BmlCatalog = {
  service: 1026,
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
            { path: 'traffic.bml', type: 'text/X-arib-bml' },
            { path: 'sample.css', type: 'text/css' },
            { path: 'sample.clt', type: 'application/octet-stream' },
          ],
        },
      ],
    },
  ],
}

/** The modules of a self-made data broadcast whose second document keeps the pages it went through in a global of its own named `history`, as a broadcaster's traffic pages do: its own `open` pushes the page it leaves there and moves on, the back key reads how many are kept and returns to the last, and with none kept it goes back to the start. Each page it shows it writes to the persistent memory as `page`. */
export function historyModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', HISTORY_TOP),
        resource('traffic.bml', 'bml', TRAFFIC),
        resource('sample.css', 'css', SAMPLE_CSS),
        resource('sample.clt', 'binary', Uint8Array.from(SAMPLE_CLUT)),
      ],
    },
  ]
}

const READS_ITSELF = `${PROLOGUE}
<bml>
<head>
<title>入口</title>
<script><![CDATA[
var me = browser.getActiveDocument();
var component = me.substring(0, 4);
var network = browser.getProgramID(3).substring(2);
function init() { browser.launchDocument(component + "0000/face.bml", "cut"); }
]]></script>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9; visibility: hidden" onload="init()">
<p id="nothing">入口</p>
</body>
</bml>`

const KNOWS_HOW_FAR = `${PROLOGUE}
<bml>
<head>
<title>入口</title>
<script><![CDATA[
function init() {
  var into = browser.getProgramRelativeTime();
  if (into >= 0 && into < 60) { browser.launchDocument("/40/0000/face.bml", "cut"); }
}
]]></script>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9; visibility: hidden" onload="init()">
<p id="nothing">入口</p>
</body>
</bml>`

const NEAR_THE_START = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9; clut: url(sample.clt); background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 80px; top: 120px; width: 400px; height: 225px"/>
<p id="ask" class="panel" style="left: 520px; top: 120px; width: 400px; height: 96px; nav-index: 0" onclick="if (browser.getProgramRelativeTime() >= 100) { browser.launchDocument('face.bml', 'cut'); }">はじめの方</p>
</body>
</bml>`

const FURTHER_ON = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
</head>
<body style="clut: url(sample.clt); background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 480px; top: 300px; width: 320px; height: 180px"/>
<p id="ask" class="panel" style="left: 40px; top: 300px; width: 400px; height: 96px; nav-index: 0" onclick="if (100 > browser.getProgramRelativeTime()) { browser.launchDocument('startup.bml', 'cut'); }">先の方</p>
</body>
</bml>`

const SEES_THE_TIME = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
<script><![CDATA[
var shown = "";
function two(n) { return n < 10 ? "0" + n : String(n); }
function show() {
  var now = new Date();
  var text = now.getFullYear() + "/" + two(now.getMonth() + 1) + "/" + two(now.getDate()) + " " + two(now.getHours()) + ":" + two(now.getMinutes()) + ":" + two(now.getSeconds());
  if (text != shown) {
    shown = text;
    document.getElementById("now").firstChild.data = text;
    browser.writePersistentArray("seen", "S:19B", [text]);
  }
}
browser.setInterval("show()", 250, 0);
]]></script>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9; clut: url(sample.clt); background-color-index: 128" onload="show()">
<object type="video/X-arib-mpeg2" style="left: 480px; top: 120px; width: 440px; height: 248px"/>
<p class="panel" style="left: 40px; top: 120px; width: 400px; height: 56px">文書が見ている日時</p>
<p id="now" class="panel" style="left: 40px; top: 184px; width: 400px; height: 56px">-</p>
</body>
</bml>`

const READ_FACE = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
</head>
<body style="clut: url(sample.clt); background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 80px; top: 120px; width: 400px; height: 225px"/>
<p class="panel" style="left: 520px; top: 120px; width: 400px; height: 96px">番組と文書を読めた</p>
</body>
</bml>`

export const PROGRAMME_READING_CATALOG: BmlCatalog = {
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
            { path: 'face.bml', type: 'text/X-arib-bml' },
            { path: 'sample.css', type: 'text/css' },
            { path: 'sample.clt', type: 'application/octet-stream' },
          ],
        },
      ],
    },
  ],
}

function readingModules(startup: string, face = READ_FACE): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', startup),
        resource('face.bml', 'bml', face),
        resource('sample.css', 'css', SAMPLE_CSS),
        resource('sample.clt', 'binary', Uint8Array.from(SAMPLE_CLUT)),
      ],
    },
  ]
}

/** The module of a self-made data broadcast whose entry document, at the top of its first script, reads its own path and the network of the programme, and moves on to its face only when it has both. */
export function programmeReadingModules(): BmlModule[] {
  return readingModules(READS_ITSELF)
}

/** The module of a self-made data broadcast whose entry document moves on to its face only when it is told it is within the first minute of the programme. */
export function relativeTimeModules(): BmlModule[] {
  return readingModules(KNOWS_HOW_FAR)
}

/** The module of a self-made data broadcast whose entry document prints the date and time it sees, four times a second, and keeps what it printed under `seen` as `S:19B`. */
export function clockModules(): BmlModule[] {
  return readingModules(SEES_THE_TIME)
}

/** The module of a self-made data broadcast whose two pages, on the enter key, ask how far into the programme they are: the one for the start moves on to the one further on from the 100th second, and that one back before it. */
export function howFarModules(): BmlModule[] {
  return readingModules(NEAR_THE_START, FURTHER_ON)
}

const CHECKING = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
<script><![CDATA[
function check() {
  var answer = browser.transmitTextDataOverIP('http://example.test/check.txt', browser.getIRDID(5) || '', 'EUC-JP');
  if (answer[0] == 1 && answer[1] == 200) { browser.launchDocument('http://example.test/bml/top.bml', 'cut'); }
}
]]></script>
</head>
<body style="clut: url(sample.clt); background-color-index: 128" onload="check()">
<object type="video/X-arib-mpeg2" style="left: 560px; top: 60px; width: 360px; height: 203px"/>
<p class="panel" style="left: 40px; top: 60px; width: 480px; height: 203px">通信の見本</p>
</body>
</bml>`

const OVER_THE_LINE = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="style/top.css" type="text/css"/>
</head>
<body style="background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 40px; top: 60px; width: 360px; height: 203px"/>
<p class="panel" style="left: 440px; top: 60px; width: 480px; height: 203px">通信で取った見本のページ</p>
</body>
</bml>`

const OVER_THE_LINE_CSS =
  '.panel { color-index: 129; background-color-index: 130; }'

export const LINE_CATALOG: BmlCatalog = {
  service: 1026,
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
            { path: 'sample.css', type: 'text/css' },
            { path: 'sample.clt', type: 'application/octet-stream' },
          ],
        },
      ],
    },
  ],
}

/** The module of a self-made data broadcast that checks the line as it loads, sending the card's ID when it is given one, and moves to a page over the line when the check is answered. */
export function lineModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', CHECKING),
        resource('sample.css', 'css', SAMPLE_CSS),
        resource('sample.clt', 'binary', Uint8Array.from(SAMPLE_CLUT)),
      ],
    },
  ]
}

/** What the line answers for the self-made pages: the page and its style sheet, each as a module of one resource. */
export const OVER_THE_LINE_PAGES: Record<string, BmlModule> = {
  'http://example.test/bml/top.bml': {
    tag: 0,
    id: 0,
    version: 0,
    resources: [resource('top.bml', 'bml', OVER_THE_LINE)],
  },
  'http://example.test/bml/style/top.css': {
    tag: 0,
    id: 0,
    version: 0,
    resources: [resource('top.css', 'css', OVER_THE_LINE_CSS)],
  },
}

/** The AIT the self-made Hybridcast page names, and the application in it, as Carina answers them. */
export const HYBRIDCAST_AIT = 'http://example.test/hc/app.ait'

export const HYBRIDCAST_APPLICATION = {
  orgId: 16,
  appId: 1,
  controlCode: 1,
  entryUrl: 'http://example.test/hc/index.html',
}

const STARTS_AN_APPLICATION = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
<script><![CDATA[
function start() {
  if (browser.getBrowserSupport('ARIB', 'APIGroup', 'AITControlledApp.Start') != 1) { return; }
  if (browser.Greg[44] == 'back' && browser.Ureg[0] != 'asking') { return; }
  browser.Ureg[0] = 'asking';
  browser.Greg[44] = 'back';
  browser.startAITControlledApp('10', '1', '${HYBRIDCAST_AIT}');
}
]]></script>
</head>
<body style="clut: url(sample.clt); background-color-index: 128" onload="start()">
<object type="video/X-arib-mpeg2" style="left: 560px; top: 60px; width: 360px; height: 203px"/>
<p class="panel" style="left: 40px; top: 60px; width: 480px; height: 203px">Hybridcast の見本</p>
</body>
</bml>`

const STARTS_ON_A_KEY = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
<script><![CDATA[
var ready = true;
function taken() { if (!ready) { return true; } ready = false; return false; }
function pressed() {
  if (taken()) { return; }
  if (document.currentEvent.keyCode == 18) {
    var r = browser.transmitTextDataOverIP('http://example.test/check', '', 'EUC-JP');
    if (r[0] == 1 && r[1] == 200) {
      browser.Greg[44] = 'back';
      browser.startAITControlledApp('10', '1', '${HYBRIDCAST_AIT}');
    }
  }
  browser.setInterval('ready = true;', 100, 1);
}
]]></script>
</head>
<body style="clut: url(sample.clt); background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 560px; top: 60px; width: 360px; height: 203px"/>
<p id="menu" class="menu" style="left: 40px; top: 60px; nav-index: 0" onkeydown="pressed();">Hybridcast</p>
</body>
</bml>`

/** A self-made data broadcast whose menu starts a Hybridcast application on 決定, as a broadcaster's menu does: its key handler turns a second press away until a timer lets it in again, checks the line first, and only then asks for the application. */
export const KEYED_HYBRIDCAST_CATALOG: BmlCatalog = {
  ...LINE_CATALOG,
  service: 1028,
}

export function keyedHybridcastModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', STARTS_ON_A_KEY),
        resource('sample.css', 'css', SAMPLE_CSS),
        resource('sample.clt', 'binary', Uint8Array.from(SAMPLE_CLUT)),
      ],
    },
  ]
}

/** A self-made data broadcast whose entry document starts a Hybridcast application as it opens, unless the shared registers say it came back from one. The script runs again from its start once the AIT is in, so it tells its own mark in the shared registers from one left by the documents before it by a mark in its own. */
export const HYBRIDCAST_CATALOG: BmlCatalog = {
  ...LINE_CATALOG,
  service: 1027,
}

export function hybridcastModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', STARTS_AN_APPLICATION),
        resource('sample.css', 'css', SAMPLE_CSS),
        resource('sample.clt', 'binary', Uint8Array.from(SAMPLE_CLUT)),
      ],
    },
  ]
}

const PLAYS_A_SOUND = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
<script><![CDATA[
function sound() {
  if (browser.playRomSound("romsound://7") == 1) { browser.launchDocument("played.bml", "cut"); }
}
]]></script>
</head>
<body style="clut: url(sample.clt); background-color-index: 128" onload="sound()">
<object type="video/X-arib-mpeg2" style="left: 560px; top: 60px; width: 360px; height: 203px"/>
<p class="panel" style="left: 40px; top: 60px; width: 480px; height: 203px">効果音の見本</p>
</body>
</bml>`

/** The document a sounding broadcast moves to once its sound played: 決定 plays sound 9, and with `later`, sound 10 plays by itself a moment after it opens. */
function soundPlayed(later: boolean): string {
  return `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="sample.css" type="text/css"/>
<script><![CDATA[
function again() {
  if (document.currentEvent.keyCode == 18) { browser.playRomSound("romsound://9"); }
}
function ring() { browser.playRomSound("romsound://10"); }
${later ? 'browser.setInterval("ring()", 1500, 1);' : ''}
]]></script>
</head>
<body style="clut: url(sample.clt); background-color-index: 128">
<object type="video/X-arib-mpeg2" style="left: 40px; top: 60px; width: 360px; height: 203px"/>
<p class="panel" style="left: 440px; top: 60px; width: 440px; height: 203px">鳴らした</p>
<p id="again" class="menu" style="left: 440px; top: 300px; nav-index: 0" onkeydown="again();">もう一度</p>
</body>
</bml>`
}

/** A self-made data broadcast whose start document plays the receiver's built-in sound 7 as it opens, and moves to a second document with the picture at the left once it is told the sound played, where 決定 plays sound 9. */
export const SOUNDING_CATALOG: BmlCatalog = {
  service: 1029,
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
            { path: 'played.bml', type: 'text/X-arib-bml' },
            { path: 'sample.css', type: 'text/css' },
            { path: 'sample.clt', type: 'application/octet-stream' },
          ],
        },
      ],
    },
  ],
}

/** The modules of the sounding broadcast; with `later`, its second document plays sound 10 by itself a moment after it opens. */
export function soundingModules({ later = false } = {}): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', PLAYS_A_SOUND),
        resource('played.bml', 'bml', soundPlayed(later)),
        resource('sample.css', 'css', SAMPLE_CSS),
        resource('sample.clt', 'binary', Uint8Array.from(SAMPLE_CLUT)),
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
    image.src = '/fonts/denpa-font.woff2'
  }))
  report.origin = self.origin
  parent.postMessage({ probe: report }, '*')
})
`

const ROWS = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="rows.css" type="text/css"/>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9">
<p style="left: 40px; top: 40px; width: 880px">番組表　今日の番組　あしたの番組</p>
<p style="left: 40px; top: 56px; width: 880px">ニュース　天気予報　スポーツ　「見本」</p>
<p style="left: 40px; top: 72px; width: 880px">漢字とかなとＡＢＣｇｙ（全角）の行</p>
<p style="left: 40px; top: 88px; width: 880px">お知らせ　番組の内容は変わることがあります</p>
</body>
</bml>`

const ROWS_CSS = 'p { height: 16px; font-size: 16px; }'

export const ROWS_CATALOG: BmlCatalog = {
  service: 1027,
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
            { path: 'rows.css', type: 'text/css' },
          ],
        },
      ],
    },
  ],
}

/** A list of rows each as tall as its 16px text, set by the style sheet, with nothing said about the line height. */
export function rowModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', ROWS),
        resource('rows.css', 'css', ROWS_CSS),
      ],
    },
  ]
}

/** Measures, once the bundled face is loaded and the rows are drawn, how far the text of any row reaches above or below its box, in the document's pixels, and how far its lines overflow it. */
export const GLYPH_PROBE = `
const faceLoaded = () => Array.from(document.fonts).some((face) => face.family.replace(/"/g, '') === 'Denpa Font' && face.status === 'loaded')
function measure() {
  const rows = Array.from(document.querySelectorAll('#bml-plane [data-bml-tag="p"]'))
  if (rows.length === 0 || !faceLoaded()) {
    return null
  }
  const report = { rows: rows.length, above: -Infinity, below: -Infinity, overflow: -Infinity }
  for (const row of rows) {
    const box = row.getBoundingClientRect()
    const range = document.createRange()
    range.selectNodeContents(row)
    const text = range.getBoundingClientRect()
    const scale = box.height / row.offsetHeight
    report.above = Math.max(report.above, (box.top - text.top) / scale)
    report.below = Math.max(report.below, (text.bottom - box.bottom) / scale)
    report.overflow = Math.max(report.overflow, row.scrollHeight - row.clientHeight)
  }
  report.above = report.above.toFixed(2)
  report.below = report.below.toFixed(2)
  report.font = getComputedStyle(rows[0]).fontSize
  return report
}
const measuring = setInterval(() => {
  const report = measure()
  if (report) {
    clearInterval(measuring)
    requestAnimationFrame(() => parent.postMessage({ probe: measure() }, '*'))
  }
}, 50)
`

const MENU = `${PROLOGUE}
<bml>
<head>
<link rel="stylesheet" href="menu.css" type="text/css"/>
<script><![CDATA[
function place(foc) {
  var cursor = document.getElementById("cursor").normalStyle;
  cursor.top = 28 * (foc / 2) + 90 + "px";
  cursor.left = 184 * (foc % 2) + 548 + "px";
  cursor.visibility = "visible";
}
place(1);
]]></script>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9">
<div style="left: 552px; top: 94px; width: 368px; height: 56px">
<div class="item" style="left: 0px; top: 0px"><p>番組表</p></div>
<div id="item1" class="item" style="left: 184px; top: 0px"><p>見本の項目</p></div>
<div class="item" style="left: 0px; top: 28px"><p>お知らせ</p></div>
<div class="item" style="left: 184px; top: 28px"><p>設定</p></div>
</div>
<div id="cursor" style="visibility: hidden">
<div class="edge" style="left: 0px; top: 0px; width: 192px; height: 4px"/>
<div class="edge" style="left: 0px; top: 32px; width: 192px; height: 4px"/>
<div class="edge" style="left: 0px; top: 0px; width: 4px; height: 36px"/>
<div class="edge" style="left: 188px; top: 0px; width: 4px; height: 36px"/>
</div>
</body>
</bml>`

const MENU_CSS = `#cursor { width: 192px; height: 36px; }
.edge { background-color-index: 4; }
.item { width: 184px; height: 28px; }
.item p { left: 25px; width: 144px; height: 28px; line-height: 28px; font-size: 16px; color-index: 7; }`

export const MENU_CATALOG: BmlCatalog = {
  ...ROWS_CATALOG,
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
            { path: 'menu.css', type: 'text/css' },
          ],
        },
      ],
    },
  ],
}

/** A two-column menu whose cursor a script places over the second item, working out its row by halving the item's number, as a receiver's integers do. */
export function menuModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', MENU),
        resource('menu.css', 'css', MENU_CSS),
      ],
    },
  ]
}

/** Measures, once the bundled face is loaded and the cursor is shown, how far the cursor reaches past the item it is on above and below, and where the item's text sits in it, in the document's pixels. */
export const CURSOR_PROBE = `
const faceLoaded = () => Array.from(document.fonts).some((face) => face.family.replace(/"/g, '') === 'Denpa Font' && face.status === 'loaded')
const byId = (id) => document.querySelector('#bml-plane [id="' + id + '"]')
function measure() {
  const cursor = byId('cursor')
  const item = byId('item1')
  if (!cursor || !item || !faceLoaded() || getComputedStyle(cursor).visibility !== 'visible') {
    return null
  }
  const row = item.getBoundingClientRect()
  const frame = cursor.getBoundingClientRect()
  const range = document.createRange()
  range.selectNodeContents(item.firstElementChild)
  const text = range.getBoundingClientRect()
  const scale = row.height / item.offsetHeight
  const fixed = (value) => (value / scale).toFixed(2)
  return {
    'frame-above': fixed(row.top - frame.top),
    'frame-below': fixed(frame.bottom - row.bottom),
    'text-above': fixed(text.top - row.top),
    'text-below': fixed(row.bottom - text.bottom),
  }
}
const measuring = setInterval(() => {
  if (measure()) {
    clearInterval(measuring)
    requestAnimationFrame(() => parent.postMessage({ probe: measure() }, '*'))
  }
}, 50)
`

const SIGNAL = `${PROLOGUE}
<bml>
<head>
<title>動く画像</title>
</head>
<body style="resolution: 960x540; display-aspect-ratio: 16v9; background-color-index: 8">
<div style="left: 40px; top: 40px; width: 420px; height: 184px; background-color-index: 65">
<p style="left: 24px; top: 20px; width: 372px; height: 40px; font-size: 28px; line-height: 40px; color-index: 7">信号の見本</p>
<object id="signal" type="image/X-arib-mng" data="signal.mng" style="left: 24px; top: 92px; width: 180px; height: 60px"/>
</div>
</body>
</bml>`

export const SIGNAL_CATALOG: BmlCatalog = {
  ...ROWS_CATALOG,
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
            { path: 'signal.mng', type: 'image/X-arib-mng' },
          ],
        },
      ],
    },
  ],
}

/** A document with a synthetic MNG of three lamps that light in turn. */
export function signalModules(): BmlModule[] {
  return [
    {
      tag: 0x40,
      id: 0x0000,
      version: 1,
      resources: [
        resource('startup.bml', 'bml', SIGNAL),
        resource('signal.mng', 'binary', signalMng()),
      ],
    },
  ]
}

/** Reads, inside the frame, which lamp of the signal is lit on its canvas, and says each time it changes: the lamps in the order they were seen lit, whether two were ever lit at once, and the canvas's size. */
export const SIGNAL_PROBE = `
const LAMPS = ${JSON.stringify(SIGNAL_LAMPS)}
const LIT = ${JSON.stringify(SIGNAL_COLOURS.lit)}
const near = (a, b) => b.every((value, at) => Math.abs(value - a[at]) <= 2)
const seen = []
let together = false
const look = setInterval(() => {
  const canvas = document.querySelector('#bml-plane canvas')
  if (!canvas) {
    return
  }
  const surface = canvas.getContext('2d')
  const lit = LAMPS.flatMap((lamp, at) => near(Array.from(surface.getImageData(lamp.x, lamp.y, 1, 1).data), LIT[at]) ? [at] : [])
  together = together || lit.length > 1
  if (lit.length === 1 && seen[seen.length - 1] !== lit[0]) {
    seen.push(lit[0])
    parent.postMessage({ probe: { seen: seen.join(' '), together: String(together), size: canvas.width + 'x' + canvas.height } }, '*')
  }
  if (seen.length >= 5) {
    clearInterval(look)
  }
}, 40)
`
