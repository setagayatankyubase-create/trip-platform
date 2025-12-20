// データ取得方針
// - メイン導線: GitHub 上に毎日生成される静的 JSON を /data 配下から読む
const DATA_BASE = "/data";

// キャッシュ無効化用バージョン（シート構造やレスポンス形式を変えたら更新）
const EVENT_CACHE_VERSION = "v2_2025-12-20"; // v2: organizerId統一対応

// キャッシュキー（バージョンと連動）
const STORAGE_KEY_BASE = `sotonavi_eventData_${EVENT_CACHE_VERSION}`;
const INDEX_STORAGE_KEY_BASE = `sotonavi_eventIndex_${EVENT_CACHE_VERSION}`;

// organizerId正規化ヘルパー
const normalizeId = (v) => {
  const s = (v ?? '').toString().trim();
  return (s && s !== 'undefined') ? s : undefined;
};

// organizerId補完が必要かどうかの判定（organizerId統一対応）
const needsOrganizerIdLookup = (e) => {
  const orgId = normalizeId(e.organizerId);
  return !orgId;
};

// グローバルに公開しておく（他のスクリプトから必ず参照できるようにする）
// eventData: 従来どおりのフルデータ（events / organizers / categories）
// eventIndex: 一覧表示用の軽量データ（events_index）
window.eventData = null;
window.eventIndex = null;      // 一覧用インデックス
window.eventMeta = null;       // organizers / categories だけ
let _eventDataLoadingPromise = null;
let _eventIndexLoadingPromise = null;
let _eventMetaLoadingPromise = null;

