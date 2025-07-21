---
title: "N高のマイページを MCP 化してみた話"
description: "N Lobby（N高のマイページ）にアクセスするための MCP サーバーを実装し、Claude から学校情報を取得できるようにした話"
pubDate: "2025-07-21"
emoji: "🏫"
tags: ["mcp", "claude", "automation", "n-school"]
---

N Lobby（N 高のマイページ）にアクセスするための MCP サーバーを実装し、Claude から学校情報を取得できるようにした話

## はじめに

Model Context Protocol（MCP）を使って N 高のマイページ「N Lobby」にアクセスできるツールを Claude Code と一緒に作りました！  
これにより Claude から直接お知らせの確認やスケジュール取得などができるようになります

## 実装した MCP ツール

個人的にも結構な種類の MCP Tool を実装できており満足しています  
以下のようなツールを実装しました

### 認証関連ツール

- `interactive_login`: ブラウザを起動してインタラクティブログイン
- `login_help`: ログイン方法のヘルプ表示
- `set_cookies`: 手動での Cookie 設定
- `verify_authentication`: 認証状態の確認

### データ取得ツール

- `get_news`: お知らせの取得
- `get_required_courses`: 必履修科目の確認
- `get_calendar_events`: カレンダーイベントの取得
- `get_schedule`: スケジュールの確認

### デバッグツール

- `health_check`: システムヘルスチェック
- `debug_connection`: 接続状況のデバッグ
- `test_page_content`: ページコンテンツのテスト

## 認証の実装について

ログインに関しては puppeteer を利用して Chrome を起動してユーザー本人に Google ログインをしてもらい Cookie を取得して API を使えるようにしています

実際の実装では、ブラウザの安定性とエラーハンドリングに多くの工夫を施しました

```typescript
export class BrowserAuth {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initializeBrowser(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: false, // ユーザーの手動ログインのため表示
      defaultViewport: { width: 1280, height: 800 },
      // Chrome安定性向上のための設定
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--memory-pressure-off",
        "--max_old_space_size=4096",
        // OAuth互換性のための設定
        "--disable-features=VizDisplayCompositor,TranslateUI",
        "--allow-running-insecure-content",
      ],
      timeout: 60000,
      slowMo: 250, // ブラウザに負荷をかけないための遅延
    });

    this.page = await this.browser.newPage();

    // User-Agentを実際のブラウザに設定
    await this.page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    );

    // リソース制限でメモリ問題を防止
    await this.page.setRequestInterception(true);
    this.page.on("request", (request) => {
      const resourceType = request.resourceType();
      // 重いリソースをブロック（ただしGoogle認証に必要な画像は許可）
      if (["image", "media", "font", "stylesheet"].includes(resourceType)) {
        if (
          resourceType === "image" &&
          (request.url().includes("accounts.google.com") ||
            request.url().includes("gstatic.com"))
        ) {
          request.continue();
        } else {
          request.abort();
        }
      } else {
        request.continue();
      }
    });
  }

  async interactiveLogin(): Promise<ExtractedCookies> {
    if (!this.browser || !this.page) {
      throw new Error("Browser not initialized");
    }

    // N Lobbyへ移動
    await this.page.goto("https://nlobby.nnn.ed.jp", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // ログイン完了まで待機（最大5分）
    await this.waitForLoginCompletionWithRetry(300000);

    // NextAuth.jsの特定のCookieを抽出
    const cookies = await this.extractCookies();
    return cookies;
  }

  private async extractCookies(): Promise<ExtractedCookies> {
    const cookies = await this.page!.cookies();
    let sessionToken: string | undefined;
    let csrfToken: string | undefined;
    const cookieStrings: string[] = [];

    for (const cookie of cookies) {
      cookieStrings.push(`${cookie.name}=${cookie.value}`);

      // NextAuth.jsの重要なCookieを特定
      if (cookie.name === "__Secure-next-auth.session-token") {
        sessionToken = cookie.value;
      } else if (cookie.name === "__Host-next-auth.csrf-token") {
        csrfToken = cookie.value;
      }
    }

    return {
      sessionToken,
      csrfToken,
      allCookies: cookieStrings.join("; "),
    };
  }
}
```

