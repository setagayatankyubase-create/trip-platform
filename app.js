// アプリケーションロジック

// URLクエリパラメータの管理
const URLManager = {
  getParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get('q') || '',
      category: params.get('category') || '',
      date: params.get('date') || '',
      area: params.get('area') || '',
      weekday: params.get('weekday') || ''
    };
  },

  setParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
      if (params[key]) {
        url.searchParams.set(key, params[key]);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.pushState({}, '', url);
  },

  updateParams(updates) {
    const current = this.getParams();
    const newParams = { ...current, ...updates };
    this.setParams(newParams);
  }
};

// 検索・フィルタ機能
const SearchFilter = {
  filterEvents(events, params) {
    let filtered = [...events];

    // フリーワード検索
    if (params.q) {
      const query = params.q.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.area.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query)
      );
    }

    // カテゴリ検索
    if (params.category) {
      filtered = filtered.filter(event => event.categoryId === params.category);
    }

    // エリア検索
    if (params.area) {
      filtered = filtered.filter(event =>
        event.area === params.area || event.prefecture === params.area
      );
    }

    // 開催日検索
    if (params.date) {
      const targetDate = new Date(params.date);
      filtered = filtered.filter(event =>
        event.dates.some(d => {
          const eventDate = new Date(d.date);
          return eventDate.toDateString() === targetDate.toDateString();
        })
      );
    }

    // 曜日検索
    if (params.weekday) {
      const today = new Date();
      let targetDates = [];

      if (params.weekday === 'this-weekend') {
        // 今週末（土日）
        const dayOfWeek = today.getDay();
        const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + daysUntilSaturday);
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        targetDates = [saturday, sunday];
      } else if (params.weekday === 'next-holiday') {
        // 次の祝日（簡易版：次の日曜日）
        const dayOfWeek = today.getDay();
        const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
        const nextSunday = new Date(today);
        nextSunday.setDate(today.getDate() + daysUntilSunday);
        targetDates = [nextSunday];
      }

      filtered = filtered.filter(event =>
        event.dates.some(d => {
          const eventDate = new Date(d.date);
          return targetDates.some(target =>
            eventDate.toDateString() === target.toDateString()
          );
        })
      );
    }

    return filtered;
  },

  getUpcomingEvents(events, days = 7) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + days);

    return events.filter(event =>
      event.dates.some(d => {
        const eventDate = new Date(d.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today && eventDate <= futureDate;
      })
    ).sort((a, b) => {
      const aDate = new Date(a.dates[0].date);
      const bDate = new Date(b.dates[0].date);
      return aDate - bDate;
    });
  },

  getNewEvents(events, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return events.filter(event => {
      const published = new Date(event.publishedAt);
      return published >= cutoff;
    }).sort((a, b) => {
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });
  },

  getRecommendedEvents(events) {
    return events.filter(event => event.isRecommended);
  }
};

// マップ機能（ダミー実装）
const MapManager = {
  mapInstance: null,
  markers: [],

  init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // ダミーマップ表示
    const placeholder = document.createElement('div');
    placeholder.className = 'map-placeholder';
    placeholder.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 10px;">🗺️</div>
        <div>マップ表示エリア</div>
        <div style="font-size: 0.8rem; margin-top: 8px; color: #999;">
          (Google Maps / Mapbox を後から統合可能)
        </div>
      </div>
    `;
    container.appendChild(placeholder);

    // 実際の実装時は以下のように置き換え可能:
    // this.mapInstance = new google.maps.Map(container, { ... });
    // または
    // this.mapInstance = mapboxgl.map({ container: containerId, ... });
  },

  addMarker(event, onClick) {
    if (!event.location || !event.location.lat) return;

    // ダミーマーカー（実際の実装時は以下に置き換え）
    // const marker = new google.maps.Marker({ position: { lat: event.location.lat, lng: event.location.lng }, map: this.mapInstance });
    // marker.addListener('click', () => onClick(event.id));

    this.markers.push({ event, onClick });
  },

  clearMarkers() {
    this.markers = [];
  },

  highlightEvent(eventId) {
    // カードのハイライト処理（使用しない）
  }
};

// イベントカードのレンダリング
const CardRenderer = {
  render(event) {
    const nearestDate = event.dates[0];
    const dateObj = new Date(nearestDate.date);
    const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;

    const badges = [];
    if (event.isRecommended) badges.push('<span class="badge recommended">おすすめ</span>');
    if (event.isNew) badges.push('<span class="badge new">新着</span>');
    if (event.externalLink) badges.push('<span class="badge external-link">外部申込</span>');

    return `
      <a href="experience.html?id=${event.id}" class="card-link" data-event-id="${event.id}">
        <div class="card" data-event-id="${event.id}">
          <img src="${event.image}" alt="${event.title}" loading="lazy">
          <div class="card-body">
            <div class="card-badges">${badges.join('')}</div>
            <div class="card-title">${event.title}</div>
            <div class="card-meta">
              <span>${event.category}</span>
              <span>•</span>
              <span>${dateStr}</span>
              <span>•</span>
              <span>${event.area}</span>
            </div>
            <div class="card-meta">
              <span>${event.duration}</span>
              <span>•</span>
              <span>¥${event.price.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </a>
    `;
  },

  renderList(events, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>該当するイベントが見つかりませんでした</h3>
          <p>検索条件を変更してお試しください</p>
        </div>
      `;
      return;
    }

    container.innerHTML = events.map(event => this.render(event)).join('');
  }
};

// ボトムシート（モバイル用）
const BottomSheet = {
  init() {
    const trigger = document.getElementById('filter-trigger');
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('bottom-sheet-overlay');
    const closeBtn = document.getElementById('bottom-sheet-close');

    if (!trigger || !sheet) return;

    trigger.addEventListener('click', () => this.open());
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (overlay) overlay.addEventListener('click', () => this.close());
  },

  open() {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('bottom-sheet-overlay');
    if (sheet) sheet.classList.add('open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('bottom-sheet-overlay');
    if (sheet) sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  BottomSheet.init();
});