window.loadEventData = function loadEventData() {
  // すでに構築済みなら即返す（早期リターン）
  if (window.eventData && window.eventIndex) {
    return Promise.resolve(window.eventData);
  }
  if (_eventDataLoadingPromise) return _eventDataLoadingPromise;

  const STORAGE_KEY = STORAGE_KEY_BASE;
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1日

  // 1) localStorage キャッシュを試す（TTL付き）
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && parsed.data && parsed.version === EVENT_CACHE_VERSION) {
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TTL_MS) {
          window.eventData = parsed.data;
          // eventIndex もキャッシュから復元
          if (parsed.data.events && Array.isArray(parsed.data.events)) {
            window.eventIndex = parsed.data.events.map(ev => ({
              id: ev.id,
              title: ev.title,
              image: ev.image,
              city: ev.area || ev.city,
              prefecture: ev.prefecture,
              price: ev.price,
              isRecommended: ev.isRecommended,
              isNew: ev.isNew,
              rating: ev.rating,
              reviewCount: ev.reviewCount,
              categoryId: ev.categoryId,
              next_date: ev.next_date || (ev.dates && ev.dates.length > 0 ? ev.dates[0].date : null),
              publishedAt: ev.publishedAt,
            }));
          }
          window.eventMeta = {
            organizers: window.eventData.organizers || [],
            categories: window.eventData.categories || [],
          };
          return Promise.resolve(window.eventData);
        }
      }
    }
  } catch (e) {
    console.warn("eventData cache read error:", e);
  }

  // 2) キャッシュが無ければ static JSON から組み立て
  _eventDataLoadingPromise = Promise.all([loadEventIndex(), loadEventMeta()])
    .then(async ([index, meta]) => {
      // events_index から最小限の events 配列を構築（index.html 互換用）
      // events_index の next_date を優先して使用（パフォーマンス向上）
      const events = [];
      
      if (Array.isArray(index) && index.length > 0) {
        // next_date が無いイベントを特定
        const itemsWithoutDate = [];
        const itemsWithDate = [];
        
        for (const item of index) {
          if (item.next_date) {
            itemsWithDate.push(item);
          } else {
            itemsWithoutDate.push(item);
          }
        }
        
        // next_date があるものは即座に構築
        for (const item of itemsWithDate) {
          const dateValue = item.next_date;
          let dateStr = null;
          
          if (typeof dateValue === 'string') {
            dateStr = dateValue;
          } else if (dateValue instanceof Date) {
            dateStr = dateValue.toISOString();
          }
          
          const dates = dateStr ? [{ date: dateStr }] : [];
          
          // organizerIdを正規化（organizerId統一対応）
          const itemOrganizerId = normalizeId(item.organizerId);
          
          events.push({
            id: item.id,
            title: item.title,
            image: item.image || item.thumb,
            area: item.area || item.city,
            prefecture: item.prefecture,
            price: item.price,
            isRecommended: item.isRecommended || false,
            isNew: item.isNew || false,
            rating: item.rating,
            reviewCount: item.reviewCount,
            categoryId: item.categoryId,
            organizerId: itemOrganizerId, // 正規化済み（空の場合はundefined）
            dates: dates,
            next_date: item.next_date,
            publishedAt: item.publishedAt || item.published_at || new Date().toISOString(),
          });
        }
        
        // next_date が無いものは詳細JSONから取得（並列化、同時実行数制限付き）
        if (itemsWithoutDate.length > 0) {
          const CONCURRENT_LIMIT = 5; // 同時実行数の上限
          const detailMap = new Map();
          
          // チャンクに分割して並列処理
          for (let i = 0; i < itemsWithoutDate.length; i += CONCURRENT_LIMIT) {
            const chunk = itemsWithoutDate.slice(i, i + CONCURRENT_LIMIT);
            const detailPromises = chunk.map(item => 
              loadEventDetail(item.id)
                .then(detail => ({ id: item.id, detail }))
                .catch(() => ({ id: item.id, detail: null }))
            );
            
            const results = await Promise.all(detailPromises);
            results.forEach(({ id, detail }) => {
              if (detail) {
                detailMap.set(id, detail);
              }
            });
          }
          
          // 詳細データから dates を取得して構築
          for (const item of itemsWithoutDate) {
            const detail = detailMap.get(item.id);
            const dates = (detail && detail.dates && Array.isArray(detail.dates) && detail.dates.length > 0)
              ? detail.dates
              : [];
            
            // organizerIdは詳細JSONから優先して取得（organizerId統一対応）
            const organizerId = normalizeId(
              detail?.organizerId ?? item.organizerId
            );
            
            events.push({
              id: item.id,
              title: item.title,
              image: item.image || item.thumb,
              area: item.area || item.city,
              prefecture: item.prefecture,
              price: item.price,
              isRecommended: item.isRecommended || false,
              isNew: item.isNew || false,
              rating: item.rating,
              reviewCount: item.reviewCount,
              categoryId: item.categoryId,
              organizerId: organizerId, // organizerIdを追加（空の場合はundefined）
              dates: dates,
              next_date: item.next_date || (dates.length > 0 ? dates[0].date : null),
              publishedAt: item.publishedAt || item.published_at || new Date().toISOString(),
            });
          }
          
          // next_date が無いイベント数をログ出力（GAS/シート整備の参考用）
          if (itemsWithoutDate.length > 0) {
            console.log(`[loadEventData] ${itemsWithoutDate.length} events without next_date (GAS側で補完推奨)`);
          }
        }
        
        // organizerIdが欠けているイベントを補完（過去データ救済用、通常は走らない）
        // この処理はすべてのイベント構築後に実行する
        const eventsNeedingOrganizerId = events.filter(needsOrganizerIdLookup);
        if (eventsNeedingOrganizerId.length > 0) {
          console.log(`[loadEventData] ⚠ ${eventsNeedingOrganizerId.length} events need organizerId lookup (out of ${events.length} total) - 補完処理を実行`);
          console.log(`[loadEventData] Sample events needing organizerId:`, eventsNeedingOrganizerId.slice(0, 3).map(e => ({ id: e.id, organizerId: e.organizerId })));
          const CONCURRENT_LIMIT = 5;
          
          for (let i = 0; i < eventsNeedingOrganizerId.length; i += CONCURRENT_LIMIT) {
            const chunk = eventsNeedingOrganizerId.slice(i, i + CONCURRENT_LIMIT);
            const lookupPromises = chunk.map(event => 
              loadEventDetail(event.id)
                .then(detail => {
                  const organizerId = normalizeId(detail?.organizerId);
                  if (organizerId) {
                    event.organizerId = organizerId;
                    console.log(`[loadEventData] ✓ Added organizerId ${organizerId} to event ${event.id}`);
                  } else {
                    console.warn(`[loadEventData] ⚠ No organizerId found for event ${event.id}`);
                  }
                  return event;
                })
                .catch(err => {
                  console.error(`[loadEventData] ✗ Failed to load detail for event ${event.id}:`, err);
                  return event;
                })
            );
            
            await Promise.all(lookupPromises);
          }
        }
        
        // デバッグログ（最小限）
        const eventsWithOrganizerId = events.filter(e => !needsOrganizerIdLookup(e));
        console.log(`[loadEventData] events total: ${events.length}, with organizerId: ${eventsWithOrganizerId.length}, sample:`, 
          events.slice(0, 3).map(e => ({ id: e.id, organizerId: normalizeId(e.organizerId) || '(empty)' })));
      }

      window.eventData = {
        events,
        organizers: meta.organizers || [],
        categories: meta.categories || [],
      };
      window.eventIndex = index;

      try {
        const payload = {
          timestamp: Date.now(),
          version: EVENT_CACHE_VERSION,
          data: window.eventData,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn("eventData cache write error:", e);
      }

      return window.eventData;
    })
    .catch(err => {
      console.error("loadEventData failed:", err);
      // エラー時も空データで続行
      window.eventData = {
        events: [],
        organizers: [],
        categories: [],
      };
      return window.eventData;
    })
    .finally(() => {
      _eventDataLoadingPromise = null;
    });

  return _eventDataLoadingPromise;
};

