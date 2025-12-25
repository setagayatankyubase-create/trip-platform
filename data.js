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
  if (!publicId) return "";
  // すでに http で始まるならそのまま返す（保険）
  if (/^https?:\/\//i.test(publicId)) return publicId;

  // ★重要：データに書いてある public_id は信じる = 勝手にフォルダ追加しない
  // public_idをそのまま使用（フォルダ名や拡張子の加工はしない）
  // 余計な先頭スラッシュを除去して、そのまま使用
  const pid = String(publicId).trim().replace(/^\/+/, "");

  // CloudinaryのURL生成：public_idをそのまま使用
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_${f},q_${q},w_${w}/${pid}`;
}

// ロゴ画像のCloudinary URLを取得
function getLogoUrl() {
  return cloudinaryUrl('logo_tfqqd0', { w: 200 });
}

// ヒーロー画像のCloudinary URLを取得
function getHeroImageUrl(imageId) {
  // imageIdはpublic_idをそのまま渡す（例: 'hero/winter_ctfkee' または 'Home/hero/winter_ctfkee'）
  return cloudinaryUrl(imageId, { w: 1920 });
}

// ファビコンのCloudinary URLを取得
function getFaviconUrl() {
  // ロゴと同じpublic_idを使用
  return cloudinaryUrl('logo_tfqqd0', { w: 32 });
}

// public_idから拡張子を除去（Cloudinaryは通常拡張子不要だが、一部のpublic_idには含まれる場合もある）
// 注意: CloudinaryのMedia Libraryの表示名と実際のpublic_idは異なる場合がある
// 実際のpublic_idを確認するには、CloudinaryのMedia Libraryで画像をクリックし、右側の詳細パネルから「Public ID」をコピーすること
function normalizePublicId(id) {
  if (!id) return '';
  
  // 既にフォルダ構造がある場合（events/evt-001/evt-001.jpg_uqv2y2など）は、そのまま使用
  // 拡張子が含まれていても、それがCloudinaryの実際のpublic_idである可能性がある
  if (id.includes('/')) {
    console.log('[normalizePublicId] Has folder structure, using as-is:', id);
    return String(id);
  }
  
  // フォルダ構造がない場合のみ、拡張子を削除してフォルダ構造を追加する準備
  // ただし、.jpg_uqv2y2のような形式は、Cloudinaryの実際のpublic_idの可能性があるため削除しない
  let normalized = String(id);
  const original = normalized;
  
  // 末尾の拡張子のみ削除（evt-001.jpg → evt-001）
  // ただし、.jpg_uqv2y2のような形式は削除しない（アンダースコアが続く場合は削除しない）
  if (!normalized.match(/\.(jpg|jpeg|png|webp)_/i)) {
    normalized = normalized.replace(/\.(jpg|jpeg|png|webp)$/i, '');
  }
  
  if (original !== normalized) {
    console.log('[normalizePublicId]', original, '→', normalized);
  }
  return normalized;
}

// イベント画像のCloudinary URLを取得
function getEventImageUrl(imageId, eventId, { w = 1200 } = {}) {
  if (!imageId) {
    console.log('[getEventImageUrl] imageId is empty');
    return '';
  }
  
  console.log('[getEventImageUrl] Input:', { imageId, eventId, w });
  
  // imageIdの形式パターン：
  // 1. 完全なpublic_id（例: 'events/evt-001/evt-001.jpg_uqv2y2' または 'events/evt-001/evt-001_uqv2y2'）
  // 2. ファイル名のみ（例: 'evt-001.jpg_uqv2y2'）→ eventIdを使って 'events/evt-001/evt-001.jpg_uqv2y2' に組み立てる
  // デモイベント（demoevt-*）の場合は 'demoevt/demoevt-002_ykbt65' のようなフォルダ構造を使用
  // 注意: Cloudinaryのpublic_idには拡張子が含まれる場合もある（evt-001.jpg_uqv2y2など）
  
  let publicId = String(imageId).trim();
  
  // 既にフォルダ構造がある場合は、そのまま使用（拡張子の処理はしない）
  if (publicId.includes('/')) {
    console.log('[getEventImageUrl] Already has folder structure, using as-is:', publicId);
    return cloudinaryUrl(publicId, { w });
  }
  
  // フォルダ構造がない場合は追加
  // 拡張子はそのまま保持（Cloudinaryの実際のpublic_idに合わせる）
  if (eventId) {
    // デモイベント（demoevt-*で始まる）の場合は demo/demoevt/ フォルダを使用
    if (eventId.startsWith('demoevt-')) {
      // demo/demoevt/demoevt-002_ykbt65 のような構造（Cloudinaryのフォルダ構造に合わせる）
      publicId = `demo/demoevt/${publicId}`;
      console.log('[getEventImageUrl] Added demo/demoevt folder structure:', publicId);
    } else {
      // 通常のイベント（evt-*など）の場合は events/ フォルダを使用
      publicId = `events/${eventId}/${publicId}`;
      console.log('[getEventImageUrl] Added events folder structure:', publicId);
    }
  } else {
    console.warn('[getEventImageUrl] eventId is missing, using imageId as-is:', publicId);
  }
  
  const url = cloudinaryUrl(publicId, { w });
  console.log('[getEventImageUrl] Generated URL:', url);
  
  return url;
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
  console.log('  Logo public_id: logo_tfqqd0');
  console.log('  Cloudinary cloud name:', CLOUDINARY_CLOUD_NAME);
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



