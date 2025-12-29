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

    // 提供元ロゴURLを取得：organizer.logoを信頼する（idから生成しない）
    // organizer.logoからロゴIDを取得（型チェック付き）
    function getOrganizerLogoPublicId(organizer) {
      // logoフィールドを優先
      if (organizer?.logo) {
        const logo = organizer.logo;
        if (typeof logo === 'string' && logo.trim() !== '') {
          return logo.trim();
        }
      }
      // imageフィールドをチェック（logoがない場合）
      if (organizer?.image) {
        const image = organizer.image;
        if (typeof image === 'string' && image.trim() !== '') {
          return image.trim();
        }
      }
      // websiteフィールドに画像名が入っている場合（例：org-001_camppk）
      // ただし、URL形式（httpを含む、.comを含む）は除外
      const websiteValue = organizer?.website || '';
      if (websiteValue && typeof websiteValue === 'string') {
        const ws = websiteValue.trim();
        if (ws && !ws.includes('http') && !ws.includes('.com') && (!ws.includes('.') || ws.includes('_'))) {
          return ws;
        }
      }
      // ロゴIDがない場合はnullを返す（idから生成しない）
      return null;
    }
    
    const logoPublicId = getOrganizerLogoPublicId(organizer);
    let logoUrl = '';
    
    // Cloudinaryを使用してロゴURLを生成（logoPublicIdがある場合のみ）
    if (logoPublicId) {
      if (typeof window.getOrganizerImageUrl === 'function') {
        logoUrl = window.getOrganizerImageUrl(logoPublicId, organizer.id, { w: 400 });
      } else if (typeof window.cloudinaryUrl === 'function') {
        logoUrl = window.cloudinaryUrl(logoPublicId, { w: 400 });
      } else {
        // フォールバック：直接Cloudinary URLを生成
        logoUrl = `https://res.cloudinary.com/ddrxsy9jw/image/upload/f_auto,q_auto,w_400/${logoPublicId}`;
      }
    }
    
    // 画像読み込みエラー時のフォールバック処理（1回だけ試行してダメなら非表示）
    const imageErrorHandler = `
      (function() {
        const img = this;
        // 無限リトライ防止：既に試行済みの場合は何もしない
        if (img.dataset.fallbackDone === "1") {
          img.style.display = 'none';
          return;
        }
        img.dataset.fallbackDone = "1";
        // 1回だけ試行してダメなら非表示
        img.style.display = 'none';
      }).call(this);
    `;

    header.innerHTML = `
      ${logoUrl ? `<img src="${logoUrl.replace(/"/g, '&quot;')}" alt="${organizer.name.replace(/"/g, '&quot;')}" class="organizer-logo" loading="lazy" decoding="async" onerror="${imageErrorHandler.replace(/"/g, '&quot;')}" />` : ''}
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

    // デバッグログ：organizerオブジェクト全体を確認
    console.log('[organizer-template] Full organizer object:', organizer);
    console.log('[organizer-template] Organizer keys:', Object.keys(organizer || {}));

    if (description) {
      description.innerHTML = `
        <p style="line-height: 1.8; margin-bottom: 16px;">${organizer.description}</p>
      `;
    }

    if (meta) {
      // 設立年を取得（複数のフィールド名に対応：スペースを含むキーにも対応）
      const establishedYear = organizer.founded_year || organizer['founded year'] || organizer.establishedYear || organizer.foundedYear;
      
      // デバッグログ（本番環境では削除可能）
      console.log('[organizer-template] Established year check:', {
        'organizer.founded_year': organizer.founded_year,
        "organizer['founded year']": organizer['founded year'],
        'organizer.establishedYear': organizer.establishedYear,
        'organizer.foundedYear': organizer.foundedYear,
        'establishedYear (result)': establishedYear,
        'type': typeof establishedYear
      });
      
      // 設立年を表示（数値も文字列も対応）
      let displayYear = '未設定';
      if (establishedYear !== undefined && establishedYear !== null && establishedYear !== '') {
        const yearStr = String(establishedYear).trim();
        if (yearStr !== 'undefined' && yearStr !== 'null' && yearStr !== '') {
          displayYear = `${yearStr}年`;
        }
      }
      
      let metaHtml = `
        <div class="meta-item">
          <div class="meta-label">設立年</div>
          <div class="meta-value">${displayYear}</div>
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
              // contact情報を取得（スペースを含むキーにも対応）
              const contact = organizer.contact || organizer['contact'] || organizer.contact_email || organizer['contact email'] || organizer.contactEmail || organizer['contactEmail'];
              
              // デバッグログ（本番環境では削除可能）
              console.log('[organizer-template] Contact check:', {
                'organizer.contact': organizer.contact,
                "organizer['contact']": organizer['contact'],
                'organizer.contact_email': organizer.contact_email,
                "organizer['contact email']": organizer['contact email'],
                'organizer.contactEmail': organizer.contactEmail,
                'contact (result)': contact,
                'type': typeof contact
              });
              
              let displayContact = '未設定';
              if (contact !== undefined && contact !== null && contact !== '') {
                const contactStr = String(contact).trim();
                if (contactStr !== 'undefined' && contactStr !== 'null' && contactStr !== '') {
                  // メールアドレスの場合はクリック可能なリンクにする
                  const isEmail = contactStr.includes('@');
                  displayContact = isEmail ? `<a href="mailto:${contactStr}" style="color: var(--primary); text-decoration: none;">${contactStr}</a>` : contactStr;
                }
              }
              return displayContact;
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

    // 強制的に複数件出る描画に統一
    container.innerHTML = '';  // まず空にする
    
    if (events.length > 0) {
      // 各イベントをforEachでループして追加
      events.forEach(ev => {
        const html = CardRenderer.render(ev);  // 既存のカード生成関数を使う
        container.insertAdjacentHTML('beforeend', html);
      });
      
      // クリックイベントリスナーを追加（イベントデータを参照できるようにクロージャで保持）
      const eventsMap = new Map(events.map(ev => [ev.id, ev]));
      const links = container.querySelectorAll('.card-link');
      links.forEach(link => {
        link.addEventListener('click', (e) => {
          const eventId = link.getAttribute('data-event-id');
          const event = eventsMap.get(eventId);
          const organizerId = event ? (event.organizerId || event.organizer_id || '') : '';
          if (typeof ClickTracker !== 'undefined' && ClickTracker.track) {
            ClickTracker.track(eventId, organizerId);
          }
        });
      });
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

