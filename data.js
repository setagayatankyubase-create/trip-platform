// データ取得方針
// - メイン導線: GitHub Pages の /data 配下
// - フォールバック: /data が壊れてる・古い・HTML返す等なら GitHub raw へ
// 重複読み込み防止：window.DATA_BASEを使用
window.DATA_BASE = window.DATA_BASE || "/data";
const DATA_BASE = window.DATA_BASE;

// 例: "https://raw.githubusercontent.com/owner/repo/main"
const sanitizeBase = (s) => String(s || "").trim().replace(/\/+$/, "");
const GITHUB_RAW_BASE = sanitizeBase(
  (window && window.GITHUB_RAW_BASE) ||
  "https://raw.githubusercontent.com/setagayatankyubase-create/trip-platform/main"
);

// キャッシュ無効化用バージョン（構造変えたら必ず上げる）
const EVENT_CACHE_VERSION = "v5_2025-01-15";

// キャッシュキー（バージョンと連動）
const STORAGE_KEY_BASE = `sotonavi_eventData_${EVENT_CACHE_VERSION}`;
const INDEX_STORAGE_KEY_BASE = `sotonavi_eventIndex_${EVENT_CACHE_VERSION}`;

// JSONの形を「配列」に正規化（{events_index:[...]} / [...] どっちも対応）
const toIndexArray = (json) =>
  Array.isArray(json?.events_index) ? json.events_index :
  Array.isArray(json) ? json :
  [];

// organizerId 正規化（空文字を殺す）
const normalizeId = (v) => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
};

// Cloudinary画像URL生成関数
const CLOUDINARY_CLOUD_NAME = "ddrxsy9jw";

