import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import { toHtml } from 'hast-util-to-html';

// アドモニションタイプとそれに対応するアイコンとカラー
const admonitionTypes = {
  note: { icon: 'ℹ️', color: '#3b82f6' },      // 青
  warning: { icon: '⚠️', color: '#f59e0b' },   // オレンジ
  tip: { icon: '💡', color: '#10b981' },       // 緑
  important: { icon: '🔥', color: '#ef4444' }, // 赤
  caution: { icon: '⚡', color: '#f97316' },    // オレンジ赤
  info: { icon: 'ℹ️', color: '#3b82f6' },      // note と同じ
  danger: { icon: '⚠️', color: '#dc2626' },    // 濃い赤
  success: { icon: '✅', color: '#22c55e' },    // 緑
};

// デフォルトのアドモニションタイプ
const defaultAdmonition = {
  icon: 'ℹ️',
  color: '#6b7280', // グレー
};

function remarkAdmonitions() {
  return (tree) => {
    visit(tree, 'blockquote', (node, index, parent) => {
      // 最初のパラグラフがアドモニション構文かチェック
      if (
        node.children.length > 0 &&
        node.children[0].type === 'paragraph' &&
        node.children[0].children.length > 0 &&
        node.children[0].children[0].type === 'text'
      ) {
        const firstLine = node.children[0].children[0].value;
        const admonitionMatch = firstLine.match(/^\[!([A-Z]+)\](.*)$/);

        if (admonitionMatch) {
          // アドモニションタイプと残りのコンテンツを取得
          const type = admonitionMatch[1].toLowerCase();
          const restOfFirstLine = admonitionMatch[2];

          // アドモニションタイプに対応するスタイルを取得
          const admonition = admonitionTypes[type] || defaultAdmonition;

          // 最初の行の残りをパラグラフに戻す
          if (restOfFirstLine.trim()) {
            node.children[0].children[0].value = restOfFirstLine;
          } else {
            // 最初の行が空になる場合は削除
            node.children.shift();
          }

          // アドモニションコンテナを作成
          const admonitionContent = h('div', { class: 'admonition-content' }, []);

          // 残りのノードをアドモニションコンテンツに移動
          node.children.forEach((child) => {
            admonitionContent.children.push(child);
          });

          // アドモニションのHTMLを作成
          const admonitionElement = h('div', {
            class: `admonition admonition-${type}`,
            style: `--admonition-color: ${admonition.color};`
          }, [
            h('div', { class: 'admonition-header' }, [
              h('span', { class: 'admonition-icon' }, admonition.icon),
              h('span', { class: 'admonition-title' }, type.toUpperCase())
            ]),
            admonitionContent
          ]);

          // ノードをHTMLノードに変換
          node.type = 'html';
          node.children = [];
          node.value = toHtml(admonitionElement);
        }
      }
    });
  };
}

export default remarkAdmonitions;
