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

    // 提供元ロゴURLを取得（Cloudinaryを使用、フォルダ構造に対応）
    let originalLogoUrl = organizer.logo || organizer.image || '';
    
    // フォールバック：logoが空の場合やプレースホルダーの場合、organizer.idに基づいてCloudinary画像を生成
    // org-001の場合、複数のパスパターンを試す
    let logoUrl = '';
    let fallbackPaths = [];
    const organizerId = organizer.id || '';
    
    if (!originalLogoUrl || originalLogoUrl.includes('picsum.photos') || originalLogoUrl.includes('placeholder')) {
      // websiteフィールドに画像名が入っている場合（例：org-001_camppk）をチェック
      const websiteValue = organizer.website || '';
      if (websiteValue && (websiteValue.includes('camppk') || (websiteValue.includes('_') && !websiteValue.includes('http') && !websiteValue.includes('.')))) {
        // websiteフィールドの値が画像名の可能性がある（URLやドメインではない）
        if (!websiteValue.includes('/')) {
          // 単純な画像名（例：org-001_camppk）の場合、フォルダパスを追加
          fallbackPaths = [
            `organizers/${organizerId}/${websiteValue}`,  // organizers/org-001/org-001_camppk
            `organizers/${websiteValue}`,                  // organizers/org-001_camppk
            websiteValue                                   // org-001_camppk
          ];
        } else {
          // 既にパス形式の場合（例：organizers/org-001/org-001_camppk）
          fallbackPaths = [websiteValue];
        }
      }
      
      // websiteフィールドから取得できない場合、organizer.idに基づいて生成
      if (fallbackPaths.length === 0 && organizerId) {
        // 複数のパスパターンを準備（Cloudinaryのpublic_idの可能性）
        // 拡張子を含むパターンも試す
        const extensions = ['', '.jpg', '.jpeg', '.png', '.webp'];
        fallbackPaths = [];
        extensions.forEach(ext => {
          fallbackPaths.push(`organizers/${organizerId}/${organizerId}_camppk${ext}`);
          fallbackPaths.push(`organizers/${organizerId}_camppk${ext}`);
          fallbackPaths.push(`${organizerId}/${organizerId}_camppk${ext}`);
          fallbackPaths.push(`${organizerId}_camppk${ext}`);
        });
        // 重複を削除
        fallbackPaths = [...new Set(fallbackPaths)];
      }
      
      if (fallbackPaths.length > 0) {
        originalLogoUrl = fallbackPaths[0]; // 最初のパスを試す
        console.log('[organizer-template] Generated fallback paths for organizer', organizerId, ':', fallbackPaths);
      }
    }
    
    // Cloudinaryを使用してロゴURLを生成（organizersフォルダを使用）
    if (typeof window.getOrganizerImageUrl === 'function') {
      logoUrl = window.getOrganizerImageUrl(originalLogoUrl, { w: 400 });
    } else if (typeof window.cloudinaryUrl === 'function') {
      logoUrl = window.cloudinaryUrl(originalLogoUrl, { w: 400, type: 'organizer' });
    } else {
      logoUrl = originalLogoUrl;
    }
    
    // 画像読み込みエラー時のフォールバック処理（複数パスを試す）
    const imageErrorHandler = fallbackPaths.length > 1 ? `
      (function() {
        const img = this;
        const currentSrc = img.src;
        const fallbackPaths = ${JSON.stringify(fallbackPaths)};
        const currentPathIndex = fallbackPaths.findIndex(p => {
          const encoded = encodeURIComponent(p).replace(/%2F/g, '/');
          return currentSrc.includes(p) || currentSrc.includes(encoded);
        });
        console.log('[organizer-template] Image load error. Current src:', currentSrc, 'Current index:', currentPathIndex, 'Total paths:', fallbackPaths.length);
        if (currentPathIndex >= 0 && currentPathIndex < fallbackPaths.length - 1) {
          const nextPath = fallbackPaths[currentPathIndex + 1];
          const nextUrl = typeof window.getOrganizerImageUrl === 'function' 
            ? window.getOrganizerImageUrl(nextPath, { w: 400 })
            : (typeof window.cloudinaryUrl === 'function' 
              ? window.cloudinaryUrl(nextPath, { w: 400 })
              : nextPath);
          img.src = nextUrl;
          console.log('[organizer-template] Trying fallback image path:', nextPath, 'URL:', nextUrl);
        } else {
          console.warn('[organizer-template] All fallback paths failed for organizer ${organizerId || 'unknown'}. Tried paths:', fallbackPaths);
          console.warn('[organizer-template] Please check Cloudinary Media Library for the actual public_id of the image');
          img.style.display = 'none';
        }
      }).call(this);
    ` : 'this.style.display=\'none\';';

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

