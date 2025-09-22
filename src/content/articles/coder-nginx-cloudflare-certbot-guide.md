---
title: "Cloudflare × Coder でつくる快適なリモート開発環境「Coder のすゝめ」"
description: "Docker Compose と Nginx のリバースプロキシで Coder をサブドメイン公開し SSO と TLS を整える実践手順"
pubDate: "2025-09-22"
emoji: "🧑‍💻"
tags:
  [
    "coder",
    "nginx",
    "cloudflare",
    "certbot",
    "docker",
    "letsencrypt",
    "oauth",
    "oidc",
  ]
---

## この記事でやること

- Coder を Docker Compose で立ち上げる
- Nginx でサブドメインに公開し WebSocket も通す
- Cloudflare で DNS とセキュリティを整える
- Certbot でワイルドカード証明書を取得し自動更新する
- GitHub OAuth と Google OIDC で SSO を構成する
- 運用の落とし穴とセキュア設定の勘所をまとめる

Coder はワークスペースごとにユニークなサブドメインを発行する設計が強力  
そのためワイルドカード証明書と Nginx の設定がポイントになる

---

## 全体アーキテクチャ

```
Developer → Internet → Cloudflare → Nginx (Reverse Proxy) → Coder:7080 → Workspaces
└→ Certbot で証明書管理
└→ SSO は Coder が直接 IdP と対話

```

- パブリック DNS は Cloudflare
- TLS 終端は Nginx
- Coder は平文で待ち受けし X-Forwarded-\* ヘッダでオリジンを認識
- ワイルドカードサブドメインでワークスペースに到達

---

## 前提条件

- ドメインを Cloudflare に移管または NS を向けていること
- Ubuntu などの Linux サーバが一台
- Docker と Docker Compose が導入済み
- 80 と 443 がインターネットから到達可能
- 7080 はローカルでもよいが Nginx から到達できること

---

## Cloudflare 設定

1. DNS レコード

   - `A coder.example.com → サーバのパブリックIP`
   - `A *.coder.example.com → 同上`
   - プロキシはお好みで
     - オレンジ雲なら DDoS 軽減や WAF が使える
     - グレー雲なら純粋な DNS のみでトラブルが少ない

2. SSL/TLS モード

   - Nginx で正しい証明書を使うなら Full strict 推奨
   - HSTS は Nginx から配信

3. セキュリティ
   - Bot Fight や WAF ルールは徐々に強化
   - WebSocket をブロックしないこと

---

## 証明書の用意 Certbot + Cloudflare DNS チャレンジ

ワイルドカード `*.coder.example.com` を取るため DNS チャレンジを使う

### 必要パッケージ

```bash
# Ubuntu の例
sudo apt update
sudo apt install -y certbot python3-certbot-dns-cloudflare
```

### Cloudflare API トークン

- Zone DNS 編集のみを許可したトークンを作成
- 認証情報ファイルを作る

```bash
sudo mkdir -p /root/.secrets
sudo vi /root/.secrets/cloudflare.ini
```

内容

```
dns_cloudflare_api_token = <cloudflare_api_token>
```

権限を絞る

```bash
sudo chmod 600 /root/.secrets/cloudflare.ini
```

### 証明書の取得

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  -d coder.example.com \
  -d *.coder.example.com \
  --agree-tos -m admin@example.com --no-eff-email
```

取得後のパス

- フルチェーン `/etc/letsencrypt/live/coder.example.com/fullchain.pem`
- 秘密鍵 `/etc/letsencrypt/live/coder.example.com/privkey.pem`

### 自動更新フックで Nginx を再読み込み

```bash
echo 'systemctl reload nginx' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh
```

---

## Docker Compose で Coder と Postgres

`.env` を分離して秘密情報を管理するのが安全

### .env の例

```
CODER_VERSION=latest
POSTGRES_USER=coder
POSTGRES_PASSWORD=please-change-me
POSTGRES_DB=coder

# 外部公開 URL
CODER_ACCESS_URL=https://coder.example.com
CODER_WILDCARD_ACCESS_URL=https://*.coder.example.com

# GitHub OAuth
CODER_OAUTH2_GITHUB_CLIENT_ID=<github_client_id>
CODER_OAUTH2_GITHUB_CLIENT_SECRET=<github_client_secret>
CODER_OAUTH2_GITHUB_ALLOW_EVERYONE=true
CODER_OAUTH2_GITHUB_ALLOW_SIGNUPS=false
CODER_OAUTH2_GITHUB_DEFAULT_PROVIDER_ENABLE=true
CODER_OAUTH2_GITHUB_DEVICE_FLOW=false

