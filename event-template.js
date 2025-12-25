// イベント詳細ページのテンプレートレンダラー

const EventPageRenderer = {
  // イベントデータからページをレンダリング
  render(event, organizer) {
    if (!event) {
      this.renderNotFound();
      return;
    }

    this.renderHeader(event);
    this.renderBreadcrumbs(event);
    this.renderTitle(event);
    this.renderGallery(event);
    this.renderContent(event, organizer);
    this.renderBooking(event, organizer);
    this.renderStructuredData(event);
  },

  // ヘッダー情報
  renderHeader(event) {
    document.title = `${event.title} | そとなび`;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) {
      metaDesc.content = event.description;
    }
  },

  // パンくずリスト
  renderBreadcrumbs(event) {
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    if (breadcrumbCategory) {
      // eventMeta または eventData からカテゴリを取得
      const categories = (window.eventMeta && window.eventMeta.categories) 
        ? window.eventMeta.categories 
        : (window.eventData && window.eventData.categories) 
          ? window.eventData.categories 
          : [];
      const category = categories.find(c => c.id === event.categoryId || c.id === event.category_id);
      breadcrumbCategory.textContent = category ? category.name : (event.category || '');
    }
  },

  // タイトルとバッジ
  renderTitle(event) {
    const titleEl = document.getElementById('event-title');
    if (titleEl) {
      titleEl.textContent = event.title;
    }

    const badgesContainer = document.getElementById('event-badges');
    if (badgesContainer) {
      const badges = [];
      if (event.isRecommended) badges.push('<span class="badge recommended">おすすめ</span>');
      if (event.isNew) badges.push('<span class="badge new">新着</span>');
      if (event.externalLink) badges.push('<span class="badge external-link">外部申込可</span>');
      badgesContainer.innerHTML = badges.join('');
    }
  },

  // ギャラリー
  renderGallery(event) {
    const mainImage = document.getElementById('event-main-image');
    if (mainImage) {
      // イベント画像URLを取得（getEventImageUrlを使用してデモイベントにも対応）
      const rawImageUrl = event.image || event.thumb || event.mainImage || '';
      let imageUrl = '';
      
      if (typeof window.getEventImageUrl === 'function' && rawImageUrl && !rawImageUrl.startsWith('http')) {
        // Cloudinaryの画像の場合、getEventImageUrlを使用（デモイベント対応）
        imageUrl = window.getEventImageUrl(rawImageUrl, event.id, { w: 1200 });
      } else if (rawImageUrl && typeof window.cloudinaryUrl === 'function') {
        // 既にURL形式の場合、またはgetEventImageUrlが利用できない場合
        imageUrl = window.cloudinaryUrl(rawImageUrl, { w: 1200 });
      }
      
      if (imageUrl) {
        mainImage.style.backgroundImage = `url('${imageUrl.replace(/'/g, "\\'")}')`;
      }
    }
    
    // サブ画像（複数枚）を設定
    const thumbsContainer = document.querySelector('.thumbs');
    if (thumbsContainer && typeof window.getEventImageUrl === 'function') {
      const thumbElements = thumbsContainer.querySelectorAll('.thumb');

      // サブ画像配列を取得（GASで既に配列に変換されている）
      const subImageIds = Array.isArray(event.images) ? event.images : [];

      // 取得できなければ何もしない
      if (subImageIds.length === 0) {
        return;
      }

      // サブ画像をサムネイルに反映（最大2枚想定）
      thumbElements.forEach((thumbEl, index) => {
        const publicId = subImageIds[index];
        if (!thumbEl || !publicId) return;

        // サブ画像もgetEventImageUrlを使用（デモイベント対応）
        const subImageUrl = window.getEventImageUrl(publicId, event.id, { w: 600 });
        if (subImageUrl) {
          thumbEl.style.backgroundImage = `url('${subImageUrl.replace(/'/g, "\\'")}')`;
        }
      });
    }
  },

  // メインコンテンツ
  renderContent(event, organizer) {
    if (!event) {
      console.error('[EventPageRenderer] Event is null or undefined in renderContent');
      return;
    }

    try {
      // 説明
      const descEl = document.getElementById('event-description');
      if (descEl) {
        descEl.textContent = event.description || '説明がありません';
      } else {
        console.warn('[EventPageRenderer] event-description element not found');
      }

      // 基本情報
      const durationEl = document.getElementById('event-duration');
      if (durationEl) {
        durationEl.textContent = event.duration || '未設定';
      }

      const locationEl = document.getElementById('event-location');
      if (locationEl) {
        if (event.location && event.location.name) {
          locationEl.textContent = event.location.name;
        } else if (event.area || event.prefecture) {
          locationEl.textContent = [event.area, event.prefecture].filter(Boolean).join(', ') || '未設定';
        } else if (event.city) {
          locationEl.textContent = event.city;
        } else {
          locationEl.textContent = '未設定';
        }
      }

      const targetAgeEl = document.getElementById('event-target-age');
      if (targetAgeEl) {
        targetAgeEl.textContent = event.targetAge || '全年齢';
      }

      // 詳細
      const detailEl = document.getElementById('event-detail');
      if (detailEl) {
        detailEl.textContent = event.detail || event.description || '';
      }

      // 開催日程
      try {
        this.renderDates(event);
      } catch (e) {
        console.error('[EventPageRenderer] Error in renderDates:', e);
      }

      // ハイライト
      try {
        this.renderHighlights(event);
      } catch (e) {
        console.error('[EventPageRenderer] Error in renderHighlights:', e);
      }

      // 設備
      try {
        this.renderFacility(event);
      } catch (e) {
        console.error('[EventPageRenderer] Error in renderFacility:', e);
      }

      // 注意事項
      const notesEl = document.getElementById('event-notes');
      if (notesEl) {
        notesEl.textContent = event.notes || '特になし';
      }

      // 提供元
      try {
        this.renderOrganizer(organizer);
      } catch (e) {
        console.error('[EventPageRenderer] Error in renderOrganizer:', e);
      }

      // 地図
      try {
        this.renderMap(event);
      } catch (e) {
        console.error('[EventPageRenderer] Error in renderMap:', e);
      }

      // 関連イベント
      try {
        this.renderRelatedEvents(event);
      } catch (e) {
        console.error('[EventPageRenderer] Error in renderRelatedEvents:', e);
      }
    } catch (e) {
      console.error('[EventPageRenderer] Error in renderContent:', e);
      throw e; // エラーを再スローして、呼び出し元で処理できるようにする
    }
  },

  // 開催日程
  renderDates(event) {
    const datesList = document.getElementById('event-dates');
    const bookingDateSelect = document.getElementById('booking-date');

    if (datesList) {
      datesList.innerHTML = '';
    }
    if (bookingDateSelect) {
      bookingDateSelect.innerHTML = '<option value="">選択してください</option>';
    }

    // dates が存在し、配列であることを確認
    if (!event.dates || !Array.isArray(event.dates) || event.dates.length === 0) {
      if (datesList) {
        datesList.innerHTML = '<li>開催日程が未設定です</li>';
      }
      return;
    }

    event.dates.forEach(d => {
      if (!d || !d.date) return;
      const dateObj = new Date(d.date);
      if (isNaN(dateObj.getTime())) return;
      
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
      
      // 時間文字列を生成（startTimeとendTimeに対応）
      let timeStr = '';
      const startTime = d.startTime || d.time || ''; // d.timeは後方互換性のため
      const endTime = d.endTime || '';
      
      if (startTime || endTime) {
        const start = String(startTime).trim();
        const end = String(endTime).trim();
        
        // Dateオブジェクトの文字列表現（GMT+0900などが含まれる）を除外
        const cleanStart = start.includes('GMT') || start.includes('Standard Time') 
          ? (start.match(/(\d{1,2}):(\d{2})/)?.[0] || '') 
          : start;
        const cleanEnd = end.includes('GMT') || end.includes('Standard Time')
          ? (end.match(/(\d{1,2}):(\d{2})/)?.[0] || '')
          : end;
        
        if (cleanStart && cleanEnd) {
          timeStr = ` ${cleanStart}-${cleanEnd}`;
        } else if (cleanStart) {
          timeStr = ` ${cleanStart}〜`;
        } else if (cleanEnd) {
          timeStr = ` 〜${cleanEnd}`;
        }
      }
      
      const dateStr = `${year}年${month}月${day}日（${weekday}）${timeStr}`;

      if (datesList) {
        const li = document.createElement('li');
        li.style.cssText = 'margin-bottom: 12px; font-size: 1rem;';
        li.innerHTML = `<span>${dateStr}</span>`;
        datesList.appendChild(li);
      }

      if (bookingDateSelect) {
        const option = document.createElement('option');
        option.value = d.date;
        option.textContent = dateStr;
        bookingDateSelect.appendChild(option);
      }
    });
  },

    // ハイライト
    renderHighlights(event) {
      const highlightsList = document.getElementById('event-highlights');
      if (!highlightsList) return;

      highlightsList.innerHTML = '';
      if (event.highlights && event.highlights.length > 0) {
        event.highlights.forEach(h => {
          const li = document.createElement('li');
          li.textContent = h;
          highlightsList.appendChild(li);
        });
        highlightsList.parentElement.style.display = 'block';
      } else {
        highlightsList.parentElement.style.display = 'none';
      }
    },

    // 設備
    renderFacility(event) {
      const facilityList = document.getElementById('event-facility');
      if (!facilityList) return;

      facilityList.innerHTML = '';
      
      // facilityが文字列の場合（| または ｜ で区切られている）
      const facilityRaw = (event.facility || '').trim();
      
      // 'undefined'文字列もチェック
      if (!facilityRaw || facilityRaw === 'undefined') {
        if (facilityList.parentElement) {
          facilityList.parentElement.style.display = 'none';
        }
        return;
      }

      // 半角・全角のパイプで分割
      const items = facilityRaw.split(/[|｜]/).map(s => s.trim()).filter(Boolean);
      
      if (items.length === 0) {
        if (facilityList.parentElement) {
          facilityList.parentElement.style.display = 'none';
        }
        return;
      }

      // リストアイテムを生成
      items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        facilityList.appendChild(li);
      });
      
      if (facilityList.parentElement) {
        facilityList.parentElement.style.display = 'block';
      }
    },

  // 提供元
  renderOrganizer(organizer) {
    const organizerInfo = document.getElementById('organizer-info');
    const organizerLink = document.getElementById('organizer-link');

    if (!organizer) return;

    if (organizerInfo) {
      // 提供元ロゴURLを取得（GitHubを優先、なければ既存URLを使用）
      let originalLogoUrl = organizer.logo || organizer.image || '';
      
      // フォールバック：logoが空の場合やプレースホルダーの場合、organizer.idに基づいてCloudinary画像を生成
      const organizerId = organizer.id || '';
      let fallbackPaths = [];
      
      // websiteフィールドに画像名が入っている場合（例：org-001_camppk）をチェック
      if (!originalLogoUrl || originalLogoUrl.includes('picsum.photos') || originalLogoUrl.includes('placeholder')) {
        // websiteフィールドに画像名らしい値がある場合、それを優先
        const websiteValue = organizer.website || '';
        // URLではない場合のみ画像名として扱う（http/httpsを含まない、ドットを含まない、アンダースコアを含む）
        if (websiteValue && !websiteValue.includes('http') && !websiteValue.includes('.com') && !websiteValue.includes('.')) {
          if (!websiteValue.includes('/')) {
            // 単純な画像名（例：org-001_camppk）の場合、フォルダパスを追加
            fallbackPaths = [
              `organizers/${organizerId}/${websiteValue}`,
              `organizers/${websiteValue}`,
              websiteValue
            ];
          } else {
            // 既にパス形式の場合（例：organizers/org-001/org-001_camppk）
            fallbackPaths = [websiteValue];
          }
        }
        
        // websiteフィールドから取得できない場合、organizer.idに基づいて生成
        if (fallbackPaths.length === 0 && organizerId) {
          // 複数のパスパターンを準備（拡張子を含むパターンも試す）
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
          originalLogoUrl = fallbackPaths[0];
        }
      }
      
      let logoUrl = '';
      
      // Cloudinaryを使用してロゴURLを生成
      if (typeof window.getOrganizerImageUrl === 'function') {
        logoUrl = window.getOrganizerImageUrl(originalLogoUrl, { w: 400 });
      } else if (typeof window.cloudinaryUrl === 'function') {
        logoUrl = window.cloudinaryUrl(originalLogoUrl, { w: 400 });
      } else {
        logoUrl = originalLogoUrl;
      }
      
      // 画像読み込みエラー時のフォールバック処理
      const imageErrorHandler = fallbackPaths.length > 1 ? `
        (function() {
          const img = this;
          const currentSrc = img.src;
          const fallbackPaths = ${JSON.stringify(fallbackPaths)};
          const currentPathIndex = fallbackPaths.findIndex(p => currentSrc.includes(encodeURIComponent(p).replace(/%2F/g, '/')) || currentSrc.includes(p));
          console.log('[event-template] Image load error. Current src:', currentSrc, 'Current index:', currentPathIndex, 'Total paths:', fallbackPaths.length);
          if (currentPathIndex >= 0 && currentPathIndex < fallbackPaths.length - 1) {
            const nextPath = fallbackPaths[currentPathIndex + 1];
            const nextUrl = typeof window.getOrganizerImageUrl === 'function' 
              ? window.getOrganizerImageUrl(nextPath, { w: 400 })
              : (typeof window.cloudinaryUrl === 'function' 
                ? window.cloudinaryUrl(nextPath, { w: 400 })
                : nextPath);
            img.src = nextUrl;
            console.log('[event-template] Trying fallback image path:', nextPath, 'URL:', nextUrl);
          } else {
            console.warn('[event-template] All fallback paths failed. Tried:', fallbackPaths);
            img.style.display = 'none';
          }
        }).call(this);
      ` : 'this.style.display=\'none\';';
      
      organizerInfo.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          ${logoUrl ? `<img src="${logoUrl.replace(/"/g, '&quot;')}" alt="${organizer.name.replace(/"/g, '&quot;')}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: #f0f0f0;" loading="lazy" decoding="async" onerror="${imageErrorHandler.replace(/"/g, '&quot;')}" />` : ''}
          <div>
            <h4 style="margin: 0 0 8px 0;">${organizer.name}</h4>
            <p style="margin: 0; color: #6c7a72; font-size: 0.9rem;">${organizer.description}</p>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #6c7a72;">
              ${(() => {
                // 設立年を取得（複数のフィールド名に対応：founded_yearがmeta.jsonで使用されている）
                const establishedYear = organizer.founded_year || organizer.establishedYear || organizer.foundedYear;
                let displayYear = '';
                if (establishedYear !== undefined && establishedYear !== null && establishedYear !== '') {
                  const yearStr = String(establishedYear).trim();
                  if (yearStr !== 'undefined' && yearStr !== 'null' && yearStr !== '') {
                    displayYear = `設立: ${yearStr}年`;
                  }
                }
                
                // 評価を取得（有効な場合のみ表示）
                const rating = parseFloat(organizer.rating) || 0;
                const reviewCount = parseInt(organizer.reviewCount) || 0;
                const displayRating = (rating > 0 && reviewCount > 0) ? `評価: ★${rating} (${reviewCount}件)` : '';
                
                // メタ情報を組み立て
                const metaItems = [];
                if (displayYear) {
                  metaItems.push(displayYear);
                }
                if (displayRating) {
                  metaItems.push(displayRating);
                }
                
                return metaItems.length > 0 ? metaItems.join(' | ') : '';
              })()}
            </div>
          </div>
        </div>
      `;
    }

    if (organizerLink) {
      organizerLink.href = `organizer-detail.html?id=${organizer.id}`;
    }
  },

  // Googleマップ埋め込み
  renderMap(event) {
    const mapIframe = document.getElementById('event-map');
    if (!mapIframe) return;

    // lat/lng がある場合はそれを優先して使用
    let mapQuery = '';
    if (event.location && event.location.lat && event.location.lng) {
      mapQuery = `${event.location.lat},${event.location.lng}`;
    } else if (event.location && event.location.name) {
      mapQuery = `${event.location.name} ${event.prefecture || ''}`;
    } else {
      mapQuery = `${event.area || ''} ${event.prefecture || ''}`;
    }

    const encodedQuery = encodeURIComponent(mapQuery.trim());
    const src = `https://www.google.com/maps?q=${encodedQuery}&hl=ja&z=13&output=embed`;

    mapIframe.src = src;
  },

  // 関連イベント（eventIndex ベース）
  renderRelatedEvents(event) {
    const section = document.getElementById('related-events-section');
    const container = document.getElementById('related-events');
    
    if (!section || !container) {
      console.warn('関連イベントセクションまたはコンテナが見つかりません');
      return;
    }
    
    // eventIndex を優先、なければ eventData にフォールバック
    const index = Array.isArray(window.eventIndex) ? window.eventIndex : [];
    const others = index.filter(e => e.id !== event.id);
    
    if (others.length === 0) {
      section.style.display = 'none';
      return;
    }

    // イベントの最初の日付を取得するヘルパー（index用）
    const getFirstDate = (e) => {
      if (e.next_date) {
        return new Date(e.next_date);
      }
      if (e.date_min) {
        return new Date(e.date_min);
      }
      // フォールバック：eventData の dates を使う
      if (eventData && eventData.events) {
        const full = eventData.events.find(ev => ev.id === e.id);
        if (full && full.dates && full.dates.length > 0) {
          const sorted = [...full.dates].sort((a, b) => new Date(a.date) - new Date(b.date));
          return new Date(sorted[0].date);
        }
      }
      return null;
    };

    const baseDate = event.next_date 
      ? new Date(event.next_date)
      : (event.dates && event.dates.length > 0)
        ? new Date(event.dates[0].date)
        : null;

    // スコアリングして関連度順にソート
    const scored = others.map(e => {
      let score = 0;
      if (e.categoryId === event.categoryId) score += 5;
      const eArea = e.area || e.city;
      const eventArea = event.area || event.city;
      if (eArea === eventArea) score += 3;
      if (e.prefecture === event.prefecture) score += 1;

      const d = getFirstDate(e);
      if (baseDate && d) {
        const diffDays = Math.abs(d - baseDate) / (1000 * 60 * 60 * 24);
        // 日付が近いほど高スコア（最大 +3）
        score += Math.max(0, 3 - Math.min(diffDays, 3));
      }

      return { event: e, score };
    }).sort((a, b) => b.score - a.score);

    // スコアが0以上なら表示（スコアが0でも最大4件表示）
    const related = scored
      .slice(0, 4)
      .map(item => item.event);

    if (!related.length) {
      section.style.display = 'none';
      return;
    }

    // 4カード横並びで表示（最大4件）
    if (typeof CardRenderer === 'undefined' || !CardRenderer.render) {
      console.error('CardRendererが見つかりません');
      section.style.display = 'none';
      return;
    }

    container.innerHTML = related.map(e => CardRenderer.render(e)).join('');
    
    // 4カード横並びのスタイルを適用
    container.className = 'related-events-grid';
    section.style.display = 'block';
  },

  // 予約セクション
  renderBooking(event, organizer) {
    // 価格（最優先・固定）
    const bookingPrice = document.getElementById('booking-price');
    const bookingPriceMeta = document.getElementById('booking-price-meta');
    if (bookingPrice) {
      bookingPrice.textContent = event.price.toLocaleString();
    }
    if (bookingPriceMeta) {
      // 単位（人 / 組 / 家族など）があれば表示、なければ「人」
      const unit = event.priceUnit || '人';
      const suffix = event.priceSuffix || '税込';
      bookingPriceMeta.textContent = ` / ${unit}（${suffix}）`;
    }

    // 開催日：プルダウン + 直近開催表示
    const dateSelect = document.getElementById('booking-date');
    const nextDateWrap = document.getElementById('booking-next-date');
    const nextDateText = document.getElementById('booking-next-date-text');

    if (dateSelect && Array.isArray(event.dates)) {
      // 一旦クリア
      dateSelect.innerHTML = '<option value="">日付を選択してください</option>';

      event.dates.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.date;
        const dateObj = new Date(d.date);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        opt.textContent = `${month}月${day}日 (${d.time})`;
        dateSelect.appendChild(opt);
      });

      if (event.dates.length > 0 && nextDateWrap && nextDateText) {
        const first = event.dates[0];
        const firstDate = new Date(first.date);
        const month = firstDate.getMonth() + 1;
        const day = firstDate.getDate();
        nextDateText.textContent = `${month}月${day}日`;
        nextDateWrap.style.display = 'block';
      }
    }

    const bookingBtn = document.getElementById('external-booking-btn');
    if (bookingBtn) {
      // externalLinkまたはexternal_linkの両方に対応
      const externalLink = event.externalLink || event.external_link;
      if (externalLink) {
        bookingBtn.href = externalLink;
        bookingBtn.textContent = '外部サイトへ進む';
        bookingBtn.style.display = 'block';
        
        // 既存のイベントリスナーを削除（重複登録を防ぐ）
        const oldHandler = bookingBtn._clickTrackerHandler;
        if (oldHandler) {
          bookingBtn.removeEventListener('click', oldHandler);
          bookingBtn._clickTrackerHandler = null;
        }
        
        // 既に登録済みの場合はスキップ（重複登録を防ぐ）
        if (bookingBtn._clickTrackerHandler) {
          console.log('[ClickTracker] [公式サイトボタン] 既にイベントリスナーが登録済み、スキップします');
          return;
        }
        
        // クリックイベントリスナーを登録（計測処理）
        const clickHandler = function(e) {
          // 重複送信防止：最初にsessionStorageをチェック＆セット（最優先・即座に実行）
          const sentFlagKey = `sotonavi_sent_button_${event.id}`;
          const currentTimestamp = Date.now();
          
          // フラグのチェックとセットをアトミックに行う（存在チェック → セット）
          try {
            // フラグが既に存在する場合は、即座に終了（重複送信を完全に防ぐ）
            if (sessionStorage.getItem(sentFlagKey)) {
              console.log('[ClickTracker] [公式サイトボタン] 既に送信済み、スキップします（重複防止）');
              return;
            }
            // フラグが存在しない場合のみ、即座にフラグをセット（この時点で他のリクエストをブロック）
            sessionStorage.setItem(sentFlagKey, currentTimestamp.toString());
          } catch (storageError) {
            console.warn('[ClickTracker] sessionStorage error:', storageError);
            // sessionStorageが使えない場合は続行（重複の可能性があるが、仕方ない）
          }
          
          // 既に処理中ならスキップ（連続クリック防止）
          if (bookingBtn._clickProcessing) {
            console.log('[ClickTracker] 処理中のためスキップします');
            // フラグを削除（リトライ可能にする）
            try {
              sessionStorage.removeItem(sentFlagKey);
            } catch (e) {
              // 無視
            }
            return;
          }
          bookingBtn._clickProcessing = true;
          
          // 少し遅延してフラグをリセット（連続クリック防止のため）
          setTimeout(() => {
            bookingBtn._clickProcessing = false;
          }, 1000);
            // 連打防止：10分間に1イベント1回まで（同じ人がクリックするのを制限）
            // 各イベントIDごとに独立して記録される
            // 「公式サイトへ進む」ボタンは、カードリンクとは別のキーを使用（別々に計測）
            const storageKey = `sotonavi_clicked_button_${event.id}`; // カードリンクとは別のキー
            console.log('[ClickTracker] [公式サイトボタン] Using storageKey:', storageKey);
            const RESET_PERIOD_MS = 10 * 60 * 1000; // 10分
            const now = Date.now();
            
            // まず、前回のタイムスタンプをチェック
            let shouldSkip = false;
            try {
              const cached = localStorage.getItem(storageKey);
              console.log('[ClickTracker] [公式サイトボタン] cached value:', cached);
              if (cached) {
                let timestamp = null;
                
                // 新しい形式 { eventId, timestamp } か古い形式（文字列のタイムスタンプ）に対応
                try {
                  const parsed = JSON.parse(cached);
                  if (parsed && typeof parsed === 'object' && parsed.timestamp) {
                    // 新しい形式：eventIdも確認（念のため）
                    if (parsed.eventId === event.id) {
                      timestamp = parsed.timestamp;
                    } else {
                      // 異なるeventIdのデータが混入している場合は削除
                      console.warn('Stale data for different eventId, removing:', storageKey);
                      localStorage.removeItem(storageKey);
                    }
                  }
                } catch (e) {
                  // JSONとしてパースできない場合は古い形式（文字列のタイムスタンプ）として扱う
                  const oldTimestamp = Number(cached);
                  if (!isNaN(oldTimestamp) && oldTimestamp > 0) {
                    timestamp = oldTimestamp;
                  }
                }
                
                // タイムスタンプがある場合、10分以内かチェック
                if (timestamp) {
                  const age = now - timestamp; // 現在時刻との差分を計算
                  const lastClickTime = new Date(timestamp).toLocaleString('ja-JP');
                  const ageSeconds = Math.round(age / 1000);
                  const ageMinutes = Math.round(age / 60000 * 10) / 10;
                  console.log(`[ClickTracker] Event ${event.id}: 最後にクリックした時刻 = ${lastClickTime}, 経過時間 = ${ageMinutes}分 (${ageSeconds}秒)`);
                  
                  if (age < RESET_PERIOD_MS) {
                    console.log(`このイベントは既に計測済みです（10分以内）: ${event.id} - 最後のクリック: ${lastClickTime} (${ageMinutes}分前)`);
                    // 計測はスキップするが、遷移は実行される
                    shouldSkip = true;
                  } else {
                    // 10分経過しているので古いデータを削除
                    console.log(`[ClickTracker] Event ${event.id}: キャッシュ期限切れ（${ageMinutes}分経過）、削除します`);
                    localStorage.removeItem(storageKey);
                  }
                }
              }
            } catch (storageError) {
              // localStorageが使えない環境でも計測は続行
              console.warn('localStorageエラー（計測は続行）:', storageError);
            }
            
            // 10分以内にクリックされていた場合は、計測をスキップ（遷移は実行される）
            if (shouldSkip) {
              bookingBtn._clickProcessing = false; // フラグをリセット
              return;
            }
            
            // 今回のクリック時刻を即座に保存（重複実行を防ぐため）
            console.log('[ClickTracker] [公式サイトボタン] タイムスタンプを保存します（計測を続行）');
            try {
              const cacheData = {
                eventId: event.id,
                timestamp: now
              };
              localStorage.setItem(storageKey, JSON.stringify(cacheData));
              const savedTime = new Date(now).toLocaleString('ja-JP');
              console.log(`[ClickTracker] [公式サイトボタン] ✅ クリック時刻を先に保存しました: ${event.id} - 保存時刻: ${savedTime}`);
            } catch (storageError) {
              console.warn('localStorage保存エラー:', storageError);
            }
            
            // organizer が null の場合でも、event 側の organizerId / organizer_id から拾う
            const organizerIdForCount =
              (organizer && organizer.id) ||
              event.organizerId ||
              event.organizer_id ||
              '';
            
            console.log('[ClickTracker] [公式サイトボタン] organizerIdForCount:', organizerIdForCount);

            // 計測処理（失敗しても遷移は実行）
            // organizer_idを確実に送信（空文字列でも送信）
            const organizerIdToSend = (organizerIdForCount !== null && organizerIdForCount !== undefined) ? String(organizerIdForCount) : '';
            const measurementData = {
              token: 'sotonavi_click_9F2kA8R7mQX3LZpD5YwE11', // GAS側のCLICK_SECRETと一致
              event_id: event.id,
              organizer_id: organizerIdToSend
            };
            console.log('[ClickTracker] [公式サイトボタン] Payload with organizer_id:', measurementData);
            
            const gasUrl = 'https://script.google.com/macros/s/AKfycbyHnX2Z4jnTHfYSCFFaOVmVdIf6yY2edAMTCEyAOUn0Mak2Mam67CQ0g-V26zAJSVJphw/exec';
            
            // navigator.sendBeaconのみを使用（ページ遷移時も確実に送信、重複送信を防ぐ）
            // text/plainを使用することでCORSプリフライトを回避
            // フラグは既にアトミックにセットされているため、ここでは送信のみ実行
            try {
              const jsonData = JSON.stringify(measurementData);
              console.log("[ClickTracker] [公式サイトボタン] Sending to GAS:", measurementData);
              
              const blob = new Blob([jsonData], { type: 'text/plain;charset=utf-8' });
              const queued = navigator.sendBeacon(gasUrl, blob);
              console.log('[ClickTracker] [公式サイトボタン] sendBeacon queued:', queued);
              
              if (!queued) {
                console.warn('[ClickTracker] [公式サイトボタン] sendBeacon failed (but continuing)');
                // 失敗時はフラグを削除（リトライ可能にする）
                try {
                  sessionStorage.removeItem(sentFlagKey);
                } catch (e) {
                  // 無視
                }
              } else {
                // 送信成功時はフラグを維持（10分制限はlocalStorageで管理）
                // フラグは送信直前にセットしているため、ここでは何もしない
              }
            } catch (beaconErr) {
              console.error('[ClickTracker] [公式サイトボタン] sendBeacon error:', beaconErr);
              // エラー時はフラグを削除（リトライ可能にする）
              try {
                sessionStorage.removeItem(sentFlagKey);
              } catch (e) {
                // 無視
              }
            }
            
            // タイムスタンプは既に保存済み（上で先に保存している）
            // 10分後にフラグを削除（簡易実装）
            setTimeout(() => {
              try {
                localStorage.removeItem(storageKey);
              } catch (e) {
                // 無視
              }
            }, RESET_PERIOD_MS);
            
            // 既存の遷移処理はそのまま実行（<a>タグのデフォルト動作）
            // preventDefault はしないので、通常通り外部サイトに遷移する
          };
        
        // ハンドラを参照として保存（後で削除できるように）
        bookingBtn._clickTrackerHandler = clickHandler;
        bookingBtn.addEventListener('click', clickHandler);
      } else {
        bookingBtn.style.display = 'none';
      }
    }
  },

  // 構造化データ
  renderStructuredData(event) {
    const structuredDataEl = document.getElementById('event-structured-data');
    if (!structuredDataEl) return;

    // datesが存在し、配列で、要素がある場合のみstartDateを設定
    let startDate = "";
    if (event.dates && Array.isArray(event.dates) && event.dates.length > 0 && event.dates[0]) {
      const firstDate = event.dates[0];
      if (firstDate.date) {
        startDate = firstDate.time ? `${firstDate.date}T${firstDate.time}:00` : `${firstDate.date}T00:00:00`;
      }
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title || "",
      "description": event.description || "",
      "image": event.image || "",
      "startDate": startDate,
      "location": {
        "@type": "Place",
        "name": event.location && event.location.name ? event.location.name : `${event.area || ''}, ${event.prefecture || ''}`,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": event.area || "",
          "addressRegion": event.prefecture || ""
        }
      },
      "offers": {
        "@type": "Offer",
        "price": event.price || 0,
        "priceCurrency": "JPY"
      }
    };

    structuredDataEl.textContent = JSON.stringify(structuredData);
  },

  // 404表示
  renderNotFound() {
    const page = document.querySelector('.page');
    if (page) {
      page.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h2>イベントが見つかりませんでした</h2>
          <p><a href="list.html">イベント一覧に戻る</a></p>
        </div>
      `;
    }
  }
};

