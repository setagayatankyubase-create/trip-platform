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
    document.title = `${organizer.name} | GreenTrails`;
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

    header.innerHTML = `
      <img src="${organizer.logo}" alt="${organizer.name}" class="organizer-logo">
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
      let metaHtml = `
        <div class="meta-item">
          <div class="meta-label">設立年</div>
          <div class="meta-value">${organizer.establishedYear}年</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">評価</div>
          <div class="meta-value">★${organizer.rating} (${organizer.reviewCount}件)</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">開催イベント数</div>
          <div class="meta-value">${events.length}件</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">連絡先</div>
          <div class="meta-value" style="font-size: 0.95rem;">${organizer.contact}</div>
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
          <h2>催行会社が見つかりませんでした</h2>
          <p><a href="organizer-list.html">催行会社一覧に戻る</a></p>
        </div>
      `;
    }
  }
};

