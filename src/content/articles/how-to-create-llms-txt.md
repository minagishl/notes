---
title: "Astro で llms.txt を生成する方法"
description: "Astro で作成したブログサイトに llms.txt を追加して、LLM クローラーにコンテンツを提供する方法"
pubDate: "2025/03/09"
emoji: "🤖"
tags: ["astro", "web"]
---

## llms.txt とは

`llms.txt` は robots.txt に似た仕組みで、LLM クローラーに対してサイトのコンテンツをどのように扱って欲しいかを指定するためのファイルです  
サイトのコンテンツを LLM の学習データとして提供する際の指針となります

## Astro での実装方法

Astro で `llms.txt` を生成するには、動的なルートを作成します  
以下のコードを `src/pages/llms.txt.js` として作成してください

```javascript
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
  // Retrieve the article collection (replace links as appropriate)
  const posts = await getCollection("articles");
  const items = posts.map((post) => ({
    ...post.data,
    link: new URL(`/articles/${post.slug}/`, context.site).toString(),
  }));

  // Generate contents of llms.txt
  context = `# ${SITE_TITLE}\n\n> ${SITE_DESCRIPTION}\n\n## Articles\n\n${items
    .map((item) => `- [${item.title}](${item.link}): ${item.description}`)
    .join("\n")}`;

  // Return response as a text file
  return new Response(context, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
```

## コードの解説

このコードは以下の手順で `llms.txt` を生成します

1. `getCollection` を使用して記事ページのコレクションを取得
2. コレクションのアイテムに対して、フル URL を生成
3. Markdown 形式でコンテンツをフォーマット
   - サイトタイトルと説明
   - 記事一覧（タイトル、URL、説明）
4. プレーンテキストとしてレスポンスを返す

これにより、`/llms.txt` にアクセスすると、サイトのコンテンツ一覧が Markdown 形式で表示されます
