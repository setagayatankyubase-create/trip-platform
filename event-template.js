// イベント詳細ページのテンプレートレンダラー

const EventPageRenderer = {
  // イベントデータからページをレンダリング
  render(event, organizer) {
    if (!event) {
      this.renderNotFound();
      return;
    }

    this.renderHeader(event);
    this.renderBreadcrumbs(event);
    this.renderTitle(event);
    this.renderGallery(event);
    this.renderContent(event, organizer);
    this.renderBooking(event, organizer);
    this.renderStructuredData(event);
  },

  // ヘッダー情報
  renderHeader(event) {
    document.title = `${event.title} | そとなび`;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) {
      metaDesc.content = event.description;
    }
  },

  // パンくずリスト
  renderBreadcrumbs(event) {
    const breadcrumbCategory = document.getElementById('breadcrumb-category');
    if (breadcrumbCategory) {
      // eventMeta または eventData からカテゴリを取得
      const categories = (window.eventMeta && window.eventMeta.categories) 
        ? window.eventMeta.categories 
        : (window.eventData && window.eventData.categories) 
          ? window.eventData.categories 
          : [];
      const category = categories.find(c => c.id === event.categoryId || c.id === event.category_id);
      breadcrumbCategory.textContent = category ? category.name : (event.category || '');
    }
  },

  // タイトルとバッジ
  renderTitle(event) {
    const titleEl = document.getElementById('event-title');
    if (titleEl) {
      titleEl.textContent = event.title;
    }

    const badgesContainer = document.getElementById('event-badges');
    if (badgesContainer) {
      const badges = [];
      if (event.isRecommended) badges.push('<span class="badge recommended">おすすめ</span>');
      if (event.isNew) badges.push('<span class="badge new">新着</span>');
      if (event.externalLink) badges.push('<span class="badge external-link">外部申込可</span>');
      badgesContainer.innerHTML = badges.join('');
    }
  },

  // ギャラリー
  renderGallery(event) {
    const mainImage = document.getElementById('event-main-image');
    if (mainImage) {
      const imageUrl = event.image || event.thumb || event.mainImage || '';
      if (imageUrl) {
        mainImage.style.backgroundImage = `url('${imageUrl}')`;
      }
    }
  },

  // メインコンテンツ
  renderContent(event, organizer) {
    if (!event) {
      console.error('Event is null or undefined');
      return;
    }

    // 説明
    const descEl = document.getElementById('event-description');
    if (descEl) {
      descEl.textContent = event.description || '説明がありません';
    }

    // 基本情報
    const durationEl = document.getElementById('event-duration');
    if (durationEl) {
      durationEl.textContent = event.duration || '未設定';
    }

    const locationEl = document.getElementById('event-location');
    if (locationEl) {
      if (event.location && event.location.name) {
        locationEl.textContent = event.location.name;
      } else if (event.area || event.prefecture) {
        locationEl.textContent = [event.area, event.prefecture].filter(Boolean).join(', ') || '未設定';
      } else if (event.city) {
        locationEl.textContent = event.city;
      } else {
        locationEl.textContent = '未設定';
      }
    }

    const targetAgeEl = document.getElementById('event-target-age');
    if (targetAgeEl) {
      targetAgeEl.textContent = event.targetAge || '全年齢';
    }

    const priceEl = document.getElementById('event-price');
    if (priceEl) {
      if (event.price !== undefined && event.price !== null) {
        priceEl.textContent = typeof event.price === 'number' ? event.price.toLocaleString() : event.price;
      } else {
        priceEl.textContent = '未設定';
      }
    }

    // 開催日程
    this.renderDates(event);

    // ハイライト
    this.renderHighlights(event);

    // 注意事項
    const notesEl = document.getElementById('event-notes');
    if (notesEl) {
      notesEl.textContent = event.notes || '特になし';
    }

    // 提供元
    this.renderOrganizer(organizer);

    // 地図
    this.renderMap(event);

    // 関連イベント
    this.renderRelatedEvents(event);
  },

  // 開催日程
  renderDates(event) {
    const datesList = document.getElementById('event-dates');
    const bookingDateSelect = document.getElementById('booking-date');

    if (datesList) {
      datesList.innerHTML = '';
    }
    if (bookingDateSelect) {
      bookingDateSelect.innerHTML = '<option value="">選択してください</option>';
    }

    // dates が存在し、配列であることを確認
    if (!event.dates || !Array.isArray(event.dates) || event.dates.length === 0) {
      if (datesList) {
        datesList.innerHTML = '<li>開催日程が未設定です</li>';
      }
      return;
    }

    event.dates.forEach(d => {
      if (!d || !d.date) return;
      const dateObj = new Date(d.date);
      if (isNaN(dateObj.getTime())) return;
      
      const dateStr = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
      const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
      const timeStr = d.time || '';

      if (datesList) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${dateStr}(${weekday}) ${timeStr}</span>`;
        datesList.appendChild(li);
      }

      if (bookingDateSelect) {
        const option = document.createElement('option');
        option.value = d.date;
        option.textContent = `${dateStr}(${weekday}) ${timeStr}`;
        bookingDateSelect.appendChild(option);
      }
    });
  },

  // ハイライト
  renderHighlights(event) {
    const highlightsList = document.getElementById('event-highlights');
    if (!highlightsList) return;

    highlightsList.innerHTML = '';
    if (event.highlights && event.highlights.length > 0) {
      event.highlights.forEach(h => {
        const li = document.createElement('li');
        li.textContent = h;
        highlightsList.appendChild(li);
      });
      highlightsList.parentElement.style.display = 'block';
    } else {
      highlightsList.parentElement.style.display = 'none';
    }
  },

  // 提供元
  renderOrganizer(organizer) {
    const organizerInfo = document.getElementById('organizer-info');
    const organizerLink = document.getElementById('organizer-link');

    if (!organizer) return;

    if (organizerInfo) {
      organizerInfo.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <img src="${organizer.logo}" alt="${organizer.name}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background: #f0f0f0;">
          <div>
            <h4 style="margin: 0 0 8px 0;">${organizer.name}</h4>
            <p style="margin: 0; color: #6c7a72; font-size: 0.9rem;">${organizer.description}</p>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #6c7a72;">
              設立: ${organizer.establishedYear}年 | 評価: ★${organizer.rating} (${organizer.reviewCount}件)
            </div>
          </div>
        </div>
      `;
    }

    if (organizerLink) {
      organizerLink.href = `organizer-detail.html?id=${organizer.id}`;
    }
  },

  // Googleマップ埋め込み
  renderMap(event) {
    const mapIframe = document.getElementById('event-map');
    if (!mapIframe) return;

    // lat/lng がある場合はそれを優先して使用
    let mapQuery = '';
    if (event.location && event.location.lat && event.location.lng) {
      mapQuery = `${event.location.lat},${event.location.lng}`;
    } else if (event.location && event.location.name) {
      mapQuery = `${event.location.name} ${event.prefecture || ''}`;
    } else {
      mapQuery = `${event.area || ''} ${event.prefecture || ''}`;
    }

    const encodedQuery = encodeURIComponent(mapQuery.trim());
    const src = `https://www.google.com/maps?q=${encodedQuery}&hl=ja&z=13&output=embed`;

    mapIframe.src = src;
  },

  // 関連イベント（eventIndex ベース）
  renderRelatedEvents(event) {
    const section = document.getElementById('related-events-section');
    const container = document.getElementById('related-events');
    
    if (!section || !container) {
      console.warn('関連イベントセクションまたはコンテナが見つかりません');
      return;
    }
    
    // eventIndex を優先、なければ eventData にフォールバック
    const index = Array.isArray(window.eventIndex) ? window.eventIndex : [];
    const others = index.filter(e => e.id !== event.id);
    
    if (others.length === 0) {
      section.style.display = 'none';
      return;
    }

    // イベントの最初の日付を取得するヘルパー（index用）
    const getFirstDate = (e) => {
      if (e.next_date) {
        return new Date(e.next_date);
      }
      if (e.date_min) {
        return new Date(e.date_min);
      }
      // フォールバック：eventData の dates を使う
      if (eventData && eventData.events) {
        const full = eventData.events.find(ev => ev.id === e.id);
        if (full && full.dates && full.dates.length > 0) {
          const sorted = [...full.dates].sort((a, b) => new Date(a.date) - new Date(b.date));
          return new Date(sorted[0].date);
        }
      }
      return null;
    };

    const baseDate = event.next_date 
      ? new Date(event.next_date)
      : (event.dates && event.dates.length > 0)
        ? new Date(event.dates[0].date)
        : null;

    // スコアリングして関連度順にソート
    const scored = others.map(e => {
      let score = 0;
      if (e.categoryId === event.categoryId) score += 5;
      const eArea = e.area || e.city;
      const eventArea = event.area || event.city;
      if (eArea === eventArea) score += 3;
      if (e.prefecture === event.prefecture) score += 1;

      const d = getFirstDate(e);
      if (baseDate && d) {
        const diffDays = Math.abs(d - baseDate) / (1000 * 60 * 60 * 24);
        // 日付が近いほど高スコア（最大 +3）
        score += Math.max(0, 3 - Math.min(diffDays, 3));
      }

      return { event: e, score };
    }).sort((a, b) => b.score - a.score);

    // スコアが0以上なら表示（スコアが0でも最大4件表示）
    const related = scored
      .slice(0, 4)
      .map(item => item.event);

    if (!related.length) {
      section.style.display = 'none';
      return;
    }

    // 4カード横並びで表示（最大4件）
    if (typeof CardRenderer === 'undefined' || !CardRenderer.render) {
      console.error('CardRendererが見つかりません');
      section.style.display = 'none';
      return;
    }

    container.innerHTML = related.map(e => CardRenderer.render(e)).join('');
    
    // 4カード横並びのスタイルを適用
    container.className = 'related-events-grid';
    section.style.display = 'block';
  },

  // 予約セクション
  renderBooking(event, organizer) {
    // 価格（最優先・固定）
    const bookingPrice = document.getElementById('booking-price');
    const bookingPriceMeta = document.getElementById('booking-price-meta');
    if (bookingPrice) {
      bookingPrice.textContent = event.price.toLocaleString();
    }
    if (bookingPriceMeta) {
      // 単位（人 / 組 / 家族など）があれば表示、なければ「人」
      const unit = event.priceUnit || '人';
      const suffix = event.priceSuffix || '税込';
      bookingPriceMeta.textContent = ` / ${unit}（${suffix}）`;
    }

    // 開催日：プルダウン + 直近開催表示
    const dateSelect = document.getElementById('booking-date');
    const nextDateWrap = document.getElementById('booking-next-date');
    const nextDateText = document.getElementById('booking-next-date-text');

    if (dateSelect && Array.isArray(event.dates)) {
      // 一旦クリア
      dateSelect.innerHTML = '<option value="">日付を選択してください</option>';

      event.dates.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.date;
        const dateObj = new Date(d.date);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        opt.textContent = `${month}月${day}日 (${d.time})`;
        dateSelect.appendChild(opt);
      });

      if (event.dates.length > 0 && nextDateWrap && nextDateText) {
        const first = event.dates[0];
        const firstDate = new Date(first.date);
        const month = firstDate.getMonth() + 1;
        const day = firstDate.getDate();
        nextDateText.textContent = `${month}月${day}日`;
        nextDateWrap.style.display = 'block';
      }
    }

    const bookingBtn = document.getElementById('external-booking-btn');
    if (bookingBtn) {
      if (event.externalLink) {
        bookingBtn.href = event.externalLink;
        bookingBtn.textContent = '公式サイトへ進む';
        bookingBtn.style.display = 'block';
        
        // 既存のイベントリスナーを削除（重複登録を防ぐ）
        const oldHandler = bookingBtn._clickTrackerHandler;
        if (oldHandler) {
          bookingBtn.removeEventListener('click', oldHandler);
          bookingBtn._clickTrackerHandler = null;
        }
        
        // 既に登録済みの場合はスキップ（重複登録を防ぐ）
        if (bookingBtn._clickTrackerHandler) {
          console.log('[ClickTracker] [公式サイトボタン] 既にイベントリスナーが登録済み、スキップします');
          return;
        }
        
        // クリックイベントリスナーを登録（計測処理）
        const clickHandler = function(e) {
          // 重複送信防止：アトミック操作でチェック＆セット
          const sentFlagKey = `sotonavi_sent_button_${event.id}`;
          const currentTimestamp = Date.now();
          
          // アトミックにチェック＆セット（重複送信を完全に防ぐ）
          let canSend = false;
          try {
            const lastSent = sessionStorage.getItem(sentFlagKey);
            if (!lastSent) {
              // フラグが存在しない場合は送信を許可し、フラグをセット
              sessionStorage.setItem(sentFlagKey, currentTimestamp.toString());
              canSend = true;
            } else {
              const lastSentTime = parseInt(lastSent, 10);
              const timeDiff = currentTimestamp - lastSentTime;
              // 5秒以内の送信は重複として扱う（より厳格に）
              if (timeDiff >= 5000) {
                // 5秒以上経過している場合は送信を許可し、フラグを更新
                sessionStorage.setItem(sentFlagKey, currentTimestamp.toString());
                canSend = true;
              } else {
                console.log('[ClickTracker] [公式サイトボタン] 5秒以内に送信済み、スキップします（重複防止）');
              }
            }
          } catch (storageError) {
            // sessionStorageが使えない場合は送信を許可
            console.warn('[ClickTracker] sessionStorage error:', storageError);
            canSend = true;
          }

          // 送信が許可されていない場合は終了
          if (!canSend) {
            return;
          }
          
          // 既に処理中ならスキップ（連続クリック防止）
          if (bookingBtn._clickProcessing) {
            console.log('[ClickTracker] 処理中のためスキップします');
            // フラグを削除（リトライ可能にする）
            try {
              sessionStorage.removeItem(sentFlagKey);
            } catch (e) {
              // 無視
            }
            return;
          }
          bookingBtn._clickProcessing = true;
          
          // 少し遅延してフラグをリセット（連続クリック防止のため）
          setTimeout(() => {
            bookingBtn._clickProcessing = false;
          }, 1000);
            // 連打防止：10分間に1イベント1回まで（同じ人がクリックするのを制限）
            // 各イベントIDごとに独立して記録される
            // 「公式サイトへ進む」ボタンは、カードリンクとは別のキーを使用（別々に計測）
            const storageKey = `sotonavi_clicked_button_${event.id}`; // カードリンクとは別のキー
            console.log('[ClickTracker] [公式サイトボタン] Using storageKey:', storageKey);
            const RESET_PERIOD_MS = 10 * 60 * 1000; // 10分
            const now = Date.now();
            
            // まず、前回のタイムスタンプをチェック
            let shouldSkip = false;
            try {
              const cached = localStorage.getItem(storageKey);
              console.log('[ClickTracker] [公式サイトボタン] cached value:', cached);
              if (cached) {
                let timestamp = null;
                
                // 新しい形式 { eventId, timestamp } か古い形式（文字列のタイムスタンプ）に対応
                try {
                  const parsed = JSON.parse(cached);
                  if (parsed && typeof parsed === 'object' && parsed.timestamp) {
                    // 新しい形式：eventIdも確認（念のため）
                    if (parsed.eventId === event.id) {
                      timestamp = parsed.timestamp;
                    } else {
                      // 異なるeventIdのデータが混入している場合は削除
                      console.warn('Stale data for different eventId, removing:', storageKey);
                      localStorage.removeItem(storageKey);
                    }
                  }
                } catch (e) {
                  // JSONとしてパースできない場合は古い形式（文字列のタイムスタンプ）として扱う
                  const oldTimestamp = Number(cached);
                  if (!isNaN(oldTimestamp) && oldTimestamp > 0) {
                    timestamp = oldTimestamp;
                  }
                }
                
                // タイムスタンプがある場合、10分以内かチェック
                if (timestamp) {
                  const age = now - timestamp; // 現在時刻との差分を計算
                  const lastClickTime = new Date(timestamp).toLocaleString('ja-JP');
                  const ageSeconds = Math.round(age / 1000);
                  const ageMinutes = Math.round(age / 60000 * 10) / 10;
                  console.log(`[ClickTracker] Event ${event.id}: 最後にクリックした時刻 = ${lastClickTime}, 経過時間 = ${ageMinutes}分 (${ageSeconds}秒)`);
                  
                  if (age < RESET_PERIOD_MS) {
                    console.log(`このイベントは既に計測済みです（10分以内）: ${event.id} - 最後のクリック: ${lastClickTime} (${ageMinutes}分前)`);
                    // 計測はスキップするが、遷移は実行される
                    shouldSkip = true;
                  } else {
                    // 10分経過しているので古いデータを削除
                    console.log(`[ClickTracker] Event ${event.id}: キャッシュ期限切れ（${ageMinutes}分経過）、削除します`);
                    localStorage.removeItem(storageKey);
                  }
                }
              }
            } catch (storageError) {
              // localStorageが使えない環境でも計測は続行
              console.warn('localStorageエラー（計測は続行）:', storageError);
            }
            
            // 10分以内にクリックされていた場合は、計測をスキップ（遷移は実行される）
            if (shouldSkip) {
              bookingBtn._clickProcessing = false; // フラグをリセット
              return;
            }
            
            // 今回のクリック時刻を即座に保存（重複実行を防ぐため）
            console.log('[ClickTracker] [公式サイトボタン] タイムスタンプを保存します（計測を続行）');
            try {
              const cacheData = {
                eventId: event.id,
                timestamp: now
              };
              localStorage.setItem(storageKey, JSON.stringify(cacheData));
              const savedTime = new Date(now).toLocaleString('ja-JP');
              console.log(`[ClickTracker] [公式サイトボタン] ✅ クリック時刻を先に保存しました: ${event.id} - 保存時刻: ${savedTime}`);
            } catch (storageError) {
              console.warn('localStorage保存エラー:', storageError);
            }
            
            // organizer が null の場合でも、event 側の organizerId / organizer_id から拾う
            const organizerIdForCount =
              (organizer && organizer.id) ||
              event.organizerId ||
              event.organizer_id ||
              null;

            // 計測処理（失敗しても遷移は実行）
            const measurementData = {
              token: 'sotonavi_click_9F2kA8R7mQX3LZpD5YwE11', // GAS側のCLICK_SECRETと一致
              event_id: event.id,
              organizer_id: organizerIdForCount
            };
            
            const gasUrl = 'https://script.google.com/macros/s/AKfycbyHnX2Z4jnTHfYSCFFaOVmVdIf6yY2edAMTCEyAOUn0Mak2Mam67CQ0g-V26zAJSVJphw/exec';
            
            // navigator.sendBeaconのみを使用（ページ遷移時も確実に送信、重複送信を防ぐ）
            // text/plainを使用することでCORSプリフライトを回避
            // フラグは既にアトミックにセットされているため、ここでは送信のみ実行
            try {
              const jsonData = JSON.stringify(measurementData);
              console.log("[ClickTracker] [公式サイトボタン] Sending to GAS:", measurementData);
              
              const blob = new Blob([jsonData], { type: 'text/plain;charset=utf-8' });
              const queued = navigator.sendBeacon(gasUrl, blob);
              console.log('[ClickTracker] [公式サイトボタン] sendBeacon queued:', queued);
              
              if (!queued) {
                console.warn('[ClickTracker] [公式サイトボタン] sendBeacon failed (but continuing)');
                // 失敗時はフラグを削除（リトライ可能にする）
                try {
                  sessionStorage.removeItem(sentFlagKey);
                } catch (e) {
                  // 無視
                }
              } else {
                // 送信成功時は5秒後にフラグを削除（次のクリックを許可、ただし10分制限はlocalStorageで管理）
                setTimeout(() => {
                  try {
                    sessionStorage.removeItem(sentFlagKey);
                  } catch (e) {
                    // 無視
                  }
                }, 5000); // 5秒後
              }
            } catch (beaconErr) {
              console.error('[ClickTracker] [公式サイトボタン] sendBeacon error:', beaconErr);
              // エラー時はフラグを削除（リトライ可能にする）
              try {
                sessionStorage.removeItem(sentFlagKey);
              } catch (e) {
                // 無視
              }
            }
            
            // タイムスタンプは既に保存済み（上で先に保存している）
            // 10分後にフラグを削除（簡易実装）
            setTimeout(() => {
              try {
                localStorage.removeItem(storageKey);
              } catch (e) {
                // 無視
              }
            }, RESET_PERIOD_MS);
            
            // 既存の遷移処理はそのまま実行（<a>タグのデフォルト動作）
            // preventDefault はしないので、通常通り外部サイトに遷移する
          };
        
        // ハンドラを参照として保存（後で削除できるように）
        bookingBtn._clickTrackerHandler = clickHandler;
        bookingBtn.addEventListener('click', clickHandler);
      } else {
        bookingBtn.style.display = 'none';
      }
    }
  },

  // 構造化データ
  renderStructuredData(event) {
    const structuredDataEl = document.getElementById('event-structured-data');
    if (!structuredDataEl) return;

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": event.title,
      "description": event.description,
      "image": event.image,
      "startDate": event.dates[0] ? `${event.dates[0].date}T${event.dates[0].time}:00` : "",
      "location": {
        "@type": "Place",
        "name": event.location ? event.location.name : `${event.area}, ${event.prefecture}`,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": event.area,
          "addressRegion": event.prefecture
        }
      },
      "offers": {
        "@type": "Offer",
        "price": event.price,
        "priceCurrency": "JPY"
      }
    };

    structuredDataEl.textContent = JSON.stringify(structuredData);
  },

  // 404表示
  renderNotFound() {
    const page = document.querySelector('.page');
    if (page) {
      page.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h2>イベントが見つかりませんでした</h2>
          <p><a href="list.html">イベント一覧に戻る</a></p>
        </div>
      `;
    }
  }
};

