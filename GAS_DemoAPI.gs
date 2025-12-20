// デモ提供元・イベント用GAS API
// スプレッドシートID（URLから取得）
const SPREADSHEET_ID = '1gxrEFkzIDoLuuNk95SDSjOimrWRdV5ayP54AdNFUtus';

// シート名
const ORGANIZER_SHEET_NAME = 'demoorg'; // 提供元データのシート名
const EVENT_SHEET_NAME = 'demoev'; // イベントデータのシート名

function doGet(e) {
  try {
    // パラメータからパスワードを取得
    const password = e.parameter.password || '';
    
    if (!password) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'パスワードが指定されていません',
        organizer: null,
        events: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // スプレッドシートを開く
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // 提供元シートを取得
    const organizerSheet = ss.getSheetByName(ORGANIZER_SHEET_NAME);
    if (!organizerSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: '提供元シート（' + ORGANIZER_SHEET_NAME + '）が見つかりません',
        organizer: null,
        events: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // イベントシートを取得
    const eventSheet = ss.getSheetByName(EVENT_SHEET_NAME);
    if (!eventSheet) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'イベントシート（' + EVENT_SHEET_NAME + '）が見つかりません',
        organizer: null,
        events: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 提供元データを取得
    const organizerData = organizerSheet.getDataRange().getValues();
    if (organizerData.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: '提供元データがありません',
        organizer: null,
        events: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 提供元ヘッダーを取得
    const organizerHeaders = organizerData[0];
    const organizerHeaderMap = {};
    organizerHeaders.forEach((header, index) => {
      organizerHeaderMap[header.toString().trim()] = index;
    });
    
    // password列が存在するかチェック
    if (organizerHeaderMap['password'] === undefined) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: '提供元シートにpassword列が見つかりません',
        organizer: null,
        events: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // パスワードに一致する提供元を検索
    let organizer = null;
    let organizerId = null;
    
    for (let i = 1; i < organizerData.length; i++) {
      const row = organizerData[i];
      const rowPassword = row[organizerHeaderMap['password']];
      
      if (rowPassword && rowPassword.toString().trim() === password.trim()) {
        organizerId = row[organizerHeaderMap['id']];
        organizer = {
          id: organizerId ? organizerId.toString() : '',
          name: row[organizerHeaderMap['name']] ? row[organizerHeaderMap['name']].toString() : '',
          description: row[organizerHeaderMap['description']] ? row[organizerHeaderMap['description']].toString() : '',
          logo: row[organizerHeaderMap['logo']] ? row[organizerHeaderMap['logo']].toString() : '',
          website: row[organizerHeaderMap['website']] ? row[organizerHeaderMap['website']].toString() : '',
          establishedYear: row[organizerHeaderMap['establishedYear']] || row[organizerHeaderMap['established_year']] || '',
          rating: parseFloat(row[organizerHeaderMap['rating']]) || 0,
          reviewCount: parseInt(row[organizerHeaderMap['reviewCount']] || row[organizerHeaderMap['review_count']] || 0) || 0,
          contact: row[organizerHeaderMap['contact']] ? row[organizerHeaderMap['contact']].toString() : '',
        };
        break;
      }
    }
    
    if (!organizer || !organizerId) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'パスワードが正しくありません',
        organizer: null,
        events: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // イベントデータを取得
    const eventData = eventSheet.getDataRange().getValues();
    if (eventData.length < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        organizer: organizer,
        events: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // イベントヘッダーを取得
    const eventHeaders = eventData[0];
    const eventHeaderMap = {};
    eventHeaders.forEach((header, index) => {
      eventHeaderMap[header.toString().trim()] = index;
    });
    
    // status列とorganizerId列、password列が存在するかチェック
    const statusIndex = eventHeaderMap['status'];
    const organizerIdIndex = eventHeaderMap['organizerId'];
    const passwordIndex = eventHeaderMap['password'];
    
    if (statusIndex === undefined) {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        organizer: organizer,
        events: []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // status="demo"かつpasswordが一致するイベントを取得
    // または、organizerIdが一致するイベントを取得（password列がない場合のフォールバック）
    const events = [];
    
    for (let i = 1; i < eventData.length; i++) {
      const row = eventData[i];
      const status = row[statusIndex];
      const rowOrganizerId = row[organizerIdIndex];
      const rowPassword = passwordIndex !== undefined ? row[passwordIndex] : null;
      
      // statusが"demo"で、かつpasswordまたはorganizerIdが一致するものを取得
      const statusMatch = status && status.toString().toLowerCase().trim() === 'demo';
      const passwordMatch = rowPassword && rowPassword.toString().trim() === password.trim();
      const organizerIdMatch = rowOrganizerId && organizerId && rowOrganizerId.toString().trim() === organizerId.toString().trim();
      
      // passwordマッチを優先（提供元ごとにパスワードで管理するため）
      if (statusMatch && passwordMatch) {
        const event = {
          id: row[eventHeaderMap['id']] ? row[eventHeaderMap['id']].toString() : '',
          title: row[eventHeaderMap['title']] ? row[eventHeaderMap['title']].toString() : '',
          categoryId: (row[eventHeaderMap['categoryId']] || row[eventHeaderMap['categoryld']] || '').toString(),
          description: row[eventHeaderMap['description']] ? row[eventHeaderMap['description']].toString() : '',
          image: row[eventHeaderMap['image']] ? row[eventHeaderMap['image']].toString() : '',
          area_id: row[eventHeaderMap['area_id']] ? row[eventHeaderMap['area_id']].toString() : '',
          area: row[eventHeaderMap['area']] ? row[eventHeaderMap['area']].toString() : '',
          prefecture: row[eventHeaderMap['prefecture']] ? row[eventHeaderMap['prefecture']].toString() : '',
          location: {
            name: row[eventHeaderMap['location_name']] ? row[eventHeaderMap['location_name']].toString() : '',
            lat: parseFloat(row[eventHeaderMap['lat']]) || null,
            lng: parseFloat(row[eventHeaderMap['lng']]) || null
          },
          duration: row[eventHeaderMap['duration']] ? row[eventHeaderMap['duration']].toString() : '',
          price: parseFloat(row[eventHeaderMap['price']]) || 0,
          targetAge: row[eventHeaderMap['target_age']] ? row[eventHeaderMap['target_age']].toString() : '',
          highlights: row[eventHeaderMap['highlights']] ? 
            row[eventHeaderMap['highlights']].toString().split('|').map(h => h.trim()).filter(h => h) : [],
          notes: row[eventHeaderMap['notes']] ? row[eventHeaderMap['notes']].toString() : '',
          organizerId: row[eventHeaderMap['organizerId']] ? row[eventHeaderMap['organizerId']].toString() : '',
          external_link: row[eventHeaderMap['external_link']] ? row[eventHeaderMap['external_link']].toString() : '',
          isRecommended: row[eventHeaderMap['is_recommended']] === true || 
                        row[eventHeaderMap['is_recommended']] === 'TRUE' || 
                        row[eventHeaderMap['is_recommended']] === 'true' ||
                        row[eventHeaderMap['is_recommender']] === true ||
                        row[eventHeaderMap['is_recommender']] === 'TRUE' ||
                        row[eventHeaderMap['is_recommender']] === 'true',
          isNew: row[eventHeaderMap['is_new']] === true || 
                 row[eventHeaderMap['is_new']] === 'TRUE' || 
                 row[eventHeaderMap['is_new']] === 'true',
          publishedAt: row[eventHeaderMap['published_at']] ? row[eventHeaderMap['published_at']].toString() : null
        };
        
        events.push(event);
      }
    }
    
    // JSON形式で返す
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      organizer: organizer,
      events: events,
      count: events.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString(),
      organizer: null,
      events: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
