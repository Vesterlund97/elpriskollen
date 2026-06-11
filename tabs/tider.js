function renderTider(el) {
  if (state.loading) {
    el.innerHTML = '<div class="loading">Hämtar prisdata...</div>';
    return;
  }

  if (!state.todayPrices && !state.tomorrowPrices) {
    el.innerHTML = `
      <div class="error">Prisdata ej tillgänglig.</div>
      <button class="primary" style="margin-top:12px;" onclick="loadPrices()">Försök igen</button>`;
    return;
  }

  el.innerHTML = `
    <div class="day-toggle">
      <button class="day-btn active" id="tidToday">Idag</button>
      <button class="day-btn" id="tidTomorrow">Imorgon</button>
    </div>
    <div id="tidContent"></div>
  `;

  let selectedDay = 'today';

  function getPriceClass(price, avg) {
    const ratio = price / avg;
    if (ratio < THRESHOLDS.cheap) return 'cheap';
    if (ratio < THRESHOLDS.medium) return 'medium';
    return 'expensive';
  }

  function getPriceLabel(cls) {
    if (cls === 'cheap') return 'Billig';
    if (cls === 'medium') return 'Normalt';
    return 'Dyr';
  }

  function renderTidContent() {
    const prices = selectedDay === 'today' ? state.todayPrices : state.tomorrowPrices;
    const container = document.getElementById('tidContent');

    if (!prices) {
      container.innerHTML = `<div class="error">${selectedDay === 'today' ? 'Prisdata saknas för idag.' : 'Morgondagens priser publiceras runt 13:00.'}</div>`;
      return;
    }

    const filtered = prices.filter(p => {
      const h = getHourSE(p.time_start);
      return h >= settings.startHour && h < settings.endHour;
    });

    if (!filtered.length) {
      container.innerHTML = '<div class="error">Inga priser i det valda tidsfönstret.</div>';
      return;
    }

    const dailyAvg = filtered.reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / filtered.length;
    const hours = filtered.map(p => ({
        price: parseFloat(p.SEK_per_kWh),
        time_start: p.time_start
    }));

    const rowsHTML = hours.map(h => {
    const realPrice = calcRealPrice(h.price);
    const cls = getPriceClass(h.price, dailyAvg);
    const label = getPriceLabel(cls);
    const timeStr = formatTime(h.time_start);
    const endStr = formatTime(new Date(new Date(h.time_start).getTime() + 15 * 60000));
    return `
        <div class="price-row">
          <div class="price-time">${timeStr} – ${endStr}</div>
          <div class="price-bar-wrap">
            <div class="price-bar price-bar-${cls}" style="width: ${Math.min((realPrice / (calcRealPrice(dailyAvg) * 2)) * 100, 100)}%"></div>
          </div>
          <div class="price-value price-${cls}">${formatPrice(realPrice)}</div>
          <div class="badge price-badge-${cls}">${label}</div>
        </div>`;
      }).join('');

    container.innerHTML = `
      <div class="card">
        <div class="card-title">Alla timmar — snitt ${formatPrice(calcRealPrice(dailyAvg))}</div>
        ${rowsHTML}
      </div>
    `;
  }

  renderTidContent();

  document.getElementById('tidToday').addEventListener('click', () => {
    selectedDay = 'today';
    document.getElementById('tidToday').classList.add('active');
    document.getElementById('tidTomorrow').classList.remove('active');
    renderTidContent();
  });

  document.getElementById('tidTomorrow').addEventListener('click', () => {
    selectedDay = 'tomorrow';
    document.getElementById('tidTomorrow').classList.add('active');
    document.getElementById('tidToday').classList.remove('active');
    renderTidContent();
  });
}