function cloudinaryUrl(publicId, { w = 1200, q = 'auto', f = 'auto' } = {}) {
  if (!publicId) return ""; // 空なら空
  // すでに http で始まるならそのまま返す（保険）
  if (/^https?:\/\//i.test(publicId)) return publicId;

  // public_idをそのまま使用（フォルダ名や拡張子の加工はしない）
  // 余計な先頭スラッシュを除去して、そのまま使用
  let id = String(publicId).trim().replace(/^\/+/, "");

  // CloudinaryのURL生成：public_idをそのまま使用
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_${f},q_${q},w_${w}/${id}`;
}

// ロゴ画像のCloudinary URLを取得
// public_idをそのまま使用（例: 'logo/logo_tfqqd0' または 'Home/logo/logo_tfqqd0'）
function getLogoUrl() {
  // TODO: CloudinaryのMedia Libraryで確認した実際のpublic_idに置き換えてください
  // 例: 'logo/logo_tfqqd0' または 'Home/logo/logo_tfqqd0'
  return cloudinaryUrl('logo/logo_tfqqd0', { w: 200 });
}

// ヒーロー画像のCloudinary URLを取得
function getHeroImageUrl(imageId) {
  // imageIdはpublic_idをそのまま渡す（例: 'hero/winter_ctfkee' または 'Home/hero/winter_ctfkee'）
  return cloudinaryUrl(imageId, { w: 1920 });
}

// ファビコンのCloudinary URLを取得
function getFaviconUrl() {
  // ロゴと同じpublic_idを使用
  return cloudinaryUrl('logo/logo_tfqqd0', { w: 32 });
}

// イベント画像のCloudinary URLを取得
function getEventImageUrl(imageId, eventId, { w = 1200 } = {}) {
  // imageIdはpublic_idをそのまま渡す（例: 'events/evt-001/evt-001_uqv2y2' または 'Home/events/evt-001/evt-001_uqv2y2'）
  // もしimageIdがファイル名のみ（例: 'evt-001.jpg_uqv2y2'）の場合は、eventIdを使って組み立てる
  let publicId = imageId;
  if (publicId && !publicId.includes('/') && eventId) {
    // 拡張子を除去（.jpg, .png等）
    publicId = publicId.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    publicId = `events/${eventId}/${publicId}`;
  }
  return cloudinaryUrl(publicId, { w });
}

// 提供元画像のCloudinary URLを取得
function getOrganizerImageUrl(imageId, { w = 400 } = {}) {
  // imageIdはpublic_idをそのまま渡す（例: 'organizers/org-001_logo' または 'Home/organizers/org-001_logo'）
  return cloudinaryUrl(imageId, { w });
}

// グローバルに公開
window.cloudinaryUrl = cloudinaryUrl;
window.getLogoUrl = getLogoUrl;
window.getHeroImageUrl = getHeroImageUrl;
window.getFaviconUrl = getFaviconUrl;
window.getEventImageUrl = getEventImageUrl;
window.getOrganizerImageUrl = getOrganizerImageUrl;

// CloudinaryのURL生成を確認（デバッグ用 - 既存動作には影響なし）
if (typeof console !== 'undefined') {
  console.log('[Cloudinary URL Check]');
  console.log('  Logo URL:', getLogoUrl());
  console.log('  Favicon URL:', getFaviconUrl());
  console.log('  Expected logo public_id: logo/logo_tfqqd0');
  console.log('  Cloudinary cloud name:', CLOUDINARY_CLOUD_NAME);
  console.log('  Note: CloudinaryのMedia Libraryで実際のpublic_idを確認してください');
}

// index配列の正規化（organizerId / organizer_id どちらでも organizerId に統一）
const normalizeIndex = (arr) =>
  (Array.isArray(arr) ? arr : []).map(e => ({
    ...e,
    organizerId: normalizeId(e.organizerId || e.organizer_id),
  }));

// 「IDの健全性」：有効率で判定（some()は危険）
const organizerIdValidRate = (arr) => {
  const a = Array.isArray(arr) ? arr : [];
  const total = a.length || 1;
  const valid = a.filter(e => String(e?.organizerId || "").trim().length > 0).length;
  return valid / total;
};

// fetchして「JSONであること」を保証（404 HTMLを即発見）
async function fetchJsonStrict_(url) {
  const res = await fetch(url, { cache: "no-store" });
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  if (!res.ok) {
    const head = await res.text().catch(() => "");
    throw new Error(`[HTTP ${res.status}] ${url} head=${head.slice(0, 160)}`);
  }

  // GitHub Pages 404などで text/html が返るのを即検知
  if (!ct.includes("application/json")) {
    const head = await res.text().catch(() => "");
    throw new Error(`[NOT JSON] ${ct} ${url} head=${head.slice(0, 160)}`);
  }

  return await res.json();
}

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
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  // 1) キャッシュ（ただし organizerId が薄い/空なら捨てる）
  try {
    const cached = localStorage.getItem(INDEX_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.timestamp && parsed?.data && parsed?.version === EVENT_CACHE_VERSION) {
        const age = Date.now() - parsed.timestamp;
        if (age < CACHE_TTL_MS) {
          // キャッシュが organizerId を含まない場合は破棄
          if (
            Array.isArray(parsed.data) &&
            parsed.data.length > 0 &&
            !("organizerId" in parsed.data[0])
          ) {
            console.warn("[CACHE] index cache missing organizerId. ignore.");
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

  // 2) raw 優先（サイトの /data が古い場合の応急処置）
  _eventIndexLoadingPromise = (async () => {
    const primaryUrl = `${GITHUB_RAW_BASE}/data/events_index.json`;

    let arr = [];
    try {
      const json = await fetchJsonStrict_(primaryUrl);
      arr = toIndexArray(json);
      // デバッグログ：evt-001のデータ構造を確認
      const evt001 = arr.find(e => e.id === 'evt-001');
      if (evt001) {
        console.log('[loadEventIndex] evt-001 from JSON:', {
          'image': evt001.image,
          'thumb': evt001.thumb,
          'mainImage': evt001.mainImage,
          'allKeys': Object.keys(evt001)
        });
      }
    } catch (e) {
      console.warn("[INDEX] primary failed:", e.message);
    }

    // primary（GitHub raw優先）が取れても organizerId が薄いなら「壊れてる」とみなす
    // その場合は /data にフォールバック
    const primaryRate = organizerIdValidRate(arr);

    if (primaryRate < 0.9) {
      // primary が GitHub raw の場合、/data にフォールバック
      const fallbackUrl = `${DATA_BASE}/events_index.json`;
      console.warn("[FALLBACK] primary rate low, trying /data. primary rate=", primaryRate, fallbackUrl);

      try {
        const fbJson = await fetchJsonStrict_(fallbackUrl);
        const fbArr = toIndexArray(fbJson);
        const fbRate = organizerIdValidRate(fbArr);

        if (fbArr.length > 0 && fbRate >= primaryRate) {
          arr = fbArr;
        } else {
          console.warn("[FALLBACK] /data not better. fbRate=", fbRate, "primaryRate=", primaryRate);
        }
      } catch (e) {
        console.warn("[FALLBACK] /data failed:", e.message);
      }
    }

    // 3) organizerId 正規化（organizerId / organizer_id どちらでも organizerId に統一）
    const raw = Array.isArray(arr) ? arr : [];
    const index = normalizeIndex(raw);

    // 4) まだ全滅ならエラーを見える化（原因は生成/配信/パス）
    const finalRate = organizerIdValidRate(index);
    if (index.length > 0 && finalRate < 0.9) {
      console.error("[INDEX] organizerId still low after fallback. rate=", finalRate);
    }

    window.eventIndex = index;

    // 5) キャッシュ
    try {
      localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify({
        timestamp: Date.now(),
        version: EVENT_CACHE_VERSION,
        data: window.eventIndex,
      }));
    } catch (e) {
      console.warn("eventIndex cache write error:", e);
    }

    return window.eventIndex;
  })()
  .catch((err) => {
    console.error("[ERROR] Failed to load event index:", err);
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
  if (window.eventMeta) return Promise.resolve(window.eventMeta);
  if (_eventMetaLoadingPromise) return _eventMetaLoadingPromise;

  _eventMetaLoadingPromise = (async () => {
    const primaryUrl = `${DATA_BASE}/meta.json`;

    let metaJson = null;
    try {
      metaJson = await fetchJsonStrict_(primaryUrl);
    } catch (e) {
      console.warn("[META] primary failed:", e.message);
    }

    let organizers = Array.isArray(metaJson?.organizers) ? metaJson.organizers : [];
    let categories = Array.isArray(metaJson?.categories) ? metaJson.categories : [];
    let areas      = Array.isArray(metaJson?.areas) ? metaJson.areas : [];

    // デバッグログ：organizersの最初の要素を確認
    if (organizers.length > 0) {
      console.log('[data.js] Sample organizer from meta.json:', organizers[0]);
      console.log('[data.js] Organizer keys:', Object.keys(organizers[0] || {}));
    }

    // デバッグログ：categoriesの内容を確認
    if (categories.length > 0) {
      console.log('[data.js] Categories loaded:', categories.length, 'items');
      console.log('[data.js] Sample categories:', categories.slice(0, 3));
    } else {
      console.warn('[data.js] No categories found in meta.json');
    }

    // organizers が空なら raw に逃げる（/data が古い・未更新対策）
    if (organizers.length === 0) {
      const fallbackUrl = `${GITHUB_RAW_BASE}/data/meta.json`;
      try {
        console.warn("[META FALLBACK] using GitHub raw:", fallbackUrl);
        const fb = await fetchJsonStrict_(fallbackUrl);
        organizers = Array.isArray(fb?.organizers) ? fb.organizers : organizers;
        categories = Array.isArray(fb?.categories) ? fb.categories : categories;
        areas      = Array.isArray(fb?.areas) ? fb.areas : areas;
        
        // デバッグログ：フォールバックからのorganizersも確認
        if (organizers.length > 0) {
          console.log('[data.js] Sample organizer from fallback:', organizers[0]);
          console.log('[data.js] Fallback organizer keys:', Object.keys(organizers[0] || {}));
        }
        
        // デバッグログ：フォールバックからのcategoriesも確認
        if (categories.length > 0) {
          console.log('[data.js] Categories from fallback:', categories.length, 'items');
          console.log('[data.js] Sample categories from fallback:', categories.slice(0, 3));
        }
      } catch (e) {
        console.warn("[META FALLBACK] failed:", e.message);
      }
    }

    const meta = { organizers, categories, areas };
    window.eventMeta = meta;

    // 互換：eventDataにマージ（他ページが参照しても落ちない）
    window.eventData = window.eventData || {};
    window.eventData.organizers = organizers;
    window.eventData.categories = categories;

    return meta;
  })()
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



