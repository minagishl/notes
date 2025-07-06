---
title: "Dokploy と Cloudflare Tunnel で安全な HTTPS 環境を構築する"
description: "Dokploy の管理画面を Cloudflare Tunnel を使って独自ドメインで HTTPS 対応させる方法を詳しく解説します"
pubDate: "2025-07-07"
emoji: "🔐"
tags: ["dokploy", "cloudflare", "tunnel", "https", "ssl"]
---

## はじめに

Dokploy は素晴らしいセルフホストデプロイメントプラットフォームですが、デフォルトでは HTTP での接続のみとなっています  
本記事では、Cloudflare Tunnel を活用して Dokploy の管理画面を独自ドメインで HTTPS 対応させる方法を詳しく解説します

この方法により、以下のメリットが得られます

- **セキュアな管理画面アクセス**
- **独自ドメインの利用**
- **外部からの安全なアクセス**

## 前提条件

- 独自ドメインを所有していること
- Cloudflare アカウントを持っていること
- サーバー（VPS やクラウドインスタンス）を用意していること
- 基本的な Linux コマンドの知識

## Step 1: Dokploy のセットアップ

まず、サーバーに Dokploy をインストールします  
公式の簡単インストールスクリプトを使用します

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

このコマンドにより、以下が自動的にインストールされます

- Docker
- Docker Compose
- Traefik（リバースプロキシ）
- Dokploy 本体

インストールが完了したら、サーバーの IP アドレスでアクセスして初期設定を完了させます

```
http://YOUR_SERVER_IP:3000
```

## Step 2: Cloudflare でのドメイン設定

### 2.1 ドメインを Cloudflare に追加

1. [Cloudflare Dashboard](https://dash.cloudflare.com) にログイン
2. **「Websites」** → **「Add a site」** をクリック
3. 使用したいドメインを入力
4. **「Free」** プランを選択
5. **「Continue」** をクリック

### 2.2 ネームサーバーの変更

1. Cloudflare が提供するネームサーバーをメモ
2. ドメインレジストラ（お名前.com、GoDaddy など）の管理画面でネームサーバーを変更
3. DNS の伝播を待つ（通常 5-24 時間）

## Step 3: Cloudflare Zero Trust の設定と Tunnel の作成

### 3.1 Zero Trust チームの作成

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com) にアクセス
2. **「Create a team」** をクリック
3. チーム名を入力
4. **「Free」** プランを選択

### 3.2 Cloudflare Tunnel の作成

1. **「Networks」** → **「Tunnels」** → **「Create a tunnel」** をクリック
2. **「Cloudflared」** を選択
3. トンネル名を入力（例：`dokploy-tunnel`）
4. **「Save tunnel」** をクリック

### 3.3 Connector の設定

Docker コマンドが表示されるので、これをサーバーで実行します

```bash
docker run -d --name cloudflare-tunnel \
  --restart unless-stopped \
  cloudflare/cloudflared:latest tunnel \
  --no-autoupdate run --token YOUR_TUNNEL_TOKEN
```

**重要**: トークンは Cloudflare が生成した実際のものを使用してください

### 3.4 Public Hostname の設定

1. **「Public Hostnames」** タブに移動
2. **「Add a public hostname」** をクリック
3. 以下の設定を入力
   - **Subdomain**: dokploy
   - **Domain**: あなたのドメイン
   - **Type**: HTTP
   - **URL**: `localhost:3000`

> **重要**: この設定により、Cloudflare が自動的に適切な DNS レコード（CNAME レコード）を作成します  
> 手動で DNS レコードを設定する必要はありません

## Step 4: SSL 設定の確認と動作確認

### 4.1 SSL 設定の確認

1. **「SSL/TLS」** → **「Overview」** に移動
2. **「Full (strict)」** または **「Full」** を選択
3. **「Save」** をクリック

### 4.2 動作確認

ブラウザで以下の URL にアクセスします

```
https://dokploy.example.com
```

Dokploy の管理画面が HTTPS で表示されれば成功です！

### 4.3 SSL 証明書の確認

1. ブラウザのアドレスバーの鍵マークをクリック
2. 証明書の詳細を確認
3. Cloudflare が発行した証明書であることを確認

## Step 5: セキュリティ設定の強化

### 5.1 Access Policy の設定（オプション）

より高いセキュリティが必要な場合、Cloudflare Access でアクセス制御を設定できます

1. **「Access」** → **「Applications」** → **「Add an application」**
2. **「Self-hosted」** を選択
3. アプリケーション名とドメインを設定
4. アクセスポリシーを設定（IP 制限、メール認証など）

### 5.2 WAF ルールの設定

1. **「Security」** → **「WAF」** に移動
2. **「Create rule」** をクリック
3. 必要に応じて攻撃からの保護ルールを設定

## トラブルシューティング

### よくある問題と解決方法

1. **"502 Bad Gateway" エラー**

   - Dokploy が起動していることを確認
   - トンネルが正常に動作していることを確認
   - ファイアウォールの設定を確認

2. **SSL エラー**

   - Cloudflare の SSL 設定が「Full」以上になっていることを確認
   - DNS の伝播が完了していることを確認

3. **アクセスできない**

   - Public Hostname が正しく設定されていることを確認
   - DNS の伝播が完了していることを確認（通常は数分で完了）

## おすすめのセキュリティ設定

### 1. 強力なパスワード設定

Dokploy の管理者パスワードは十分に強力なものを設定しましょう

### 2. 定期的なバックアップ

重要なデータは定期的にバックアップを取得しましょう

### 3. アクセスログの監視

Cloudflare のアクセスログを定期的に確認しましょう

## まとめ

Dokploy と Cloudflare Tunnel を組み合わせることで、以下を実現できました

- **セキュアな HTTPS 接続**
- **独自ドメインでのアクセス**
- **自動 SSL 証明書管理**
- **外部からの安全なアクセス**
- **高いセキュリティ設定**

この構成により、Dokploy をプロダクション環境で安全に運用できるようになります  
特に、チーム開発や複数のプロジェクトを管理する際に、セキュアで使いやすい環境を提供できます

## 参考リンク

- [Dokploy 公式ドキュメント](https://docs.dokploy.com/)
- [Cloudflare Tunnel ドキュメント](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Cloudflare Zero Trust](https://www.cloudflare.com/ja-jp/zero-trust/)
