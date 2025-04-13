---
title: "学校のニュースサイトをスクレイピングして RSS フィードを作成した話"
description: "同好会での活動で利用したい RSS フィードが公式に提供されていなかったため、スクレイピングしてRSSフィードを自作した話"
pubDate: "2025-04-13"
emoji: "📰"
tags: ["development", "php", "rss", "scraping"]
---

学校の同好会活動で RSS リーダーを使って最新のニュース記事を追いかけたいと思いましたが、公式サイトで RSS フィードが提供されていませんでした  
そこで、PHP を使ってニュースページをスクレイピングし、RSS フィードを生成するツールを作成しました

## 主な機能と実装

- ニュースページのスクレイピング

  - DOMDocument と XPath を使用して記事情報を抽出
  - 記事のタイトル、日付、カテゴリー、URLを取得

- キャッシュ機能

  - パフォーマンス向上のため 30 分のキャッシュを実装
  - 24 時間以上経過したキャッシュは自動削除

- RSS フィード生成
  - RSS 2.0 形式で XML を生成
  - 日付は ISO 形式に変換

## 技術スタック

- PHP 8.1
- Docker

## コードのポイント

1. キャッシュ管理

```php
define('CACHE_EXPIRATION', 1800); // 30 minutes
define('CACHE_MAX_AGE', 86400); // 24 hours
```

2. スクレイピング

```php
$anchors = $xpath->query("//ul[contains(@class, 'ArticleArea_newsList')]//li//article//a");
```

3. RSS フィード生成

```php
$rssDoc = new DOMDocument('1.0', 'UTF-8');
$rss = $rssDoc->createElement('rss');
$rss->setAttribute('version', '2.0');
```

## デプロイ方法

Docker Compose を使用して簡単にデプロイできます

```bash
docker compose up -d
```

その後、`http://localhost:8080` でRSSフィードにアクセスできます

## まとめ

学園では LOLIPOP のサーバーが無料で利用できるので、お得に運用できています  
また、コードは [GitHub](https://github.com/minagishl/nnn-news-rss) で公開しています！
