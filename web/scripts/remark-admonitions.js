import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import { toHtml } from 'hast-util-to-html';

// アドモニション（注釈）タイプの定義
const ADMONITION_TYPES = {
  'NOTE': { icon: 'ℹ️', label: 'ノート', className: 'admonition-note' },
  'TIP': { icon: '💡', label: 'ヒント', className: 'admonition-tip' },
  'WARNING': { icon: '⚠️', label: '警告', className: 'admonition-warning' },
  'CAUTION': { icon: '🔥', label: '注意', className: 'admonition-caution' },
  'IMPORTANT': { icon: '❗', label: '重要', className: 'admonition-important' },
  'INFO': { icon: 'ℹ️', label: '情報', className: 'admonition-info' },
};

function remarkAdmonitions() {
  return (tree) => {
    visit(tree, 'blockquote', (node, index, parent) => {
      // 最初の段落が [!TYPE] で始まるか確認
      if (
        node.children.length > 0 &&
        node.children[0].type === 'paragraph' &&
        node.children[0].children.length > 0 &&
        node.children[0].children[0].type === 'text'
      ) {
        const text = node.children[0].children[0].value;
        const match = text.match(/^\[!(.*?)\](.*)/);

        if (match) {
          const type = match[1].trim().toUpperCase();
          const restOfText = match[2].trim();

          // 対応するアドモニションタイプがあるか確認
          if (ADMONITION_TYPES[type]) {
            const { icon, label, className } = ADMONITION_TYPES[type];

            // 残りのテキストを最初の段落に設定
            if (restOfText) {
              node.children[0].children[0].value = restOfText;
            } else {
              // 空の場合は最初の段落を削除
              node.children.shift();
            }

            // アドモニションブロックを作成
            const admonitionBlock = h('div', { class: `admonition ${className}` }, [
              h('div', { class: 'admonition-header' }, [
                h('span', { class: 'admonition-icon' }, icon),
                h('span', { class: 'admonition-title' }, label)
              ]),
              h('div', { class: 'admonition-content' })
            ]);

            // アドモニションのコンテンツを追加
            const content = admonitionBlock.children[1];

            // ブロッククォートの中身を移動
            for (const child of node.children) {
              content.children.push(child);
            }

            // ノードをHTMLに変換
            node.type = 'html';
            node.value = toHtml(admonitionBlock);
            node.children = undefined;
          }
        }
      }
    });
  };
}

export default remarkAdmonitions;
