import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import { toHtml } from 'hast-util-to-html';

/**
 * コードブロックを折りたためるようにするremarkプラグイン
 * 長いコードブロック（20行以上）を検出し、最初の12行は表示したまま、それ以降を隠します
 * 最後の2行はぼかしエフェクトをかけて、中央に「コードをすべてみる」ボタンを配置します
 *
 * 通常のコードブロック:
 * ```js
 * // 長いコード
 * ```
 *
 * または明示的に指定する場合:
 * <details>
 * ```js
 * // 長いコード
 * ```
 * </details>
 */
function remarkCollapsibleCode() {
  const VISIBLE_LINES = 12;  // 表示する行数
  const BLUR_LINES = 2;      // ぼかしをかける行数
  const MIN_LINES = 20;      // 折りたたみを適用する最小行数

  return (tree) => {
    // 明示的な<details>タグでマークされたケースの処理
    visit(tree, 'html', (node) => {
      if (node.value.match(/<details>\s*```/) && node.value.includes('</details>')) {
        // 元の内容を取得
        const originalContent = node.value;

        // コードブロックを抽出
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/;
        const codeBlockMatch = originalContent.match(codeBlockRegex);

        if (codeBlockMatch) {
          const language = codeBlockMatch[1] || 'plaintext';
          const code = codeBlockMatch[2];
          const lines = code.split('\n');

          if (lines.length >= MIN_LINES) {
            processLongCodeBlock(node, lines, language);
          } else {
            // 行数が少ない場合は通常のコードブロックとして表示
            const codeBlock = h('pre', { class: `language-${language}`, 'data-language': language }, [
              h('code', code)
            ]);
            node.value = toHtml(codeBlock);
          }
        }
      }
    });

    // 通常のコードブロックの処理（長い場合は自動的に折りたたむ）
    visit(tree, 'code', (node) => {
      // コードの行数をカウント
      const lines = node.value.split('\n');

      // MIN_LINES行以上の長いコードブロックの場合のみ処理
      if (lines.length >= MIN_LINES) {
        // 親ノードを置き換え
        node.type = 'html';
        processLongCodeBlock(node, lines, node.lang || 'plaintext');
      }
    });
  };

  // 長いコードブロックを処理する関数
  function processLongCodeBlock(node, lines, language) {
    // 表示する部分（先頭VISIBLE_LINES行）とぼかし部分（次のBLUR_LINES行）と隠す部分（残り）に分割
    const visibleLines = lines.slice(0, VISIBLE_LINES - BLUR_LINES).join('\n');
    const blurLines = lines.slice(VISIBLE_LINES - BLUR_LINES, VISIBLE_LINES).join('\n');
    const hiddenLines = lines.slice(VISIBLE_LINES).join('\n');

    // 一意のIDを生成（タイムスタンプとランダム文字列の組み合わせ）
    const uniqueId = `code-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // JavaScriptコード（クリック時の処理）
    const jsCode = `
      document.getElementById('show-more-${uniqueId}').addEventListener('click', function() {
        document.getElementById('blur-code-${uniqueId}').style.display = 'none';
        document.getElementById('hidden-code-${uniqueId}').style.display = 'block';
        this.style.display = 'none';
      });
    `;

    // 折りたたみ構造を生成
    const codeBlock = h('div', { class: 'code-block-with-preview' }, [
      // 見える部分
      h('pre', { class: `language-${language}`, 'data-language': language }, [
        h('code', visibleLines)
      ]),

      // ぼかし部分
      h('div', { id: `blur-code-${uniqueId}`, class: 'blur-code' }, [
        h('pre', { class: `language-${language}` }, [
          h('code', blurLines)
        ]),
        h('button', {
          id: `show-more-${uniqueId}`,
          class: 'show-more-button',
          type: 'button'
        }, 'コードをすべてみる')
      ]),

      // 隠れている部分
      h('div', {
        id: `hidden-code-${uniqueId}`,
        class: 'hidden-code',
        style: 'display: none;'
      }, [
        h('pre', { class: `language-${language}` }, [
          h('code', blurLines + '\n' + hiddenLines)
        ])
      ]),

      // インラインJavaScript
      h('script', jsCode)
    ]);

    // HTMLに変換
    node.value = toHtml(codeBlock);
  }
}

export default remarkCollapsibleCode;
