// データ取得方針
// - メイン導線: GitHub 上に毎日生成される静的 JSON を /data 配下から読む
// - フォールバック: organizerId が空の場合、GitHub raw から読み込む
const DATA_BASE = "/data";

// GitHub raw URL（organizerId が空の場合のフォールバック用）
// 必要に応じて環境に合わせて設定してください
// 例: "https://raw.githubusercontent.com/owner/repo/main"
const GITHUB_RAW_BASE = window.GITHUB_RAW_BASE || "";

// キャッシュ無効化用バージョン（シート構造やレスポンス形式を変えたら更新）
const EVENT_CACHE_VERSION = "v3_2025-12-21"; // v3: GitHub raw フォールバック対応

// キャッシュキー（バージョンと連動）
const STORAGE_KEY_BASE = `sotonavi_eventData_${EVENT_CACHE_VERSION}`;
const INDEX_STORAGE_KEY_BASE = `sotonavi_eventIndex_${EVENT_CACHE_VERSION}`;

// organizerId正規化ヘルパー（唯一の入口、空文字も殺す）
const normalizeId = (v) => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
};

// organizerId補完が必要かどうかの判定（organizerId統一対応）
const needsOrganizerIdLookup = (e) => {
  const orgId = normalizeId(e.organizerId);
  return !orgId;
};

// events 配列に organizerId が入ってるか判定（キャッシュ健全性チェック用）
function hasOrganizerIdInEvents_(arr) {
  return Array.isArray(arr) && arr.some(e => e && typeof e === "object" && String(e.organizerId || "").trim());
}

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
          const cachedEvents = parsed.data?.events;

          // ★根本治療：organizerId が無いキャッシュは採用しない
          if (!hasOrganizerIdInEvents_(cachedEvents)) {
            console.warn("[CACHE] cached events missing organizerId. Ignore cache and refetch.");
          } else {
            window.eventData = parsed.data;

            // ★mapで落とさない：そのまま持つ
            window.eventIndex = cachedEvents;

            // ★互換：events_index も揃える（ページ側がどっち見てもOK）
            window.eventData.events_index = cachedEvents;

            window.eventMeta = {
              organizers: window.eventData.organizers || [],
              categories: window.eventData.categories || [],
            };
            return Promise.resolve(window.eventData);
          }
        }
      }
    }
  } catch (e) {
    console.warn("eventData cache read error:", e);
  }

  // 2) キャッシュが無ければ static JSON から組み立て
  _eventDataLoadingPromise = Promise.all([loadEventIndex(), loadEventMeta()])
    .then(([index, meta]) => {
      // ★最重要：この index を唯一の真実にする
      window.eventIndex = index;

      window.eventData = {
        events: index,
        events_index: index,                 // ← organizer-detail が events_index 見てもOK
        organizers: meta.organizers || [],
        categories: meta.categories || []
      };

      // 勝利判定用ログ
      console.log("[FIXED] events organizerId sample:", 
        (index || []).slice(0, 5).map(e => e.organizerId)
      );
      console.log("[FIXED] events count:", (index || []).length);

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
          // ★organizerId が無い index キャッシュは捨てる
          if (!Array.isArray(parsed.data) || !parsed.data.some(e => String(e?.organizerId || "").trim())) {
            console.warn("[CACHE] cached eventIndex missing organizerId. Ignore cache and refetch.");
          } else {
            window.eventIndex = parsed.data;
            return Promise.resolve(window.eventIndex);
          }
        }
      }
    }
  } catch (e) {
    console.warn("eventIndex cache read error:", e);
  }

  // まず /data から読み込む
  const url = `${DATA_BASE}/events_index.json`;
  _eventIndexLoadingPromise = fetch(url, { cache: "no-store" })
    .then(async (res) => {
      console.log("[TRACE] index fetch", res.status, res.url, res.headers.get("content-type"));
      const txt = await res.text();
      console.log("[TRACE] index head", txt.slice(0, 120));
      const json = JSON.parse(txt);
      console.log("[TRACE] index keys", Object.keys(json));
      console.log("[TRACE] index length", (json.events_index || []).length);
      
      if (!res.ok) {
        throw new Error(`Failed to load event index: ${res.status}`);
      }
      return json;
    })
    .then((json) => {
      // ルートが { events_index: [...] } でも単純配列でも対応
      const raw = Array.isArray(json.events_index) ? json.events_index
        : Array.isArray(json) ? json
        : [];

      // ★根本治療：organizerId が空文字列の場合、GitHub raw にフォールバック
      const hasValidOrganizerId = raw.some(e => String(e?.organizerId || "").trim().length > 0);
      
      if (!hasValidOrganizerId && GITHUB_RAW_BASE) {
        console.warn("[FALLBACK] organizerId is empty in /data/events_index.json, falling back to GitHub raw");
        const fallbackUrl = `${GITHUB_RAW_BASE}/data/events_index.json`;
        return fetch(fallbackUrl, { cache: "no-store" })
          .then(async (res) => {
            if (!res.ok) {
              throw new Error(`Failed to load event index from GitHub: ${res.status}`);
            }
            console.log("[FALLBACK] GitHub raw fetch", res.status, res.url);
            return res.json();
          })
          .then((fallbackJson) => {
            const fallbackRaw = Array.isArray(fallbackJson.events_index) ? fallbackJson.events_index
              : Array.isArray(fallbackJson) ? fallbackJson
              : [];
            console.log("[FALLBACK] GitHub raw index length", fallbackRaw.length);
            return fallbackRaw;
          });
      }
      
      return raw;
    })
    .then((raw) => {
      // ★最重要：index を「唯一の真実」にするため、ここで正規化
      const index = raw.map(e => ({
        ...e,
        organizerId: normalizeId(e.organizerId)
      }));

      console.log("[INDEX normalized organizerId sample]",
        index.slice(0, 5).map(e => e.organizerId)
      );

      // ★organizerId が空の index は採用しない（フォールバック後でも空ならエラー）
      if (!index.some(e => e.organizerId)) {
        console.error("[ERROR] organizerId is still empty after fallback. Data may be corrupted.");
      }

      window.eventIndex = index;

      // ★注意: window.eventData.events は loadEventData() が設定する
      // ここでは触らない（上書き競合を防ぐ）

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
    .catch((err) => {
      console.error("[ERROR] Failed to load event index:", err);
      // エラー時は空配列を返す
      window.eventIndex = [];
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


