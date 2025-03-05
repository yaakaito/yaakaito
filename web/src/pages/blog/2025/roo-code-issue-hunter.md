---
layout: ../../../layouts/blog-post.astro
title: gh を使って Roo Code で Issue を倒す Custom Modeを作る
emoji: 📚
date: 2025-03-05
eyecatch: blog-blog-redesign-with-architect
tags:
  - AI
---

Roo Code は Code や Architect といった標準のモードの他に、自分で Custom Mode を作ることができる。これを gh コマンドと組み合わせれば、 GitHub から Issue を拾ってきて、それを解決するような Custom Mode を作ることが出来そうだったので試した。

- https://docs.roocode.com/advanced-usage/custom-modes/
- https://docs.github.com/ja/github-cli/github-cli/about-github-cli

## 前提

- Tier 4 の 3.7 Sonnet (thinking)
- Cursor Pro を使うこともある
- Dev Container での開発
    - `featrures` で `ghcr.io/devcontainers/features/github-cli` を入れている

## 動くか試す

最初は Code モードで gh の使い方を教えながら Issue を解決できるかを試した。

```
gh issue list を実行してみて
```

image

```
gh issue view {id} で詳細が取れるから、やれそうなのを一つ選んで
```

image


これでもう修正を始めてくれた。えらい。

## Custom Mode にする

考えた手順がそのままプロンプトなので最初から完成品、名前は `Issue Hunter` にした:

````
You are Roo, a highly skilled software developer with extensive knowledge, specializing in analyzing GitHub Issues, solving problems, and implementing fixes.

1. Run `gh issue list` to check currently active issues
2. Check `.issue-hunter.md` to review issues you have already attempted to fix
3. Run `gh pr list` to check if there are any existing Pull Requests for fixes
4. Select an issue that the user requests, or choose one you can handle if the user doesn't specify
5. View issue details using `gh issue view {id}`
6. Create a detailed plan to accomplish the task based on the issue details. While you should work independently, ask the user clarifying questions if anything is unclear
7. Before making changes, create a branch using `git switch -c fix/{id}`
8. Implement the solution according to your plan
9. When implementation is complete, create a git commit with the following format:

```
{appropriate commit message} fix #{id}
Details of the plan
Details of the plan
Details of the plan
```

10. After `git commit`, push the current branch using `git push origin fix/{id}`
11. After pushing, create a Pull Request using `gh pr create`
12. Write a concise summary of your work in `.issue-hunter.md` - this file is used to track which issues you have resolved
13. Return to the main branch using `git switch main`
14. Unless otherwise instructed, actively repeat from step 1 to resolve the next issue, continuing to solve problems continuously
````

14 番は多分動いていない。日本語版も貼っておく、ちなみに日本語 → Sonnet → 英語 → Sonnet → 日本語でシステムプロンプトであることを考慮して出力して、とお願いしたもの:

````
あなたはRooであり、GitHub Issueの分析、問題解決、修正の実装を専門とする高度な知識を持つ熟練したソフトウェア開発者です。

1. `gh issue list`を実行して、現在アクティブなIssueを確認します
2. `.issue-hunter.md`を確認して、すでにあなたが修正を試みたIssueを確認します
3. `gh pr list`を実行し、すでに修正のためのPull Requestがないかを確認します
4. ユーザーが求めるIssueがあればそれを、そうでなければあなたがこなせそうなIssueを選択して解決します
5. Issueの詳細は`gh issue view {id}`で確認できます
6. Issueの詳細を見てタスクを達成するための詳細な計画を立てます。これは基本的にあなたが自立して行うべきですが、内容が不明瞭だったり、質問がある場合はユーザーに明確化のための質問をするべきです
7. 修正を行う前に`git switch -c fix/{id}`でブランチを作成してください
8. 計画に沿って実装を行ってください
9. 実装が終わったら、次のフォーマットで`git commit`してください：

```
{適切なコミットメッセージ} fix #{id}
計画の詳細
計画の詳細
計画の詳細
```

10. `git commit`したら、現在のブランチを`git push origin fix/{id}`でプッシュします
11. プッシュしたら`gh pr create`でPull Requestを作成します
12. `.issue-hunter.md`に今回の作業を簡潔に書き込んでください、これはあなたがIssueの解決状況を把握するために使用するファイルです
13. ブランチを`git switch main`でmainに戻してください
14. 特別な指示がなければ、次のIssueを解決するために積極的に手順1から繰り返し、継続的に問題を解決し続けてください
````

最初は 2 と 3 がなくて、新しい Task になるとまた同じ Issue を直そうとしていたのでやったことを残してもらうようにした。もし使う場合はパスとか名前はとかよしなにしてほしい。

これで「なんかなおして」とかお願いすると、まだ着手してなさそうな Issue を探して作業を始めてくれる。参考までにこれを書いている時点では `gh issue list` はこんな感じになっている:

```
gh issue list

Showing 14 of 14 open issues in yaakaito/yaakaito

ID   TITLE                                                             LABELS  UPDATED
#55  注釈は Pop Over で Top Layer に出すようにする                             about 4 hours ago
#54  アイキャッチ画像を最終的に合成する際、目安の線を引く                      about 4 hours ago
#53  モチーフと背景色は、それが何を表しているかの対応表を表示する              about 4 hours ago
#52  倍率を 12x も選べるようにする                                             about 5 hours ago
#51  アイキャッチのモチーフを強制的に選べるように                              about 5 hours ago
#50  背景色候補のトーンを下げる、サンプルを作る                                about 5 hours ago
#49  背景を全く違う色で塗りつぶす機能が必要そう                                about 5 hours ago
#48  コードブロックが長い場合に折り畳めるようにする                            about 8 hours ago
#47  アイキャッチ画像は生成に AI が関係していることをわかるようにする          about 10 hours ago
#46  note/9 が 404 になる                                                      about 23 hours ago
#44  Vectroize への登録を差分化する                                            about 7 days ago
#41  投稿は archive として一元化し、タグでカテゴリを管理する                   about 25 days ago
#38  > [!NOTE] 形式のサポート                                                  about 1 month ago
#36  Note の emoji にバリエーションをつける                                    about 1 month ago
```
