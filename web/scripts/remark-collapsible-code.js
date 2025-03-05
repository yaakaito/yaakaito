import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import { toHtml } from 'hast-util-to-html';

/**
 * Remarkプラグイン: コードブロックを折り畳み可能にする
 * <details>タグで囲まれたコードブロックを検出し、折り畳み可能なHTMLに変換します
 */
function remarkCollapsibleCode() {
  return (tree) => {
    // <details>タグで囲まれた領域を検出して処理
    visit(tree, 'html', (node, index, parent) => {
      if (!node.value.trim().startsWith('<details')) return;

      // <details>の開始タグを抽出してサマリーを取得
      const detailsMatch = node.value.match(/<details(?:\s+([^>]*))?>/i);
      if (!detailsMatch) return;

      // サマリーの属性を抽出（もしあれば）
      let summary = 'コードを表示';
      const summaryMatch = node.value.match(/<summary>(.*?)<\/summary>/i);
      if (summaryMatch && summaryMatch[1]) {
        summary = summaryMatch[1].trim();
      }

      // 次のノードがコードブロックかチェック
      if (!parent || !parent.children || index === parent.children.length - 1) return;

      const nextNode = parent.children[index + 1];
      if (nextNode.type !== 'code') return;

      // コードブロックの後に</details>が続くかチェック
      if (index + 2 >= parent.children.length) return;

      const closingNode = parent.children[index + 2];
      if (closingNode.type !== 'html' || !closingNode.value.trim().match(/<\/details>/i)) return;

      // 折り畳み可能なコンテナを作成
      const codeContent = nextNode.value;
      const language = nextNode.lang || '';

      // HTMLに変換
      const detailsElement = h('details', { class: 'collapsible-code' }, [
        h('summary', {}, summary),
        h('pre', { class: language ? `language-${language}` : '' }, [
          h('code', {}, codeContent)
        ])
      ]);

      // 元のノードを置き換え
      node.value = toHtml(detailsElement);

      // 処理済みのノードを削除
      parent.children.splice(index + 1, 2);
    });
  };
}

export default remarkCollapsibleCode;
