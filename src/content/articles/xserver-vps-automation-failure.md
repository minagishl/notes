---
title: "XServer の無料 VPS を自動化しようとして諦めた話"
description: "XServer の無料 VPS 自動延長を実現しようと試行錯誤しましたが、最終的に Cloudflare Turnstile により頓挫した経験談です"
pubDate: "2025-07-21"
emoji: "🤖"
tags: ["automation", "xserver", "captcha", "scraping"]
---

XServer の無料 VPS 自動更新に挑戦しましたが、最終的に Cloudflare Turnstile という強固な壁に阻まれて断念した話をお話しします

## はじめに

XServer では無料で VPS を提供していますが、手動で延長手続きをする必要があります  
この面倒な作業を自動化しようと思い立ったのが事の始まりでした

## 画像処理による CAPTCHA 解決アプローチ

最初のアプローチは、CAPTCHA 画像を Gemini に投げて解読させる方法でした  
画像の前処理が鍵となり、以下のような処理を実装しました

```typescript
import Jimp from "jimp";

// 純黒ピクセル (#000000) を白 (#ffffff) に置き換える
async function processImageReplaceBlackAndThicken(
  buffer: Buffer
): Promise<Buffer> {
  const image = await Jimp.read(buffer);
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  // 純黒を白に置き換え
  image.scan(0, 0, width, height, function (_x, _y, idx) {
    const red = (this as any).bitmap.data[idx + 0];
    const green = (this as any).bitmap.data[idx + 1];
    const blue = (this as any).bitmap.data[idx + 2];
    if (red === 0 && green === 0 && blue === 0) {
      (this as any).bitmap.data[idx + 0] = 255;
      (this as any).bitmap.data[idx + 1] = 255;
      (this as any).bitmap.data[idx + 2] = 255;
    }
  });
  return image.getBufferAsync(Jimp.MIME_PNG);
}

// 白背景用の画像処理
async function processImageWithJimpWhiteBackground(
  buffer: Buffer
): Promise<Buffer> {
  const image = await Jimp.read(buffer);
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  // 白背景処理
  image.scan(0, 0, width, height, function (_x: any, _y: any, idx: any) {
    const red = (this as any).bitmap.data[idx + 0];
    const green = (this as any).bitmap.data[idx + 1];
    const blue = (this as any).bitmap.data[idx + 2];

    const brightness = (red + green + blue) / 3;

    if (brightness < 150) {
      // 暗いピクセル（テキストや線）→ 黒
      (this as any).bitmap.data[idx + 0] = 0;
      (this as any).bitmap.data[idx + 1] = 0;
      (this as any).bitmap.data[idx + 2] = 0;
    } else {
      // 明るいピクセル（背景）→ 白
      (this as any).bitmap.data[idx + 0] = 255;
      (this as any).bitmap.data[idx + 1] = 255;
      (this as any).bitmap.data[idx + 2] = 255;
    }
  });

  return image
    .resize(300, 90)
    .contrast(0.3)
    .greyscale()
    .normalize()
    .getBufferAsync(Jimp.MIME_PNG);
}

// 黒背景用の画像処理
async function processImageWithJimpBlackBackground(
  buffer: Buffer
): Promise<Buffer> {
  const image = await Jimp.read(buffer);
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  // 白背景と同様の処理
  image.scan(0, 0, width, height, function (_x: any, _y: any, idx: any) {
    const red = (this as any).bitmap.data[idx + 0];
    const green = (this as any).bitmap.data[idx + 1];
    const blue = (this as any).bitmap.data[idx + 2];

    const brightness = (red + green + blue) / 3;

    if (brightness < 150) {
      // 暗いピクセル（テキストや線）→ 黒
      (this as any).bitmap.data[idx + 0] = 0;
      (this as any).bitmap.data[idx + 1] = 0;
      (this as any).bitmap.data[idx + 2] = 0;
    } else {
      // 明るいピクセル（背景）→ 白
      (this as any).bitmap.data[idx + 0] = 255;
      (this as any).bitmap.data[idx + 1] = 255;
      (this as any).bitmap.data[idx + 2] = 255;
    }
  });

  // 処理を適用
  const processedImage = image
    .resize(300, 90)
    .contrast(0.3)
    .greyscale()
    .normalize();

  // 色を反転（白 ⟷ 黒）
  return processedImage.invert().getBufferAsync(Jimp.MIME_PNG);
}
```

これらの前処理により、CAPTCHA 画像の文字を鮮明化し、Gemini での認識精度を大幅に向上させることができました  
特に以下の処理が効果的でした

- 線（純黒ピクセル）の白への置き換えでノイズを除去
- 明度による二値化でテキストを強調
- リサイズ・コントラスト調整・グレースケール化で認識しやすく最適化
- 黒背景用には色反転も適用

この手法により、従来の OCR では困難だった複雑な CAPTCHA でも高い精度で解読できるようになりました！

## Cloudflare Turnstile という壁

画像処理と AI 解読の仕組みが完成し、「これで勝った！」と思った矢先、XServer が Cloudflare Turnstile を導入してしまいました
これにより以下の問題が発生しました

- 単純な CAPTCHA 画像解読では突破不可能
- ブラウザの挙動や JavaScript の実行が必要
- 人間らしいインタラクションパターンの検証
- IP レピュテーションやフィンガープリンティング

技術的には突破方法は存在するものの、コストと複雑さを考慮すると現実的ではないと判断し、プロジェクトを断念することにしました

## 学んだこと

このプロジェクトを通じて、以下のことを学ぶことができました

- 画像前処理による AI の認識精度向上テクニック
- Jimp を使った効果的な画像操作手法
- 現代の CAPTCHA システムの進化と複雑さ

## おわりに

結果的には失敗に終わりましたが、画像処理と AI を組み合わせた CAPTCHA 解読の手法は興味深い技術実験でした  
Cloudflare Turnstile のような高度なボット検出システムの前では、単純な画像認識だけでは太刀打ちできないということを身をもって学びました

完全なコードは [GitHub リポジトリ](https://github.com/minagishl/xserver-auto-renew) で公開していますので、興味のある方はぜひご覧ください
