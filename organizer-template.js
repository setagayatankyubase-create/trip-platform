// 主催者詳細ページのテンプレートレンダラー

const OrganizerPageRenderer = {
  // 主催者データからページをレンダリング
  render(organizer, events) {
    if (!organizer) {
      this.renderNotFound();
      return;
    }

    this.renderHeader(organizer);
    this.renderBreadcrumbs(organizer);
    this.renderOrganizerHeader(organizer);
    this.renderOrganizerInfo(organizer, events);
    this.renderOrganizerEvents(events);
  },

  // ヘッダー情報
  renderHeader(organizer) {
    document.title = `${organizer.name} | そとなび`;
  },

  // パンくずリスト
  renderBreadcrumbs(organizer) {
    const breadcrumb = document.getElementById('organizer-name-breadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = organizer.name;
    }
  },

  // 主催者ヘッダー
  renderOrganizerHeader(organizer) {
    const header = document.getElementById('organizer-header');
    if (!header) return;

    // 提供元ロゴURLを取得（GitHubを優先、なければ既存URLを使用）
    const originalLogoUrl = organizer.logo || '';
    let logoUrl = '';
    let fallbackUrl = null;
    
    // GitHubの画像URL生成関数が利用可能な場合、GitHubを優先
    if (typeof window.getOrganizerLogoUrl === 'function' && organizer.id) {
      logoUrl = window.getOrganizerLogoUrl(organizer.id, 'jpg');
      // 既存のURLをフォールバックとして保持
      if (originalLogoUrl && originalLogoUrl.trim() !== '') {
        fallbackUrl = originalLogoUrl;
      }
    } else {
      // GitHubのURL生成関数がない場合は既存のURLを使用
      logoUrl = originalLogoUrl;
    }

    header.innerHTML = `
      <img src="${logoUrl}" ${fallbackUrl ? `onerror="this.onerror=null; if(this.src!==this.getAttribute('data-fallback')){this.setAttribute('data-fallback','${fallbackUrl.replace(/'/g, "\\'")}'); this.src='${fallbackUrl.replace(/'/g, "\\'")}';}else{this.style.display='none';}"` : 'onerror="this.onerror=null; this.style.display=\'none\';"'} alt="${organizer.name}" class="organizer-logo">
      <div class="organizer-info" style="flex: 1;">
        <h1>${organizer.name}</h1>
        <p style="margin: 0; color: #6c7a72; line-height: 1.6; font-size: 1.05rem;">${organizer.description}</p>
      </div>
    `;
  },

  // 主催者情報
  renderOrganizerInfo(organizer, events) {
    const description = document.getElementById('organizer-description');
    const meta = document.getElementById('organizer-meta');

    if (description) {
      description.innerHTML = `
        <p style="line-height: 1.8; margin-bottom: 16px;">${organizer.description}</p>
      `;
    }

    if (meta) {
      // 設立年を取得（複数のフィールド名に対応）
      const establishedYear = organizer.establishedYear || organizer.founded_year || organizer.foundedYear || '';
      
      let metaHtml = `
        <div class="meta-item">
          <div class="meta-label">設立年</div>
          <div class="meta-value">${establishedYear && establishedYear !== 'undefined' && establishedYear.trim() !== '' ? `${establishedYear}年` : '未設定'}</div>
        </div>
        ${(() => {
          const rating = parseFloat(organizer.rating) || 0;
          const reviewCount = parseInt(organizer.reviewCount) || 0;
          // 評価が有効で、レビュー数が1以上の場合のみ表示
          if (rating <= 0 || reviewCount <= 0) {
            return '';
          }
          const fullStars = Math.floor(rating);
          const hasHalfStar = rating % 1 >= 0.5;
          let starsHtml = '';
          for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
              starsHtml += '<span style="color: #ffc107;">★</span>';
            } else if (i === fullStars && hasHalfStar) {
              starsHtml += '<span style="color: #ffc107;">☆</span>';
            } else {
              starsHtml += '<span style="color: #ddd;">★</span>';
            }
          }
          return `
        <div class="meta-item">
          <div class="meta-label">評価</div>
          <div class="meta-value">
            ${starsHtml}
            <span style="margin-left: 8px; font-weight: 600; font-size: 1.05rem;">${rating}</span>
            <span style="color: #6c7a72; font-size: 0.9em; margin-left: 8px;">(${reviewCount}件)</span>
          </div>
        </div>
          `;
        })()}
        <div class="meta-item">
          <div class="meta-label">開催イベント数</div>
          <div class="meta-value">${events.length}件</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">連絡先</div>
          <div class="meta-value" style="font-size: 0.95rem;">
            ${(() => {
              // contact情報を取得
              const contact = organizer.contact || organizer.contact_email || '';
              if (!contact || contact.trim() === '' || contact === 'undefined') {
                return '未設定';
              }
              // メールアドレスの場合はクリック可能なリンクにする
              const isEmail = contact.includes('@');
              return isEmail ? `<a href="mailto:${contact}" style="color: var(--primary); text-decoration: none;">${contact}</a>` : contact;
            })()}
          </div>
        </div>
      `;

      if (organizer.website) {
        metaHtml += `
          <div class="meta-item">
            <div class="meta-label">ウェブサイト</div>
            <div class="meta-value">
              <a href="${organizer.website}" target="_blank" rel="noopener" style="color: var(--primary); text-decoration: none; font-size: 0.95rem;">
                ${organizer.website.replace(/^https?:\/\//, '')} →
              </a>
            </div>
          </div>
        `;
      }

      meta.innerHTML = metaHtml;
    }
  },

  // 主催者のイベント一覧
  renderOrganizerEvents(events) {
    const countEl = document.getElementById('event-count');
    const container = document.getElementById('organizer-events');

    if (countEl) {
      countEl.textContent = `${events.length}件のイベント`;
    }

    if (!container) return;

    if (events.length > 0) {
      CardRenderer.renderList(events, 'organizer-events');
    } else {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📅</div>
          <h3>現在開催中のイベントはありません</h3>
        </div>
      `;
    }
  },

  // 404表示
  renderNotFound() {
    const page = document.querySelector('.page');
    if (page) {
      page.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h2>提供元が見つかりませんでした</h2>
          <p><a href="organizer-list.html">提供元一覧に戻る</a></p>
        </div>
      `;
    }
  }
};

