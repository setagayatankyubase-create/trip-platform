# デモ用GAS API設定ガイド

## 概要

提供元一覧ページのデモ欄で使用するGoogle Apps Script（GAS）APIの設定方法です。パスワードに応じて異なるデモコンテンツを表示できます。

## 1. スプレッドシートの作成

### 1.1 新しいスプレッドシートを作成

1. Google スプレッドシートを新規作成
2. シート名を「demo」に変更（任意）

### 1.2 スプレッドシートの構造

以下のような列構造でデータを管理します：

| password | name | description | logo | meta | link |
|----------|------|-------------|------|------|------|
| demo123 | デモ提供元A | これはデモ提供元の説明です | https://example.com/logo.png | 設立: 2020年 • 評価: ★4.5 | https://example.com/demo1 |
| demo123 | デモ提供元B | もう一つのデモ提供元です | https://example.com/logo2.png | 設立: 2018年 • 評価: ★4.8 | https://example.com/demo2 |
| demo456 | 別のデモ提供元 | パスワードが違う場合のデモ | https://example.com/logo3.png | 設立: 2021年 | https://example.com/demo3 |

**列の説明：**
- `password`: この行のデータを表示するためのパスワード
- `name`: 提供元名
- `description`: 説明文
- `logo`: ロゴ画像のURL（任意）
- `meta`: メタ情報（設立年、評価など。HTML形式でOK）
- `link`: 詳細ページのURL（任意）

**注意：**
- 1行目はヘッダー行として扱われます
- 複数のパスワードで同じデータを表示したい場合は、複数行に同じデータを入力してください

## 2. Google Apps Scriptの作成

### 2.1 スクリプトを作成

1. スプレッドシートのメニューから「拡張機能」→「Apps Script」を選択
2. 以下のコードを貼り付けて保存

```javascript
// スプレッドシートのIDを設定（URLから取得）
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // 例: '1abc123def456...'

// シート名
const SHEET_NAME = 'demo';

function doGet(e) {
  try {
    // パラメータからパスワードを取得
    const password = e.parameter.password || '';
    
    if (!password) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'パスワードが指定されていません',
        items: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // スプレッドシートを開く
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'シートが見つかりません',
        items: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // データを取得
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'データがありません',
        items: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // ヘッダー行を取得
    const headers = data[0];
    const passwordIndex = headers.indexOf('password');
    const nameIndex = headers.indexOf('name');
    const descriptionIndex = headers.indexOf('description');
    const logoIndex = headers.indexOf('logo');
    const metaIndex = headers.indexOf('meta');
    const linkIndex = headers.indexOf('link');
    
    if (passwordIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        error: 'password列が見つかりません',
        items: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // パスワードに一致する行をフィルタリング
    const items = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[passwordIndex] && row[passwordIndex].toString().trim() === password.trim()) {
        const item = {};
        
        if (nameIndex !== -1 && row[nameIndex]) item.name = row[nameIndex].toString();
        if (descriptionIndex !== -1 && row[descriptionIndex]) item.description = row[descriptionIndex].toString();
        if (logoIndex !== -1 && row[logoIndex]) item.logo = row[logoIndex].toString();
        if (metaIndex !== -1 && row[metaIndex]) item.meta = row[metaIndex].toString();
        if (linkIndex !== -1 && row[linkIndex]) item.link = row[linkIndex].toString();
        
        items.push(item);
      }
    }
    
    // JSON形式で返す
    return ContentService.createTextOutput(JSON.stringify({
      items: items,
      count: items.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString(),
      items: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### 2.2 スプレッドシートIDの設定

1. スプレッドシートのURLからIDを取得
   - URL例: `https://docs.google.com/spreadsheets/d/1abc123def456.../edit`
   - ID部分: `1abc123def456...`
2. スクリプトの`SPREADSHEET_ID`を実際のIDに置き換え

### 2.3 Webアプリとしてデプロイ

1. スクリプトエディタで「デプロイ」→「新しいデプロイ」を選択
2. 種類の選択で「ウェブアプリ」を選択
3. 設定：
   - **説明**: 任意（例：「デモAPI v1」）
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: 「全員」を選択
4. 「デプロイ」をクリック
5. **WebアプリのURL**をコピー（後で使用します）

## 3. フロントエンドの設定

### 3.1 `organizer-list.html`の設定

`organizer-list.html`ファイルを開き、以下の行でGAS APIのURLを設定：

```javascript
const DEMO_GAS_API_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

`YOUR_DEPLOYMENT_ID`を、GASのデプロイで取得したWebアプリのURLに置き換えてください。

## 4. 動作確認

### 4.1 スプレッドシートにデータを入力

1. スプレッドシートにデモデータを入力
2. パスワード列にテスト用のパスワードを入力（例：`demo123`）

### 4.2 ブラウザで確認

1. `organizer-list.html`を開く
2. ページを下にスクロールして「デモ」セクションを表示
3. パスワードを入力して「表示」ボタンをクリック
4. データが表示されることを確認

## 5. パスワードごとの表示制御

異なるパスワードで異なるコンテンツを表示したい場合は、スプレッドシートで以下のように設定：

**例：パスワード「demo123」の場合**
- デモ提供元A
- デモ提供元B

**例：パスワード「demo456」の場合**
- 別のデモ提供元
- 特別なデモ提供元

同じパスワードを持つ複数の行が、すべて表示されます。

## 6. トラブルシューティング

### 6.1 「パスワードが正しくない」と表示される

- スプレッドシートのパスワード列に入力されている値と、入力したパスワードが完全に一致しているか確認
- 余分な空白がないか確認
- スプレッドシートのヘッダー行が正しいか確認（`password`という列名になっているか）

### 6.2 データが表示されない

- GASのスクリプトを実行してエラーがないか確認（「実行」→「doGet」）
- ブラウザの開発者ツール（F12）のコンソールでエラーメッセージを確認
- スプレッドシートIDが正しいか確認

### 6.3 CORSエラーが発生する

- GASのデプロイで「アクセスできるユーザー」を「全員」に設定しているか確認
- デプロイを再実行して新しいURLを取得してください

## 7. セキュリティに関する注意

- パスワードはURLパラメータで送信されるため、完全なセキュリティは提供されません
- 機密情報は表示しないでください
- 定期的にパスワードを変更することを推奨します

