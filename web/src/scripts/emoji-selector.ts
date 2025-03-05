/**
 * Note記事のタイトルや内容に基づいて絵文字を自動選択するユーティリティ
 */

// カテゴリ別の絵文字セット
const emojiSets: Record<string, string[]> = {
  // 開発・コーディング関連
  development: ['💻', '👨‍💻', '👩‍💻', '🧑‍💻', '⌨️', '🖥️', '🚀', '⚙️', '🔧', '🔨', '🛠️', '🧰'],

  // デザイン関連
  design: ['🎨', '🖌️', '🖍️', '✏️', '📐', '📏', '🎭', '👁️', '🔍'],

  // メモ・ノート関連
  notes: ['📝', '✍️', '🖊️', '📓', '📔', '📒', '📕', '📗', '📘', '📙'],

  // ウェブ・インターネット関連
  web: ['🌐', '🔗', '📡', '📱', '📶', '🌍', '🌎', '🌏'],

  // 時間・スケジュール関連
  time: ['⏰', '⏱️', '⏲️', '🕰️', '📅', '📆', '🗓️', '⌛', '⏳'],

  // アイデア・思考関連
  idea: ['💡', '🧠', '🤔', '💭', '✨', '🔮'],

  // データ・分析関連
  data: ['📊', '📈', '📉', '🧮', '🔢', '📑', '📋'],

  // コミュニケーション関連
  communication: ['💬', '🗣️', '📢', '📣', '📮', '📧', '✉️', '📩', '📨'],

  // セキュリティ関連
  security: ['🔒', '🔓', '🔐', '🔑', '🗝️', '🛡️'],

  // 実験・テスト関連
  experiment: ['🧪', '🧫', '🔬', '🔭', '🧬'],

  // その他
  misc: ['📌', '📎', '🔖', '🏷️', '💼', '📁', '📂', '🗂️', '📤', '📥', '📚', '🎲', '🎯']
};

// キーワードとカテゴリのマッピング
const keywordCategories: Record<string, string[]> = {
  // 開発・コーディング関連キーワード
  development: [
    'code', 'コード', 'プログラム', 'program', 'dev', '開発', 'アプリ', 'app',
    'software', 'ソフトウェア', 'エンジニア', 'engineer', 'script', 'スクリプト',
    'function', '関数', 'coding', 'コーディング', 'debug', 'デバッグ', 'api', 'データベース',
    'database', 'プラグイン', 'plugin', 'サーバー', 'server', 'フレームワーク', 'framework',
    'ライブラリ', 'library', 'npm', 'git', 'コンパイル', 'compile'
  ],

  // デザイン関連キーワード
  design: [
    'design', 'デザイン', 'ui', 'ux', 'インターフェース', 'interface', 'グラフィック',
    'graphic', 'layout', 'レイアウト', 'color', '色', 'スタイル', 'style', 'フォント',
    'font', 'アイコン', 'icon', 'ロゴ', 'logo', 'イラスト', 'illustration', '画像',
    'image', 'デザイナー', 'designer', 'css'
  ],

  // メモ・ノート関連キーワード
  notes: [
    'note', 'ノート', 'メモ', 'memo', 'メモランダム', 'memorandum', '書き留め', 'jot',
    'reminder', 'リマインダー', 'todo', 'タスク', 'task', 'チェックリスト', 'checklist'
  ],

  // ウェブ・インターネット関連キーワード
  web: [
    'web', 'ウェブ', 'サイト', 'site', 'インターネット', 'internet', 'ブラウザ', 'browser',
    'html', 'css', 'javascript', 'js', 'http', 'https', 'ドメイン', 'domain', 'url',
    'リンク', 'link', 'セッション', 'session', 'cookie', 'クッキー', 'サーバー', 'server',
    'クライアント', 'client', 'レスポンシブ', 'responsive', 'モバイル', 'mobile'
  ],

  // 時間・スケジュール関連キーワード
  time: [
    'time', '時間', '日時', 'date', 'スケジュール', 'schedule', '予定', '締め切り',
    'deadline', '期限', 'カレンダー', 'calendar', '時計', 'clock', '分', 'minute',
    '秒', 'second', '日', 'day', '月', 'month', '年', 'year', '週', 'week'
  ],

  // アイデア・思考関連キーワード
  idea: [
    'idea', 'アイデア', '思考', 'thinking', '考え', 'thought', 'ひらめき', 'inspiration',
    'インスピレーション', '創造', 'creation', '創造的', 'creative', 'イノベーション',
    'innovation', 'ブレインストーミング', 'brainstorming', '発想', 'concept', 'コンセプト'
  ],

  // データ・分析関連キーワード
  data: [
    'data', 'データ', '分析', 'analysis', '統計', 'statistics', 'グラフ', 'graph',
    'チャート', 'chart', '数値', 'number', '数字', 'figure', 'レポート', 'report',
    '指標', 'metric', 'kpi', '測定', 'measurement', 'マイニング', 'mining'
  ],

  // コミュニケーション関連キーワード
  communication: [
    'communication', 'コミュニケーション', 'メッセージ', 'message', '会話', 'conversation',
    'チャット', 'chat', 'トーク', 'talk', 'ディスカッション', 'discussion', 'メール',
    'email', '手紙', 'letter', '通知', 'notification', 'アナウンス', 'announcement',
    'ニュース', 'news', 'コメント', 'comment', 'フィードバック', 'feedback'
  ],

  // セキュリティ関連キーワード
  security: [
    'security', 'セキュリティ', '安全', 'safety', 'プライバシー', 'privacy', '保護',
    'protection', '暗号化', 'encryption', 'パスワード', 'password', '認証', 'authentication',
    '認可', 'authorization', 'ファイアウォール', 'firewall', 'ハッキング', 'hacking'
  ],

  // 実験・テスト関連キーワード
  experiment: [
    'experiment', '実験', 'テスト', 'test', '検証', 'validation', '確認', 'verification',
    'トライアル', 'trial', 'プロトタイプ', 'prototype', 'PoC', 'proof of concept',
    'ベータ', 'beta', 'アルファ', 'alpha', '研究', 'research', '調査', 'investigation'
  ]
};

/**
 * タイトルと内容からカテゴリを推測する
 * @param {string} title - 記事のタイトル
 * @param {string} content - 記事の内容（オプション）
 * @returns {string} - 推測されたカテゴリ
 */
function guessCategory(title: string, content: string = ''): string {
  // タイトルと内容を結合して小文字化
  const text = (title + ' ' + content).toLowerCase();

  // 各カテゴリのキーワードとマッチするかチェック
  for (const [category, keywords] of Object.entries(keywordCategories)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  // デフォルトはnotes
  return 'notes';
}

/**
 * カテゴリに基づいて絵文字をランダムに選択
 * @param {string} category - 記事のカテゴリ
 * @returns {string} - 選択された絵文字
 */
function getRandomEmojiForCategory(category: string): string {
  const emojis = emojiSets[category] || emojiSets.notes;
  const randomIndex = Math.floor(Math.random() * emojis.length);
  return emojis[randomIndex];
}

/**
 * タイトルと内容から絵文字を自動選択
 * @param {string} title - 記事のタイトル
 * @param {string} content - 記事の内容（オプション）
 * @returns {string} - 選択された絵文字
 */
export function selectEmoji(title: string, content: string = ''): string {
  const category = guessCategory(title, content);
  return getRandomEmojiForCategory(category);
}

export default selectEmoji;
