import type { Preview } from '@storybook/nextjs'
import { useEffect } from 'react'
import '../app/globals.css'
import { ThemeProvider } from '../components/theme/ThemeProvider'
import type { ThemePreference } from '../lib/theme'
import { afterTheArrival } from '../stories/after-the-arrival'

const REQUESTED_THEME =
  typeof location === 'undefined'
    ? null
    : new URLSearchParams(location.search).get('theme')

function WithTheme({
  theme,
  children,
}: {
  theme: ThemePreference
  children: React.ReactNode
}) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return <ThemeProvider initialPreference={theme}>{children}</ThemeProvider>
}

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          'Foundations',
          ['色', '文字', '面と影', 'アイコン', 'ロゴと案内役'],
          'Components',
          [
            '枠組み',
            ['アプリの枠', '面と空状態', '幕'],
            'ナビゲーション',
            ['タブバー', 'タブと日付送り'],
            'ボタンとフォーム',
            ['ボタン', '選ぶボタン', 'フォームの部品'],
            '見出しと文字',
            ['節の見出し', '日時の書き方'],
            '一覧と表',
            ['データの一覧', '表'],
            '状態と知らせ',
            [
              '状態の表示',
              'バナー',
              '進み具合',
              '読み込み中',
              'セッション切れ',
              'サインインの断り',
              'driver 再起動の帯',
            ],
            '重なり',
            ['ダイアログとメニュー', '見切れた文字の全文'],
            '番組と局',
            ['局のロゴ', '番組の面', '単発の通知'],
            'プレイヤー',
            ['録画プレイヤー', '操作子の名札'],
            'データ放送',
            ['BML', 'Hybridcast'],
          ],
          'Screens',
          [
            '番組表',
            ['番組表', '番組詳細', '番組検索', '収集状態'],
            'ライブ',
            ['ライブ', 'データ放送'],
            'ライブラリ',
            [
              'ライブラリ',
              '録画詳細',
              [
                '録画詳細',
                'CM・OP・ED を飛ばす操作',
                'シークを送る',
                'データ放送',
              ],
            ],
            '予約',
            ['予約', 'ルール', '失敗台帳'],
            '設定',
            [
              '入口',
              'システム',
              '観る',
              ['視聴', '表示'],
              '録る',
              ['エンコード', 'CM・OP・ED の検出', '品質'],
              '機器',
              ['チューナー', 'チャンネル', 'スキャン結果'],
              '管理',
              ['認証', '整合性チェック', '通知', '移行記録'],
            ],
            'サインイン',
            ['サインイン', 'サインアウト完了'],
            'エラー',
            ['見つからない画面', '表示できなかった画面'],
          ],
          'Theme',
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
    a11y: {
      test: 'error',
      options: { preload: { assets: ['cssom'] } },
    },
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'sun',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  afterEach: async ({ canvasElement }) => {
    await afterTheArrival(canvasElement)
  },
  decorators: [
    (Story, context) => {
      const theme: ThemePreference =
        (REQUESTED_THEME ?? context.globals.theme) === 'dark' ? 'dark' : 'light'
      return (
        <WithTheme theme={theme}>
          <Story />
        </WithTheme>
      )
    },
  ],
}

export default preview
