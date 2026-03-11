---
layout: ../../../layouts/blog-post.astro
title: docs を管理する Skill を作って (A)DR + 数個の Markdown で開発をしている
emoji: ☁️
date: 2026-03-11
eyecatch: blog-dev-with-adr
tags:
  - AI
---

最近 ADR を使った開発に関する話題をよく見かける気がするが、自分も前に記事を書いたときから ADR 中心の開発を続けていて、その型が自分の中で固まってきたので現時点でのものをまとめる。

- https://yaakai.to/blog/2025/my-spec-driven-dev-plan

先に断っておくと基本的には個人の private なリポジトリで使っているものなので実際の出力のサンプルはない。

概要としては以下のような感じで、これで分かる人は見なくていい内容だと思う:

- docs/adr もしくは docs/decisions に意思決定ログとして (A)DR を書き、それを元に Plan などを作成して開発
- AI 向けのドキュメントは基本 (A)DR + CLAUDE.md のみ
- 人間向けのドキュメントとして (A)DR がすべて反映された ARCHITECTURE.md と README.md を作成する Skill を用意して作成
- (A)DR を書くために AskUserQuestion や WebSearch を使う Skill を別途用意

(A)DR と書いているのは、技術要素や Architecture っぽいものでなくとも Decision Record として残すようにしているため。以後は ADR とする。

ツッコミ回避をしておくと、リポジトリに人間用のドキュメントを入れる必要はないし、毎回 AI に聞いてコードベースと ADR を調べてもらえば良い、というのはそれはそうだと思っている。あるといい感じにみえるという趣味九割で入れている。一割の実用は AI をあらゆるドキュメントの代わりに使うにはまだ速度が足りないのと、AI が 100% 生成しているわけではないので人間目線で出力がある程度読みやすいからという感じ。

## ディレクトリ

```
/
├── .claude
│   └── skills
│       └── doc-writer/SKILL.md
├── docs
│   ├── decisions
│   │   ├── 2026-02-26-foo-foo-foo.md
│   │   ├── 2026-02-28-bar-bar-bar.md
│   │   └── 2026-03-02-buzz-buzz-buzz.md
│   ├── ARCHITECTURE.md
│   └── FOOFOO.md
├── CLAUDE.md
├── README.md
└── YAAKAITO.md
```

よくある感じ。

ARCHITECTURE.md 以外にも人間向けのドキュメントを残していることがたまにある。大体は調べたこと + あとで反映したいことを一時的にまとめるために使っていて、Issue にしたりコードに全部反映したら消している。

YAAKAITO.md は完全に自分用のメモで global に gitignore されたものを置いている。リポジトリに入れるなという話はあるが、 DevContainer を使っている関係でここが一番扱いやすい、中身は自由なメモ。

## ADR と ARCHITECTURE.md を書くための Skill

2 つのフォーマットと、常にコードベース > ADR > ARCHITECTURE.md であることを知識として Skill にしている。フォーマットや構造はリポジトリ毎に微調整したいことがあるので Plugin なんかではなくリポジトリに commit している。

````md
---
name: doc-writer
description: Write or update project documentation (Decision Records and ARCHITECTURE.md). Use when requests involve "create DR", "create ADR", "record decision", "write ARCHITECTURE.md", "update architecture doc", "document design decisions", or equivalent requests to summarize prior discussion into a decision record. Also triggers on requests to summarize architecture, reflect decision changes into documentation, describe the overall project structure, or when code changes warrant updating architectural documentation. Use this skill even when the user doesn't explicitly mention "DR" or "ARCHITECTURE.md" — any request about recording why a technical choice was made or capturing the current system design should use this skill.
user-invocable: true
---

# Document Writer

Create Decision Records (DR) and update ARCHITECTURE.md. DR is essentially synonymous with ADR (Architecture Decision Record) — no distinction is made.

## Document Map

```
CLAUDE.md                    -- Architecture Overview, Core Principles
docs/ARCHITECTURE.md         -- Detailed architecture document
docs/decisions/
  yyyy-mm-dd-slug.md         -- Decision Records (DR)
```

- Keep `CLAUDE.md` Architecture Overview and Core Principles consistent with ARCHITECTURE.md

## Routing

Execute one of the following based on the request:

1. **Create/edit a DR** → Follow the "Decision Record Writing" section
2. **Create/update ARCHITECTURE.md** → Follow the "Architecture Document Writing" section

## Decision Record Writing

### Naming

- Filename: `yyyy-mm-dd-slug.md` (date is the creation date)
- Location: `docs/decisions/`

### Title

Use `# Title` format. Preserve existing `# ADR NNNN:` titles as historical records.

