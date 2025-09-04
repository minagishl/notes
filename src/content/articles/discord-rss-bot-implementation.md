---
title: "Discord で運用している RSS Bot の話"
description: "Rsshub を自分でホスティングして MonitorSS を利用した Discord RSS Bot の実装と運用について"
pubDate: "2025/09/04"
emoji: "🗞️"
tags: ["discord", "rss", "rsshub", "monitorss", "docker", "bot"]
---

Discord で運用している RSS Bot の話

## はじめに

Discord サーバーで RSS フィードを自動配信する Bot を作成しました！  
Rsshub を自分でホスティングして同じコンテナ内から MonitorSS を利用して配信するという構成で、安全に自分だけが使うことができる非常に快適な環境を構築できました

## システム構成

この RSS Bot は以下のコンポーネントで構成されています

### メインサービス

- `rsshub`: RSS フィードを生成する基盤サーバー
- `monitorss`: Discord Bot として RSS を配信
- `browserless`: JavaScript が必要なサイトのレンダリング用
- `redis`: キャッシュとセッション管理
- `mongo`: MonitorSS の設定データ保存

全て Docker Compose で管理しており、コンテナ間の通信で完結しているため外部依存が最小限になっています

## Docker Compose 設定

```yaml
services:
  rsshub:
    image: "diygod/rsshub:chromium-bundled"
    restart: always
    ports:
      - "1200:1200"
    environment:
      NODE_ENV: production
      CACHE_TYPE: redis
      REDIS_URL: "redis://redis:6379/"
      PUPPETEER_WS_ENDPOINT: "ws://browserless:3000"
      TWITTER_PHONE_OR_EMAIL: "${TWITTER_PHONE_OR_EMAIL}"
      TWITTER_USERNAME: "${TWITTER_USERNAME}"
      TWITTER_PASSWORD: "${TWITTER_PASSWORD}"
      TWITTER_AUTH_TOKEN: "${TWITTER_AUTH_TOKEN}"
    healthcheck:
      test:
        - CMD
        - curl
        - "-f"
        - "http://localhost:1200/healthz"
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      - redis
      - browserless
    networks:
      - app

  monitorss:
    image: synzen/monitorss
    restart: always
    environment:
      DRSS_START: bot-web
      DRSS_BOT_OWNERIDS: "${DRSS_BOT_OWNERIDS}"
      DRSS_BOT_PREFIX: "!"
      DRSS_BOT_TOKEN: "${DRSS_BOT_TOKEN}"
      DRSSWEB_BOT_TOKEN: "${DRSS_BOT_TOKEN}"
      DRSSWEB_BOT_REDIRECTURI: "${DRSSWEB_BOT_REDIRECTURI}"
      DRSSWEB_BOT_CLIENTID: "${DRSSWEB_BOT_CLIENTID}"
      DRSSWEB_BOT_CLIENTSECRET: "${DRSSWEB_BOT_CLIENTSECRET}"
      DRSSWEB_DATABASE_URI: "mongodb://mongo:27017/rss"
      DRSSWEB_DATABASE_REDIS: "redis://redis:6379"
      DRSS_DATABASE_URI: "mongodb://mongo:27017/rss"
    depends_on:
      - mongo
    ports:
      - "8081:8081"
    networks:
      - app

  browserless:
    image: browserless/chrome
    restart: always
    ulimits:
      core:
        hard: 0
        soft: 0
    healthcheck:
      test:
        - CMD
        - curl
        - "-f"
        - "http://localhost:3000/pressure"
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - app

  redis:
    image: "redis:alpine"
    restart: always
    volumes:
      - "redis-data:/data"
    healthcheck:
      test:
        - CMD
        - redis-cli
        - ping
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 5s
    networks:
      - app

  mongo:
    image: "mongo:latest"
    restart: always
    volumes:
      - "mongo-data:/data/db"
    networks:
      - app

networks:
  app: null

volumes:
  redis-data:
  mongo-data:
```

## 環境設定

`.env.example` ファイルを参考に設定を行います

```bash
DEBUG_INFO=false
DISALLOW_ROBOT=true

# Twitter Authentication
TWITTER_PHONE_OR_EMAIL=your_twitter_email_or_phone
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_AUTH_TOKEN=your_twitter_auth_token

# Discord Bot Configuration
DRSS_BOT_OWNERIDS=your_discord_user_id
DRSS_BOT_TOKEN=your_discord_bot_token
DRSSWEB_BOT_REDIRECTURI=http://localhost:8081/authorize
DRSSWEB_BOT_CLIENTID=your_discord_client_id
DRSSWEB_BOT_CLIENTSECRET=your_discord_client_secret
```

## このアーキテクチャの利点

### セキュリティ面

- 自分専用のホスティングなので外部に情報が漏れない
- Twitter 認証情報も自分の環境内でのみ利用
- Discord Bot のトークンも自分で管理

### パフォーマンス面

- Redis による効率的なキャッシュ
- Browserless によるリソース節約
- 同一ネットワーク内での通信で低レイテンシ

### 運用面

- Docker Compose による簡単な起動・停止
- ヘルスチェックによる自動復旧
- 永続化ボリュームによるデータ保護

## 使用方法

### 1. セットアップ

```bash
# 作業ディレクトリを作成
mkdir discord-rss-bot
cd discord-rss-bot

# compose.ymlと.envファイルを作成
# 上記の設定内容をそれぞれのファイルに保存

# サービス起動
docker-compose up -d
```

### 2. MonitorSS Web UI での設定

`http://localhost:8081` にアクセスして Discord OAuth でログイン後、RSS フィードを設定できます

### 3. RSS フィードの追加

- Rsshub のフィード URL: `http://localhost:1200/...`
- 通常の RSS フィード URL も利用可能
- MonitorSS の Web UI から簡単に追加・編集

## 運用での工夫

### RSS フィードの品質向上

Rsshub を使うことで、通常 RSS を提供していないサイトからもフィードを生成できます  
特に Twitter や YouTube などのソーシャルメディアからの情報取得が非常に便利です

## まとめ

自分でホスティングする RSS Bot の構築により、以下のメリットを享受できています

- プライバシーが完全に保護された環境
- 高いカスタマイズ性と拡張性
- 安定した運用とメンテナンス性
- コスト効率の良いソリューション

Docker Compose を使った構成で、複雑なサービス間の依存関係も簡潔に管理でき、非常に快適な RSS Bot 運用環境を実現できました！
