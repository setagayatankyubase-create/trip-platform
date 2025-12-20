// データ取得方針
// - メイン導線: GitHub 上に毎日生成される静的 JSON を /data 配下から読む
const DATA_BASE = "/data";

// キャッシュ無効化用バージョン（シート構造やレスポンス形式を変えたら更新）
const EVENT_CACHE_VERSION = "v1_2025-12-18";

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
  // すでに構築済みなら即返す
  if (window.eventData && window.eventIndex) {
    return Promise.resolve(window.eventData);
  }
  if (_eventDataLoadingPromise) return _eventDataLoadingPromise;

  const STORAGE_KEY = "sotonavi_eventData_v1";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1日

  // 1) localStorage キャッシュを試す
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && parsed.data && parsed.version === EVENT_CACHE_VERSION) {
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TTL_MS) {
          window.eventData = parsed.data;
          window.eventIndex = window.eventData.events || [];
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
      
      console.log('[loadEventData] index length:', Array.isArray(index) ? index.length : 0);
      if (Array.isArray(index) && index.length > 0) {
        console.log('[loadEventData] first index item:', index[0]);
        console.log('[loadEventData] first index item next_date:', index[0].next_date);
        
        for (const item of index) {
          // dates は events_index の next_date から構築（優先）
          // next_date が無い場合のみ詳細JSONから取得
          let dates = [];
          if (item.next_date) {
            // next_date を dates 配列に変換
            const dateValue = item.next_date;
            let dateStr = null;
            
            if (typeof dateValue === 'string') {
              // 文字列の場合、そのまま使用（"2026-02-01" 形式を想定）
              dateStr = dateValue;
            } else if (dateValue instanceof Date) {
              // Date オブジェクトの場合、ISO形式に変換
              dateStr = dateValue.toISOString();
            }
            
            if (dateStr) {
              // dates 配列形式: [{ date: "2026-02-01" }]
              dates = [{ date: dateStr }];
            }
          }
          
          // next_date が無い場合のみ詳細JSONを取得（必要な場合のみ）
          if (dates.length === 0) {
            try {
              const detail = await loadEventDetail(item.id);
              if (detail && detail.dates && Array.isArray(detail.dates) && detail.dates.length > 0) {
                dates = detail.dates;
              }
            } catch (e) {
              // 詳細JSON取得失敗は無視
            }
          }
          
          const eventObj = {
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
            dates: dates,
            publishedAt: item.publishedAt || item.published_at || new Date().toISOString(),
          };
          
          // next_date も保持（フォールバック用）
          if (item.next_date) {
            eventObj.next_date = item.next_date;
          }
          
          // デバッグ：最初の3件だけログ出力
          if (events.length < 3) {
            console.log(`[loadEventData] Event ${item.id}:`, {
              hasNextDate: !!item.next_date,
              nextDate: item.next_date,
              datesLength: dates.length,
              dates: dates
            });
          }
          
          events.push(eventObj);
        }
        
        console.log(`[loadEventData] Built ${events.length} events, with dates:`, 
          events.filter(e => e.dates && e.dates.length > 0).length
        );
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

  const INDEX_STORAGE_KEY = "sotonavi_eventIndex_v1";
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

  return fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load event detail: ${res.status}`);
      }
      return res.json();
    })
    .then((json) => {
      // ファイルが { ...event } か { event: {...} } の両方に対応
      return json && json.event ? json.event : json;
    });
};

// ユーザーが使いやすいように、サンプルと同名の関数もエクスポートしておく
window.fetchEventsIndex = function fetchEventsIndex() {
  return loadEventIndex();
};

window.fetchEvent = function fetchEvent(id) {
  return loadEventDetail(id);
};


