---
layout: ../../../layouts/blog-post.astro
title: TypeScript で Coding Agent のワークフローを書いて動かしている
emoji: 🔄
date: 2026-10-17
eyecatch: blog-ts-zod-agents-workflow
tags:
  - AI
---

複数の Codex や Claude Code を組み合わせた、ある程度安定したワークフローを記述できるようにしたいなと思っていて、
なんやかんや半年くらいボチボチ作ったり壊したりを繰り返しつつそれなりに動いてきたので考えていたこととかを書いておく。

これに取り組み始めたのが Claude Code の Routines が出た頃で、いくらか便利に使いつつも不満に感じることがあったので自分で作ることにした。
特にでかかったのが GitHub との連携周りで、現在は改善されているが当時は動作がわりと不安定で、
これは完全に悪口だがサイレントな修正で動かなくなる + それをユーザーサポートに連絡してもまともに取り合ってもらえない、みたいなことがあった。

とまあそんなこともあり、次のようなモチベーションで作り始めた:

- Claude Code の Routines よりも決定論的で安定した動作、出力がほしい
- コードで記述して安定して動かせるものを AI を経由してやりたくない
- 作業手順と AI を切り離して、その時々で任意のハーネス、モデルを利用したい
- CLI 的に振る舞うこともできる、汎用的なものがほしい

## コンセプトとかんたんな仕組み

YAML を使ってワークフローを記述する案もあったが、「コードで記述して安定して動かせるものを AI を経由してやりたくない」を実現するにあたって、都度必要なものを定義するのがだるそうなので TS のコードとして書く方針にした。

ざっくり言うと次のようなコードを動かしたかった:

```typescript
const triaged = github.issues().filter(issue => agent("Issueが実装できそうか判断して", issue).ok)
for (const issue of triaged) {
  const ws = workspace.createWorktree()
  const r = agent("Issueを実装して", ws, issue)
  github.createPr(r)
}
```

GitHub から Issue を取得し、実装できそうな Issue を取り出して Git worktree を作って実装、成果物から PR を作る、という感じ。
処理の流れをそのままコードとして書くのでラベルジャンプ的なことは難しいが、その分ループなんかはシンプルに書ける。

途中で扱うデータを TS の Object として書けることがポイントで、Claude Code と Codex は JSON Schema で出力を定義できるため、それと Zod の `toJSONSchema` を組み合わせている。

- https://zod.dev/json-schema

Claude Code と Codex の SDK はそれぞれ `outputFormat` / `outputSchema` という形で対応しているので、そこに Zod で定義したスキーマを渡すことで安定した出力が得られる。

- https://code.claude.com/docs/en/agent-sdk/structured-outputs
- https://github.com/openai/codex/blob/main/sdk/typescript/README.md#structured-output

入力は単に呼び出し時に型を縛っているだけではあるが、Zod を中心とすることで入出力の加工がしやすくなって便利。

## ライブラリ化

実装やインターフェイスはいまも都度変わっているので、ここに具体的な例は記載しない。
自分が使いやすいように npm パッケージにはしているので、興味があれば README などを見てほしい。

- https://www.npmjs.com/package/@yaakaito/agflo

もともと GitHub Packages にあったが CLI 的な利用の際にだるくて npm にした。
最初はコア部分だけ抜き出していたが、いろんなところで拡張したものを都度取り込んでいるので、パッケージとしては安定しておらずリポジトリを公開する気もいまのところない。

## 使い道

現状では主に定期実行したい処理の自動化と、特定の手順で操作をする CLI の実装に使っている。例えば、

- `/simplify` 的なコード改善の定期的な実行、不要なコメントやテストの掃除
- Codex Security を実行し Issue 化
- Dependabot の依存更新の内容を調査し、PR に報告
- 技術的な Issue やエラートラッキングツールの Issue の自動的な解決
- リスクの低そうな PR の自動的なマージ (Dependabot の patch バージョン、見た目だけの修正 etc)
- Bot/AI が PR につけたレビューの精査と修正を行いつつ、人間のレビューについて下調べを行う CLI
- diff や PR の情報から、人間の理解を助ける HTML に内容を整理する CLI

あたりは高い頻度で動かしたり使っている。
それぞれを定期的に実行するための daemon として Tauri で適当なアプリを作って常駐させているが、動いている環境はいろいろ。

また、コーディング関連の用途だけでなく、一日一回 Slack や Discord を巡回して自分の発言をすべて拾ってきて、
Issue にまとめたり、次の日にリマインドしたり、みたいな Bot 的な動かし方もしている。

Routines も完全に使っていないわけではなくて、プロトタイプ的に作って便利だったらコード化したりしている。とはいえ最近作った記憶はないが...。

## 雑感

Routines (や GitHub Agentic Workflows)で動かしていたときよりも、例えば PR のフォーマットが安定していたり、メモリ的に使っている Issue を安定して扱えているように感じる。
他には、複数のレビューについて修正を行ったときに、適当に頼むと commit をまとめられたりするが、
取得後トリアージを挟んで同類のレビューごとに修正 → commit の処理を決定論的にやることで commit が混ざったりしないのが地味に嬉しい。

ワークフローは一旦 Codex を基準にして組むことがほとんどだが、一層噛ませておくことでその時使いたいものを選べるのは結構気に入っている。

その他:

- ワークフロー自体がただの関数なので Cron として動かしたり CLI にしたり組み合わせたりが楽
- コアはワークフロー定義 + Coding Agent へのブリッジだけに留めているので TS さえ動けばなんでもよく便利に感じる
- これで作られた PR なんかがどう処理されるかはまた気が向いたら書く
- Mac mini ほしい
