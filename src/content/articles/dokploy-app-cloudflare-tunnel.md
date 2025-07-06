---
title: "Dokploy のアプリケーションを Cloudflare Tunnel で公開する"
description: "Dokploy で作成したアプリケーションを Cloudflare Tunnel を使って独自のサブドメインで安全に公開する方法を詳しく解説します"
pubDate: "2025-07-07"
emoji: "🌐"
tags: ["dokploy", "cloudflare", "tunnel", "deployment", "subdomain"]
---

## はじめに

前回の記事で Dokploy の管理画面を Cloudflare Tunnel を使って HTTPS で公開する方法を説明しました  
今回は、その続きとして、Dokploy で作成したアプリケーションを独自のサブドメインで公開する方法を解説します

この方法により、以下のようなメリットが得られます

- **複数のアプリケーションを異なるサブドメインで公開**
- **セキュアな HTTPS 接続**
- **柔軟なドメイン管理**
- **外部からの安全なアクセス**

## 前提条件

この記事は前回の記事「Dokploy と Cloudflare Tunnel で安全な HTTPS 環境を構築する」の続きとなります  
以下の設定が完了していることを前提とします

- Dokploy がインストール済み
- Cloudflare でドメインが管理されている
- Cloudflare Tunnel が設定済み
- Dokploy の管理画面が HTTPS でアクセス可能

## Step 1: Dokploy でアプリケーションを作成

まず、Dokploy の管理画面からプロジェクトとアプリケーションを作成します

### 1.1 プロジェクトの作成

1. Dokploy の管理画面にアクセス（例：`https://dokploy.example.com`）
2. 管理画面にログイン
3. **「Create Project」** をクリック
4. プロジェクト名を入力（例：`my-portfolio`）
5. **「Create」** をクリック

### 1.2 アプリケーションの作成

1. 作成したプロジェクト内で **「Create Service」** をクリック
2. **「Application」** をサービスタイプとして選択
3. 以下の情報を入力
   - **Application Name**: 任意の名前（例：`my-app`）
4. **「Create」** をクリック

### 1.3 アプリケーションのデプロイ

1. **「General」** タブに移動
2. **「Deploy」** をクリック
3. デプロイが完了するまで待機
4. **「Deployments」** でデプロイの状況を確認

### 1.4 アプリケーションの設定

1. **「Domains」** タブに移動
2. **「Add Domain」** をクリック
3. 以下の情報を入力
   - **Service Name**: コンテナを選択
   - **Host**: CLoudflare Tunnel で公開するドメイン
   - **Container Port**: コンテナ内の公開するポート
4. **「Create」** をクリック
5. **「General」** タブに移動
6. 再度デプロイ

## Step 2: Dokploy のリバースプロキシについて理解する

Dokploy では、すべてのアプリケーションが Traefik リバースプロキシを通してアクセスされます  
これにより、外部からは統一されたポート（80/443）でアクセスできます

### 2.1 リバースプロキシの仕組み

1. アプリケーションは内部で異なるポートで動作
2. Traefik がポート 80/443 でリクエストを受信
3. ドメイン名に基づいて適切なアプリケーションにルーティング
4. Cloudflare Tunnel は Traefik のポート 80 に接続

そのため、Cloudflare Tunnel の設定では常に `localhost:80` を指定します

## Step 3: Cloudflare Tunnel に新しい Public Hostname を追加

### 3.1 Cloudflare Zero Trust ダッシュボードへアクセス

1. [Cloudflare Zero Trust](https://one.dash.cloudflare.com) にアクセス
2. **「Networks」** → **「Tunnels」** に移動
3. 既存のトンネルを選択

### 3.2 新しい Public Hostname の追加

1. **「Public Hostnames」** タブに移動
2. **「Add a public hostname」** をクリック
3. 以下の設定を入力
   - **Subdomain**: アプリケーション名（例：`my-app`）
   - **Domain**: あなたのドメイン
   - **Type**: HTTP
   - **URL**: `localhost:80`（リバースプロキシのポート番号）
4. **「Save hostname」** をクリック

## Step 4: 動作確認

### 4.1 アクセステスト

ブラウザで以下の URL にアクセスします

```
https://my-app.example.com
```

アプリケーションが正常に表示されれば成功です！

### 4.2 SSL 証明書の確認

1. ブラウザのアドレスバーの鍵マークをクリック
2. 証明書の詳細を確認
3. Cloudflare が発行した証明書であることを確認

## Step 5: 環境変数の設定

### 6.1 Dokploy での環境変数設定

アプリケーションが外部ドメインで動作するように環境変数を設定します

1. **「Settings」** → **「Environment Variables」** に移動
2. 以下の環境変数を追加
   - `NEXT_PUBLIC_BASE_URL`: `https://my-app.example.com`
   - `ALLOWED_HOSTS`: `my-app.example.com`
3. **「Save」** をクリック
4. アプリケーションを再デプロイ

## トラブルシューティング

### よくある問題と解決方法

1. **"502 Bad Gateway" エラー**

   - アプリケーションが正常に起動していることを確認
   - ポート番号が正しいことを確認
   - Dokploy のログを確認

2. **"404 Not Found" エラー**

   - Public Hostname の設定が正しいことを確認
   - DNS の伝播が完了していることを確認
   - トンネルが正常に動作していることを確認

3. **CSS や JavaScript が読み込まれない**

   - アプリケーションのベース URL 設定を確認
   - 環境変数が正しく設定されていることを確認
   - 相対パスではなく絶対パスを使用

## まとめ

Dokploy と Cloudflare Tunnel を組み合わせることで、以下を実現できました

- **複数のアプリケーションを独立したサブドメインで公開**
- **セキュアな HTTPS 接続**
- **柔軟なドメイン管理**
- **簡単なデプロイメント**

この構成により、個人プロジェクトから本格的な Web アプリケーションまで、様々な用途に対応できる柔軟な環境を構築できます  
特に、開発者にとって複数のプロジェクトを効率的に管理できる優れたソリューションとなります

## 次のステップ

- [Dokploy の監視とアラート設定](https://docs.dokploy.com/docs/core)
- [Cloudflare の高度なセキュリティ設定](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/routing-to-tunnel)

## 参考リンク

- [Dokploy 公式ドキュメント](https://docs.dokploy.com/)
- [Cloudflare Tunnel Public Hostnames](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/routing-to-tunnel)
- [Cloudflare Zero Trust](https://www.cloudflare.com/ja-jp/zero-trust/)
- [Dokploy Cloudflare Integration](https://docs.dokploy.com/docs/core/domains/cloudflare)
