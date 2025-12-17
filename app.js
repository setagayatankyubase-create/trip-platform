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

    // 曜日検索（今週 / 来週）
    if (params.weekday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 月曜日始まりの「今週」「来週」を定義
      const dayOfWeek = today.getDay(); // 0=日,1=月,...6=土
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      let startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - daysFromMonday);

      if (params.weekday === 'next-week') {
        // 来週は今週の1週間後
        startOfWeek.setDate(startOfWeek.getDate() + 7);
      }

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      filtered = filtered.filter(event =>
        event.dates.some(d => {
          const eventDate = new Date(d.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= startOfWeek && eventDate <= endOfWeek;
        })
      );
    }

    return filtered;
  },

  // 直近開催イベント
  // デモ用に「今日からの◯日」ではなく、データ内の開催日が早い順に並べて返す
  getUpcomingEvents(events, limit = 20) {
    return events
      .filter(event => event.dates && event.dates.length > 0)
      .sort((a, b) => {
        const aDate = new Date(a.dates[0].date);
        const bDate = new Date(b.dates[0].date);
        return aDate - bDate;
      })
      .slice(0, limit);
  },

  // 新着イベント
  // デモ用に期間フィルタを外し、公開日の新しい順で並べる
  getNewEvents(events) {
    return events
      .filter(event => event.publishedAt)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
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

// お気に入り管理（localStorage使用）
const FavoriteManager = {
  getFavorites() {
    try {
      const favorites = localStorage.getItem('sotobina_favorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch (e) {
      return [];
    }
  },

  isFavorite(eventId) {
    const favorites = this.getFavorites();
    return favorites.includes(eventId);
  },

  toggleFavorite(eventId) {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(eventId);
    
    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(eventId);
    }
    
    try {
      localStorage.setItem('sotobina_favorites', JSON.stringify(favorites));
      return !this.isFavorite(eventId);
    } catch (e) {
      console.error('Failed to save favorite:', e);
      return false;
    }
  }
};

// イベントカードのレンダリング
const CardRenderer = {
  getRatingHtml(event) {
    // イベントに評価がある場合はそれを使い、なければ催行会社の評価を使う
    let rating = event.rating;
    let reviewCount = event.reviewCount;
    
    if (!rating || !reviewCount) {
      const organizer = eventData.organizers.find(o => o.id === event.organizerId);
      if (organizer) {
        rating = organizer.rating;
        reviewCount = organizer.reviewCount;
      } else {
        // デフォルト値
        rating = 4.5;
        reviewCount = 10;
      }
    }
    
    return `
      <div class="card-rating">
        <span class="rating-star">⭐</span>
        <span class="rating-value">${rating.toFixed(2)}</span>
        <span class="rating-count">(${reviewCount}件)</span>
      </div>
    `;
  },

  render(event) {
    // バッジ判定
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingLimit = new Date(today);
    upcomingLimit.setDate(today.getDate() + 7);

    const isUpcoming = event.dates.some(d => {
      const eventDate = new Date(d.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today && eventDate <= upcomingLimit;
    });

    let badgesHtml = '';
    if (event.isRecommended) {
      badgesHtml += '<span class="badge recommended">おすすめ</span>';
    }
    if (event.isNew) {
      badgesHtml += '<span class="badge new">新着</span>';
    }
    if (isUpcoming) {
      badgesHtml += '<span class="badge upcoming">直近開催</span>';
    }

    const isFavorite = FavoriteManager.isFavorite(event.id);
    const favoriteClass = isFavorite ? 'card-favorite active' : 'card-favorite';
    const favoriteTitle = isFavorite ? 'お気に入りから削除' : 'お気に入りに追加';
    const favoriteFill = isFavorite ? 'currentColor' : 'none';

    return `
      <a href="experience.html?id=${event.id}" class="card-link" data-event-id="${event.id}">
        <div class="card" data-event-id="${event.id}">
          <div class="card-image-wrapper">
            <img src="${event.image}" alt="${event.title}" loading="lazy">
            <button class="${favoriteClass}" onclick="toggleFavorite('${event.id}', event)" title="${favoriteTitle}">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="${favoriteFill}" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>
          </div>
          <div class="card-body">
            <div class="card-badges-rating">
              ${badgesHtml ? `<div class="card-badges">${badgesHtml}</div>` : ''}
              ${this.getRatingHtml(event)}
            </div>
            <div class="card-title">${event.title}</div>
            <div class="card-location">${event.area}, ${event.prefecture}</div>
            <div class="card-price">¥ ${event.price.toLocaleString()}</div>
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
  },

  renderCarousel(events, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="width: 100%; padding: 40px;">
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

// お気に入りトグル関数（グローバルスコープ）
function toggleFavorite(eventId, e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  const isNowFavorite = FavoriteManager.toggleFavorite(eventId);
  const button = e?.target.closest('.card-favorite');
  
  if (button) {
    if (isNowFavorite) {
      button.classList.add('active');
      button.title = 'お気に入りから削除';
      const svg = button.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', 'currentColor');
      }
    } else {
      button.classList.remove('active');
      button.title = 'お気に入りに追加';
      const svg = button.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', 'none');
      }
    }
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  BottomSheet.init();
});

