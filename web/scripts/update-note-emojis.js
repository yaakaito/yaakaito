#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ノートカテゴリと対応する絵文字のマッピング
const EMOJI_CATEGORIES = {
  TIPS: ['💡', '🔧', '🛠️', '📝', '🧰'],
  NEWS: ['📢', '📰', '🔔', '📣', '🗞️'],
  MEMO: ['📒', '📋', '📔', '🗒️', '📌'],
  CODE: ['💻', '⌨️', '🖥️', '🧮', '👨‍💻'],
  CSS: ['🎨', '🖌️', '🎭', '🖼️', '🎭'],
  TEST: ['🧪', '🔬', '📊', '📈', '🧬'],
  WEB: ['🌐', '🕸️', '🔗', '🌍', '📱'],
  ANIMATION: ['🚀', '✨', '🎬', '💫', '🎞️']
};

// カテゴリごとのキーワード
const CATEGORY_KEYWORDS = {
  TIPS: ['使う', '利用', 'できる', '方法', 'CLI', 'コマンド'],
  NEWS: ['新機能', '導入', 'リリース', '追加', 'バージョン', '最新'],
  MEMO: ['メモ', '備忘録', '覚書', 'まとめ', '個人的'],
  CODE: ['コード', 'TypeScript', 'JavaScript', 'React', 'Node'],
  CSS: ['CSS', 'スタイル', 'デザイン', 'レイアウト', ':has'],
  TEST: ['テスト', 'swc', 'テストランナー', '検証'],
  WEB: ['HTML', 'ブラウザ', 'Web', 'API'],
  ANIMATION: ['アニメーション', '遷移', 'トランジション', 'Transition']
};

// ファイル内容からカテゴリを判定する関数
function determineCategory(content) {
  let scores = {};

  // すべてのカテゴリに対してスコアリング
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      // キーワードが含まれる回数を加算
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      if (matches) {
        scores[category] += matches.length;
      }
    }
  }

  // 最もスコアが高いカテゴリを返す
  let maxScore = 0;
  let bestCategory = 'TIPS'; // デフォルト

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

// カテゴリから絵文字をランダムに選ぶ関数
function getRandomEmojiForCategory(category) {
  const emojis = EMOJI_CATEGORIES[category] || EMOJI_CATEGORIES.TIPS;
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// ノートファイルの絵文字を更新する関数
async function updateNoteEmoji(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8');

    // すでに更新済みかどうかチェック（🖊以外の絵文字が設定されている場合）
    if (!content.includes('emoji: 🖊')) {
      console.log(`${path.basename(filePath)} はすでに更新済みです`);
      return false;
    }

    // カテゴリを判定
    const category = determineCategory(content);

    // カテゴリに基づいて絵文字を選定
    const newEmoji = getRandomEmojiForCategory(category);

    // 絵文字を更新
    const updatedContent = content.replace(
      /emoji: 🖊/,
      `emoji: ${newEmoji}`
    );

    // ファイルに書き戻す
    await fs.promises.writeFile(filePath, updatedContent, 'utf8');

    console.log(`${path.basename(filePath)} の絵文字を ${newEmoji} に更新しました (カテゴリ: ${category})`);
    return true;
  } catch (error) {
    console.error(`${path.basename(filePath)} の処理中にエラーが発生しました:`, error);
    return false;
  }
}

// メイン処理
async function main() {
  const noteDir = path.join(__dirname, '../src/pages/note');

  try {
    // すべてのマークダウンファイルを取得
    const files = fs.readdirSync(noteDir)
      .filter(file => file.endsWith('.md'))
      .map(file => path.join(noteDir, file));

    console.log(`${files.length} 件のノートファイルを処理します...`);

    // 各ファイルの絵文字を更新
    const results = await Promise.all(files.map(updateNoteEmoji));

    // 更新された件数をカウント
    const updatedCount = results.filter(Boolean).length;

    console.log(`\n処理完了: ${updatedCount} / ${files.length} 件のノートの絵文字を更新しました`);
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
main();