# Google OIDC
CODER_OIDC_SIGN_IN_TEXT=Google
CODER_OIDC_ICON_URL=https://coder.example.com/icon/google.svg
CODER_OIDC_GROUP_AUTO_CREATE=false
CODER_OIDC_ALLOW_SIGNUPS=true
CODER_OIDC_ISSUER_URL=https://accounts.google.com
CODER_OIDC_EMAIL_DOMAIN=example.com
CODER_OIDC_CLIENT_ID=<google_client_id>
CODER_OIDC_CLIENT_SECRET=<google_client_secret>
```

### compose.yml 推奨構成

Nginx を前段に置くなら Coder のポートをホスト公開せず内部ネットワークでつなぐと安全

```yaml
services:
  coder:
    image: ghcr.io/coder/coder:${CODER_VERSION:-latest}
    environment:
      CODER_PG_CONNECTION_URL: "postgresql://${POSTGRES_USER:-coder}:${POSTGRES_PASSWORD:-please-change-me}@database/${POSTGRES_DB:-coder}?sslmode=disable"
      CODER_HTTP_ADDRESS: "0.0.0.0:7080"
      CODER_ACCESS_URL: "${CODER_ACCESS_URL}"
      CODER_WILDCARD_ACCESS_URL: "${CODER_WILDCARD_ACCESS_URL}"

      # セキュア設定
      CODER_SSH_KEYGEN_ALGORITHM: "ed25519"
      CODER_SECURE_AUTH_COOKIE: "true"
      CODER_DISABLE_OWNER_WORKSPACE_ACCESS: "false"

      # Coder 内部の TLS は無効, 終端は Nginx
      CODER_TLS_REDIRECT_HTTP_TO_HTTPS: "true"
      CODER_TLS_ENABLE: "false"
      CODER_TLS_MIN_VERSION: "tls12"

      # OAuth と OIDC は .env の値を利用
      CODER_OAUTH2_GITHUB_ALLOW_EVERYONE: "${CODER_OAUTH2_GITHUB_ALLOW_EVERYONE}"
      CODER_OAUTH2_GITHUB_ALLOW_SIGNUPS: "${CODER_OAUTH2_GITHUB_ALLOW_SIGNUPS}"
      CODER_OAUTH2_GITHUB_CLIENT_ID: "${CODER_OAUTH2_GITHUB_CLIENT_ID}"
      CODER_OAUTH2_GITHUB_CLIENT_SECRET: "${CODER_OAUTH2_GITHUB_CLIENT_SECRET}"
      CODER_OAUTH2_GITHUB_DEFAULT_PROVIDER_ENABLE: "${CODER_OAUTH2_GITHUB_DEFAULT_PROVIDER_ENABLE}"
      CODER_OAUTH2_GITHUB_DEVICE_FLOW: "${CODER_OAUTH2_GITHUB_DEVICE_FLOW}"

      CODER_OIDC_SIGN_IN_TEXT: "${CODER_OIDC_SIGN_IN_TEXT}"
      CODER_OIDC_ICON_URL: "${CODER_OIDC_ICON_URL}"
      CODER_OIDC_GROUP_AUTO_CREATE: "${CODER_OIDC_GROUP_AUTO_CREATE}"
      CODER_OIDC_ALLOW_SIGNUPS: "${CODER_OIDC_ALLOW_SIGNUPS}"
      CODER_OIDC_ISSUER_URL: "${CODER_OIDC_ISSUER_URL}"
      CODER_OIDC_EMAIL_DOMAIN: "${CODER_OIDC_EMAIL_DOMAIN}"
      CODER_OIDC_CLIENT_ID: "${CODER_OIDC_CLIENT_ID}"
      CODER_OIDC_CLIENT_SECRET: "${CODER_OIDC_CLIENT_SECRET}"

    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      database:
        condition: service_healthy
    networks:
      - coder_net

  database:
    image: postgres:14
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-coder}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-please-change-me}
      POSTGRES_DB: ${POSTGRES_DB:-coder}
    volumes:
      - coder_data:/var/lib/postgresql/data
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "pg_isready -U ${POSTGRES_USER:-coder} -d ${POSTGRES_DB:-coder}",
        ]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: always
    networks:
      - coder_net

volumes:
  coder_data:

networks:
  coder_net:
    driver: bridge
```

ユーザー構成のように `ports: "7080:7080"` で公開しても動くが  
Nginx が前段にいるなら内部ネットワークのみの方が安全でシンプル

---

## Nginx 設定 サブドメインと WebSocket を正しくプロキシ

### 1 サイト定義

`/etc/nginx/sites-available/coder.example.com` を作成

```nginx
# 80 番で HTTPS へリダイレクト
server {
    listen 80;
    listen [::]:80;
    server_name coder.example.com *.coder.example.com;

    return 301 https://$host$request_uri;
}

# 443 番でオリジンへプロキシ
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name coder.example.com *.coder.example.com;

    ssl_certificate     /etc/letsencrypt/live/coder.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coder.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Cloudflare 経由で本当のクライアント IP を拾う場合
    # set_real_ip_from 173.245.48.0/20;  # 代表例 コメントを外し Cloudflare 公開レンジを列挙
    # real_ip_header CF-Connecting-IP;

    # 大きめのアップロードを許可
    client_max_body_size 200m;

    # セキュリティヘッダ
    add_header Strict-Transport-Security "max-age=15552000; includeSubDomains" always;

    location / {
        proxy_pass http://coder:7080;
        proxy_http_version 1.1;

        # WebSocket
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        # オリジン情報
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # タイムアウト緩和
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}

