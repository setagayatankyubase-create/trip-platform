/***********************
 * Daily JSON Generator -> Push to GitHub
 * Outputs:
 *  - /data/events_index.json  (index + aggregated date fields)
 *  - /data/meta.json          (organizers + categories + areas optional)
 *  - /data/events/{id}.json   (event detail)
 *
 * Run:
 *  - generateDailyJson()
 ***********************/

const SPREADSHEET_ID = '1BdLjn92UUcQooSPCpBUmPDyzCD_ue5_irHc1Ml0sWrk';

function generateDailyJson() {
  const cfg = getGhConfig_();

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const indexSheet  = ss.getSheetByName('events_index');
  const eventsSheet = ss.getSheetByName('events');
  const datesSheet  = ss.getSheetByName('event_dates');

  const orgSheet  = ss.getSheetByName('organizers');
  const catSheet  = ss.getSheetByName('categories');
  const areaSheet = ss.getSheetByName('areas'); // 任意。無くてもOK

  if (!indexSheet || !eventsSheet || !datesSheet) {
    throw new Error('missing_sheet: need events_index, events, event_dates');
  }

  // ---------- 1) dates 集計（next_date / date_min / date_max） ----------
  const dateAggById = buildDateAggByEventId_(datesSheet);

  // ---------- 2) eventsシートからorganizerIdマップを構築（events_indexにorganizerIdがない場合のため） ----------
  const organizerIdMap = buildOrganizerIdMap_(eventsSheet);

  // ---------- 3) events_index.json（一覧） ----------
  const indexArr = buildEventsIndexWithAgg_(indexSheet, dateAggById, organizerIdMap);

  const indexPayload = {
    generated_at: new Date().toISOString(),
    events_index: indexArr
  };

  saveJsonToGitHub_(cfg, joinPath_(cfg.baseDir, 'events_index.json'), indexPayload, 'daily: update events_index.json');

  // ---------- 4) meta.json（organizers/categories/areas） ----------
  const metaPayload = {
    generated_at: new Date().toISOString(),
    organizers: orgSheet ? sheetToObjectsFast_(orgSheet) : [],
    categories: catSheet ? sheetToObjectsFast_(catSheet) : [],
    areas: areaSheet ? sheetToObjectsFast_(areaSheet) : []
  };

  saveJsonToGitHub_(cfg, joinPath_(cfg.baseDir, 'meta.json'), metaPayload, 'daily: update meta.json');

  // ---------- 5) events/{id}.json（詳細：publishedのみ） ----------
  const eventsRaw = sheetToObjectsFast_(eventsSheet);

  let updated = 0;
  for (let i = 0; i < eventsRaw.length; i++) {
    const r = eventsRaw[i];
    const status = String(r.status || 'published').trim();
    if (status !== 'published') continue;

    const id = String(r.id || '').trim();
    if (!id) continue;

    const one = buildOneEventFast_(eventsSheet, datesSheet, id);
    if (!one) continue;

    const detailPayload = {
      generated_at: new Date().toISOString(),
      event: one
    };

    saveJsonToGitHub_(
      cfg,
      joinPath_(cfg.baseDir, `events/${id}.json`),
      detailPayload,
      `daily: update events/${id}.json`
    );

    updated++;
  }

  Logger.log(`Done. Updated detail files: ${updated}`);
}

/* --------------------
 * OrganizerId Map builder (from events sheet)
 * -------------------- */

// eventsシートから { event_id: organizerId } のマップを構築
function buildOrganizerIdMap_(eventsSheet) {
  const lastRow = eventsSheet.getLastRow();
  if (lastRow < 2) return {};

  const lastCol = eventsSheet.getLastColumn();
  const header = eventsSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const col = {};
  for (let i = 0; i < header.length; i++) col[header[i]] = i;

  if (col.id == null || col.organizerId == null) return {};

  const values = eventsSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const map = {};

  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    const id = String(row[col.id] || '').trim();
    const organizerId = String(row[col.organizerId] || '').trim();
    if (id && organizerId) {
      map[id] = organizerId;
    }
  }

  return map;
}

