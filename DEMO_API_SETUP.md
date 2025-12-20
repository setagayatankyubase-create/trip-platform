# デモ提供元・イベントAPI設定ガイド

## 概要

提供元一覧ページのデモ欄で、**提供元ごとにパスワード認証**を行い、その提供元と関連するイベント（status="demo"）を表示するためのGAS APIの設定方法です。

承認後は、スプレッドシートの`status`を`demo`から`public`などに変更することで、通常のデータとして公開できます。

## 1. スプレッドシートの準備

スプレッドシートID: `1gxrEFkzIDoLuuNk95SDSjOimrWRdV5ayP54AdNFUtus`

### 1.1 提供元シートの構造

新しいシート「提供元」を作成（または既存の提供元シートを使用）し、以下の列を設定：

| 列名 | 説明 | 必須 |
|------|------|------|
| id | 提供元ID | ✓ |
| name | 提供元名 | ✓ |
| password | パスワード（提供元ごとに異なる） | ✓ |
| description | 説明 | |
| logo | ロゴ画像URL | |
| establishedYear | 設立年 | |
| rating | 評価（数値） | |
| reviewCount | レビュー数 | |
| contact | 連絡先 | |
| website | ウェブサイトURL | |

**例：**
| id | name | password | description | logo |
|----|------|----------|-------------|------|
| org-001 | デモ提供元A | demo123 | これはデモ提供元の説明です | https://example.com/logo.png |
| org-002 | デモ提供元B | demo456 | もう一つのデモ提供元です | https://example.com/logo2.png |

### 1.2 イベントシートの構造

既存のイベントシート（例：「デモシート」）を使用。以下の列が必要：

| 列名 | 説明 | 必須 |
|------|------|------|
| id | イベントID | ✓ |
| title | イベントタイトル | ✓ |
| organizerId | 提供元ID（提供元シートのidと一致） | ✓ |
| status | ステータス（"demo"でデモ表示、"public"で公開） | ✓ |
| categoryId | カテゴリID | |
| description | 説明 | |
| image | 画像URL | |
| area | エリア名 | |
| prefecture | 都道府県 | |
| location_name | 場所名 | |
| lat | 緯度 | |
| lng | 経度 | |
| duration | 所要時間 | |
| price | 価格（数値） | |
| target_age | 対象年齢 | |
| highlights | ハイライト（\|区切り） | |
| notes | 注意事項 | |
| external_link | 外部リンク | |
| is_recommended | おすすめ（TRUE/FALSE） | |
| is_new | 新着（TRUE/FALSE） | |
| published_at | 公開日 | |

**例：**
| id | title | organizerId | status | price | ... |
|----|-------|-------------|--------|-------|-----|
| evt-001 | 里山たんけん隊 | org-001 | demo | 1500 | ... |
| evt-002 | 自然観察会 | org-001 | demo | 2000 | ... |
| evt-003 | 別のイベント | org-002 | demo | 1800 | ... |

### 1.3 データの登録と公開フロー

1. **デモデータの登録**
   - 提供元シートに提供元情報とパスワードを登録
   - イベントシートにイベントデータを登録
   - イベントの`status`列に`demo`と入力
   - イベントの`organizerId`を提供元の`id`と一致させる

2. **デモ確認**
   - パスワードを入力してデモを確認
   - 提供元情報とイベント一覧が表示されることを確認

3. **公開**
   - 問題なければ、イベントシートの`status`を`demo`から`public`（または他の公開ステータス）に変更
   - これで通常のデータとして公開されます

## 2. Google Apps Scriptの設定

### 2.1 スクリプトの作成

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を選択
2. `GAS_DemoAPI.gs`の内容をコピー＆ペースト
3. スプレッドシートIDが正しいことを確認（既に設定済み）

### 2.2 シート名の設定

`GAS_DemoAPI.gs`の以下の行でシート名を設定：

```javascript
const ORGANIZER_SHEET_NAME = '提供元'; // 提供元データのシート名
const EVENT_SHEET_NAME = 'デモシート'; // イベントデータのシート名
```

実際のシート名に合わせて変更してください。

### 2.3 Webアプリとしてデプロイ