### Template

When creating a new DR, read `references/decision-record-template.md` with the Read tool and follow its structure.

### Writing Guidelines

- Context and Decision are written by the user. Only the user can accurately describe their decision-making context and judgment — ask for these sections' content and compose the DR from their answers
- Write Decision in active voice with "We will ..." statements
- Consequences should cover positive, negative, and neutral outcomes — a consequence often becomes Context for a future DR
- Cross-link related existing DRs in the Notes section
- Write section headings in English (Status, Context, Decision, Consequences, Notes)

## Architecture Document Writing

ARCHITECTURE.md is a document written for humans, not AI agents (CLAUDE.md serves that role):

- Helps new developers and maintainers understand the system's design intent without reading every source file
- Documents core architectural concepts that reviewers rely on when evaluating whether a change aligns with the system's design direction

Analyze DRs and the codebase to create or update ARCHITECTURE.md.

### Instructions

1. Examine the package structure under `packages/`, package.json dependencies, and main entry points
2. Examine `.github/workflows/` to understand where and how each package runs
3. Read all DRs under `docs/decisions/`
4. Create or update ARCHITECTURE.md following the guidelines below

### Source Priority

Follow **codebase > DR > existing ARCHITECTURE.md** priority. Code is the single source of truth — DRs record intent but implementation may lag behind, so trust sources in this order. If a DR is accepted but not yet reflected in code, describe the current code state. Only reflect DR content to the extent it is implemented in code.

### Updating

Broad but shallow coverage has no value — the user selects which items to focus on. Present proposed changes to the user and apply only after approval.

After updating ARCHITECTURE.md, check whether `CLAUDE.md` Architecture Overview and Core Principles need updates, and propose them if so.

### What to Include

Record the knowledge a human needs to understand this system — the design intent, the reasoning behind structural choices, and the mental model that makes the codebase navigable. A new developer reading ARCHITECTURE.md should come away understanding why the system is shaped this way, not just what exists.

- Text-based overview diagram (execution environments and data flow)
- Design principles and how they are concretized in each component
- Package collaboration structure and dependency rules centered on core types
- Where each package runs and how it connects to others
- Technology selection rationale (only when significant context exists, such as cost, constraints, or bug avoidance)

### Prohibited

- Direct code (command examples, schema definitions, function signatures, etc.). Sample JSON is allowed (see "Exceptions" below)
- Facts obvious from reading code (CLI flags, API endpoint lists, etc.) or enumerations of each package's implementation details
- Inventing names that don't exist in the codebase
- Describing historical changes ("originally X, then changed to Y"). Change history belongs in DRs — write only the current state and intent
- Meta-descriptions of the document's own purpose
- Operational details (schedule frequencies, CI/CD configuration values, etc.) — these change frequently and become stale

### Style

- Write declaratively, not in Q&A format. State the current state in each section with intent woven in naturally
- Keep it simple. Avoid verbose explanations
- Write for a human reader — use natural narrative flow, not bullet-point checklists optimized for machine parsing

### Examples

**Bad — stating what's obvious from code:**
cli-fetch-rss is a package that fetches RSS feeds, accepts a group argument,
loads a list of corresponding feed URLs, and fetches them in parallel.

**Good — design intent not readable from code:**
Feed fetching and AI processing are separated into different packages so that
expensive AI processing can be skipped for quick debugging.

**Bad — historical narrative:**
Originally called the Claude API directly, then migrated to Agent SDK.

**Good — current intent only:**
AI processing uses Agent SDK. By providing tools to agents, they can fetch
external information as needed to make decisions.

### Format