この方法により以下のメリットがあります

- 学校の認証システムをそのまま利用
- ユーザーが直接ログインするためセキュリティ面で安全
- 複雑な認証フローに対応
- Cookie の自動取得でその後の API 呼び出しが可能

## 技術的なアーキテクチャ

システムは以下の層構造で設計しました

```
Browser Authentication
↓
Cookie Management
↓
HTTP Client
↓
tRPC Client
↓
Credential Manager
```

### セキュリティ対策

- 認証トークンはメモリ内のみで保持
- 機密情報のログ出力を禁止
- Cookie の適切な管理

## 使用例

Claude から以下のように学校情報を取得できます

```
// お知らせの確認
Claude: 最新のお知らせを確認してください

// スケジュールの確認
Claude: 今週のスケジュールを教えてください

// 課題の確認
Claude: 必履修科目の進捗を確認してください
```

## 苦労した点

### 1. 認証システムの複雑さ

N Lobby は Google OAuth を使用しており、単純な API 呼び出しでは認証できませんでした  
puppeteer を使ったブラウザベース認証で解決しました

### 2. Cookie の管理

取得した Cookie の適切な管理と有効期限の処理が複雑でした  
Credential Manager を実装して自動的な更新機能を追加しました

### 3. Next.js のデータ解析

N Lobby は Next.js で構築されており、通常の HTML スクレイピングでは取得できませんでした  
`self.__next_f.push()` という Next.js 独自の仕組みから JSON データを抽出する必要がありました

```typescript
private parseNewsFromHtml(html: string): NLobbyAnnouncement[] {
  // Next.jsのself.__next_f.push()からデータを抽出
  const nextFPushMatches = html.match(/self\.__next_f\.push\((\[.*?\])\)/g);

  if (nextFPushMatches) {
    for (const pushCall of nextFPushMatches) {
      const jsonMatch = pushCall.match(/self\.__next_f\.push\((\[.*?\])\)/);
      if (!jsonMatch) continue;

      const pushData = JSON.parse(jsonMatch[1]);

      // "5:[[...]]" のような形式のデータを解析
      if (pushData.length >= 2 && typeof pushData[1] === "string") {
        const stringData = pushData[1];
        const prefixMatch = stringData.match(/^(\d+):(.*)/);

        if (prefixMatch) {
          const actualJsonString = prefixMatch[2];
          const parsedContent = JSON.parse(actualJsonString);

          // コンポーネントデータからnews配列を探索
          const foundNews = this.searchForNewsInData(parsedContent);
          if (foundNews && foundNews.length > 0) {
            return this.transformNewsToAnnouncements(foundNews);
          }
        }
      }
    }
  }

  // フォールバック: __NEXT_DATA__からの抽出も試行
  return this.parseFromNextData(html);
}
```

この部分は特に苦労しました  
Next.js の内部データ構造を理解し、複数のフォールバック手法を実装する必要がありました

## 学んだこと

このプロジェクトを通じて、以下のことを学ぶことができました

- MCP サーバーの実装方法と設計パターン
- puppeteer を使ったブラウザ自動化の応用
- 学校システムのような複雑な認証フローへの対応
- TypeScript での型安全な API クライアント実装
- セキュリティを考慮した認証情報の管理

## おわりに

N 高のマイページを MCP 化することで、Claude から直接学校情報にアクセスできるようになりました  
学校生活の管理がより効率的になり、お知らせの確認漏れなども防げるようになります

完全なコードは [GitHub リポジトリ](https://github.com/minagishl/nlobby-mcp) で公開しているので、興味のある方はぜひご覧ください！