/* --------------------
 * Index builder (with date agg)
 * -------------------- */

// events_indexシートの列名に合わせて、できるだけ拾う。
// + dateAggById から next_date/date_min/date_max を注入。
// + organizerIdMap から organizerId を注入（events_indexにない場合）。
// ※ events_index に categoryId/area/organizerId が無いなら空になる。
//   追加したければ events_index シートに列を足すのが一番ラク。
function buildEventsIndexWithAgg_(indexSheet, dateAggById, organizerIdMap) {
  const lastRow = indexSheet.getLastRow();
  if (lastRow < 2) return [];

  const lastCol = indexSheet.getLastColumn();
  const header = indexSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const col = {};
  for (let i = 0; i < header.length; i++) col[header[i]] = i;

  if (col.id == null) return [];

  const values = indexSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const out = [];
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    const id = String(row[col.id] || '').trim();
    if (!id) continue;

    const agg = dateAggById[id] || { next_date: '', date_min: '', date_max: '' };

    // organizerId: events_indexシートにあればそれを使い、なければeventsシートから取得
    const organizerIdFromIndex = String(pick_(row, col, 'organizerId')).trim();
    const organizerId = organizerIdFromIndex || (organizerIdMap[id] || '');

    out.push({
      id,
      title: String(pick_(row, col, 'title')).trim(),
      image: String(pick_(row, col, 'thumb')).trim(),
      city: String(pick_(row, col, 'city')).trim(),
      prefecture: String(pick_(row, col, 'prefecture')).trim(),

      // あなたの events_index 列（スクショ準拠）
      isRecommended: toBool_(pick_(row, col, 'is_recommended')),
      isNew: toBool_(pick_(row, col, 'is_new')),
      rating: toNum_(pick_(row, col, 'rating')),
      reviewCount: toNum_(pick_(row, col, 'review_count')),
      price: toNum_(pick_(row, col, 'price_yen')),

      // 追加（フィルタ/トップ表示を軽くする）
      categoryId: String(pick_(row, col, 'categoryId')).trim(),
      area: String(pick_(row, col, 'area')).trim(),
      organizerId: organizerId, // events_indexから取得、なければeventsシートから
      publishedAt: String(pick_(row, col, 'published_at')).trim(),

      next_date: agg.next_date,
      date_min: agg.date_min,
      date_max: agg.date_max
    });
  }
  return out;
}

function pick_(row, colMap, key) {
  const idx = colMap[key];
  return (idx == null) ? '' : row[idx];
}

/* --------------------
 * Date aggregation
 * - Reads event_dates once
 * - Produces: { [event_id]: {next_date, date_min, date_max} }
 * Assumes date is in YYYY-MM-DD or Date object. (Time is ignored for sorting.)
 * next_date: earliest date >= today (JST 기준) else ''.
 * -------------------- */

function buildDateAggByEventId_(datesSheet) {
  const lastRow = datesSheet.getLastRow();
  const lastCol = datesSheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return {};

  const values = datesSheet.getRange(1, 1, lastRow, lastCol).getValues();
  const header = values[0].map(h => String(h).trim());
  const col = {};
  for (let i = 0; i < header.length; i++) col[header[i]] = i;

  if (col.event_id == null || col.date == null) return {};

  // JSTの「今日」(00:00)
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // ローカルTZ（GASは通常スクリプトTZ）

  // event_id -> dates[]
  const map = {};
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const eid = String(row[col.event_id] || '').trim();
    if (!eid) continue;

    const d = normalizeDateYmd_(row[col.date]);
    if (!d) continue;

    if (!map[eid]) map[eid] = [];
    map[eid].push(d);
  }

  // agg
  const out = {};
  const eids = Object.keys(map);
  for (let i = 0; i < eids.length; i++) {
    const eid = eids[i];
    const arr = map[eid].slice().sort(); // YYYY-MM-DD string sort works

    const date_min = arr[0] || '';
    const date_max = arr[arr.length - 1] || '';

    // next_date = earliest >= today
    let next_date = '';
    for (let j = 0; j < arr.length; j++) {
      const dStr = arr[j];
      const dt = ymdToDate_(dStr);
      if (dt && dt.getTime() >= today.getTime()) {
        next_date = dStr;
        break;
      }
    }

    out[eid] = { next_date, date_min, date_max };
  }
  return out;
}

