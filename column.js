// WordPress API連携 - コラム記事管理
// 
// 設定手順：
// 1. WORDPRESS_API_BASE を実際のWordPressサイトのURLに変更
//    例: 'https://blog.example.com/wp-json/wp/v2'
// 2. WORDPRESS_COLUMN_CATEGORY_ID をコラム用カテゴリのIDに変更
//    詳細は WORDPRESS_SETUP.md を参照してください

// WordPress APIのベースURL（実際のWordPressサイトのURLに変更してください）
const WORDPRESS_API_BASE = 'https://your-wordpress-site.com/wp-json/wp/v2';

// コラム記事の管理
const ColumnManager = {
  // WordPress APIからコラム記事を取得
  async fetchColumns(page = 1, perPage = 10) {
    try {
      const url = `${WORDPRESS_API_BASE}/posts?categories=${WORDPRESS_COLUMN_CATEGORY_ID}&per_page=${perPage}&page=${page}&_embed`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const posts = await response.json();
      return posts.map(post => this.transformPost(post));
    } catch (error) {
      console.error('Error fetching columns from WordPress:', error);
      throw error;
    }
  },

  // WordPressの投稿データをアプリケーション用の形式に変換
  transformPost(post) {
    // アイキャッチ画像を取得
    const featuredImage = post._embedded && post._embedded['wp:featuredmedia'] 
      ? post._embedded['wp:featuredmedia'][0]?.source_url 
      : null;

    // 投稿者情報を取得
    const author = post._embedded && post._embedded.author 
      ? post._embedded.author[0] 
      : null;

    return {
      id: post.id,
      title: post.title.rendered,
      excerpt: post.excerpt.rendered,
      content: post.content.rendered,
      date: post.date,
      modified: post.modified,
      slug: post.slug,
      link: post.link,
      featuredImage: featuredImage,
      author: author ? {
        id: author.id,
        name: author.name,
        slug: author.slug
      } : null,
      categories: post.categories || []
    };
  },

  // コラム記事一覧を表示
  async loadColumns() {
    const container = document.getElementById('column-list');
    if (!container) return;

    // WordPress APIが設定されていない場合は、準備中メッセージを表示
    if (!WORDPRESS_API_BASE || WORDPRESS_API_BASE === 'https://your-wordpress-site.com/wp-json/wp/v2') {
      container.innerHTML = `
        <div class="empty-state" style="width: 100%; padding: 40px; text-align: center;">
          <div class="empty-state-icon">📝</div>
          <h3>コラム記事は準備中です</h3>
          <p>記事が公開され次第、こちらに表示されます</p>
        </div>
      `;
      return;
    }

    try {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #6c7a72;">読み込み中...</div>';
      
      const columns = await this.fetchColumns();
      
      if (columns.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="width: 100%; padding: 40px; text-align: center;">
            <div class="empty-state-icon">📝</div>
            <h3>コラム記事がありません</h3>
            <p>記事が公開され次第、こちらに表示されます</p>
          </div>
        `;
        return;
      }

      container.innerHTML = columns.map(column => this.renderColumnCard(column)).join('');
    } catch (error) {
      console.error('Error loading columns:', error);
      container.innerHTML = `
        <div class="empty-state" style="width: 100%; padding: 40px; text-align: center;">
          <div class="empty-state-icon">📝</div>
          <h3>コラム記事は準備中です</h3>
          <p>記事が公開され次第、こちらに表示されます</p>
        </div>
      `;
    }
  },

  // コラムカードをレンダリング
  renderColumnCard(column) {
    const date = new Date(column.date);
    const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    
    // 抜粋からHTMLタグを除去
    const excerptText = column.excerpt.replace(/<[^>]*>/g, '').trim();
    
    const imageHtml = column.featuredImage 
      ? `<img src="${column.featuredImage}" alt="${column.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;">`
      : '';

    return `
      <article class="card" style="cursor: pointer;" onclick="window.open('${column.link}', '_blank')">
        ${imageHtml}
        <h2 style="margin: 0 0 12px 0; font-size: 1.25rem; line-height: 1.4;">
          ${column.title}
        </h2>
        <p style="color: #6c7a72; margin: 0 0 16px 0; line-height: 1.6;">
          ${excerptText}
        </p>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #6c7a72;">
          <span>${dateStr}</span>
          ${column.author ? `<span>by ${column.author.name}</span>` : ''}
        </div>
      </article>
    `;
  },

  // 単一のコラム記事を取得（詳細ページ用）
  async fetchColumnBySlug(slug) {
    try {
      const url = `${WORDPRESS_API_BASE}/posts?slug=${slug}&_embed`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const posts = await response.json();
      if (posts.length === 0) {
        return null;
      }
      
      return this.transformPost(posts[0]);
    } catch (error) {
      console.error('Error fetching column by slug:', error);
      throw error;
    }
  }
};

// コラムカテゴリのID（WordPress管理画面で作成したカテゴリのIDを入力）
// カテゴリIDの確認方法：
// - WordPress管理画面の「投稿」→「カテゴリ」で、カテゴリ名にマウスをかざすと表示されるURLの最後の数字
// - または、カテゴリ編集画面のURLの tag_ID= の後の数字
const WORDPRESS_COLUMN_CATEGORY_ID = ''; // 例: '3' や '5'

