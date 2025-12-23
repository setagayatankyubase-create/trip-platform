/****************************************************
 * Demo Organizer/Event GAS API (Complete)
 * Spreadsheet:
 *  - demoorg : organizer master
 *  - demoev  : events (date列から日付データを取得)
 *
 * GET:
 *  /exec?password=xxxx[&debug=1]
 *
 * Returns:
 *  {
 *    success: boolean,
 *    organizer: {...} | null,
 *    events: [...],
 *    count: number,
 *    debug?: {...}
 *  }
 ****************************************************/

const SPREADSHEET_ID = '1gxrEFkzIDoLuuNk95SDSjOimrWRdV5ayP54AdNFUtus';
const ORGANIZER_SHEET_NAME = 'demoorg';
const EVENT_SHEET_NAME     = 'demoev';

function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const password = safeStr_(params.password).trim();
    const debugOn  = isTruthy_(params.debug);

    if (!password) {
      return json_({
        success: false,
        error: 'パスワードが指定されていません',
        organizer: null,
        events: [],
        count: 0
      });
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    const orgSheet = ss.getSheetByName(ORGANIZER_SHEET_NAME);
    if (!orgSheet) {
      return json_({
        success: false,
        error: `提供元シート（${ORGANIZER_SHEET_NAME}）が見つかりません`,
        organizer: null,
        events: [],
        count: 0
      });
    }

    const evSheet = ss.getSheetByName(EVENT_SHEET_NAME);
    if (!evSheet) {
      return json_({
        success: false,
        error: `イベントシート（${EVENT_SHEET_NAME}）が見つかりません`,
        organizer: null,
        events: [],
        count: 0
      });
    }

    // -----------------------------
    // 1) Organizer lookup by password
    // -----------------------------
    const orgRows = orgSheet.getDataRange().getValues();
    if (orgRows.length < 2) {
      return json_({
        success: false,
        error: '提供元データがありません',
        organizer: null,
        events: [],
        count: 0
      });
    }

    const orgHeaders = orgRows[0].map(h => String(h).trim());
    const orgMap = headerMap_(orgHeaders);

    if (orgMap.password === undefined) {
      return json_({
        success: false,
        error: '提供元シートにpassword列が見つかりません',
        organizer: null,
        events: [],
        count: 0
      });
    }
    if (orgMap.id === undefined) {
      return json_({
        success: false,
        error: '提供元シートにid列が見つかりません',
        organizer: null,
        events: [],
        count: 0
      });
    }

    let organizer = null;
    let organizerId = null;
    let organizerName = '';

    for (let i = 1; i < orgRows.length; i++) {
      const r = orgRows[i];
      const rowPassword = safeStr_(r[orgMap.password]).trim();
      if (rowPassword && rowPassword === password) {
        organizerId = safeStr_(r[orgMap.id]).trim();
        organizerName = safeStr_(r[orgMap.name]).trim();

        organizer = {
          id: organizerId,
          name: organizerName,
          description: safeStr_(r[orgMap.description]),
          logo: safeStr_(r[orgMap.logo]),
          website: safeStr_(r[orgMap.website]),
          establishedYear:
            safeStr_(r[orgMap.establishedYear]) ||
            safeStr_(r[orgMap.established_year]) ||
            safeStr_(r[orgMap.founded_year]) ||
            '',
          rating: toNum_(r[orgMap.rating], 0),
          reviewCount: toInt_(r[orgMap.reviewCount] ?? r[orgMap.review_count], 0),
          contact: safeStr_(r[orgMap.contact])
        };
        break;
      }
    }

    if (!organizer || !organizerId) {
      return json_({
        success: false,
        error: 'パスワードが正しくありません',
        organizer: null,
        events: [],
        count: 0
      });
    }

    // -----------------------------
    // 2) Events filtering
    // -----------------------------
    const evRows = evSheet.getDataRange().getValues();
    if (evRows.length < 2) {
      return json_({
        success: true,
        organizer,
        events: [],
        count: 0,
        ...(debugOn ? { debug: { organizerId, organizerName, totalEvents: 0, matchedEvents: 0 } } : {})
      });
    }

    const evHeaders = evRows[0].map(h => String(h).trim());
    const evMap = headerMap_(evHeaders);

    // organizer id/name columns (揺れ吸収)
    const organizerIdIndex =
      pickIndex_(evMap, ['organizerid', 'organizer_id', 'providerid', 'provider_id', 'organizer', 'organizerid']);

    const organizerNameIndex =
      pickIndex_(evMap, ['organizername', 'organizer_name', 'providername', 'provider_name']);

    // optional columns
    const passwordIndex = evMap.password; // 任意
    const statusIndex   = evMap.status;   // 任意（demoのみ、などで絞りたい場合）

    // facility column
    const facilityIndex = evMap.facility ?? evMap.facilities;

    // date/time columns (single schedule -> dates[]) - demoevシートからのフォールバック用
    const dateIndex =
      pickIndex_(evMap, ['date', 'event_date', 'start_date', 'day']);

    const startTimeIndex =
      pickIndex_(evMap, ['start_time', 'starttime', 'start']);

    const endTimeIndex =
      pickIndex_(evMap, ['end_time', 'endtime', 'end']);

    const events = [];

    // debug counters
    let totalEvents = 0;
    let matchedEvents = 0;
    let statusNG = 0;
    let orgNG = 0;
    let passNG = 0;

    // helper for matching (trim + normalize)
    const norm = v => normalizeVal_(safeStr_(v));

    for (let i = 1; i < evRows.length; i++) {
      const r = evRows[i];
      if (!r || r.every(v => v === '' || v === null)) continue;

      totalEvents++;

      const rowStatus = (statusIndex !== undefined) ? safeStr_(r[statusIndex]).trim().toLowerCase() : '';
      // status列があるなら "demo" / "公開" / "published" / 空文字を許可
      const statusOK = (statusIndex === undefined) ? true : 
        (rowStatus === '' || rowStatus === 'demo' || rowStatus === '公開' || rowStatus === 'published');

      const rowOrgId = (organizerIdIndex !== undefined) ? safeStr_(r[organizerIdIndex]).trim() : '';
      const rowOrgName = (organizerNameIndex !== undefined) ? safeStr_(r[organizerNameIndex]).trim() : '';

      const rowPassword = (passwordIndex !== undefined) ? safeStr_(r[passwordIndex]).trim() : '';

      // match rules:
      // - statusOK must pass (if status col exists)
      // - if password col exists, allow password match
      // - if organizer_id col exists, allow organizer_id match
      // - if organizer_name col exists, allow organizer_name match
      const passOK = (passwordIndex !== undefined) && rowPassword && (rowPassword === password);

      const orgIdOK = (organizerIdIndex !== undefined) && rowOrgId && (norm(rowOrgId) === norm(organizerId));
      const orgNameOK = (organizerNameIndex !== undefined) && rowOrgName && organizerName && (norm(rowOrgName) === norm(organizerName));

      const orgOK = orgIdOK || orgNameOK;

      if (!statusOK) { statusNG++; continue; }

      // if we have organizer columns, require orgOK OR passOK.
      // if organizer columns are missing entirely, fallback to passOK only.
      const hasOrgSignal = (organizerIdIndex !== undefined) || (organizerNameIndex !== undefined);
      const ok = hasOrgSignal ? (orgOK || passOK) : passOK;

      if (!ok) {
        if (!orgOK) orgNG++;
        if (!passOK) passNG++;
        continue;
      }

      matchedEvents++;

      const eventId = safeStr_(r[evMap.id]).trim();

      // category id (typo absorb categoryld)
      const categoryId = safeStr_(
        getByKeys_(r, evMap, ['categoryid', 'category_id', 'categoryld'])
      ).trim();

      const highlightsRaw = safeStr_(getByKeys_(r, evMap, ['highlights']));
      const highlights = highlightsRaw
        ? highlightsRaw.split('|').map(s => s.trim()).filter(Boolean)
        : [];

      // 日付データの取得：demoevシートのdate列から取得
      const dateStr = (dateIndex !== undefined) ? safeStr_(r[dateIndex]).trim() : '';
      const startTime = (startTimeIndex !== undefined) ? safeStr_(r[startTimeIndex]).trim() : '';
      const endTime   = (endTimeIndex !== undefined) ? safeStr_(r[endTimeIndex]).trim() : '';
      
      const eventDates = dateStr ? [{
        date: normalizeDateYmd_(dateStr),
        startTime: startTime || null,
        endTime: endTime || null
      }] : [];

      const event = {
        id: eventId,
        title: safeStr_(r[evMap.title]).trim(),
        categoryId,
        description: safeStr_(getByKeys_(r, evMap, ['description'])),
        detail: safeStr_(getByKeys_(r, evMap, ['detail'])),
        image: safeStr_(getByKeys_(r, evMap, ['image'])),
        area_id: safeStr_(getByKeys_(r, evMap, ['area_id', 'areaid'])),
        area: safeStr_(getByKeys_(r, evMap, ['area'])),
        prefecture: safeStr_(getByKeys_(r, evMap, ['prefecture'])),
        location: {
          name: safeStr_(getByKeys_(r, evMap, ['location_name', 'locationname', 'location'])),
          lat: toNum_(getByKeys_(r, evMap, ['lat']), null),
          lng: toNum_(getByKeys_(r, evMap, ['lng']), null)
        },
        duration: safeStr_(getByKeys_(r, evMap, ['duration'])),
        price: toNum_(getByKeys_(r, evMap, ['price']), 0),
        targetAge: safeStr_(getByKeys_(r, evMap, ['target_age', 'targetage'])),
        highlights,

        facility: (facilityIndex !== undefined) ? safeStr_(r[facilityIndex]) : '',

        notes: safeStr_(getByKeys_(r, evMap, ['notes'])),

        // organizer
        organizerId: rowOrgId || organizerId,

        // external link
        external_link: safeStr_(getByKeys_(r, evMap, ['external_link', 'externallink'])),

        // flags
        isRecommended: toBool_(getByKeys_(r, evMap, ['is_recommended', 'isrecommended', 'is_recommender']), false),
        isNew: toBool_(getByKeys_(r, evMap, ['is_new', 'isnew']), false),

        publishedAt: safeStr_(getByKeys_(r, evMap, ['published_at', 'publishedat'])) || null,

        // schedule fields (demoevシートのdate列から取得)
        date: eventDates.length > 0 ? eventDates[0].date : null,
        dates: eventDates
      };

      events.push(event);
    }

    const res = {
      success: true,
      organizer,
      events,
      count: events.length
    };

    if (debugOn) {
      res.debug = {
        organizerId,
        organizerName,
        totalEvents,
        matchedEvents,
        indices: {
          organizerIdIndex,
          organizerNameIndex,
          passwordIndex,
          statusIndex,
          facilityIndex,
          dateIndex,
          startTimeIndex,
          endTimeIndex
        },
        counts: { statusNG, orgNG, passNG },
        headers: {
          organizers: orgHeaders,
          events: evHeaders
        }
      };
    }

    return json_(res);

  } catch (err) {
    return json_({
      success: false,
      error: String(err),
      organizer: null,
      events: [],
      count: 0
    });
  }
}

/* ------------------------
 * helpers
 * ------------------------ */

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function headerMap_(headers) {
  // キーを正規化（小文字+空白除去）してマップを作成
  const map = {};
  headers.forEach((h, i) => {
    const key = normalizeKey_(h);
    if (!key) return;
    if (map[key] === undefined) map[key] = i;
  });
  return map;
}

function normalizeKey_(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s　_]+/g, ''); // 半角/全角スペースとアンダースコアを除去
}

function pickIndex_(map, keys) {
  // 正規化されたキーでマップからインデックスを取得
  for (const key of keys) {
    const normalized = normalizeKey_(key);
    if (map[normalized] !== undefined) return map[normalized];
  }
  return undefined;
}

function getByKeys_(row, map, keys) {
  // 正規化されたキーでマップから値を取得
  const index = pickIndex_(map, keys);
  return (index !== undefined) ? row[index] : undefined;
}

function safeStr_(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function toNum_(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

function toInt_(v, fallback) {
  if (v === null || v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function toBool_(v, fallback) {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return fallback;
}

function isTruthy_(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

function normalizeVal_(v) {
  return safeStr_(v)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// 日付をYYYY-MM-DD形式に正規化
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
