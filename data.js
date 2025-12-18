// イベント・提供元データを API から読み込む
// GAS 側では type パラメータで役割を分けている:
//   - type=index            ... 一覧用の軽量データ（events_index のみ）
//   - type=event&id=evt-001 ... 1件分の詳細データ
//   - type=meta             ... organizers / categories だけ
//   - type=full             ... 互換用のフルデータ（既存ページ用・重い）
const EVENTS_API_BASE =
  "https://script.google.com/macros/s/AKfycbwR6elgN0XtjKCqjqhcVLDf-RdcMFfcaHZGdWGrAWUzW67jzRMrJXY25oTgJJYEYLi2QQ/exec";
const EVENTS_API_URL = `${EVENTS_API_BASE}?type=full`;

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
  // すでに読み込み済みなら即座に解決
  if (window.eventData && window.eventIndex) {
    return Promise.resolve(window.eventData);
  }
  // 読み込み中なら同じ Promise を使い回す
  if (_eventDataLoadingPromise) return _eventDataLoadingPromise;

  const STORAGE_KEY = "sotonavi_eventData_v1";
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2分（短めにして「更新されない」沼を避ける）

  // 1) localStorage キャッシュを試す
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && parsed.data && parsed.version === EVENT_CACHE_VERSION) {
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TTL_MS) {
          window.eventData = parsed.data;
          return Promise.resolve(window.eventData);
        }
      }
    }
  } catch (e) {
    // localStorage が使えなくても処理は続行
    console.warn("eventData cache read error:", e);
  }

  // 2) キャッシュが無ければ API から取得
  _eventDataLoadingPromise = fetch(EVENTS_API_URL, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load events: ${res.status}`);
      }
      return res.json();
    })
    .then((json) => {
      // フルデータ
      window.eventData = json;
      // 一覧用のインデックス（なければ空配列でフォールバック）
      window.eventIndex = Array.isArray(json.events_index)
        ? json.events_index
        : [];

      // 取得結果を localStorage にキャッシュ
      try {
        const payload = {
          timestamp: Date.now(),
          version: EVENT_CACHE_VERSION,
          data: json,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn("eventData cache write error:", e);
      }

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
  const CACHE_TTL_MS = 2 * 60 * 1000; // 2分

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

  const url = `${EVENTS_API_BASE}?type=index`;
  _eventIndexLoadingPromise = fetch(url, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load event index: ${res.status}`);
      }
      return res.json();
    })
    .then((json) => {
      window.eventIndex = Array.isArray(json.events_index)
        ? json.events_index
        : [];

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

  const url = `${EVENTS_API_BASE}?type=meta`;
  _eventMetaLoadingPromise = fetch(url, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load event meta: ${res.status}`);
      }
      return res.json();
    })
    .then((json) => {
      window.eventMeta = {
        organizers: Array.isArray(json.organizers) ? json.organizers : [],
        categories: Array.isArray(json.categories) ? json.categories : [],
      };

      // 従来の eventData.categories / organizers を期待しているコード向けに最低限マージ
      window.eventData = window.eventData || {};
      window.eventData.organizers = window.eventMeta.organizers;
      window.eventData.categories = window.eventMeta.categories;

      return window.eventMeta;
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

  const url = `${EVENTS_API_BASE}?type=event&id=${encodeURIComponent(
    eventId
  )}`;

  return fetch(url, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load event detail: ${res.status}`);
      }
      return res.json();
    })
    .then((json) => json.event || null);
};


