---
layout: ../../../layouts/blog-post.astro
title: 2025年3月時点での Memory Bank と .clinerules の使い分けに関する考え
emoji: 🏦
date: 2025-03-13
eyecatch: blog-clinerules-and-memory-bank
tags:
  - AI
  - 開発
---

Cline (Roo Code) を使っているとよく出てくる概念として Memory Bank というものがある。

- https://docs.cline.bot/improving-your-prompting-skills/custom-instructions-library/cline-memory-bank

これのコンセプトはなんとなく理解できるものの、「じゃあ .clinerules との使い分けはどうなんだ」「Memory Bank は commit するべきなのか？」というのがあまり分かっていなくて、そこにフォーカスして考えた内容。

これを書いている 2025 年 3 月初旬時点の頭の中をダンプした個人的な記録で、完全に間違っているかもしれないし 1 週間後にはまったく違うことを言っているかもしれない、というものなのでご了承いただきたい。また、基本的にはコードを複数人で触ることを前提として考えている。

ここでは特に Cline の Memory Bank について書いて、基本的なコンセプトなどは分かっているものだとする。解説がほしい方は以下の記事がおすすめ。

- https://zenn.dev/katonium/articles/cline-memorybank-poem

Roo Code 向けの Memory Bank として以下のものがあることは知っているが、使ったことはない。

- https://github.com/GreatScottyMac/roo-code-memory-bank/tree/main

## 現時点での使い分け

「`.clinerules` をリポジトリに含めて育て、 Memory Bank は個人をサポートするツールとして利用する」に自分の中で落ち着いた。

### .clinerules

これに記載するべき内容については散々各所で言われていると思うので割愛する。
Git などの管理下において共有し、これがあれば Cline での開発を進めることができるだろう、という状態を目指したい。
基本的には人間が記述し管理する、もしくは AI が生成したものを人間が編集しレビューする、という形で運用する。

### Memory Bank

Memory Bank は個人のカスタムプロンプトとして利用して、その成果物を共有しない。
個人がどのように使うか、そもそも使うか使わないかも管理しないことにする。
生成されたドキュメントをどこで管理するかというの問題があるが、個人で gitignore してもらうか、配置場所のルールを決めてそこを gitignore しておく。

## なんでそう思ったか

### Memory Bank は出力が安定しているわけではない

これは自分の設定や使い方の問題の可能性があるが、Memory Bank の出力する md ファイルは毎回同じ内容が安定して手に入るわけではない、という認識をしている。
ある意味当たり前の話ではあるのだが、ある程度コードのあるリポジトリで何度か作り直したりすると、毎回違うものが出てくる。
違うといっても主にフォーマットや言葉遣いの話で主要なところはだいたい似通っているのだけど、なんにせよこれを共有したいかというとそういう気にはならなかった。うまくプロンプトを書けば安定が手に入る...のかもしれない。

### activeContext や progress は完全に個人の作業状況に依存する

という認識をしている。共有したいものではないし、これを共有するよりは Plan や Architect の出力をリポジトリに含める方が、他の人があとから参照させることもできたりして効果が高そう。

### Memory Bank は .clinerules も見てくれる

update memory bank を行うときに、 .clinerules があればその内容を考慮した Memory Bank が生成されているはずで、より不変な知識は .clinerules に任せるのがよいのだと思う。
一方でこれを AI の生成に完全に任せてしまうと、出力が安定しないのでコンフリクト祭り... となりそう。

### Cursor の Project Rules との共存

現状だと個人の好みも込みで、 Cursor が共存することが多いと考えていて、実際自分も Cursor の中で Roo Code を動かしている。
Cursor には、少なくとも自分の知る限りでは Memory Bank に相当するものはなく、基本的には Project Rules で AI を制御する形になっている。
この運用としてそれぞれの rules 系ファイルを個別に管理するのではなく、ベースとなるものは同一にし、それをそれぞれの形式に加工するスクリプトを用意するような形が想定される。
そこで Memory Bank よりは近い性質をもつ .clinerules が管理されているべきだと思う。

## 逆に個人開発ならどうなのか？

これは Cline しか使わないなら、 Memory Bank だけで十分なのではないかと思う。 Memory Bank を運用していく中で、不変なものは .clinerules に蒸留していくような形にするのが良いと思う。
