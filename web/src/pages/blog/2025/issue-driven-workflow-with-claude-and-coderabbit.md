---
layout: ../../../layouts/blog-post.astro
title: Issue 起点の開発フローを claude-code-action と CodeRabbit で作った
emoji: 🐇
date: 2025-12-31
eyecatch: blog-issue-driven-workflow-with-claude-and-coderabbit
tags:
  - AI
---

適当な Issue を AI に実装したり一度試してもらいたいときに、これまでは @claude したり [git-worktree を使った裏での実行](https://yaakai.to/blog/2025/dev-with-claude-code-2025-07)をしていたが、これを GitHub 上でレビューまで完結するようにしたかったのでフローを作った。 private リポジトリでしばらく使っていたが、[このブログのリポジトリ](https://github.com/yaakaito/yaakaito)にも移植してきたのでこのタイミングでまとめておく。

## やっていること

Issue に特定のラベルをつけると GHA が起動して、 Claude Code による実装と CodeRabbit でのレビュー、その修正が自動で行われる。
可能なものは Cloudflare Workers の [Preview URLs](https://developers.cloudflare.com/workers/configuration/previews/) を発行していて、それが PR に貼られるのでそこで動作確認をしている。

流れを書くとこんな感じ:

1. Issue テンプレートから `ai-automate:claude` ラベル付きで Issue を作成
2. GHA が起動して、Issue 内容をもとに Claude Code が実装を行い、PR を作成
    - Preview URLs を発行
3. CodeRabbit が PR をレビューして、 Approved か Request Changes を通知
4. レビュー通知に合わせて GHA が起動
    - Approved の場合は Claude Code を使ってレビューをして内容をコメント
    - Request Changes の場合は Claude Code で修正を行い、 Approved されるまで繰り返す

このフローを基本としつつ、今は CodeRabbit が Plan を作ってくれるようになったので、その Plan に基づいて実装を行うフローも追加している。
ただ、 Plan が作られるトリガーがよく分かっていなくて動作が不安定。 CodeRabbit からのコメントをトリガーにしているが、それが来ないことがある。

## Why CodeRabbit?

- https://www.coderabbit.ai/ja

レビューの精度みたいな話を一旦抜きにして、 Approved と Request Changes を送ってくれるからというのがある。というよりは、元々 CodeRabbit を試していて、これをしてくれるのでこのフローを作ってみようと思った。
AI によるコードレビューだと Claude Code にやらせたり、 GitHub Copilot や Greptile を使うという方法が他にもあるが、 PR レビューの承認や変更要求を自動で行ってくれるものはないはずなので CodeRabbit を採用している。

レビュー内容に関しても今のところそこまで不満はないが、少し遅めなのと、細かすぎる(Nitsや揚げ足取り的な内容)のではと思うことは多少ある。
が、特に今回のように修正を AI が行ってくれる場合は細かい分には嬉しいので、プラスかなと捉えている。遅いのも基本的には放置してあとで見るのであまり気にならない。

ただ、最終的には Claude Code のレビューも兼用するようにしている。
push 毎に Claude Code がレビューすると PR が荒れがちになるのが気になっていたが、 CodeRabbit の Approved 後にすることでちょうどよくなったと思う。

また、まだ効果が実感できていないので期待になってしまうが、CodeRabbit や Greptile のようなツールを使うことで、レビューの内容を学習(した記録を外付け)できることに魅力を感じている。

- https://www.greptile.com/learning

あと Poem がかわいい。

## Examples

作った Issue と PR の例:

- https://github.com/yaakaito/yaakaito/issues/122
- https://github.com/yaakaito/yaakaito/pull/125

ここでは Approved されているのでそれで終わっているが、 Request Changes された場合はさらに修正が自動で行われる。
例えばこれは何度かやりとりを繰り返してる:

- https://github.com/yaakaito/yaakaito/pull/127

## GitHub Actions の workflow

Preview URLs 用のものを含めると 3 つの workflow で構成している。Preview URLs は適当に `wrangler versions upload` すればよいだけなのでここでは割愛、[GitHub にこのリポジトリのものが置いてある。](https://github.com/yaakaito/yaakaito/blob/main/.github/workflows/deploy-preview.yaml)

> [!WARNING]
> この workflow は移植するにあたって、調整を行っている場所がいくつかあって、十分に確認はできていないのでそれが原因で動作しない可能性がある。

> [!NOTE]
> PR を作るのが Bot だと CodeRabbit が反応せず、これを変更する設定もなかった(2025/12/31 時点)ので、PR を作成するために PAT なりを用意する必要がある。
> メインで使っているアカウントの PAT でもよいのだが、変更できる範囲を限定したいのと、通知が多くなりすぎてしまうので、自分は専用のアカウントを作ってそれの PAT を使っている。
> ただし、 private リポジトリで使う場合はそのユーザーの分も CodeRabbit の seat が必要になるので注意。

まず、 Issue に `ai-automate:claude` ラベルがつけられたときに起動する workflow:

```yaml
name: Automate with Claude

on:
  issues:
    types: [labeled]

jobs:
  automate-issue:
    if: github.event.label.name == 'ai-automate:claude'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v5
      - name: Create branch for issue
        env:
          GH_TOKEN: ${{ secrets.AI_USER_GH_TOKEN }}
        run: |
          BRANCH_NAME="claude/automate-${{ github.event.issue.number }}-$(date +%Y%m%d-%H%M)"
          git checkout -b "$BRANCH_NAME"
          git push -u origin "$BRANCH_NAME"
          echo "BRANCH_NAME=$BRANCH_NAME" >> $GITHUB_ENV
      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          github_token: ${{ secrets.AI_USER_GH_TOKEN }}
          prompt: |
            Read the issue and implement the requested changes.

            Note: A branch named "${{ env.BRANCH_NAME }}" has already been created and checked out for this issue.

            ## Language Policy

            Use the same language as the issue for commits, PR title, and PR body.

            ## Workflow

            1. Use mcp__github__get_issue to read and understand the issue
            2. Check CLAUDE.md for repository-specific guidelines
            3. Implement the changes
            4. Commit and push changes to the current branch
               - Include Co-authored-by: ${{ github.event.issue.user.login }} <${{ github.event.issue.user.id }}+${{ github.event.issue.user.login }}@users.noreply.github.com>
            5. Read .claude/skills/pr-template/SKILL.md for PR template, then create PR with mcp__github__create_pull_request
            6. Add "ai-automate:claude" label to the created PR
            7. Comment the PR URL to the issue using: gh issue comment ${{ github.event.issue.number }} --body "Created PR: [PR_URL]"
          claude_args: |
            --allowedTools "Bash,Write,Edit,Read,Glob,Grep,Task,mcp__github__get_issue,mcp__github_comment__update_claude_comment,mcp__github__create_branch,mcp__github__create_pull_request,mcp__github__update_issue,Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*),Bash(gh issue comment:*)"
```

Claude Code に実装させ、実装が終わったら PR を作成させている。

branch を先に作っているのは、たまに main へそのまま commit して push してしまうことがあったため。
branch protection ルールで守るなどの方法もあるが、ブランチ名が衝突しても面倒そうなので手動で作ることにしている。

PR に書く内容は Skill 化しているのだが、claude-code-action 内で Skill がうまく動かないので SKILL.md を直接読むように指示している。

次に、PR が CodeRabbit によってレビューされたときに起動する workflow:

```yaml
name: Claude Fix Unresolved Reviews

on:
  pull_request_review:
    types: [submitted]

jobs:
  # CodeRabbitのrequested changes時に自動修正を実行
  fix-requested-changes:
    if: |
      github.event_name == 'pull_request_review' &&
      github.event.review.state == 'changes_requested' &&
      github.event.review.user.login == 'coderabbitai[bot]' &&
      contains(join(github.event.pull_request.labels.*.name, ','), 'ai-automate:')
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v5
      - name: Checkout PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr checkout ${{ github.event.pull_request.number }}
      - name: Fetch unresolved reviews
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          OWNER=$(echo "${{ github.repository }}" | cut -d/ -f1)
          REPO=$(echo "${{ github.repository }}" | cut -d/ -f2)
          PR_NUMBER=${{ github.event.pull_request.number }}

          RESULT=$(gh api graphql -f query='
          query($owner: String!, $repo: String!, $number: Int!) {
              repository(owner: $owner, name: $repo) {
                  pullRequest(number: $number) {
                      reviewThreads(first: 100) {
                          nodes {
                              isResolved
                              isOutdated
                              path
                              line
                              comments(first: 10) {
                                  nodes {
                                      author { login }
                                      body
                                  }
                              }
                          }
                      }
                  }
              }
          }' -f owner="$OWNER" -f repo="$REPO" -F number="$PR_NUMBER")

          echo "$RESULT" | jq -r '
              .data.repository.pullRequest.reviewThreads.nodes
              | map(select(.isResolved == false and .isOutdated == false))
              | if length == 0 then
                  "<no-unresolved-comments />"
                else
                  .[] |
                  "<review-comment>",
                  "  <file>\(.path // "unknown")</file>",
                  "  <line>\(.line // "unknown")</line>",
                  "  <author>\(.comments.nodes[0].author.login // "unknown")</author>",
                  "  <body>\(.comments.nodes[0].body // "")</body>",
                  "</review-comment>",
                  ""
                end
          ' > .git/unresolved_reviews.xml
      - uses: anthropics/claude-code-action@v1
        with: &claude-code-fix-reviews
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          github_token: ${{ secrets.AI_USER_GH_TOKEN }}
          allowed_bots: coderabbitai[bot]
          track_progress: true
          prompt: |
            Fix unresolved review comments on this GitHub PR.

            ## Steps

            1. Read the file `.git/unresolved_reviews.xml` which contains unresolved review comments.
            2. Review each comment and apply the necessary fixes.
               - If the file contains `<no-unresolved-comments />`, exit.
            3. Commit after each fix.
            4. Repeat until all fixes are complete.
            5. Push the branch to remote when all fixes are done.
          claude_args: |
            --allowedTools "Bash,Write,Edit,MultiEdit,Read,LS,Glob,Grep,mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*)"

  # CodeRabbitのapproved時にClaude Codeレビューを実行
  claude-review-after-approval:
    if: |
      github.event_name == 'pull_request_review' &&
      github.event.review.state == 'approved' &&
      github.event.review.user.login == 'coderabbitai[bot]'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 1
      - name: Checkout PR
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh pr checkout ${{ github.event.pull_request.number }}
      - name: Run Claude Code Review
        uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          allowed_bots: coderabbitai[bot]
          track_progress: true
          prompt: |
            REPO: ${{ github.repository }}
            PR NUMBER: ${{ github.event.pull_request.number }}

            Perform a comprehensive code review in the same language as the Pull Request description with the following focus areas:

            1. **Code Quality**
               - Clean code principles and best practices
               - Proper error handling and edge cases
               - Code readability and maintainability

            2. **Security**
               - Check for potential security vulnerabilities
               - Validate input sanitization
               - Review authentication/authorization logic

            3. **Performance**
               - Identify potential performance bottlenecks
               - Review database queries for efficiency
               - Check for memory leaks or resource issues

            4. **Testing**
               - Verify adequate test coverage
               - Review test quality and edge cases
               - Check for missing test scenarios

            5. **Documentation**
               - Ensure code is properly documented
               - Verify README updates for new features
               - Check API documentation accuracy

            Provide detailed feedback using inline comments for specific issues.
            Use top-level comments for general observations or praise.

          claude_args: |
            --allowedTools "mcp__github_inline_comment__create_inline_comment,Bash(gh pr comment:*),Bash(gh pr diff:*),Bash(gh pr view:*)"

```

前提として、 PR が作られると CodeRabbit のレビューが自動に開始される必要がある。
Approved された場合は Claude Code によるレビューを行い、 Request Changes された場合は Claude Code による修正を Approved されるまで繰り返す。レビュー用の `prompt` は claude-code-action に組み込まれているものと同じはず。

ここでも[レビューコメントの取得を Skill 化したもの](https://github.com/yaakaito/env/tree/main/cc-plugins/base/skills/github-pr-unresolved-review-fetcher)を使いたかったが、一旦妥協して workflow 内に直接 script を書く形にしている。
未解決のレビューを取得するよう `prompt` で指示するだけでも十分に思えるが、 GitHub 上で resolved されたものの判別がうまくできないことが何度かあって、確実に動かすためにこうしている。

ちなみに claude-code-action の場合も次のような設定をすることで Plugin を使うことができる。

```yaml
plugin_marketplaces: https://github.com/yaakaito/env.git
plugins: base@yaakaito-env
```


## 雑感

- 軽い実装であれば Preview URLs も合わせて GitHub 上で動作確認までできて便利
  - メインの作業中に思いついたことを雑に Issue にして投げておける
  - 必要であれば修正を @claude で投げればよい
- Skill が動いてほしい、動きそうなのだが...
  - ただの md なので直接読めばよいという恩恵を受けている感じがある
  - `--allowedTools` が足りないとかではなく `❌ Error: Execute skill: pr-template` のように失敗してしまう
- `track_progress` を使うと beta 版のように進捗を Issue Comment としてアップデートしてくれて便利な上 branch の問題も解決する
  - ただ、Mention が毎回飛んでくるのでちょっとだるい感じになる
  - 放置しておいてあとでまとめて確認したい
- 修正を push してもたまに CodeRabbit が反応しないことがある
  - Plan がこないのも同じ理由なのだろうか？