function normalizeDateYmd_(v) {
  if (!v) return '';
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  // 文字列
  const s = String(v).trim();
  // ざっくり YYYY-MM-DD 抜き出し
  const m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (!m) return '';
  const yyyy = m[1];
  const mm = ('0' + m[2]).slice(-2);
  const dd = ('0' + m[3]).slice(-2);
  return `${yyyy}-${mm}-${dd}`;
}

function ymdToDate_(ymd) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(y, mo, d);
}

/* --------------------
 * Detail builder
 * - events: TextFinder -> 1 row
 * - dates: filter matching
 * -------------------- */

function buildOneEventFast_(eventsSheet, datesSheet, targetId) {
  const lastCol = eventsSheet.getLastColumn();
  const header = eventsSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const col = {};
  for (let i = 0; i < header.length; i++) col[header[i]] = i + 1;

  if (!col.id) return null;

  const lastRow = eventsSheet.getLastRow();
  if (lastRow < 2) return null;

  const idRange = eventsSheet.getRange(2, col.id, lastRow - 1, 1);
  const finder = idRange.createTextFinder(targetId).matchEntireCell(true).findNext();
  if (!finder) return null;

  const rowIdx = finder.getRow();
  const row = eventsSheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];

  const status = String(getCell_(row, col, 'status') || 'published').trim();
  if (status !== 'published') return null;

  const dates = buildDatesForEvent_(datesSheet, targetId);

  return {
    id: targetId,
    title: String(getCell_(row, col, 'title')).trim(),
    categoryId: String(getCell_(row, col, 'categoryId')).trim(),
    description: String(getCell_(row, col, 'description')).trim(),
    image: String(getCell_(row, col, 'image')).trim(),
    images: splitList_(getCell_(row, col, 'images')),

    area: String(getCell_(row, col, 'area')).trim(),
    prefecture: String(getCell_(row, col, 'prefecture')).trim(),
    city: String(getCell_(row, col, 'city')).trim(),

    location: {
      name: String(getCell_(row, col, 'location_name')).trim(),
      lat: toNum_(getCell_(row, col, 'lat')),
      lng: toNum_(getCell_(row, col, 'lng'))
    },

    duration: String(getCell_(row, col, 'duration')).trim(),
    price: toNum_(getCell_(row, col, 'price')),
    targetAge: String(getCell_(row, col, 'target_age')).trim(),
    highlights: splitList_(getCell_(row, col, 'highlights')),
    notes: String(getCell_(row, col, 'notes')).trim(),

    organizerId: String(getCell_(row, col, 'organizerId')).trim(),
    externalLink: String(getCell_(row, col, 'external_link')).trim(),

    isRecommended: toBool_(getCell_(row, col, 'is_recommended')),
    isNew: toBool_(getCell_(row, col, 'is_new')),
    publishedAt: String(getCell_(row, col, 'published_at')).trim(),

    dates
  };
}

function getCell_(row, colMap, key) {
  const c = colMap[key];
  if (!c) return '';
  return row[c - 1];
}

function buildDatesForEvent_(datesSheet, targetId) {
  const lastRow = datesSheet.getLastRow();
  if (lastRow < 2) return [];

  const lastCol = datesSheet.getLastColumn();
  const header = datesSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
  const col = {};
  for (let i = 0; i < header.length; i++) col[header[i]] = i;

  if (col.event_id == null) return [];

  const values = datesSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const out = [];
  for (let r = 0; r < values.length; r++) {
    const row = values[r];
    if (String(row[col.event_id] || '').trim() !== targetId) continue;

    const d = normalizeDateYmd_(col.date != null ? row[col.date] : '');
    out.push({
      date: String(d || '').trim(),
      time: String(col.time != null ? row[col.time] : '').trim()
    });
  }
  return out;
}