# HTTP/2 での Connection ヘッダ問題を回避
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
```

有効化とテスト

```bash
sudo ln -s /etc/nginx/sites-available/coder.example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### ユーザー例に近い設定

ユーザー構成のようにワイルドカードを親ドメインに当てるパターンも可  
`server_name *.example.com` は影響範囲が広いので専用サブドメインに限定がおすすめ

---

## Coder の初回起動

```bash
docker compose --env-file .env up -d
docker compose logs -f coder
```

管理者ユーザーの作成や SSO 有効化は Coder の UI から行う  
`CODER_ACCESS_URL` と `CODER_WILDCARD_ACCESS_URL` が正しいと  
ワークスペースは `*.coder.example.com` のホスト名で生える

---

## GitHub OAuth と Google OIDC

- GitHub

  - OAuth App の Authorization callback URL は `https://coder.example.com/api/v2/users/oauth2/github/callback`
  - Org 限定にしたい場合は `ALLOW_EVERYONE=false` で制御

- Google

  - OIDC の Authorized redirect URI は `https://coder.example.com/api/v2/users/oidc/callback`
  - `EMAIL_DOMAIN` で社内ドメインに限定

秘密情報は `.env` や Secret マネージャで管理し
リポジトリにコミットしないこと

---

## Workspace 用のワイルドカード公開

Coder はワークスペース用に `*.coder.example.com` を消費する  
Nginx 側はホストヘッダをそのまま上流に渡すだけでよい  
個別の location を書かなくても問題ない

---

## Cloudflare をプロキシにするか DNS のみにするか

- オレンジ雲

  - DDoS 軽減やキャッシュの利点
  - WebSocket は有効であることを確認
  - TLS は Full strict

- グレー雲

  - レイテンシが安定しトラブルシュートが容易
  - 自前でレート制限や WAF を検討

どちらでも Certbot の自動更新は DNS チャレンジなので影響なし

---

## サブドメインで別ポートへ振り分けたい場合の小ネタ

Coder 以外の内部サービスにサブドメインで到達させたいニーズは多い  
`map` でホスト名から上流ポートを切り替えるパターンが便利

```nginx
map $host $upstream {
    default      coder:7080;
    jupyter.coder.example.com  jupyter:8888;
    registry.coder.example.com registry:5000;
}

server {
    listen 443 ssl http2;
    server_name coder.example.com *.coder.example.com;

    ssl_certificate     /etc/letsencrypt/live/coder.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coder.example.com/privkey.pem;

    location / {
        proxy_pass http://$upstream;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
    }
}
```

Docker のネットワーク内で `jupyter` や `registry` というサービス名を解決できるようにする

---

## セキュリティ強化チェックリスト

- Coder は内部 TLS 無効 Nginx で終端という役割分担を明確化
- HSTS を必ず配信 includeSubDomains を付ける
- `client_max_body_size` を用途に応じて調整
- Cloudflare を使うなら `set_real_ip_from` と `real_ip_header` を設定
- Nginx の `limit_req` で軽いレート制限を導入
- 管理者ログインは SSO のみ許可しパスワード認証を避ける
- Postgres は外部公開しない
- Docker ソケットをマウントする場合は最小権限に注意
- バックアップは DB と `coder templates` を定期的に取得

---

## 運用とバックアップ

- DB の毎日ダンプ

  ```bash
  docker exec -t <postgres_container> pg_dump -U $POSTGRES_USER $POSTGRES_DB > /backup/coder-$(date +%F).sql
  ```

- Coder のテンプレートやパラメータはリポジトリ管理
- Certbot の更新確認

  ```bash
  sudo systemctl status certbot.timer
  sudo certbot renew --dry-run
  ```

- Nginx のアクセスログとエラーログをローテーション管理

---

## トラブルシューティング

- 404 や 502 が出る

  - `nginx -t` で構文チェック
  - `docker compose ps` でコンテナが生きているか確認

- WebSocket が切れる

  - `proxy_set_header Upgrade` と `Connection` の設定を確認
  - Cloudflare で WebSocket が許可されているか確認

- SSO が戻ってこない

  - コールバック URL のスペルとプロトコルを再確認
  - `CODER_ACCESS_URL` が https で揃っているか確認

- 証明書の自動更新が反映されない

  - deploy フックで `systemctl reload nginx` が呼ばれているか確認

---

## まとめ

Cloudflare の DNS と Certbot の DNS チャレンジでワイルドカード証明書を確保  
Nginx を前段に据え WebSocket とヘッダを正しく中継  
Coder の `ACCESS_URL` と `WILDCARD_ACCESS_URL` を揃える  
これでサブドメイン単位の快適なリモート開発環境が完成

今日から Coder のすゝめを始めよう
