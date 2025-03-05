#!/usr/bin/env node
/**
 * emoji-suggestions.js
 *
 * Note（メモ）作成時に、タイトルに基づいて適切な絵文字を提案するツール
 * TIPS / NEWS / MEMO の3つのカテゴリに分けて、それぞれ関連する絵文字候補を提供します
 *
 * 使用方法:
 * $ node scripts/emoji-suggestions.js "Noteのタイトル"
 */

// カテゴリごとの絵文字セット
const emojiCategories = {
  TIPS: [
    { emoji: '💡', description: '閃き、ヒント、アイデア' },
    { emoji: '🔍', description: '調査、発見、研究' },
    { emoji: '🛠️', description: 'ツール、手順、作業方法' },
    { emoji: '⚙️', description: '設定、構成、メカニズム' },
    { emoji: '🧩', description: '解決策、改善方法' },
    { emoji: '📝', description: 'メモ、記録、ノート取り' },
    { emoji: '🧠', description: '考え方、コンセプト、知識' },
    { emoji: '🎯', description: '目標達成、的確なアドバイス' },
    { emoji: '⚡', description: '効率化、高速化、パフォーマンス' },
    { emoji: '🔧', description: '修正、調整、メンテナンス' }
  ],

  NEWS: [
    { emoji: '📰', description: 'ニュース、発表、最新情報' },
    { emoji: '🔔', description: 'お知らせ、通知、アラート' },
    { emoji: '🚀', description: 'リリース、ローンチ、新機能' },
    { emoji: '📢', description: 'アナウンス、告知' },
    { emoji: '🆕', description: '新着、新規、最新' },
    { emoji: '📅', description: 'イベント、日程、スケジュール' },
    { emoji: '🎉', description: 'お祝い、成功、達成' },
    { emoji: '📊', description: '統計、トレンド、データ' },
    { emoji: '🔄', description: '更新、変更、アップデート' },
    { emoji: '📈', description: '成長、進展、向上' }
  ],

  MEMO: [
    { emoji: '📋', description: '覚書、リスト、チェックリスト' },
    { emoji: '🗒️', description: 'ノート、メモ帳' },
    { emoji: '✏️', description: 'メモ書き、下書き' },
    { emoji: '📌', description: '重要なポイント、ピン留め' },
    { emoji: '🔖', description: 'ブックマーク、参照、保存' },
    { emoji: '💭', description: '考え、アイデア、思考' },
    { emoji: '🧐', description: '観察、分析、検討' },
    { emoji: '🤔', description: '疑問、考察、思考中' },
    { emoji: '📓', description: '日記、記録、ログ' },
    { emoji: '🖋️', description: 'メモ、筆記、記述' }
  ]
};

// キーワードとカテゴリの対応関係
const categoryKeywords = {
  TIPS: [
    'やり方', '方法', 'ハウツー', 'コツ', 'テクニック', '使い方', '便利', '効率',
    'ヒント', 'アイデア', '改善', '解決', '実装', '最適化', 'パターン', 'スキル',
    'コマンド', 'ツール', '設定', '構成', 'tips', 'how to', '開発', 'dev', 'tool',
    '活用', '利用', '使う', '導入', 'よくある', '役立つ', '実践', '一工夫'
  ],

  NEWS: [
    'ニュース', '発表', 'リリース', '登場', '最新', '新機能', 'アップデート',
    '変更点', 'アナウンス', '告知', 'イベント', '発売', '公開', '開催', 'ベータ',
    'アルファ', 'お知らせ', '速報', 'news', 'release', 'update', 'announce', 'event',
    '新着', '新しい', '新規', '次期', '次世代', 'version', 'バージョン', '発見'
  ],

  MEMO: [
    'メモ', 'ノート', '記録', '覚書', '備忘録', '雑記', 'まとめ', '考察',
    '思考', '観察', '振り返り', '日記', 'ログ', 'レビュー', '感想', '考え',
    '調査', 'memo', 'note', 'log', 'diary', 'thought', '調べた', '検証',
    'レポート', '見つけた', '気づき', '発見した', '見た', '読んだ', '聞いた'
  ]
};