/* --------------------
 * Sheet -> objects (fast)
 * -------------------- */

function sheetToObjectsFast_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const header = values[0].map(h => String(h).trim());

  const out = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.join('') === '') continue;

    const o = {};
    for (let c = 0; c < header.length; c++) o[header[c]] = row[c];
    out.push(o);
  }
  return out;
}

/* --------------------
 * GitHub Contents API (create/update)
 * -------------------- */

function saveJsonToGitHub_(cfg, path, obj, message) {
  const json = JSON.stringify(obj);
  const contentB64 = Utilities.base64Encode(json, Utilities.Charset.UTF_8);

  const existing = githubGetContentMeta_(cfg, path);
  const sha = existing && existing.sha ? existing.sha : null;

  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}`;

  const payload = {
    message: message,
    content: contentB64,
    branch: cfg.branch
  };
  if (sha) payload.sha = sha;

  const res = UrlFetchApp.fetch(url, {
    method: 'put',
    muteHttpExceptions: true,
    headers: githubHeaders_(cfg),
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });

  const code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(`GitHub PUT failed (${code}): ${res.getContentText()}`);
  }
}

function githubGetContentMeta_(cfg, path) {
  const url = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodeURIComponent(path).replace(/%2F/g,'/')}?ref=${encodeURIComponent(cfg.branch)}`;

  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: githubHeaders_(cfg)
  });

  const code = res.getResponseCode();
  if (code === 404) return null;
  if (code < 200 || code >= 300) {
    throw new Error(`GitHub GET failed (${code}): ${res.getContentText()}`);
  }
  return JSON.parse(res.getContentText());
}

function githubHeaders_(cfg) {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${cfg.token}`,
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function getGhConfig_() {
  const props = PropertiesService.getScriptProperties();
  const owner  = props.getProperty('GH_OWNER');
  const repo   = props.getProperty('GH_REPO');
  const branch = props.getProperty('GH_BRANCH') || 'main';
  const token  = props.getProperty('GH_TOKEN');
  const baseDir = props.getProperty('GH_BASEDIR') || '';

  if (!owner || !repo || !token) {
    throw new Error('Missing Script Properties: GH_OWNER, GH_REPO, GH_TOKEN (and optionally GH_BRANCH, GH_BASEDIR)');
  }
  return { owner, repo, branch, token, baseDir };
}

function joinPath_(a, b) {
  const left = String(a || '').replace(/^\/+|\/+$/g,'');
  const right = String(b || '').replace(/^\/+|\/+$/g,'');
  if (!left) return right;
  if (!right) return left;
  return `${left}/${right}`;
}

/* --------------------
 * Type helpers
 * -------------------- */

function toNum_(v) {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function toBool_(v) {
  if (v === true) return true;
  const s = String(v).toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
}

function splitList_(v) {
  if (!v) return [];
  return String(v)
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * 毎日自動更新トリガーを作成（1回だけ実行）
 * - generateDailyJson() を毎日指定時刻に実行
 * - 重複トリガーは作らない（既存があれば先に消す）
 */
function installDailyTrigger() {
  const TARGET_FUNC = 'generateDailyJson';

  // 既存の同名トリガーを削除（重複防止）
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === TARGET_FUNC) {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 毎日 3:00 に実行（好きな時刻に変えてOK）
  ScriptApp.newTrigger(TARGET_FUNC)
    .timeBased()
    .everyDays(1)
    .atHour(3)     // 0〜23
    .nearMinute(0) // 0〜59（だいたいこの近辺で実行される）
    .create();

  Logger.log('Daily trigger installed for ' + TARGET_FUNC);
}

/**
 * トリガー削除したい時用（任意）
 */
function removeDailyTrigger() {
  const TARGET_FUNC = 'generateDailyJson';
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction && t.getHandlerFunction() === TARGET_FUNC) {
      ScriptApp.deleteTrigger(t);
    }
  });
  Logger.log('Daily trigger removed for ' + TARGET_FUNC);
}

