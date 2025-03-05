// ノートの絵文字をコンテンツに基づいて更新するスクリプト
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const noteDir = path.join(__dirname, '../src/pages/note');

// カテゴリ別の絵文字マッピング
const EMOJIS = {
  TIPS: ['💡', '⚙️', '🔧', '🛠️', '🧰'],
  NEWS: ['📰', '🔔', '📢', '🆕', '📣'],
  MEMO: ['📝', '📌', '🗒️', '📓', '✏️'],
};

// キーワードベースのカテゴリ判定
const CATEGORY_KEYWORDS = {
  TIPS: ['使う', '方法', '実装', 'できる', 'やり方', 'コード', '機能', 'API', 'ツール'],
  NEWS: ['導入', '新しい', '追加', 'リリース', 'アップデート', '発表', '登場', 'バージョン'],
  MEMO: ['メモ', '覚書', '参考', 'まとめ', '情報', '知識', 'リンク', 'ドキュメント'],
};

// ノートの内容からカテゴリを判定
function categorizeNote(content) {
  const scores = {
    TIPS: 0,
    NEWS: 0,
    MEMO: 0,
  };

  // 各カテゴリのキーワードの出現回数をカウント
  Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex);
      if (matches) {
        scores[category] += matches.length;
      }
    });
  });

  // もっともスコアが高いカテゴリを選択
  let maxCategory = 'MEMO'; // デフォルトはMEMO
  let maxScore = 0;

  Object.entries(scores).forEach(([category, score]) => {
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category;
    }
  });

  return maxCategory;
}

// ランダムに絵文字を選択
function getRandomEmoji(category) {
  const emojis = EMOJIS[category];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// ノートファイルの絵文字を更新
function updateNoteEmoji(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // フロントマターとコンテンツを分離
  const parts = content.split('---');
  if (parts.length < 3) return null;

  const frontMatter = parts[1];
  const noteContent = parts.slice(2).join('---');

  // 現在の絵文字を確認
  const currentEmojiMatch = frontMatter.match(/emoji:\s*([^\n]+)/);
  if (!currentEmojiMatch) return null;

  const currentEmoji = currentEmojiMatch[1].trim();

  // カテゴリを判定して新しい絵文字を取得
  const category = categorizeNote(noteContent);
  const newEmoji = getRandomEmoji(category);

  // 絵文字が同じなら変更しない
  if (newEmoji === currentEmoji) return null;

  // 絵文字を更新
  const updatedFrontMatter = frontMatter.replace(
    /emoji:\s*([^\n]+)/,
    `emoji: ${newEmoji}`
  );

  // 更新した内容を書き戻す
  const updatedContent = `---${updatedFrontMatter}---${noteContent}`;
  fs.writeFileSync(filePath, updatedContent);

  return {
    file: path.basename(filePath),
    oldEmoji: currentEmoji,
    newEmoji,
    category,
  };
}

// メイン処理
async function main() {
  try {
    const files = fs.readdirSync(noteDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    console.log(`Found ${mdFiles.length} note files. Updating emojis...`);

    const updates = [];

    for (const file of mdFiles) {
      const filePath = path.join(noteDir, file);
      const result = updateNoteEmoji(filePath);
      if (result) {
        updates.push(result);
      }
    }

    console.log(`Updated ${updates.length} note emojis:`);
    updates.forEach(update => {
      console.log(`- ${update.file}: ${update.oldEmoji} → ${update.newEmoji} (${update.category})`);
    });

  } catch (error) {
    console.error('Error updating note emojis:', error);
  }
}

main();
