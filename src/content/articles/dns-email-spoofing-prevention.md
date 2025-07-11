---
title: "使用していないドメインを悪用したメールを遮断するための DNS 設定"
description: "自分が所有するドメインが悪用されて偽装メールに使われるのを防ぐDNS設定方法について解説します"
pubDate: "2025/05/19"
emoji: "🔒"
tags: ["dns", "security", "email"]
podcastUrl: "https://github.com/minagishl/assets/raw/refs/heads/main/podcasts/dns-email-spoofing-prevention.wav"
---

## はじめに

メールアドレスの偽装や、フィッシングメールは現代のインターネットにおける大きな脅威です  
特に、自分が所有しているドメインが悪用され、そのドメインから正規のメールを装った偽メールが送信されると非常に厄介です

この記事では、自分が所有するドメインが悪用されないようにするための DNS 設定について解説します

## メール偽装とは

メール偽装とは、送信元のメールアドレスを詐称して、あたかも正規の送信者からのメールであるかのように見せかける手法です  
たとえば、`info@example.com` というアドレスを持っていなくても、誰かがそのアドレスからメールを送っているように見せかけることが可能です

この問題を解決するために、DNS に特定の設定を追加することで、ドメインからの正規メール送信を認証し、偽装メールを遮断することができます

## SPF レコードの設定

SPF（Sender Policy Framework）は、ドメインの所有者が、どのメールサーバーがそのドメイン名を使用してメールを送信できるかを指定するための仕組みです

SPF レコードの基本的な設定例

```
v=spf1 -all
```

この設定は「このドメインからのメール送信はすべて拒否する」という意味になります  
メールを送信しないドメインであれば、これが最も安全な設定です

もし特定のサーバーからのメール送信を許可したい場合は

```text
v=spf1 ip4:192.0.2.0/24 include:_spf.example.com -all
```

このように IP アドレスや他の SPF レコードを include で指定することで、特定のサーバーからの送信を許可できます

## DMARC レコードの設定

DMARC（Domain-based Message Authentication, Reporting & Conformance）は、SPF や DKIM の認証結果に基づいて、受信側がどのように処理すべきかを指示する仕組みです

基本的な DMARC レコードの設定例

```
v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;
```

この設定では

- `p=reject` - SPF または DKIM 認証に失敗したメールを拒否する
- `sp=reject` - サブドメインからのメールも同様に拒否する
- `adkim=s` - DKIM の厳格な一致を要求する
- `aspf=s` - SPF の厳格な一致を要求する

## DKIM の設定

DKIM（DomainKeys Identified Mail）は、送信者がメールに電子署名を付け、受信者がその署名を検証できるようにする仕組みです

DKIM を設定するには

1. 公開鍵と秘密鍵のペアを生成
2. DNS に公開鍵を TXT レコードとして登録
3. メール送信時に秘密鍵で署名

例えば

```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgK...（公開鍵）
```

メールを送信しないドメインの場合は、空の DKIM レコードを設定することでも保護できます

```
*._domainkey.example.com.	1	IN	TXT	"v=DKIM1; p="
```

この設定は、ワイルドカード（`*`）を使用してドメインのすべての DKIM セレクタに対して空の公開鍵を設定し、そのドメインからの DKIM 署名を無効にします

## MTA-STS の設定

MTA-STS（SMTP MTA Strict Transport Security）は、メール転送時の TLS 暗号化を強制するための仕組みです

MTA-STS を設定するには

1. DNS に特定の TXT レコードを追加
2. HTTPS サーバーで特定のポリシーファイルを公開

## 実際の設定手順

1. DNS 管理画面に移動
2. 以下のレコードを追加
   - `@` TXT レコード: `v=spf1 -all`
   - `_dmarc` TXT レコード: `v=DMARC1; p=reject; sp=reject; adkim=s; aspf=s;`
   - `*._domainkey` TXT レコード: `v=DKIM1; p=`

これらの設定により、当該ドメインからのメール送信は一切許可されなくなり、偽装メールは拒否されるようになります

## 設定の確認方法

設定が正しく行われたかを確認するには、以下のようなコマンドを使用できます：

```
dig TXT example.com
dig TXT _dmarc.example.com
```

または、オンラインの SPF/DMARC 検証ツールを利用することもできます

## まとめ

使用していないドメインを悪用した偽装メールを防ぐためには、適切な DNS 設定が不可欠です  
この記事で紹介した SPF、DMARC、DKIM の設定を行うことで、自分のドメインが悪用されるリスクを大幅に減らすことができます

特にメールを送信する予定のないドメインであれば、SPF を `-all` に、DMARC を `p=reject` に設定することで、そのドメインからのメール送信をすべて拒否することができます

セキュリティ対策は常に最新の情報を確認し、定期的に設定を見直すことをお勧めします
