---
layout: ../../../layouts/blog-post.astro
title: Popover API と Dialog に関する備忘録
emoji: 🎈
date: 2025-01-23
tags:
  - Web
  - HTML
  - CSS
  - JavaScript
---

2024 年の Baseline に追加された機能として Popover API があり、またそれに関連するものとして Dialog がすでに実装されている。
この 2 つは目的は違うが技術的には似たものになっているので、それぞれの特徴などをまとめる。

動作サンプル: https://yaakaito.github.io/code-sandbox/popover-and-dialog/

## 前提知識

### Top Layer

- [Top layer (最上位レイヤー) - MDN Web Docs 用語集: ウェブ関連用語の定義 | MDN](https://developer.mozilla.org/ja/docs/Glossary/Top_layer)

従来のz-indexとは異なる、ブラウザネイティブの最前面レイヤー。PopoverとDialogのモーダルモードは、このTop layerを利用して要素を描画する。入れ子も可能だが、Light Dismiss（要素外クリックでの閉じる）の挙動には注意が必要となる。


## 利用用途による違い

- Popover
    - カレンダーのようなフォームでの特殊な入力 UI
    - 通知、トースト
    - チュートリアル UI
- モーダル Dialog
    - 利用規約への同意のようなそれ以外を操作できないような UI
    - 削除のような重要な確認操作
- 非モーダル Dialog
    - Cookie の利用許可のような、ユーザーに同意を求めるが、コンテンツは操作できる UI
    - プライベート URL で共有を行うようなコンテンツでの、共有に関する警告の UI

## Popover

[ポップオーバー API - Web API | MDN](https://developer.mozilla.org/ja/docs/Web/API/Popover_API)

Popover は属性で、任意の要素を Top layer へ配置することができる。ダイアログやモーダルではないので、アクセシビリティといった視点で意味は持たず、基本的には背景の要素に操作が貫通する。

```html
<button popovertarget="mypopover">toggle popover</button>
<div id="mypopover" popover="auto|manual|hint">Popover content</div>
```

popover 属性には現状 3 つの値を設定することができ、これによって Light Dismiss や表示方法をコントロールする。

- `auto`: デフォルト値で、Light Dismiss が有効になる
- `manual`: Light Dismiss が無効になり、閉じるための動作を実装する必要がある
- `hint`: 「hint」は Chrome 133 から導入された（される予定の）機能で、この値が設定されている Popover は同時に1つしか表示されない

JS からもコントロール可能だが、必ず属性に `popover` が付与されている必要がある。

```jsx
popover.showPopover()
popover.hidePopover()
```

## Dialog

[<dialog>: ダイアログ要素 - HTML: ハイパーテキストマークアップ言語 | MDN](https://developer.mozilla.org/ja/docs/Web/HTML/Element/dialog)

`<dialog>` はユーザーに操作を求めるための役割（`role=dialog`）を持つ。モーダル/非モーダルの2つのモードがあり、特にモーダルモードではTop layerへの表示と背景操作のロックを行う。JS での制御が想定されていて、`showModal()` を利用することでモーダルダイアログが、`show()` を利用することで非モーダルダイアログが表示される。

```html
<dialog id="dialog">
    <h1>Dialog</h1>
    <p>This is a dialog.</p>
    <button>Close</button>
</dialog>
<script>
    const dialog = document.getElementById('dialog');
    dialog.showModal();
</script>
```

モーダルの場合、次の機能がブラウザネイティブで提供される。これによって、これまでの実装よりもアクセシビリティや UX の向上が期待できる。

- inert による背景 UI のロック
    - [inert - HTML: ハイパーテキストマークアップ言語 | MDN](https://developer.mozilla.org/ja/docs/Web/HTML/Global_attributes/inert)
    - `.showModal()` で表示された Dialog は、Top Layer でない要素が inert となる
- :backdrop による背景の表示
    - [::backdrop - CSS: カスケーディングスタイルシート | MDN](https://developer.mozilla.org/ja/docs/Web/CSS/::backdrop)
    - Top layer と背景コンテンツの間に表示される領域で、モーダルダイアログではデフォルトで半透明の背景が表示されており、ユーザーの操作を受け付けないことを表現している
- ESC での閉じるのサポート
    - Light Dismiss ではない
- フォーカスの管理
    - モーダルダイアログが表示された際に、その中の要素にフォーカスが移動する
    - ダイアログが閉じられた際に、直前のフォーカス位置に戻る


## Anchor Positioning

[CSS アンカー位置指定の使用 - CSS: カスケーディングスタイルシート | MDN](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_anchor_positioning/Using)

特定要素を基準とした配置をサポート。Top layer要素でも有効で、Popoverと組み合わせて使用できる。

```html
<style>
   #anchorPopoverTrigger {
        anchor-name: --anchor-target;
   }
   #anchorPopover  {
        position-anchor: --anchor-target;
        position-area: bottom span-right;
        position-try-fallbacks: flip-inline, flip-inline flip-block;
        margin: 0;
        width: 300px;
   }
</style>
<button id="anchorPopoverTrigger" popovertarget="anchorPopoverLeft">toggle anchor popover</button>
<div id="anchorPopover" popover>
    Anchor Popover Left
</div>

```

position-area による配置指定が基本となりそうだが、top や left などを使用した直接的な位置指定も可能。

- [https://developer.mozilla.org/ja/docs/Web/CSS/CSS_anchor_positioning/Using#position-area_の設定](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_anchor_positioning/Using#position-area_%E3%81%AE%E8%A8%AD%E5%AE%9A)

fallback を設定することができ、画面に収まらない場合の挙動を調整することが出来る。

- https://developer.mozilla.org/en-US/docs/Web/CSS/position-try-fallbacks

### Close Watcher

[CloseWatcher - Web APIs | MDN](https://developer.mozilla.org/en-US/docs/Web/API/CloseWatcher)

ユーザーが閉じようとした動作を検知できる API で、具体的には ESC や戻るを押したタイミングが検知できる。`popover=manual` や非モーダルダイアログには ESC での閉じる機能がないので、対応する必要が出てきたときに有効。

```jsx
let closeWatcher = null
popoverTrigger.addEventListener('click', () => {
    if (closeWatcher) {
        closeWatcher.destroy()
    }
    closeWatcher = new CloseWatcher()
    closeWatcher.onclose = () => {
        popover.hidePopover()
    }
    popover.showPopover()
})
```

## Refs

- [#Tags | blog.jxck.io](https://blog.jxck.io/tags/#popover)
- [CSS Anchor Positioning 仕様の紹介](https://zenn.dev/d_kawaguchi/articles/css-anchor-positioning-294aa71a7f77fc)
- [UI を閉じる動作を処理する CloseWatcher API](https://azukiazusa.dev/blog/close-watcher-api/)