// テクニカルキーワードと推奨カテゴリの対応
const technicalKeywords = {
  // プログラミング言語
  'JavaScript': 'TIPS',
  'TypeScript': 'TIPS',
  'Python': 'TIPS',
  'Java': 'TIPS',
  'Go': 'TIPS',
  'Rust': 'TIPS',
  'C#': 'TIPS',
  'Kotlin': 'TIPS',
  'Swift': 'TIPS',
  'PHP': 'TIPS',
  'Ruby': 'TIPS',
  'CSS': 'TIPS',
  'HTML': 'TIPS',
  'SQL': 'TIPS',

  // フレームワーク/ライブラリ
  'React': 'TIPS',
  'Vue': 'TIPS',
  'Angular': 'TIPS',
  'Next.js': 'TIPS',
  'Nuxt': 'TIPS',
  'Svelte': 'TIPS',
  'Express': 'TIPS',
  'Django': 'TIPS',
  'Flask': 'TIPS',
  'Spring': 'TIPS',
  'Laravel': 'TIPS',
  'Rails': 'TIPS',
  'Astro': 'TIPS',

  // インフラ/ツール
  'Docker': 'TIPS',
  'Kubernetes': 'TIPS',
  'AWS': 'TIPS',
  'GCP': 'TIPS',
  'Azure': 'TIPS',
  'GitHub': 'TIPS',
  'GitLab': 'TIPS',
  'CI/CD': 'TIPS',
  'Terraform': 'TIPS',
  'npm': 'TIPS',
  'yarn': 'TIPS',
  'pnpm': 'TIPS',
  'Webpack': 'TIPS',
  'Vite': 'TIPS',

  // 新製品/アップデート関連
  'ベータ': 'NEWS',
  'アルファ': 'NEWS',
  'RC': 'NEWS',
  'リリース': 'NEWS',
  '発表': 'NEWS',
  'バージョン': 'NEWS',
  '最新版': 'NEWS',
  'アップデート': 'NEWS',
  '新機能': 'NEWS',
  '変更点': 'NEWS',
  '改善': 'NEWS',
  '発売': 'NEWS',
  '公開': 'NEWS',

  // 考察/調査メモ関連
  '検証': 'MEMO',
  '調査': 'MEMO',
  '考察': 'MEMO',
  '思考': 'MEMO',
  'まとめ': 'MEMO',
  'レポート': 'MEMO',
  '備忘録': 'MEMO',
  '気づき': 'MEMO',
  '振り返り': 'MEMO',
  '比較': 'MEMO',
  '所感': 'MEMO',
  '試した': 'MEMO'
};

// タイトルからカテゴリを予測する関数
function predictCategory(title) {
  const titleLower = title.toLowerCase();

  // カテゴリごとにキーワードマッチングのスコアを計算
  const scores = {
    TIPS: 0,
    NEWS: 0,
    MEMO: 0
  };

  // 一般キーワードによるスコアリング
  Object.keys(categoryKeywords).forEach(category => {
    categoryKeywords[category].forEach(keyword => {
      if (titleLower.includes(keyword.toLowerCase())) {
        scores[category] += 1;
      }
    });
  });

  // 技術キーワードによる特定カテゴリへのボーナス
  Object.keys(technicalKeywords).forEach(keyword => {
    if (titleLower.includes(keyword.toLowerCase())) {
      const category = technicalKeywords[keyword];
      scores[category] += 1.5; // 技術キーワードにはボーナススコア
    }
  });

  // 最高スコアのカテゴリを見つける
  let maxCategory = 'MEMO'; // デフォルトはMEMO
  let maxScore = 0;

  Object.keys(scores).forEach(category => {
    if (scores[category] > maxScore) {
      maxScore = scores[category];
      maxCategory = category;
    }
  });

  return {
    category: maxCategory,
    confidence: maxScore > 0 ? Math.min(maxScore / 3, 1) : 0.3 // 信頼度の計算（0.3～1.0）
  };
}

// ランダムに絵文字を取得する関数（確率的選択）
function getRandomEmojis(category, count = 3) {
  const emojis = emojiCategories[category];

  // Fisher-Yatesシャッフルアルゴリズムでランダムに並べ替え
  const shuffled = [...emojis];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

// メイン処理
function suggestEmojis(title) {
  const { category, confidence } = predictCategory(title);

  // 信頼度に応じて、他のカテゴリからも少数の絵文字を混ぜる
  const primaryCount = 3;
  const secondaryCount = confidence < 0.6 ? 1 : 0;

  // メインカテゴリから絵文字を取得
  const primaryEmojis = getRandomEmojis(category, primaryCount);

  // サブカテゴリの決定
  const otherCategories = Object.keys(emojiCategories).filter(c => c !== category);
  const secondaryEmojis = [];

  if (secondaryCount > 0) {
    // 低信頼度の場合、他のカテゴリからも少数の絵文字を取得
    otherCategories.forEach(otherCategory => {
      secondaryEmojis.push(...getRandomEmojis(otherCategory, secondaryCount));
    });
  }

  // 結果の作成
  const result = {
    title,
    predictedCategory: category,
    confidence: confidence.toFixed(2),
    suggestedEmojis: [...primaryEmojis, ...secondaryEmojis]
  };

  return result;
}

// コマンドライン引数からタイトルを取得
const title = process.argv[2];

if (!title) {
  console.log('使用方法: node scripts/emoji-suggestions.js "Noteのタイトル"');
  process.exit(1);
}

// 絵文字の提案を実行し、結果を表示
const suggestions = suggestEmojis(title);

// 結果の出力
console.log(`\n🔍 「${suggestions.title}」の絵文字候補`);
console.log(`\n推測カテゴリ: ${suggestions.predictedCategory} (信頼度: ${suggestions.confidence})\n`);

console.log('おすすめの絵文字:');
suggestions.suggestedEmojis.forEach(emoji => {
  console.log(`${emoji.emoji} - ${emoji.description}`);
});

console.log('\n使い方: Noteのフロントマターに選んだ絵文字を設定してください');
console.log('例: emoji: "選んだ絵文字"\n');