When creating or significantly revising ARCHITECTURE.md, read `references/architecture-template.md` with the Read tool and follow its structure. The format is inspired by [esbuild's architecture.md](https://github.com/evanw/esbuild/blob/main/docs/architecture.md).

- **Leading comment**: Always include an HTML comment at the very top of the file (before the table of contents) stating that this document is for human readers and directing AI agents to also read the Decision Records under `docs/decisions/`

  ```html
  <!--
    This document is written for human readers.
    If you are an AI agent, also read the Decision Records under docs/decisions/.
  -->
  ```
- **Table of contents**: Place a nested bulleted list below the leading comment (before the title). Each item is an anchor link to a section heading
- **Design principles**: Use `* **Principle Name**` + indented paragraph (not `**Name**: description` inline format)
- **Section headings**: Write in English
- **Overview diagram**: Text-based ASCII diagram. Do not use Japanese inside boxes (monospace fonts misalign). Do not include specific configuration values like cron frequencies

### Exceptions

The following are allowed as exceptions to the "don't write details" principle in Prohibited:

- ...

## User Prompt

$ARGUMENTS
````

ある程度複合的なことをする Skill になっているので、細かいものにわけてもいいと思う。知識の共有がだるかったのとそんな大した量でもないので一緒にしてしまっている。

一応英語に変換してもらっているが、ある程度はメンテすることを前提にしているので普段の会話で使っている言語でいいと思う。

## ADR

なにかしらの方法で議論しコンテキストが満たされている状態で、

```
/doc-writer ここまでの議論の内容を ADR としてまとめて
```

とかで作っている、フォーマットは [Michael Nygard 氏の ADR](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) に Notes 欄を足したものを使うことが多い。
ADR 自体は特に特殊なものでもなく、良い解説は世の中に溢れていると思うので割愛。

事前の議論の密度にもよるが、 Context と Decision はできるだけ監修するというか、ほとんど自分で書くようにしている。

## ARCHITECTURE.md

これは人間向けだから AI は ADR をちゃんと辿ってねと苦し紛れにコメントで書いている、多分大して意味はない。

ADR の実装が終わった後なんかに、

```
/doc-writer ARCHITECTURE.md に @docs/decisions/2026-xx-xx の内容を反映して
```

みたいな感じで一旦下書きをしてもらい、気に入らなかったら何度か会話して自分好みのものにしている。
自分は esbuild の architecture.md の感じが好きなのでそれを目指して書いているが、細かいルールがあるわけではないので好きに書くのがいいと思う。

- https://github.com/evanw/esbuild/blob/main/docs/architecture.md

また、すべての ADR を反映しているわけではなく、その必要もないと思っている。反映の基準としては以下のどれかに当てはまると思ったら書き加えたり消したりしている:

- 人間がコードレビューをするときに、事前知識としてあったら嬉しい情報
- しばらく触らないと忘れそうだが ADR を辿るのはだるそうな、なにかしらの意図がある情報
- 一度試したがあまりうまくいかなかったことと、その解決策

## CLAUDE.md

Architecture Overview として概要を書くことが多くて、ARCHITECTURE.md からさらに厳選した以下のようなものを 2-3 行書いている。

- 複数の環境で動くいくつかのパッケージがある場合は、その関係性とデータの流れ
- 複数のパッケージでなにかしら統一したい方針があるならそれ
- キャッシュ使って無駄に API にリクエストしないでねみたいな勘所

他はよく言われている内容で、最小限に AI が知らない固有のことだけを書くように努力している。

## README.md

人間向けの手順とか書く。AI 以前から特に変わってない。

## 周辺

### `/discuss` Skill

以前は全体の流れに含んでいたが、独立して議論モードに入るための Skill として用意している。

````markdown
---
name: discuss
description: Engage in professional software engineering discussion to brainstorm and explore design approaches. Use when the user wants to think through a problem collaboratively. Triggers on "let's discuss", "talk about", "think through".
user-invocable: true
disable-model-invocation: true
---

# Discuss

You are a professional software engineer.
Engage in discussion with the user to clarify requirements and explore design approaches based on the provided context.

## Purpose

- Clarify and organize ideas
- Identify requirements
- Explore design approaches

## Behavior

### Adaptive Discussion

During the conversation, use the following approaches as needed:

1. **Explore** - When technical context is needed:
   - Analyze the codebase (tech stack, existing patterns, related code)
   - Search the web for similar implementations and best practices
   - Check document directories for relevant information

2. **Clarify** - When requirements are ambiguous:
   - Use **AskUserQuestion tool** with 2-4 options per question
   - Cover key categories: Scope, Behavior, Data, Users, Integration, Constraints, Priority, Edge cases
   - Skip questions answerable from codebase analysis

3. **Research** - When external guidance would help:
   - Use **WebSearch** to find best practices (minimum 3 sources)
   - Look for official documentation, common patterns, and pitfalls
   - Present findings with applicability assessment

### Key Principles

- Listen actively and provide constructive feedback
- Present options with pros/cons when decisions are needed
- Summarize key points periodically
- Do NOT create code or documentation unless explicitly requested

## Output

Provide discussion summaries including:

- Key decisions made
- Open questions remaining
- Recommended next steps
````

これは User レベルの Skill として用意していてリポジトリには依存しないものとしている。
大体は新しいセッションを起動してこの Skill ではじめる。

```
/discuss foo をしたい、bar は buzz で bunbun
```

コードを書かないモードになっていて、都度 AskUserQuestion で必要な情報を聞いてくれる。さらに深堀りが必要そうなときは繰り返して満足行くところまでやっている。満足したら `/doc-writer` に任せる。

これは以下のものを参考にさせてもらっていて、影響を強く受けている:

- https://x.com/trq212/status/2005315275026260309
- https://github.com/fumiya-kume/claude-code/blob/master/dig/commands/dig.md
- https://gist.github.com/taichi/8419da7e2b20685db8d5f91f73fc3b1d

### Claude Code on the web

ADR を作った時点で一度コンテキストが切れる(ことができる)ので、ローカルで ADR だけ作って実装は on the web でやってみたり、その逆をしたりしている。複数の worktree を監視するのは面倒だが、 on the web であれば結構気楽に複数タスクを投げれるようになってきたので便利。

ただ、on the web で `/discuss` で会話を始めるのがうまくいかなくて、Skill として登録なんかはしているのだが動いている感じがしない。なので on the web で ADR を作る場合は入力が増えがちかもしれない。

### ADR の実装

ほぼほぼ Plan Mode に ADR を食わせるだけでやっている。
フェーズがいくつかある場合は、大まかなタスクリストを Markdown として作って、ADR と合わせて渡してフェーズごとに Plan Mode → 実装とすることもある。

### GitHub Agentic Workflows

まだお試しレベルだが、ADR 以外のドキュメント類で間違っている部分を GHA で検出するのを試している。以下の記事に書いたものと同じ:

- https://yaakai.to/note/145

```md
---
description: Validate ARCHITECTURE.md and CLAUDE.md for factual accuracy against the current codebase
on:
  schedule: weekly
  workflow_dispatch:
permissions:
  contents: read
  issues: read
  pull-requests: read
engine:
  id: copilot
  model: gpt-5
tools:
  github:
    toolsets: [default]
  edit:
safe-outputs:
  github-token: ${{ secrets.AI_USER_GH_TOKEN }}
  create-pull-request:
    max: 1
    labels: [documentation, ai-automate:claude]
  add-labels:
    allowed: [documentation, ai-automate:claude]
---

# Validate Documentation

You are an AI agent that validates ARCHITECTURE.md and CLAUDE.md for factual accuracy against the current codebase.

### Scope

Only check for **incorrect** items. Do NOT:
- Add missing items or sections
- Remove items that are correct
- Suggest improvements or reorganization
- Change style or wording unless factually wrong

An item is "incorrect" when it describes something that contradicts the actual codebase — for example, a package name that doesn't exist, a wrong file path, a description that doesn't match what the code actually does, or a stated principle that the codebase explicitly violates.

### Steps

1. Read `.claude/skills/doc-writer/SKILL.md` to understand the documentation rules and structure
2. Read `.github/scan/validate-docs.md` — this is the suppression list. Any documentation item listed there is an intentional decision and must be skipped entirely. Do NOT flag, modify, or mention suppressed items.
3. Examine the package structure under `packages/` (list directories, read package.json files and main entry points)
4. Examine `.github/workflows/` to understand where and how each package runs
5. Read `docs/ARCHITECTURE.md` and validate every factual claim against the codebase
6. Read `CLAUDE.md` and validate every factual claim against the codebase
7. If no incorrect items are found, call `noop` with "Documentation is accurate. No fixes needed." and stop
8. If incorrect items are found:
   a. Fix only the incorrect items in ARCHITECTURE.md and/or CLAUDE.md using the edit tool
   b. Use the `create-pull-request` safe output with:
      - Branch name: `chore/fix-docs-YYYYMMDD-RUNID` (where YYYYMMDD is today's date and RUNID is the current GitHub Actions run ID)
      - Commit message: `docs: fix incorrect items in ARCHITECTURE.md / CLAUDE.md`
      - Title: `docs: fix incorrect items in project documentation`
      - Body listing each incorrect item found and what was fixed

## Language Policy

Write commit messages, PR title, and PR body in the same language as README.md.

### Output

- If no incorrect items are found (the expected common case), call `noop` and stop. Do NOT create a PR.
- If clear factual errors are found, use the `create-pull-request` safe output to submit a PR with the fixes. Never push directly to the branch.
```

まだあまり運用はできていないが、ちょっとしたことでも割と見つけてくれる感じで便利。週 1 くらいで動かすようにしている。

### 雑感

- リポジトリに SDD や AI 向けの PLAN を入れるのには今も否定的なので、人間向けも兼ねるこの形が気に入っている
  - AI 専用みたいなドキュメントはあんまいらなくて人間が嬉しければ AI も嬉しい気はする、今は
- SDD は 5 回くらいチャレンジしては挫折した、これくらいのライトさがよい
- ADR は元々好きな考え方だったので盛り上がってきているのは嬉しい
- on the web で Skill が使いづらい
- Agentic Workflows よい
