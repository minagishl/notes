---
title: "Discord サーバーを守るロール認証アプリの話"
description: "Cloudflare Workers と Hono を使って Discord のロール認証システムを構築し、メールドメイン認証による安全なサーバー管理を実現した話"
pubDate: "2025/09/05"
emoji: "🔐"
tags: ["discord", "oauth", "cloudflare-workers", "hono", "typescript"]
---

Discord サーバーを守るロール認証アプリの話

## はじめに

Discord サーバーの招待リンクが漏れてしまい、不特定多数の人がサーバーに参加できる状況になってしまったことがきっかけで、メールドメイン認証によるロール認証システムを作成しました！  
Cloudflare Workers と Hono を使ったサーバーレス構成で、Discord OAuth2 と Google OAuth2 を組み合わせた二段階認証システムを実装しています

以前 [Zenn で公開した記事](https://zenn.dev/minagishl/articles/7a6aab48d433a5) の内容をベースに、より詳細な実装について解説します

## システム構成

この認証システムは以下のコンポーネントで構成されています

### 技術スタック

- **Cloudflare Workers**: サーバーレス実行環境
- **Hono**: 軽量な Web フレームワーク
- **TypeScript**: 型安全性を確保
- **Discord OAuth2**: Discord アカウント認証
- **Google OAuth2**: メールアドレス認証

### 認証フロー

1. Discord OAuth2 による Discord アカウント認証
2. Google OAuth2 による Google アカウント認証
3. メールドメインの検証（指定ドメインのみ許可）
4. Discord サーバーでのロール付与

## 核となる実装

### 型定義の設計

まずは、OAuth トークンとユーザー情報の型を定義しています

```typescript
// Discord トークンレスポンス
type DiscordTokenResponse = {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

// Google トークンレスポンス
type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  id_token: string;
};

// Discord ユーザー情報
type User = {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  publicFlags: number;
  flags: number;
  banner: string | null;
  accentColor: number;
  globalName: string;
  avatarDecorationData: string | null;
  bannerColor: string | null;
  clan: string | null;
  primaryGuild: string | null;
  mfaEnabled: boolean;
  locale: string;
  premiumType: number;
};
```

### CSRF 保護の実装

セキュリティの要となる CSRF 保護機能を実装しています

```typescript
// CSRF state の生成と保存
const state = crypto.randomUUID();
const stateResponse = new Response(null, {
  status: 302,
  headers: {
    Location: discordAuthUrl,
    "Set-Cookie": `state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  },
});

// state の検証
const storedState = getCookie(c, "state");
if (!storedState || storedState !== urlState) {
  throw new Error("Invalid state parameter");
}
```

この実装により、クロスサイトリクエストフォージェリ攻撃を防いでいます

### JWT セッション管理

Discord ユーザー ID を安全に保存するために JWT を使用しています

```typescript
import { sign, verify } from "hono/jwt";

// JWT トークンの生成
const payload = { userId: discordUser.id };
const token = await sign(payload, c.env.JWT_SECRET);

// JWT トークンの検証
const payload = await verify(token, c.env.JWT_SECRET);
const userId = payload.userId as string;
```

環境変数 `JWT_SECRET` を使用してトークンに署名し、改ざんを防いでいます

### メールドメイン検証

Google OAuth2 で取得したメールアドレスのドメインを検証する仕組みです

```typescript
// 許可されたドメインのリスト
const allowedDomains = ["nnn.ed.jp", "n-jr.jp"];

// メールドメインの検証
const emailDomain = email.split("@")[1];
if (!allowedDomains.includes(emailDomain)) {
  throw new Error("Email domain not allowed");
}
```

学校のメールドメインのみを許可することで、関係者のみがサーバーに参加できるように制限しています

### Discord API を使ったロール付与

認証が完了したユーザーに自動でロールを付与します

```typescript
// Discord API を使ってロールを付与
const response = await fetch(
  `https://discord.com/api/v10/guilds/${c.env.DISCORD_GUILD_ID}/members/${userId}/roles/${c.env.DISCORD_ROLE_ID}`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${c.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
  }
);

if (!response.ok) {
  throw new Error("Failed to assign role");
}
```

Bot トークンを使用してサーバー管理者権限でロールを付与しています

## セキュリティ対策

### 1. CSRF 保護

ランダムな `state` パラメータを生成し、Cookie に保存して検証することで CSRF 攻撃を防いでいます

### 2. セキュアな Cookie 管理

```typescript
'Set-Cookie': `token=${jwt}; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`
```

HttpOnly、Secure、SameSite 属性を設定して XSS や CSRF を防止しています

### 3. JWT による安全なセッション管理

トークンに署名を付けることで改ざんを検出し、有効期限を設定してセキュリティを強化しています

### 4. 環境変数による機密情報管理

全ての API キーやシークレットキーは環境変数で管理し、コードに直接埋め込まないようにしています

## Cloudflare Workers での運用

### デプロイの簡単さ

```bash
# 依存関係のインストール
yarn install

# 開発環境での起動
yarn dev

# 本番環境へのデプロイ
yarn deploy
```

Wrangler CLI を使用することで、簡単にデプロイできます

### サーバーレスのメリット

- **スケーラビリティ**: 自動的にスケールする
- **コスト効率**: 使った分だけの課金
- **メンテナンス不要**: サーバー管理が不要
- **高速**: エッジロケーションでの実行

## 学んだこと

このプロジェクトを通じて、以下のことを深く学ぶことができました

### OAuth2 認証フローの理解

- 認可コードフローの実装方法
- state パラメータを使った CSRF 保護
- トークン交換の仕組み

### セキュリティベストプラクティス

- JWT の適切な使用方法
- Cookie のセキュリティ属性
- 機密情報の安全な管理

### TypeScript による型安全性

- API レスポンスの型定義
- 環境変数の型安全なアクセス
- エラーハンドリングの改善

## 運用での効果

このシステムを導入することで以下の効果を得られました

- **セキュリティ向上**: 不正なユーザーの参加を防止
- **運用効率化**: 手動でのロール付与作業が不要
- **スケーラブル**: 多数のユーザーにも対応可能
- **コスト削減**: サーバーレスによる低コスト運用

## まとめ

Discord サーバーのセキュリティ問題を解決するために、Cloudflare Workers と Hono を使った認証システムを構築しました  
OAuth2 の二段階認証とメールドメイン検証を組み合わせることで、安全で使いやすいシステムを実現できました

完全なコードは [GitHub リポジトリ](https://github.com/minagishl/discord-email-auth) で公開しているので、同じような課題を抱えている方はぜひ参考にしてください！
