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
      // 詳細は必要になったら loadEventDetail() で個別に取得
      const events = Array.isArray(index) ? index.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image || item.thumb,
        area: item.area || item.city,
        prefecture: item.prefecture,
        price: item.price,
        isRecommended: item.isRecommended,
        isNew: item.isNew,
        rating: item.rating,
        reviewCount: item.reviewCount,
        categoryId: item.categoryId,
        // dates は next_date から生成
        dates: item.next_date ? [{ date: item.next_date }] : [],
        publishedAt: item.publishedAt || new Date().toISOString(),
      })) : [];

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


