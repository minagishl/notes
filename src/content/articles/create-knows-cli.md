---
title: "開発中の “あの一手間” を減らすポート確認 CLI「knows」を作った"
description: "ポートが塞がっているときに毎回 lsof を叩く手間を省く、シンプルなポート・プロセス確認 CLI ツール「knows」の開発経緯と機能紹介"
pubDate: "2025-10-27"
emoji: "⏱️"
tags: ["typescript", "cli", "nodejs"]
---

## きっかけは「lsof を叩くのが面倒」

ポートが塞がっているときに毎回 `lsof -i :3000` のようなコマンドを調べてコピペするのが地味にストレスだったので、開発中に手早く「どのプロセスがどのポートを掴んでいるか」を確認できる CLI を作りました
それが `knows` です
`lsof` や `netstat` の生の出力を読む手間を減らし、実行してすぐに PID やコマンド名を把握できることを目指して開発しました

## 名前の由来

`knows` は「知っている」という意味の英単語から取りました
自分のデバイス上で「どのポートをどのプロセスが掴んでいるのかを知っている」ツールにしたいという意図があります
短くて発音しやすく、CLI らしい軽さのある単語を意識して設計しました

## knows でできること

内部は `commander` で構成し、`processManager.ts` で OS ごとに適したコマンドを呼び分けています
macOS/Linux では `lsof`、Windows では `netstat` を使用し、さらに `find-process` で PID からコマンド名を補完しています

- `list` — 現在リッスンしているプロセスを一覧表示します `--port` や `--port-range` で絞り込み可能です
- `inspect` — 指定ポートの詳細を表示します `--format json|csv` で構造化出力に対応しています
- `kill` — ポートに紐づくプロセスへ SIGTERM を送信します（Windows は `taskkill`）
- `watch` — 一覧を定期的に更新して監視します
- `interactive` — `inquirer` を使ってポート → プロセス → アクションを選択できる対話モードを提供しています

### `list` コマンドの例

```bash
$ knows list | head -n 5
TCP/5000 pid:817 addr:* ControlCe
TCP/5000 pid:817 addr:* ControlCe
TCP/6463 pid:91620 addr:127.0.0.1 Discord
TCP/7000 pid:817 addr:* ControlCe
TCP/7000 pid:817 addr:* ControlCe
```

### `inspect` でピンポイントに確認

```bash
$ knows inspect 6463
TCP/6463 pid:91620 addr:127.0.0.1 Discord

$ knows 6463 --format json
[
  {
    "pid": 91620,
    "port": 6463,
    "protocol": "TCP",
    "address": "127.0.0.1",
    "command": "Discord"
  }
]
```

## 実装メモ

- OS ごとに処理を分けつつ、`listListeningProcesses()` は共通の返り値を持つように設計しています
- `find-process` で補完することで、権限不足で `lsof` が返さないケースでもコマンド名を取得できるようにしています
- JSON/CSV 出力は `utils/output.ts` にまとめており、テキスト出力では `TCP/3000 pid:12345` のように整形するようにしています
- `kill` コマンドでは `SIGTERM` 送信後に `ESRCH`（すでに終了済み）の場合は正常終了として扱い、無駄なエラーを出さないようにしています

## 今後のアイデア

`watch` と `interactive` は今後さらに拡張予定です
`--filter` や `--format` の柔軟化、監視間隔の調整などに対応していく予定です

---

今では「ポートが空かない」と思った瞬間に `knows list --port 3000` を叩くだけで状況を確認できるようになりました
小さな CLI ですが、開発のテンポを崩さず作業を続けるためのちょうど良いツールになっています
`npm i -g knows` で、ぜひ触ってみてください
