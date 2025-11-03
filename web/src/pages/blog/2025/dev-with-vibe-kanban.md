---
layout: ../../../layouts/blog-post.astro
title: 実装計画を Vibe Kanban で並列に開発する
emoji: 🐙
date: 2025-11-04
tags:
  - AI
---

Coding Agent でタスクリストや実装計画を立てて開発を行っていると、作業を並列に進めることができるシーンが度々ある。いままではこれを git-worktree を利用したり、可能であれば GitHub の Issue として登録することで進めていたが、Vibe Kanban を使うことで快適に行えそうだったので試した。Vibe Kanban の使い方を細かく解説するような内容ではない。

## Vibe Kanban

- https://www.vibekanban.com/
- https://www.vibekanban.com/docs

git-worktree をうまく扱えるツールだと認識している。git-worktree を利用して、複数の Coding Agent のインスタンスを同時に立ち上げ、それぞれを管理することができる。自分は名前から勘違いしていたが、 GitHub の Issue を並列で実装できる、というようなツールではない。そのような使い方もできるとは思うが。

複数の Project(Repository?) を扱えるようなので明記しておくと、自分は Dev Container で開発しているので `/workspaces/repo` で `npx` で Vibe Kanban を起動している:

```
cd /workspaces/repo
npx vibe-kanban
```

起動すると URL が発行されるので Web ブラウザで開く。 GitHub と連携すると PR を作成したりできるが、今回の用途では連携しなくとも問題ないはず。

## 実装計画を作って MCP Server を利用してタスクを登録する

Vibe Kanban 自体がなにかタスクを分割するような機能を持っているわけではないので、好みのツールやフォーマットで実装計画を作って、タスクリストを作る。
このタイミングで、並列に開発が行えるタスクは依存関係を含めて分割しておく。今回は設計とタスクリストをまとめて `PLAN.md` として保存している。

タスクが分割できたら Vibe Kanban に取り込むのだが、 MCP Server が用意されているのでこれを利用するとタスクの登録を Coding Agent でできるようになる。今回は Claude Code を使用している。

- https://www.vibekanban.com/docs/integrations/vibe-kanban-mcp-server

```json
{
  "mcpServers": {
    "vibe_kanban": {
      "command": "npx",
      "args": ["-y", "vibe-kanban@latest", "--mcp"]
    }
  }
}
```

設定ができたら次のようなプロンプトを実行する:

```md
@PLAN.md を確認して、作業計画を Task 単位で vibe_kanban へ Task として登録してください。
タスクには以下の内容を記載します:

- 設計は @PLAN.md を参照すること
- このタスクでの具体的な作業内容
- 依存する他のタスクや、並列作業が可能かどうか
- 並列実行できる場合は、タイトルに + をつけてください

タスクは降順に登録してください。
```

「降順に登録」が割と重要で、これがないと Vibe Kanban 上のタスクリストが逆になってしまうはず。現状タスクのソート機能がなく、常に登録された順番に表示されるためこれを入れたほうがよいと思う。

<img src="/images/dev-with-vibe-kanban-01.png" alt="Vibe Kanban にタスクが登録された様子">

登録されたタスクは Attempt を追加して実行する。デフォルトではリポジトリで switch している branch からタスクを実装するようになっている。
今回は Vibe Kanban でコードの確認までした worktree を実装計画用の作業 branch に随時マージしていき、 VSCode 側で作業 branch を使って人間が動作確認するようなスタイルにした。

また、今回自分は Vibe Kanban で計画を作ったが、タスク登録を考えると計画には Claude Code なりをそのまま利用したほうがよいと思う。

## 並列での実装とレビュー

並列で実装が行えるタスクになったら、それぞれに Attempt を追加して実行する。実行中のタスクはすべて In Progress に移動したあと、終わったものから In Review に移動していくので、レビューを行う。

<img src="/images/dev-with-vibe-kanban-02.png" alt="複数のタスクを実行している様子">

レビューは Vibe Kanban 内の UI で行うことができる。開発サーバーを連携することでライブプレビューも利用できるようだが、今回は試していない。

<img src="/images/dev-with-vibe-kanban-03.png" alt="レビューしている様子">

このレビュー UI は[もともと VSCode 上で行っていたスタイル](https://yaakai.to/blog/2025/dev-with-claude-code-2025-07/)と似ていて使いやすい。
行単位にレビューしつつも、レビューごとに修正を行うのではなくまとめて依頼することができるようになっていて便利。

レビューを送信するとまた In Progress に移動するので、これを繰り返して納得できるコードを生成する。生成したら Merge すると内容が作業 branch に反映され、動作確認してタスク完了となる。複数のタスクを並列に進めている場合はしょっちゅう Conflict するが、 Web UI から rebase を要求できるようになっているのでこれを使って解決する。

あとはすべてのタスクが完了するまでこれを繰り返す。

## 雑感

- AI にコードを書かせている途中で思いついたタスクを追加したいことはよくあるが、Vibe Kanban では To Do へ適当に追加しておけばよいのが楽だった
    - 例えば、似た構成の複数のパッケージを並列で開発させたあと、それぞれの README.md やコードを見比べて品質の統一をするようなタスクを作成し、次のフェーズへ進む前に実行していた
- タスクを簡単に複製できるので、複数の Coding Agent での実装を試したりするのが手軽にできそう
- Vibe Kanban ですべてやるよりは CLI や他のツールも適宜使った方がよさそう
- 試す前はなんとなくスペック駆動との相性が悪そうに思えていたが、使い始めてみるとむしろよいように感じた
