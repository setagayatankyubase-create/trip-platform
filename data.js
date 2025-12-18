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

  _eventDataLoadingPromise = fetch(EVENTS_API_URL, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) {
        throw new Error(`Failed to load events: ${res.status}`);
      }
      return res.json();
    })
    .then((json) => {
      window.eventData = json;
      return window.eventData;
    })
    .finally(() => {
      _eventDataLoadingPromise = null;
    });

  return _eventDataLoadingPromise;
};


