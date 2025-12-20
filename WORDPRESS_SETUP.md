# WordPress API統合 実装手順

## 1. WordPress側の準備

### 1.1 WordPress REST APIの確認
WordPressのREST APIはデフォルトで有効になっています。以下のURLで確認できます：

```
https://your-wordpress-site.com/wp-json/wp/v2/posts
```

このURLにアクセスして、JSONデータが返ってくればAPIは動作しています。

### 1.2 コラム用カテゴリの作成

1. WordPressの管理画面にログイン
2. **投稿** → **カテゴリ** に移動
3. 新しいカテゴリを作成（例：「コラム」）
4. カテゴリIDを確認する方法：
   - カテゴリ一覧ページで、カテゴリ名の上にマウスをかざす
   - ブラウザのステータスバーに表示されるURLの最後の数字がカテゴリID
   - または、カテゴリ編集画面のURL（例：`/wp-admin/term.php?taxonomy=category&tag_ID=3`）の`tag_ID=3`の部分がID

### 1.3 CORS（クロスオリジン）設定（必要に応じて）

外部ドメインからWordPress APIにアクセスする場合、CORSエラーが発生する可能性があります。

**方法1: WordPressプラグインを使用**
- 「REST API - Filter Fields」や「CORS Headers」などのプラグインをインストール

**方法2: `functions.php`にコードを追加**
```php
add_action('rest_api_init', function() {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Credentials: true');
        return $value;
    });
}, 15);
```

## 2. コード側の設定

### 2.1 `column.js`の設定

`column.js`ファイルを開き、以下の2つの定数を設定します：

```javascript
// WordPress APIのベースURL（実際のWordPressサイトのURLに変更）
const WORDPRESS_API_BASE = 'https://your-wordpress-site.com/wp-json/wp/v2';

// コラムカテゴリのID（WordPressで作成したカテゴリのIDを入力）
const WORDPRESS_COLUMN_CATEGORY_ID = '3'; // 例：3
```

**設定例：**
```javascript
// 例1: 自分のWordPressサイトが https://blog.example.com の場合
const WORDPRESS_API_BASE = 'https://blog.example.com/wp-json/wp/v2';
const WORDPRESS_COLUMN_CATEGORY_ID = '5';

// 例2: サブディレクトリにWordPressがある場合
const WORDPRESS_API_BASE = 'https://example.com/wordpress/wp-json/wp/v2';
const WORDPRESS_COLUMN_CATEGORY_ID = '2';
```

### 2.2 動作確認

1. `column.html`をブラウザで開く
2. 開発者ツール（F12）のコンソールを開く
3. エラーがないか確認
4. 記事が表示されるか確認

## 3. テスト手順

### 3.1 APIの動作確認

ブラウザまたはcurlコマンドで以下を実行：

```bash
# すべての投稿を取得
curl https://your-wordpress-site.com/wp-json/wp/v2/posts

# 特定のカテゴリの投稿を取得（カテゴリID=3の場合）
curl "https://your-wordpress-site.com/wp-json/wp/v2/posts?categories=3&per_page=10&_embed"
```

### 3.2 ブラウザでの確認

1. WordPress管理画面でコラムカテゴリに記事を投稿
2. `column.html`にアクセス
3. 記事が表示されることを確認

## 4. トラブルシューティング

### 4.1 CORSエラーが発生する場合

ブラウザのコンソールに以下のようなエラーが表示される場合：
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**対処法：**
- WordPress側でCORSヘッダーを設定（上記1.3を参照）
- または、プロキシサーバーを経由してアクセス

### 4.2 記事が表示されない場合

1. `WORDPRESS_COLUMN_CATEGORY_ID`が正しいか確認
2. WordPressで該当カテゴリの記事が公開されているか確認
3. ブラウザのコンソールでエラーメッセージを確認

### 4.3 アイキャッチ画像が表示されない場合

- WordPressの記事にアイキャッチ画像が設定されているか確認
- `_embed`パラメータが正しく渡されているか確認

## 5. 参考情報

### WordPress REST APIのエンドポイント

- **投稿一覧**: `/wp-json/wp/v2/posts`
- **特定の投稿**: `/wp-json/wp/v2/posts/{id}`
- **カテゴリでフィルタ**: `/wp-json/wp/v2/posts?categories={id}`
- **埋め込みデータを含む**: `/wp-json/wp/v2/posts?_embed`

### よく使うパラメータ

- `per_page`: 1ページあたりの投稿数（デフォルト: 10、最大: 100）
- `page`: ページ番号（1から始まる）
- `categories`: カテゴリID（カンマ区切りで複数指定可能）
- `_embed`: 関連データ（アイキャッチ画像、投稿者情報など）を含める

## 6. セキュリティに関する注意

- WordPress REST APIは公開されているため、認証なしでアクセス可能です
- 機密情報を含む記事は公開しないように注意してください
- 必要に応じて、REST APIへのアクセスを制限するプラグインを使用してください

