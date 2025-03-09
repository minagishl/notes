---
title: "レポート提出を自動化したら先生から電話が来た話"
description: "レポート提出を自動化したら先生から電話が来た話"
pubDate: "2025/02/10"
emoji: "🏫"
tags: ["automation", "trouble"]
---

## はじめに

これは、私が入学して数ヶ月経った頃の出来事です

5 月頃、友人が **Zen Study（旧：N 予備校）** の動画が終了すると次の動画に自動遷移するツールを作成していました

私はそのツールをさらに進化させたいと考え、開発を開始し  
見事に完成させることができました！

しかし、その友人は自身の拡張機能を **Chrome Web Store** に公開した後、Slack から姿を消してしまいました

数日後、私の元にメンター（以下「先生」）から電話があり、この拡張機能について多くの質問を受けました

- **作成の目的**
- **使用用途**
- **どのように動作するのか**

約 7 分間の会話の後、通話は終了

### 再び先生からの電話

翌日、再び先生から電話がありました

結論として、私の作成したアプリは **コードを公開しているものの、拡張機能としては公開していない** こと、さらに `README.md` に **「自分のための練習用」** と明記していたことから、警告のみで済みました

ただし、コード内の変数を変更することで **完全にバックグラウンドで動作する点** については特に注意を受けました

幸い、私は Slack から姿を消すこともなく、現在は部活の運営や実行委員として活動を続けています  
その点は安心してください！

## 開発の過程での気付き

この拡張機能を作成している途中で気付いたことがあります

**デバッグ中に動画を最後まで再生してしまい、実際に利用する機会が少なかったこと**

これはかなり悔しいポイントでした

## コードの解説

現在のコードは当時のものより進化していますが、基本的な構造は変わっていないので少しだけ解説します

```ts
const RGB_COLOR_GREEN = "rgb(0, 197, 65)";
const TYPE_MOVIE_ROUNDED_PLUS = "movie-rounded-plus";

function getList(): ListItem[] {
  const elements = document.querySelectorAll<HTMLLIElement>(
    'ul[aria-label="必修教材リスト"] > li'
  );
  return Array.from(elements).map((element) => {
    const titleElement = element.querySelector<HTMLSpanElement>(
      "div div div span:nth-child(2)"
    );
    const title = titleElement?.textContent?.trim() ?? "";
    const iconElement = element.querySelector<HTMLElement>("div > svg");
    const iconColor = iconElement
      ? window.getComputedStyle(iconElement).color
      : "";
    const passed =
      (iconColor === RGB_COLOR_GREEN ||
        element.textContent?.includes("視聴済み")) ??
      false;
    const type =
      iconElement?.getAttribute("type") === TYPE_MOVIE_ROUNDED_PLUS
        ? "supplement"
        : "main";
    return { title, passed, type };
  });
}
```

このコードでは `getList()` を使用して **視聴済みの動画・未視聴の動画・必修ではないコンテンツ** を判断し、JSON オブジェクトとして返却します

上記関数で作成された JSON をもとに、未視聴のコンテンツの index を探し、再生する仕組みです

```ts
function findIndex(data: ListItem[]): number {
  return data.findIndex((item) => item.type === "main" && !item.passed);
}
```

## Firefox 対応について

この拡張機能は Firefox にも対応しています

Chrome Web Store には公開されていませんが、Firefox の `about:debugging#/runtime/this-firefox` から手動でインストールすれば利用可能です

ただし、Firefox では Chrome とは異なり `manifest.json` の `browser_specific_settings` を適切に設定する必要があります（ビルドスクリプトで自動対応）

拡張機能の動作自体はほぼ同じですが、開発者ツールでのデバッグ方法や API の挙動が一部異なるため、完全な動作は保証できません

## まとめ

この拡張機能の作成を通じて学んだことは以下の通りです

- **技術的なチャレンジは楽しいが、その影響範囲を考えなければならない**
- **公開することで想定外の反応があることもある**
- **デバッグ中に動画を最後まで視聴してしまうのは割と困る**

まあ、この記事が消えたら察してください（）
