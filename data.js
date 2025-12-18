// イベント・提供元データを API から読み込む
const EVENTS_API_URL =
  "https://script.google.com/macros/s/AKfycbxB8qi3BsvmHUOkWup6lA-pdMTf7RuWgFu0xov3TexLyO9MPM3b5ND7RF0xqauMS_Q0KA/exec";

// グローバルに公開しておく（他のスクリプトから必ず参照できるようにする）
window.eventData = null;
let _eventDataLoadingPromise = null;

window.loadEventData = function loadEventData() {
  // すでに読み込み済みなら即座に解決
  if (window.eventData) return Promise.resolve(window.eventData);
  // 読み込み中なら同じ Promise を使い回す
  if (_eventDataLoadingPromise) return _eventDataLoadingPromise;

  const STORAGE_KEY = "sotonavi_eventData_v1";
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10分

  // 1) localStorage キャッシュを試す
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.timestamp && parsed.data) {
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
      window.eventData = json;

      // 取得結果を localStorage にキャッシュ
      try {
        const payload = {
          timestamp: Date.now(),
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


