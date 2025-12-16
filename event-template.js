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
    this.renderBooking(event);
    this.renderStructuredData(event);
  },

  // ヘッダー情報
  renderHeader(event) {
    document.title = `${event.title} | GreenTrails`;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) {
      metaDesc.content = event.description;
    }
  },

  // パンくずリスト
  renderBreadcrumbs(event) {
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    if (breadcrumbCategory) {
      const category = eventData.categories.find(c => c.id === event.categoryId);
      breadcrumbCategory.textContent = category ? category.name : event.category;
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
      mainImage.style.backgroundImage = `url('${event.image}')`;
    }
  },

  // メインコンテンツ
  renderContent(event, organizer) {
    // 説明
    const descEl = document.getElementById('event-description');
    if (descEl) {
      descEl.textContent = event.description;
    }

    // 基本情報
    const durationEl = document.getElementById('event-duration');
    if (durationEl) {
      durationEl.textContent = event.duration;
    }

    const locationEl = document.getElementById('event-location');
    if (locationEl) {
      locationEl.textContent = event.location ? event.location.name : `${event.area}, ${event.prefecture}`;
    }

    const targetAgeEl = document.getElementById('event-target-age');
    if (targetAgeEl) {
      targetAgeEl.textContent = event.targetAge || '全年齢';
    }

    const priceEl = document.getElementById('event-price');
    if (priceEl) {
      priceEl.textContent = event.price.toLocaleString();
    }

    // 開催日程
    this.renderDates(event);

    // ハイライト
    this.renderHighlights(event);

    // 注意事項
    const notesEl = document.getElementById('event-notes');
    if (notesEl) {
      notesEl.textContent = event.notes || '特になし';
    }

    // 催行会社
    this.renderOrganizer(organizer);

    // 地図
    this.renderMap(event);
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

    event.dates.forEach(d => {
      const dateObj = new Date(d.date);
      const dateStr = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
      const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];

      if (datesList) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${dateStr}(${weekday}) ${d.time}</span>`;
        datesList.appendChild(li);
      }

      if (bookingDateSelect) {
        const option = document.createElement('option');
        option.value = d.date;
        option.textContent = `${dateStr}(${weekday}) ${d.time}`;
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

  // 催行会社
  renderOrganizer(organizer) {
    const organizerInfo = document.getElementById('organizer-info');
    const organizerLink = document.getElementById('organizer-link');

    if (!organizer) return;

    if (organizerInfo) {
      organizerInfo.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <img src="${organizer.logo}" alt="${organizer.name}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: #f0f0f0;">
          <div>
            <h4 style="margin: 0 0 8px 0;">${organizer.name}</h4>
            <p style="margin: 0; color: #6c7a72; font-size: 0.9rem;">${organizer.description}</p>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #6c7a72;">
              設立: ${organizer.establishedYear}年 | 評価: ★${organizer.rating} (${organizer.reviewCount}件)
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

  // 予約セクション
  renderBooking(event) {
    const bookingPrice = document.getElementById('booking-price');
    if (bookingPrice) {
      bookingPrice.textContent = event.price.toLocaleString();
    }

    const bookingBtn = document.getElementById('external-booking-btn');
    if (bookingBtn) {
      if (event.externalLink) {
        bookingBtn.href = event.externalLink;
        bookingBtn.textContent = '外部サイトで予約する';
        bookingBtn.style.display = 'block';
      } else {
        bookingBtn.style.display = 'none';
      }
    }
  },

  // 構造化データ
  renderStructuredData(event) {
    const structuredDataEl = document.getElementById('event-structured-data');
    if (!structuredDataEl) return;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title,
      "description": event.description,
      "image": event.image,
      "startDate": event.dates[0] ? `${event.dates[0].date}T${event.dates[0].time}:00` : "",
      "location": {
        "@type": "Place",
        "name": event.location ? event.location.name : `${event.area}, ${event.prefecture}`,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": event.area,
          "addressRegion": event.prefecture
        }
      },
      "offers": {
        "@type": "Offer",
        "price": event.price,
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

