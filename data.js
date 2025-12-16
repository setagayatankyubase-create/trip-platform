// ダミーデータ: イベント・催行会社
const eventData = {
  events: [
    {
      id: 'evt-001',
      title: '屋久島・苔むす森トレッキング（ガイド付き・少人数）',
      category: 'ハイキング/トレッキング',
      categoryId: 'hiking',
      description: '世界遺産・屋久島の原生林を熟練ガイドと歩く6時間トレイル。混雑を避けた早朝スタートで、苔むす森や屋久杉を少人数でゆったり鑑賞します。',
      image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      dates: [
        { date: '2025-01-18', time: '06:30' },
        { date: '2025-01-19', time: '06:30' },
        { date: '2025-01-25', time: '06:30' },
        { date: '2025-01-26', time: '06:30' }
      ],
      area: '屋久島',
      prefecture: '鹿児島県',
      location: { lat: 30.3589, lng: 130.4994, name: '安房エリア集合' },
      duration: '約6時間',
      price: 12800,
      organizerId: 'org-001',
      isRecommended: true,
      isNew: false,
      publishedAt: '2024-12-01',
      externalLink: 'https://example.com/book/evt-001',
      targetAge: '10歳以上',
      notes: '6時間歩ける体力が必要。雨天時はコース変更の可能性あり。',
      highlights: [
        '苔むす森・屋久杉をガイドが丁寧に案内',
        '少人数ツアーで写真タイムも確保',
        'レインウェア・トレッキングポール無料レンタル'
      ]
    },
    {
      id: 'evt-002',
      title: '知床・クリアカヤックで海と流氷をクルーズ',
      category: 'カヤック/カヌー',
      categoryId: 'kayak',
      description: '知床の海をクリアカヤックでクルーズ。流氷シーズンには流氷の間を縫って進む特別な体験ができます。',
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
      dates: [
        { date: '2025-01-20', time: '09:00' },
        { date: '2025-01-21', time: '09:00' },
        { date: '2025-01-27', time: '09:00' },
        { date: '2025-01-28', time: '09:00' }
      ],
      area: '知床',
      prefecture: '北海道',
      location: { lat: 44.0682, lng: 145.1235, name: 'ウトロ港集合' },
      duration: '約3時間',
      price: 9400,
      organizerId: 'org-002',
      isRecommended: true,
      isNew: false,
      publishedAt: '2024-11-15',
      externalLink: 'https://example.com/book/evt-002',
      targetAge: '8歳以上',
      notes: '水着・タオル持参。悪天候時は中止の可能性あり。'
    },
    {
      id: 'evt-003',
      title: '阿蘇高原・星空キャンプ＆焚き火体験',
      category: '星空・天体観測',
      categoryId: 'stargazing',
      description: '阿蘇の高原で星空観察と焚き火を楽しむ一泊二日のキャンプ体験。',
      image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
      dates: [
        { date: '2025-01-18', time: '15:00' },
        { date: '2025-01-19', time: '15:00' },
        { date: '2025-01-25', time: '15:00' }
      ],
      area: '阿蘇',
      prefecture: '熊本県',
      location: { lat: 32.8844, lng: 131.1036, name: '阿蘇キャンプ場' },
      duration: '1泊2日',
      price: 7200,
      organizerId: 'org-003',
      isRecommended: false,
      isNew: true,
      publishedAt: '2025-01-10',
      externalLink: 'https://example.com/book/evt-003',
      targetAge: '全年齢',
      notes: 'テント・寝袋レンタル可能（別途料金）。'
    },
    {
      id: 'evt-004',
      title: '富士山麓・サイクリングツアー（初心者向け）',
      category: 'サイクリング',
      categoryId: 'cycling',
      description: '富士山の美しい景色を楽しみながら、初心者でも安心のサイクリングコースをガイドと一緒に走ります。',
      image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=900&q=80',
      dates: [
        { date: '2025-01-19', time: '08:00' },
        { date: '2025-01-20', time: '08:00' },
        { date: '2025-01-26', time: '08:00' },
        { date: '2025-01-27', time: '08:00' }
      ],
      area: '富士山麓',
      prefecture: '山梨県',
      location: { lat: 35.3606, lng: 138.7274, name: '河口湖駅前' },
      duration: '約4時間',
      price: 8500,
      organizerId: 'org-001',
      isRecommended: false,
      isNew: true,
      publishedAt: '2025-01-05',
      externalLink: 'https://example.com/book/evt-004',
      targetAge: '12歳以上',
      notes: '自転車レンタル込み。ヘルメット必須。'
    },
    {
      id: 'evt-005',
      title: '白馬・ロッククライミング体験（初級コース）',
      category: 'ロッククライミング',
      categoryId: 'climbing',
      description: '白馬の岩場でロッククライミングを体験。初級者向けのコースで、安全に楽しめます。',
      image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
      dates: [
        { date: '2025-01-20', time: '10:00' },
        { date: '2025-01-21', time: '10:00' },
        { date: '2025-01-27', time: '10:00' }
      ],
      area: '白馬',
      prefecture: '長野県',
      location: { lat: 36.6989, lng: 137.8614, name: '白馬クライミングエリア' },
      duration: '約3時間',
      price: 11000,
      organizerId: 'org-004',
      isRecommended: true,
      isNew: false,
      publishedAt: '2024-12-20',
      externalLink: 'https://example.com/book/evt-005',
      targetAge: '10歳以上',
      notes: '装備一式レンタル込み。経験者向けコースもあり。'
    },
    {
      id: 'evt-006',
      title: '箱根・温泉リトリート＆森林浴ハイキング',
      category: '温泉リトリート',
      categoryId: 'onsen',
      description: '箱根の温泉と森林浴を組み合わせたリラックス体験。',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80',
      dates: [
        { date: '2025-01-18', time: '13:00' },
        { date: '2025-01-19', time: '13:00' },
        { date: '2025-01-25', time: '13:00' },
        { date: '2025-01-26', time: '13:00' }
      ],
      area: '箱根',
      prefecture: '神奈川県',
      location: { lat: 35.2327, lng: 139.1033, name: '箱根湯本駅' },
      duration: '約5時間',
      price: 9800,
      organizerId: 'org-005',
      isRecommended: false,
      isNew: false,
      publishedAt: '2024-11-01',
      externalLink: null,
      targetAge: '全年齢',
      notes: '温泉入浴料込み。タオル持参。'
    }
  ],
  organizers: [
    {
      id: 'org-001',
      name: '屋久島自然ガイド協会',
      description: '屋久島の自然を熟知した認定ガイドが案内するツアーを提供。安全第一で、自然保護にも配慮した活動を行っています。',
      logo: 'https://via.placeholder.com/200x200?text=屋久島ガイド',
      website: 'https://example.com/org-001',
      contact: 'info@yakushima-guide.jp',
      establishedYear: 2010,
      rating: 4.9,
      reviewCount: 2104
    },
    {
      id: 'org-002',
      name: '知床マリンツアー',
      description: '知床の海を専門とするツアー会社。カヤック、ダイビング、クルーズなど様々なマリンアクティビティを提供。',
      logo: 'https://via.placeholder.com/200x200?text=知床マリン',
      website: 'https://example.com/org-002',
      contact: 'info@shiretoko-marine.jp',
      establishedYear: 2015,
      rating: 4.8,
      reviewCount: 987
    },
    {
      id: 'org-003',
      name: '阿蘇星空キャンプ',
      description: '阿蘇の大自然を舞台にしたキャンプ・星空観察ツアーを企画。家族連れにも人気のツアーを多数提供。',
      logo: 'https://via.placeholder.com/200x200?text=阿蘇星空',
      website: 'https://example.com/org-003',
      contact: 'info@aso-stargazing.jp',
      establishedYear: 2018,
      rating: 4.7,
      reviewCount: 432
    },
    {
      id: 'org-004',
      name: '白馬アドベンチャー',
      description: '白馬エリアでロッククライミング、トレッキング、マウンテンバイクなどアウトドアアクティビティを提供。',
      logo: 'https://via.placeholder.com/200x200?text=白馬アド',
      website: 'https://example.com/org-004',
      contact: 'info@hakuba-adventure.jp',
      establishedYear: 2012,
      rating: 4.8,
      reviewCount: 856
    },
    {
      id: 'org-005',
      name: '箱根リラクゼーション',
      description: '箱根の温泉と自然を楽しむリトリートツアーを企画。日帰りから宿泊まで様々なプランを提供。',
      logo: 'https://via.placeholder.com/200x200?text=箱根リラ',
      website: 'https://example.com/org-005',
      contact: 'info@hakone-relax.jp',
      establishedYear: 2016,
      rating: 4.6,
      reviewCount: 623
    }
  ],
  categories: [
    { id: 'hiking', name: 'ハイキング/トレッキング', icon: '🏞️' },
    { id: 'kayak', name: 'カヤック/カヌー', icon: '🛶' },
    { id: 'stargazing', name: '星空・天体観測', icon: '🌌' },
    { id: 'cycling', name: 'サイクリング', icon: '🚴' },
    { id: 'climbing', name: 'ロッククライミング', icon: '🧗' },
    { id: 'onsen', name: '温泉リトリート', icon: '♨️' }
  ],
  areas: [
    '北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島',
    '茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川',
    '新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜',
    '静岡', '愛知', '三重', '滋賀', '京都', '大阪', '兵庫',
    '奈良', '和歌山', '鳥取', '島根', '岡山', '広島', '山口',
    '徳島', '香川', '愛媛', '高知', '福岡', '佐賀', '長崎',
    '熊本', '大分', '宮崎', '鹿児島', '沖縄'
  ]
};

