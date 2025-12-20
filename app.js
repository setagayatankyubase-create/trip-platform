// アプリケーションロジック

// GAS URL（クリック計測用）
const CLICK_TRACKING_GAS_URL = 'https://script.google.com/macros/s/AKfycbyHnX2Z4jnTHfYSCFFaOVmVdIf6yY2edAMTCEyAOUn0Mak2Mam67CQ0g-V26zAJSVJphw/exec';
// クリック計測用の秘密鍵（GAS側のCLICK_SECRETと一致させる必要がある）
const CLICK_SECRET = 'sotonavi_click_9F2kA8R7mQX3LZpD5YwE11';

// クリック計測（スプレッドシートに書き込み）
const ClickTracker = {
  // 集計済みデータをリセット（開発者コンソールから ClickTracker.reset() で実行可能）
  reset() {
    try {
      const keys = Object.keys(localStorage);
      let resetCount = 0;
      keys.forEach(key => {
        if (key.startsWith('sotonavi_clicked_')) {
          const value = localStorage.getItem(key);
          console.log(`[ClickTracker] Removing: ${key} = ${value}`);
          localStorage.removeItem(key);
          resetCount++;
        }
      });
      console.log(`[ClickTracker] Reset ${resetCount} tracked events`);
      return resetCount;
    } catch (e) {
      console.error('[ClickTracker] Reset failed:', e);
      return 0;
    }
  },

  // 現在の集計済みデータを確認（開発者コンソールから ClickTracker.status() で実行可能）
  status() {
    try {
      const keys = Object.keys(localStorage);
      const tracked = [];
      keys.forEach(key => {
        if (key.startsWith('sotonavi_clicked_')) {
          const value = localStorage.getItem(key);
          try {
            const parsed = JSON.parse(value);
            const age = Date.now() - parsed.timestamp;
            tracked.push({
              key: key,
              eventId: parsed.eventId,
              timestamp: new Date(parsed.timestamp).toISOString(),
              ageSeconds: Math.round(age / 1000),
              ageMinutes: Math.round(age / 60000 * 10) / 10
            });
          } catch (e) {
            tracked.push({
              key: key,
              value: value,
              error: 'Invalid format'
            });
          }
        }
      });
      console.table(tracked);
      return tracked;
    } catch (e) {
      console.error('[ClickTracker] Status failed:', e);
      return [];
    }
  },

  track(eventId, organizerId) {
    console.log('[ClickTracker] [カードリンク] track called:', eventId, organizerId);
    
    if (!eventId) {
      console.warn('[ClickTracker] eventId is missing');
      return;
    }
    
    // 重複送信防止：最初にsessionStorageをチェック＆セット（最優先・即座に実行）
    const sentFlagKey = `sotonavi_sent_${eventId}`;
    const currentTimestamp = Date.now();
    
    // フラグのチェックとセットをアトミックに行う（存在チェック → セット）
    try {
      // フラグが既に存在する場合は、即座に終了（重複送信を完全に防ぐ）
      if (sessionStorage.getItem(sentFlagKey)) {
        console.log('[ClickTracker] [カードリンク] 既に送信済み、スキップします（重複防止）');
        return;
      }
      // フラグが存在しない場合のみ、即座にフラグをセット（この時点で他のリクエストをブロック）
      sessionStorage.setItem(sentFlagKey, currentTimestamp.toString());
    } catch (storageError) {
      console.warn('[ClickTracker] sessionStorage error:', storageError);
      // sessionStorageが使えない場合は続行（重複の可能性があるが、仕方ない）
    }
    
    // 連打防止：10分間に1イベント1回まで（同じ人がクリックするのを制限）
    // 別のイベントIDなら別々に記録される（各イベントごとに独立）
    const storageKey = `sotonavi_clicked_${eventId}`; // イベントIDごとに別のキー
    console.log('[ClickTracker] [カードリンク] Using storageKey:', storageKey);
    const RESET_PERIOD_MS = 10 * 60 * 1000; // 10分
    const now = Date.now();
    
    // まず、前回のタイムスタンプをチェック
    let shouldSkip = false;
    try {
      const cached = localStorage.getItem(storageKey);
      console.log('[ClickTracker] [カードリンク] cached value:', cached);
      if (cached) {
        let timestamp = null;
        
        // 新しい形式 { eventId, timestamp } か古い形式（文字列のタイムスタンプ）に対応
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && parsed.timestamp) {
            // 新しい形式：eventIdも確認（念のため）
            if (parsed.eventId === eventId) {
              timestamp = parsed.timestamp;
            } else {
              // 異なるeventIdのデータが混入している場合は削除
              console.warn('[ClickTracker] Stale data for different eventId, removing:', storageKey);
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
          console.log(`[ClickTracker] Event ${eventId}: 最後にクリックした時刻 = ${lastClickTime}, 経過時間 = ${ageMinutes}分 (${ageSeconds}秒)`);
          
          if (age < RESET_PERIOD_MS) {
            console.log(`[ClickTracker] このイベントは既に計測済みです（10分以内）: ${eventId} - 最後のクリック: ${lastClickTime} (${ageMinutes}分前)`);
            shouldSkip = true; // 計測をスキップ
          } else {
            // 10分経過しているので古いデータを削除
            console.log(`[ClickTracker] Event ${eventId}: キャッシュ期限切れ（${ageMinutes}分経過）、削除します`);
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (storageError) {
      // localStorageが使えない環境でも計測は続行
      console.warn('[ClickTracker] localStorage error:', storageError);
    }
    
    // 10分以内にクリックされていた場合は、計測をスキップ
    if (shouldSkip) {
      return;
    }
    
    // 今回のクリック時刻を即座に保存（重複実行を防ぐため）
    try {
      const cacheData = {
        eventId: eventId,
        timestamp: now
      };
      localStorage.setItem(storageKey, JSON.stringify(cacheData));
      const savedTime = new Date(now).toLocaleString('ja-JP');
      console.log(`[ClickTracker] ✅ クリック時刻を先に保存しました: ${eventId} - 保存時刻: ${savedTime}`);
    } catch (storageError) {
      console.warn('[ClickTracker] localStorage保存エラー:', storageError);
    }

    // GASにPOSTリクエストを送信（GAS側の実装に合わせる）
    // フラグは既にセット済み（上で即座にセットしている）
    const payload = {
      token: CLICK_SECRET,
      event_id: eventId,
      organizer_id: organizerId || ''
    };

    // navigator.sendBeaconのみを使用（ページ遷移時も確実に送信、重複送信を防ぐ）
    // text/plainを使用することでCORSプリフライトを回避
    try {
      const jsonData = JSON.stringify(payload);
      console.log('[ClickTracker] [カードリンク] Sending payload:', payload);
      const blob = new Blob([jsonData], { type: 'text/plain;charset=utf-8' });
      const queued = navigator.sendBeacon(CLICK_TRACKING_GAS_URL, blob);
      console.log('[ClickTracker] [カードリンク] sendBeacon queued:', queued);
      
      if (!queued) {
        console.warn('[ClickTracker] [カードリンク] sendBeacon failed (but continuing)');
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
      console.error('[ClickTracker] [カードリンク] sendBeacon error:', beaconErr);
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
  }
};

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
      filtered = filtered.filter(event => {
        const texts = [];
        if (event.title) texts.push(event.title);
        if (event.name) texts.push(event.name); // API側で title が name になっている場合に対応
        if (event.description) texts.push(event.description);
        if (event.area) texts.push(event.area);
        if (event.area_name) texts.push(event.area_name);
        if (event.category) texts.push(event.category);
        if (event.category_name) texts.push(event.category_name);
        if (event.category && event.category.name) texts.push(event.category.name);

        return texts.some(text =>
          typeof text === 'string' && text.toLowerCase().includes(query)
        );
      });
    }

    // カテゴリ検索
    if (params.category) {
      const target = params.category;
      filtered = filtered.filter(event => {
        // API / ダミーデータ 両対応のため、複数パターンを許容
        const id =
          event.categoryId ||
          event.category_id ||
          (event.category && event.category.id) ||
          (event.categories && event.categories[0] && event.categories[0].id);

        // 文字列として比較（数値IDでもOKにする）
        return id != null && String(id) === String(target);
      });
    }

    // エリア検索（area_id 前提）
    if (params.area) {
      const target = params.area;
      filtered = filtered.filter(event => {
        const areaId =
          event.areaId ||
          event.area_id ||
          (event.area && event.area.id);
        const areaSlug = event.area_slug || event.areaSlug;
        const areaName = event.area || event.area_name;
        const prefecture = event.prefecture;

        return (
          (areaId != null && String(areaId) === String(target)) || // id一致（推奨）
          (areaSlug && String(areaSlug) === String(target)) ||     // slug指定時
          (areaName && areaName === target) ||                     // 旧実装（エリア名）
          (prefecture && prefecture === target)                    // 旧実装（都道府県）
        );
      });
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
  },

  // 検索条件に近いイベントをスコアリングして取得
  getSimilarEvents(params, limit = 4) {
    // data.js で定義したグローバルな eventData を直接参照する
    if (typeof eventData === 'undefined' || !eventData.events) return [];

    const events = eventData.events;
    const q = (params.q || '').toLowerCase();
    const categoryId = params.category || '';
    const areaParam = params.area || '';
    const dateParam = params.date || '';
    const weekdayParam = params.weekday || '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let targetStart = null;
    let targetEnd = null;

    // 日付指定があればその日を中心に、なければ「今週/来週」の範囲をターゲットにする
    if (dateParam) {
      const d = new Date(dateParam);
      d.setHours(0, 0, 0, 0);
      targetStart = new Date(d);
      targetEnd = new Date(d);
    } else if (weekdayParam === 'this-week' || weekdayParam === 'next-week') {
      const dayOfWeek = today.getDay(); // 0=日,1=月,...6=土
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      targetStart = new Date(today);
      targetStart.setDate(today.getDate() - daysFromMonday);
      if (weekdayParam === 'next-week') {
        targetStart.setDate(targetStart.getDate() + 7);
      }
      targetEnd = new Date(targetStart);
      targetEnd.setDate(targetStart.getDate() + 6);
    }

    const scored = events
      .map(event => {
        let score = 0;

        // カテゴリ一致
        if (categoryId) {
          const id =
            event.categoryId ||
            event.category_id ||
            (event.category && event.category.id) ||
            (event.categories && event.categories[0] && event.categories[0].id);
          if (id != null && String(id) === String(categoryId)) {
            score += 5;
          }
        }

        // エリア一致（area_id / slug / 名称 / 都道府県）
        if (areaParam) {
          const areaId =
            event.areaId ||
            event.area_id ||
            (event.area && event.area.id);
          const areaSlug = event.area_slug || event.areaSlug;
          const areaName = event.area || event.area_name;

          if (areaId != null && String(areaId) === String(areaParam)) score += 5;
          if (areaSlug && String(areaSlug) === String(areaParam)) score += 4;
          if (areaName && areaName === areaParam) score += 3;
          if (event.prefecture && event.prefecture === areaParam) score += 2;
        }

        // キーワード一致（タイトル・説明）
        if (q) {
          const text = `${event.title} ${event.description}`.toLowerCase();
          if (text.includes(q)) score += 4;
        }

        // 日程の近さ（ターゲット日程が指定されている場合）
        if (targetStart && targetEnd && event.dates && event.dates.length > 0) {
          // イベントの最初の開催日
          const firstDate = new Date(event.dates[0].date);
          firstDate.setHours(0, 0, 0, 0);

          // 範囲内であれば高スコア、少し外れていても距離に応じて減点しながら加点
          if (firstDate >= targetStart && firstDate <= targetEnd) {
            score += 5;
          } else {
            const center = targetStart && targetEnd
              ? new Date((targetStart.getTime() + targetEnd.getTime()) / 2)
              : targetStart;
            const diffDays = Math.abs(firstDate - center) / (1000 * 60 * 60 * 24);
            if (diffDays <= 7) {
              score += Math.max(1, 4 - Math.floor(diffDays)); // 0〜7日差なら 1〜4点
            }
          }
        }

        return { event, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    let result = scored.slice(0, limit).map(item => item.event);

    // スコア付き候補がない場合でも、日程が近いイベントを必ず返す
    if (result.length === 0 && (dateParam || weekdayParam) && targetStart) {
      const center = targetStart && targetEnd
        ? new Date((targetStart.getTime() + targetEnd.getTime()) / 2)
        : targetStart;

      result = events
        .filter(e => e.dates && e.dates.length > 0)
        .map(e => {
          const d = new Date(e.dates[0].date);
          d.setHours(0, 0, 0, 0);
          const diffDays = Math.abs(d - center) / (1000 * 60 * 60 * 24);
          return { event: e, diffDays };
        })
        .sort((a, b) => a.diffDays - b.diffDays)
        .slice(0, limit)
        .map(item => item.event);
    }

    // それでも空なら「おすすめイベント」か、なければ全体の先頭から埋める
    if (result.length === 0) {
      const recommended = SearchFilter.getRecommendedEvents
        ? SearchFilter.getRecommendedEvents(events).slice(0, limit)
        : [];

      if (recommended.length) {
        result = recommended;
      } else {
        result = events.slice(0, limit);
      }
    }

    return result;
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
    const wasFavorite = index > -1;

    if (wasFavorite) {
      favorites.splice(index, 1);
    } else {
      favorites.push(eventId);
    }

    try {
      localStorage.setItem('sotobina_favorites', JSON.stringify(favorites));
      // 追加後の状態（true: お気に入りになった / false: 外した）を返す
      return !wasFavorite;
    } catch (e) {
      console.error('Failed to save favorite:', e);
      return false;
    }
  }
};

// イベントカードのレンダリング
const CardRenderer = {
  // 画像URLを一覧表示向けに軽量化（主に Unsplash 想定）
  optimizeImageUrl(url) {
    if (!url || typeof url !== 'string') return url;

    try {
      const u = new URL(url);
      // Unsplash など images.unsplash.com の場合はパラメータで圧縮
      if (u.hostname.includes('images.unsplash.com')) {
        // 既存クエリを維持しつつ、必要なパラメータだけ上書き
        u.searchParams.set('auto', 'format');
        u.searchParams.set('fit', 'crop');
        u.searchParams.set('w', '600');
        u.searchParams.set('q', '70');
        return u.toString();
      }
    } catch {
      // URLパースに失敗した場合はそのまま返す
      return url;
    }

    return url;
  },

  getRatingHtml(event) {
    // イベントに評価がある場合はそれを使い、なければ提供元の評価を使う
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

    // API側の型や欠損にかかわらず安全に扱えるように数値化＆フォールバック
    const numericRating = Number(rating);
    const numericReviewCount = Number(reviewCount);

    const safeRating = Number.isFinite(numericRating) ? numericRating : 4.5;
    const safeReviewCount = Number.isFinite(numericReviewCount) ? numericReviewCount : 0;

    return `
      <div class="card-rating">
        <span class="rating-star">⭐</span>
        <span class="rating-value">${safeRating.toFixed(2)}</span>
        <span class="rating-count">(${safeReviewCount}件)</span>
      </div>
    `;
  },

  render(event) {
    // dates が無いインデックスデータにも対応するための日付配列
    let dates = Array.isArray(event.dates) ? event.dates : [];
    if ((!dates || dates.length === 0) && event.next_date) {
      dates = [{ date: event.next_date }];
    }

    // バッジ判定
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingLimit = new Date(today);
    upcomingLimit.setDate(today.getDate() + 7);

    const isUpcoming = dates.some(d => {
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

    const optimizedImage = this.optimizeImageUrl(event.image);

    // インデックスデータでは city が area 相当として使われる
    const area = event.area || event.city || "";

    return `
      <a href="experience.html?id=${event.id}" class="card-link" data-event-id="${event.id}">
        <div class="card" data-event-id="${event.id}">
          <div class="card-image-wrapper">
            <img src="${optimizedImage}" alt="${event.title}" loading="lazy">
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
            <div class="card-location">${area}, ${event.prefecture || ''}</div>
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
      // 一覧側ではコンテナは空にして、上部メッセージ＋おすすめ導線のみ表示
      if (containerId === 'event-list') {
        container.innerHTML = '';
      } else {
        // その他のリスト（主催者ページなど）は従来通りのメッセージのみ
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3>該当するイベントが見つかりませんでした</h3>
            <p>検索条件を変更してお試しください</p>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = events.map(event => this.render(event)).join('');
    
    // クリックイベントリスナーを追加（イベントデータを参照できるようにクロージャで保持）
    const eventsMap = new Map(events.map(ev => [ev.id, ev]));
    const links = container.querySelectorAll('.card-link');
    console.log('[CardRenderer] Adding click listeners to', links.length, 'cards');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const eventId = link.getAttribute('data-event-id');
        console.log('[CardRenderer] Card clicked:', eventId);
        const event = eventsMap.get(eventId);
        const organizerId = event ? (event.organizerId || event.organizer_id || '') : '';
        ClickTracker.track(eventId, organizerId);
      });
    });
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
    
    // クリックイベントリスナーを追加（イベントデータを参照できるようにクロージャで保持）
    const eventsMap = new Map(events.map(ev => [ev.id, ev]));
    const links = container.querySelectorAll('.card-link');
    console.log('[CardRenderer] Adding click listeners to', links.length, 'cards');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        const eventId = link.getAttribute('data-event-id');
        console.log('[CardRenderer] Card clicked:', eventId);
        const event = eventsMap.get(eventId);
        const organizerId = event ? (event.organizerId || event.organizer_id || '') : '';
        ClickTracker.track(eventId, organizerId);
      });
    });
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