// 一覧用インデックスだけを読み込む（軽量）
window.loadEventIndex = function loadEventIndex() {
  if (window.eventIndex && Array.isArray(window.eventIndex)) {
    return Promise.resolve(window.eventIndex);
  }
  if (_eventIndexLoadingPromise) return _eventIndexLoadingPromise;

  const INDEX_STORAGE_KEY = INDEX_STORAGE_KEY_BASE;
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1日（GitHub 更新が1日1回の想定）

  try {
    const cached = localStorage.getItem(INDEX_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && parsed.data && parsed.version === EVENT_CACHE_VERSION) {
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TTL_MS) {
          window.eventIndex = parsed.data;
          return Promise.resolve(window.eventIndex);
        }
      }
    }
  } catch (e) {
    console.warn("eventIndex cache read error:", e);
  }

  const url = `${DATA_BASE}/events_index.json`;
  _eventIndexLoadingPromise = fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load event index: ${res.status}`);
      }
      return res.json();
    })
    .then((json) => {
      // ルートが { events_index: [...] } でも単純配列でも対応
      const index = Array.isArray(json.events_index) ? json.events_index
        : Array.isArray(json) ? json
        : [];

      window.eventIndex = index;

      try {
        const payload = {
          timestamp: Date.now(),
          version: EVENT_CACHE_VERSION,
          data: window.eventIndex,
        };
        localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn("eventIndex cache write error:", e);
      }

      return window.eventIndex;
    })
    .finally(() => {
      _eventIndexLoadingPromise = null;
    });

  return _eventIndexLoadingPromise;
};

// organizers / categories だけを読み込む
window.loadEventMeta = function loadEventMeta() {
  if (window.eventMeta) {
    return Promise.resolve(window.eventMeta);
  }
  if (_eventMetaLoadingPromise) return _eventMetaLoadingPromise;

  const url = `${DATA_BASE}/meta.json`;
  _eventMetaLoadingPromise = fetch(url)
    .then(async (res) => {
      // meta.json が存在しない／エラーでもサイトは止めない
      if (!res.ok) {
        return { organizers: [], categories: [], areas: [] };
      }
      return res.json();
    })
    .then((json) => {
      const meta = {
        organizers: Array.isArray(json?.organizers) ? json.organizers : [],
        categories: Array.isArray(json?.categories) ? json.categories : [],
        areas: Array.isArray(json?.areas) ? json.areas : [],
      };

      window.eventMeta = meta;

      // 従来の eventData.categories / organizers を期待しているコード向けに最低限マージ
      window.eventData = window.eventData || {};
      window.eventData.organizers = meta.organizers;
      window.eventData.categories = meta.categories;

      return meta;
    })
    .finally(() => {
      _eventMetaLoadingPromise = null;
    });

  return _eventMetaLoadingPromise;
};

// 単一イベントの詳細を取得する（events 配列を全部作らない）
window.loadEventDetail = function loadEventDetail(eventId) {
  if (!eventId) {
    return Promise.reject(new Error("eventId is required"));
  }

  const url = `${DATA_BASE}/events/${encodeURIComponent(eventId)}.json`;
  console.log('[data.js] Loading event detail from:', url);

  return fetch(url)
    .then((res) => {
      if (!res.ok) {
        console.error('[data.js] Failed to load event detail:', res.status, res.statusText);
        throw new Error(`Failed to load event detail: ${res.status}`);
      }
      return res.json();
    })
    .then((json) => {
      console.log('[data.js] Event detail JSON received:', json);
      // ファイルが { ...event } か { event: {...} } の両方に対応
      const event = json && json.event ? json.event : json;
      console.log('[data.js] Event object extracted:', event);
      return event;
    })
    .catch((error) => {
      console.error('[data.js] Error loading event detail:', error);
      throw error;
    });
};

// ユーザーが使いやすいように、サンプルと同名の関数もエクスポートしておく
window.fetchEventsIndex = function fetchEventsIndex() {
  return loadEventIndex();
};

window.fetchEvent = function fetchEvent(id) {
  return loadEventDetail(id);
};


