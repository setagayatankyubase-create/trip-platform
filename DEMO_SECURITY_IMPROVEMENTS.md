# デモページのセキュリティ改善提案

## 現在の実装の問題点

1. **パスワードがURLパラメータで送信される**
   - ブラウザの履歴にパスワードが残る
   - サーバーログにパスワードが記録される可能性
   - 共有リンクにパスワードが含まれる

2. **クライアント側認証のみ**
   - `sessionStorage`に認証状態を保存しているが、簡単に変更できる
   - サーバー側で認証状態を検証していない

3. **パスワードが平文で保存**
   - スプレッドシートにパスワードが平文で保存されている

## 推奨される改善策

### 1. POSTリクエストへの変更（推奨度：中）

**変更内容：**
- `fetchDemoData`を`fetch`の`POST`メソッドに変更
- GAS APIの`doGet`を`doPost`に変更

**メリット：**
- パスワードがURLに露出しない
- ブラウザ履歴に残らない

**デメリット：**
- GASの`doPost`はCORS制約がある
- 実装が少し複雑になる

### 2. セッショントークン方式（推奨度：高）

**変更内容：**
1. 初回認証時：パスワードをPOSTで送信
2. GASでパスワードを検証し、セッショントークン（UUID）を生成
3. セッショントークンをクライアントに返す
4. 以降のリクエストでは、セッショントークンを送信
5. GASでセッショントークンを検証してデータを返す

**メリット：**
- パスワードが一度しか送信されない
- セッショントークンは有効期限を設定できる
- より安全な認証フロー

**デメリット：**
- 実装が複雑になる
- GASでセッショントークンの管理が必要（スプレッドシートまたはCacheService）

### 3. パスワードハッシュ化（推奨度：低）

**変更内容：**
- クライアント側でパスワードをハッシュ化（SHA-256など）して送信
- GAS側でも同じハッシュ化ロジックで検証

**メリット：**
- 平文パスワードが送信されない

**デメリット：**
- ハッシュが漏洩すれば、同じパスワードにアクセスできる
- レインボーテーブル攻撃に対して脆弱
- 実質的なセキュリティ向上は限定的

### 4. HTTPS必須の確認（推奨度：必須）

**確認事項：**
- GAS APIのURLが`https://`で始まっていることを確認
- 現在のURLは`https://`なので、この点は問題なし

## デモ用途としての現実的な判断

**デモ用途の場合：**
- 完全なセキュリティは必要ない
- ただし、最低限の保護は推奨される

**現状維持でも問題ない場合：**
- デモ用途で、本番環境ではない
- パスワードが漏洩しても大きなリスクがない
- 一時的なアクセス用

**改善を推奨する場合：**
- より長期間使用する予定
- 複数人がアクセスする可能性がある
- 機密情報が含まれている

## 簡単に実装できる最小限の改善

1. **パスワードフィールドの説明を追加**
   - 「このパスワードは一時的なデモ用です」などの注意書き

2. **セッションタイムアウトの追加**
   - `sessionStorage`の認証状態に有効期限を設定（例：1時間）

3. **ログアウト機能の強化**
   - `clearDemoAuth()`で確実にセッションをクリア

## 実装例（セッションタイムアウト）

```javascript
// organizer-list.htmlのhandleDemoAuth関数に追加
const AUTH_EXPIRY_MS = 60 * 60 * 1000; // 1時間

async function handleDemoAuth() {
  const password = document.getElementById('demo-password').value.trim();
  if (!password) {
    document.getElementById('demo-auth-error').textContent = 'パスワードを入力してください';
    document.getElementById('demo-auth-error').style.display = 'block';
    return;
  }
  
  const demoData = await fetchDemoData(password);
  
  if (!demoData || !demoData.success) {
    document.getElementById('demo-auth-error').textContent = 'パスワードが正しくありません';
    document.getElementById('demo-auth-error').style.display = 'block';
    return;
  }
  
  // 認証状態を保存（有効期限付き）
  const authData = {
    password: password,
    authenticatedAt: Date.now(),
    expiresAt: Date.now() + AUTH_EXPIRY_MS
  };
  sessionStorage.setItem('demo_auth', JSON.stringify(authData));
  
  // ... 以下、既存のコード ...
}

// checkDemoAuth関数に有効期限チェックを追加
function checkDemoAuth() {
  const authDataStr = sessionStorage.getItem('demo_auth');
  if (!authDataStr) return false;
  
  try {
    const authData = JSON.parse(authDataStr);
    if (Date.now() > authData.expiresAt) {
      sessionStorage.removeItem('demo_auth');
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}
```