1. スクリプトエディタで「デプロイ」→「新しいデプロイ」を選択
2. 種類の選択で「ウェブアプリ」を選択
3. 設定：
   - **説明**: 任意（例：「デモ提供元・イベントAPI v1」）
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: 「全員」を選択
4. 「デプロイ」をクリック
5. **WebアプリのURL**をコピー（例：`https://script.google.com/macros/s/AKfycby.../exec`）

## 3. フロントエンドの設定

### 3.1 `organizer-list.html`の設定

`organizer-list.html`ファイルを開き、以下の行でGAS APIのURLを設定：

```javascript
const DEMO_GAS_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

`YOUR_DEPLOYMENT_ID`を、GASのデプロイで取得したWebアプリのURLに置き換えてください。

## 4. 動作確認

### 4.1 スプレッドシートにデータを入力

1. 提供元シートに提供元データとパスワードを登録
2. イベントシートにイベントデータを登録
3. イベントの`status`列に`demo`と入力
4. イベントの`organizerId`を提供元の`id`と一致させる

### 4.2 ブラウザで確認

1. `organizer-list.html`を開く
2. ページを下にスクロールして「デモ」セクションを表示
3. 提供元のパスワードを入力して「表示」ボタンをクリック
4. 提供元情報とイベント一覧が表示されることを確認
5. イベントカードをクリックして、詳細ページに遷移できることを確認

## 5. APIレスポンス形式

### 成功時

```json
{
  "success": true,
  "organizer": {
    "id": "org-001",
    "name": "デモ提供元A",
    "description": "これはデモ提供元の説明です",
    "logo": "https://example.com/logo.png",
    "establishedYear": "2020",
    "rating": 4.5,
    "reviewCount": 120,
    "contact": "contact@example.com",
    "website": "https://example.com"
  },
  "events": [
    {
      "id": "evt-001",
      "title": "里山たんけん隊：春の生きもの探し",
      "categoryId": "nature",
      "description": "里山を歩きながら春の昆虫や植物を観察します。",
      "image": "https://picsum.photos/seed/evt1/800/600",
      "area": "世田谷",
      "prefecture": "東京都",
      "location": {
        "name": "砧公園",
        "lat": 35.6342,
        "lng": 139.6245
      },
      "duration": "120分",
      "price": 1500,
      "targetAge": "小学生〜",
      "highlights": ["昆虫", "少人数", "ガイド付き"],
      "notes": "汚れてもいい服装",
      "organizerId": "org-001",
      "external_link": "https://example.com/evt1",
      "isRecommended": true,
      "isNew": true,
      "publishedAt": "2025-01-01"
    }
  ],
  "count": 1
}
```

### エラー時

```json
{
  "success": false,
  "error": "パスワードが正しくありません",
  "organizer": null,
  "events": []
}
```

## 6. 公開フロー

### 6.1 デモから公開への移行

1. デモデータを確認・承認
2. イベントシートで、該当イベントの`status`列を`demo`から`public`（または他の公開ステータス）に変更
3. これで通常のデータ処理フローで公開されます

### 6.2 複数提供元の管理

- 各提供元ごとに異なるパスワードを設定
- 提供元Aのパスワード → 提供元Aとそのイベントを表示
- 提供元Bのパスワード → 提供元Bとそのイベントを表示

## 7. トラブルシューティング

### 7.1 「パスワードが正しくありません」と表示される

- 提供元シートに`password`列が存在するか確認
- パスワードに余分な空白がないか確認
- 提供元の`id`とイベントの`organizerId`が一致しているか確認

### 7.2 提供元は表示されるがイベントが表示されない

- イベントシートの`status`列に`demo`が入力されているか確認
- イベントの`organizerId`が提供元の`id`と一致しているか確認
- シート名が正しく設定されているか確認

### 7.3 データが表示されない

- GASのスクリプトを実行してエラーがないか確認（「実行」→「doGet」）
- ブラウザの開発者ツール（F12）のコンソールでエラーメッセージを確認
- APIレスポンスを確認（NetworkタブでAPIのレスポンスを見る）

## 8. セキュリティに関する注意

- パスワードはURLパラメータで送信されるため、完全なセキュリティは提供されません
- 機密情報は表示しないでください
- 定期的にパスワードを変更することを推奨します
- 提供元ごとに異なるパスワードを設定することで、アクセス制御が可能です
