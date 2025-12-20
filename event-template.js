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
      const category = eventData.categories.find(c => c.id === event.categoryId);
      breadcrumbCategory.textContent = category ? category.name : event.category;
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
      mainImage.style.backgroundImage = `url('${event.image}')`;
    }
  },

  // メインコンテンツ
  renderContent(event, organizer) {
    // 説明
    const descEl = document.getElementById('event-description');
    if (descEl) {
      descEl.textContent = event.description;
    }

    // 基本情報
    const durationEl = document.getElementById('event-duration');
    if (durationEl) {
      durationEl.textContent = event.duration;
    }

    const locationEl = document.getElementById('event-location');
    if (locationEl) {
      locationEl.textContent = event.location ? event.location.name : `${event.area}, ${event.prefecture}`;
    }

    const targetAgeEl = document.getElementById('event-target-age');
    if (targetAgeEl) {
      targetAgeEl.textContent = event.targetAge || '全年齢';
    }

    const priceEl = document.getElementById('event-price');
    if (priceEl) {
      priceEl.textContent = event.price.toLocaleString();
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

    event.dates.forEach(d => {
      const dateObj = new Date(d.date);
      const dateStr = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
      const weekday = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];

      if (datesList) {
        const li = document.createElement('li');
        li.innerHTML = `<span>${dateStr}(${weekday}) ${d.time}</span>`;
        datesList.appendChild(li);
      }

      if (bookingDateSelect) {
        const option = document.createElement('option');
        option.value = d.date;
        option.textContent = `${dateStr}(${weekday}) ${d.time}`;
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
        }
        
        // クリックイベントリスナーを登録（計測処理）
        const clickHandler = function(e) {
          // 既に処理中ならスキップ（連続クリック防止）
          if (bookingBtn._clickProcessing) {
            console.log('[ClickTracker] 処理中のためスキップします');
            return;
          }
          bookingBtn._clickProcessing = true;
          
          // 少し遅延してフラグをリセット（連続クリック防止のため）
          setTimeout(() => {
            bookingBtn._clickProcessing = false;
          }, 1000);
            // 連打防止：10分間に1イベント1回まで（同じ人がクリックするのを制限）
            // 各イベントIDごとに独立して記録される
            const storageKey = `sotonavi_clicked_${event.id}`;
            console.log('[ClickTracker] Using storageKey:', storageKey);
            const RESET_PERIOD_MS = 10 * 60 * 1000; // 10分
            
            try {
              const cached = localStorage.getItem(storageKey);
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
                  const age = Date.now() - timestamp;
                  const lastClickTime = new Date(timestamp).toLocaleString('ja-JP');
                  const ageSeconds = Math.round(age / 1000);
                  const ageMinutes = Math.round(age / 60000 * 10) / 10;
                  console.log(`[ClickTracker] Event ${event.id}: 最後にクリックした時刻 = ${lastClickTime}, 経過時間 = ${ageMinutes}分 (${ageSeconds}秒)`);
                  if (age < RESET_PERIOD_MS) {
                    console.log(`このイベントは既に計測済みです（10分以内）: ${event.id} - 最後のクリック: ${lastClickTime} (${ageMinutes}分前)`);
                    // 計測はスキップするが、遷移は実行される
                    return;
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
            
            const gasUrl = 'https://script.google.com/macros/s/AKfycbw7G7Rf3wK2o8eS9V9VgNHtQvrTdMnhpoHxkXlR7Om9YdOLTP9nAjcdX4uN4xOeHKVHJw/exec';
            
            try {
              // fetchで計測データを送信（デバッグ用にCORSモードでレスポンスを確認）
              const jsonData = JSON.stringify(measurementData);
              console.log("Sending to GAS:", measurementData);
              
              fetch(gasUrl, {
                method: 'POST',
                body: jsonData,
                keepalive: true,
                mode: 'cors', // デバッグ用にCORSモードにしてレスポンスを確認
                headers: {
                  'Content-Type': 'text/plain;charset=utf-8'
                }
              })
              .then(response => response.text())
              .then(text => {
                console.log('GAS response:', text);
                if (text === 'ok') {
                  console.log('✅ Click tracked successfully');
                } else {
                  console.warn('⚠️ GAS returned:', text);
                }
              })
              .catch(function(err) {
                console.warn('Fetch failed:', err);
                // フォールバック: sendBeaconを試す
                try {
                  const blob = new Blob([jsonData], { type: 'text/plain;charset=utf-8' });
                  navigator.sendBeacon(gasUrl, blob);
                } catch (beaconErr) {
                  console.error('sendBeacon also failed:', beaconErr);
                }
              });
              
              // 送信済みフラグを保存（10分間有効、送信成功・失敗に関わらず記録）
              try {
                const now = Date.now();
                const cacheData = {
                  eventId: event.id, // 確実にeventIdを含める
                  timestamp: now
                };
                localStorage.setItem(storageKey, JSON.stringify(cacheData));
                const savedTime = new Date(now).toLocaleString('ja-JP');
                console.log(`[ClickTracker] ✅ クリック時刻を保存しました: ${event.id} - 保存時刻: ${savedTime}`, cacheData);
                // 10分後にフラグを削除（簡易実装）
                setTimeout(() => {
                  try {
                    localStorage.removeItem(storageKey);
                  } catch (e) {
                    // 無視
                  }
                }, RESET_PERIOD_MS);
              } catch (storageError) {
                // localStorage保存失敗は無視
              }
            } catch (error) {
              // 計測処理が失敗してもエラーを出さず、遷移は実行
              console.warn('計測処理でエラーが発生しました:', error);
            }
            
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

