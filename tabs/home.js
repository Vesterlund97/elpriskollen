const WIDGET_REGISTRY = [
  { type: 'current-price',  label: 'Aktuellt pris',    icon: 'bolt',           unique: true,  defaultConfig: {} },
  { type: 'day-chart',      label: 'Dagsgraf',          icon: 'chart-bar',      unique: true,  defaultConfig: {} },
  { type: 'day-summary',    label: 'Dagssummering',     icon: 'list',           unique: true,  defaultConfig: {} },
  { type: 'price-trend',    label: 'Pristrend',         icon: 'trending-up',    unique: true,  defaultConfig: {} },
  { type: 'best-time',      label: 'Bästa tid',         icon: 'star',           unique: false, defaultConfig: { hours: 1 },
    configFields: [{ key: 'hours', label: 'Timmar', type: 'number', default: 1 }] },
  { type: 'worst-time',     label: 'Sämsta tid',        icon: 'alert-triangle', unique: false, defaultConfig: { hours: 1 },
    configFields: [{ key: 'hours', label: 'Timmar', type: 'number', default: 1 }] },
  { type: 'countdown',      label: 'Nedräkning',        icon: 'hourglass',      unique: true,  defaultConfig: {} },
  { type: 'next-expensive', label: 'Nästa dyra period', icon: 'alert',          unique: true,  defaultConfig: {} },
  { type: 'price-alarm',    label: 'Prisalarm',         icon: 'bell',           unique: false, defaultConfig: { threshold: 50 },
    configFields: [{ key: 'threshold', label: 'Tröskel (öre/kWh)', type: 'number', default: 50 }] },
  { type: 'time-alarm',     label: 'Klockalarm',        icon: 'alarm',          unique: false, defaultConfig: { alarmTime: '07:00' },
    configFields: [{ key: 'alarmTime', label: 'Tid', type: 'time', default: '07:00' }] },
  { type: 'appliance',      label: 'Apparat',           icon: 'plug',           unique: false, defaultConfig: { applianceId: '', hours: 1 },
    configFields: [
      { key: 'applianceId', label: 'Apparat', type: 'appliance-select', default: '' },
      { key: 'hours',       label: 'Timmar',  type: 'number',           default: 1  },
    ] },
  { type: 'tomorrow',       label: 'Imorgon',           icon: 'calendar',       unique: true,  defaultConfig: {} },
];

const DEFAULT_HOME_WIDGETS = [
  { id: 'w_d1', type: 'current-price', config: {} },
  { id: 'w_d2', type: 'day-chart',     config: {} },
  { id: 'w_d3', type: 'best-time',     config: { hours: 1 } },
  { id: 'w_d4', type: 'tomorrow',      config: {} },
];

let homeEditMode = false;
const alarmTimeouts = {};

function loadHomeWidgets() {
  const saved = localStorage.getItem('homeWidgets');
  if (saved) return JSON.parse(saved);
  return DEFAULT_HOME_WIDGETS.map(w => ({ ...w }));
}

function saveHomeWidgets(widgets) {
  localStorage.setItem('homeWidgets', JSON.stringify(widgets));
}

// ── Shared helpers ──────────────────────────────────────────────────────────

function _filteredDay(prices) {
  if (!prices) return [];
  return prices.filter(p => {
    const h = getHourSE(p.time_start);
    return h >= settings.startHour && h < settings.endHour;
  });
}

function _avgOf(prices) {
  if (!prices.length) return 0;
  return prices.reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / prices.length;
}

function _priceClass(price, avg) {
  if (!avg) return 'medium';
  const r = price / avg;
  if (r < THRESHOLDS.cheap)  return 'cheap';
  if (r < THRESHOLDS.medium) return 'medium';
  return 'expensive';
}

function _priceLabel(cls) {
  if (cls === 'cheap') return 'Billigt';
  if (cls === 'medium') return 'Normalt';
  return 'Dyrt';
}

function _currentEntry() {
  if (!state.todayPrices) return null;
  const now = new Date();
  return state.todayPrices.find(p =>
    now >= new Date(p.time_start) && now < new Date(p.time_end)
  ) || null;
}

function _bestBlock(prices, hours) {
  const size = Math.round(hours * 4);
  if (prices.length < size) return null;
  let best = null;
  for (let j = 0; j <= prices.length - size; j++) {
    const avg = prices.slice(j, j + size).reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / size;
    if (!best || avg < best.avg) best = { avg, entry: prices[j] };
  }
  return best;
}

function _worstBlock(prices, hours) {
  const size = Math.round(hours * 4);
  if (prices.length < size) return null;
  let worst = null;
  for (let j = 0; j <= prices.length - size; j++) {
    const avg = prices.slice(j, j + size).reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / size;
    if (!worst || avg > worst.avg) worst = { avg, entry: prices[j] };
  }
  return worst;
}

function _msDiff(ms) {
  const totalMins = Math.floor(ms / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── Widget renderers ────────────────────────────────────────────────────────

function _wCurrentPrice() {
  const prices = _filteredDay(state.todayPrices);
  const avg = _avgOf(prices);
  const cur = _currentEntry();
  if (!cur) return `
    <div class="card">
      <div class="card-title">Aktuellt pris</div>
      <div style="color:var(--text-secondary);font-size:14px;">Utanför tidsfönstret.</div>
    </div>`;
  const spot = parseFloat(cur.SEK_per_kWh);
  const real = calcRealPrice(spot);
  const cls  = _priceClass(spot, avg);
  return `
    <div class="card">
      <div class="card-title">Aktuellt pris</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="font-size:36px;font-weight:700;">${formatPrice(real)}</div>
        <div class="badge price-badge-${cls}">${_priceLabel(cls)}</div>
      </div>
      <div style="font-size:12px;color:var(--text-secondary);">
        Spotpris: ${formatPrice(spot)} &nbsp;·&nbsp; Snitt idag: ${formatPrice(calcRealPrice(avg))}
      </div>
    </div>`;
}

function _wDayChart() {
  const prices = _filteredDay(state.todayPrices);
  if (!prices.length) return '';
  const avg  = _avgOf(prices);
  const now  = new Date();

  // Group 15-min blocks into hourly bars
  const hourly = [];
  for (let i = 0; i + 4 <= prices.length; i += 4) {
    const block = prices.slice(i, i + 4);
    hourly.push({
      avg:  block.reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / 4,
      time: block[0].time_start,
    });
  }

  const maxP = Math.max(...hourly.map(h => h.avg));
  const MAX_H = 70; // px available for bars (chart is 80px, label row is 10px)
  const colorMap = { cheap: '#8bc34a', medium: '#ffb74d', expensive: '#ef5350' };

  const bars = hourly.map(h => {
    const barH  = Math.max(Math.round((h.avg / maxP) * MAX_H), 3);
    const color = colorMap[_priceClass(h.avg, avg)];
    const isNow = now >= new Date(h.time) && now < new Date(new Date(h.time).getTime() + 3600000);
    const label = new Date(h.time).toLocaleTimeString('sv-SE', {
      timeZone: 'Europe/Stockholm', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    return `
      <div class="chart-bar-col" title="${label}: ${formatPrice(calcRealPrice(h.avg))}">
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${barH}px;background:${color};${isNow ? 'outline:2px solid #fff;outline-offset:-1px;' : ''}"></div>
        </div>
        <div class="chart-bar-now">${isNow ? '▲' : ''}</div>
      </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="card-title">Dagsgraf — idag</div>
      <div class="day-chart">${bars}</div>
    </div>`;
}

function _wDaySummary() {
  const prices = _filteredDay(state.todayPrices);
  if (!prices.length) return '';
  const spots    = prices.map(p => parseFloat(p.SEK_per_kWh));
  const avg      = spots.reduce((s, v) => s + v, 0) / spots.length;
  const min      = Math.min(...spots);
  const max      = Math.max(...spots);
  const minEntry = prices.find(p => parseFloat(p.SEK_per_kWh) === min);
  const maxEntry = prices.find(p => parseFloat(p.SEK_per_kWh) === max);
  return `
    <div class="card">
      <div class="card-title">Dagssummering</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">
        <div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">LÄGST</div>
          <div style="font-size:16px;font-weight:600;color:#8bc34a;">${formatPrice(calcRealPrice(min))}</div>
          <div style="font-size:11px;color:var(--text-secondary);">${minEntry ? formatTime(minEntry.time_start) : ''}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">SNITT</div>
          <div style="font-size:16px;font-weight:600;">${formatPrice(calcRealPrice(avg))}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">HÖGST</div>
          <div style="font-size:16px;font-weight:600;color:#ef5350;">${formatPrice(calcRealPrice(max))}</div>
          <div style="font-size:11px;color:var(--text-secondary);">${maxEntry ? formatTime(maxEntry.time_start) : ''}</div>
        </div>
      </div>
    </div>`;
}

function _wPriceTrend() {
  const prices = _filteredDay(state.todayPrices);
  const cur    = _currentEntry();
  if (!cur) return '';
  const now      = new Date();
  const upcoming = prices.filter(p => new Date(p.time_start) >= now);
  if (upcoming.length < 4) return '';

  const currentSpot  = parseFloat(cur.SEK_per_kWh);
  const nextHourAvg  = upcoming.slice(0, 4).reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / 4;
  const delta        = nextHourAvg - currentSpot;
  const deltaPct     = currentSpot > 0 ? Math.abs((delta / currentSpot) * 100).toFixed(0) : 0;
  const goingUp      = delta > 0.005;
  const goingDown    = delta < -0.005;
  const icon  = goingUp   ? 'ti-trending-up'   : goingDown ? 'ti-trending-down' : 'ti-minus';
  const color = goingUp   ? '#ef5350'           : goingDown ? '#8bc34a'          : 'var(--text-secondary)';
  const label = goingUp   ? `${deltaPct}% dyrare nästa timme`
              : goingDown ? `${deltaPct}% billigare nästa timme`
              : 'Stabilt pris';

  return `
    <div class="card">
      <div class="card-title">Pristrend — kommande timme</div>
      <div style="display:flex;align-items:center;gap:12px;">
        <i class="ti ${icon}" style="font-size:32px;color:${color};"></i>
        <div>
          <div style="font-size:18px;font-weight:600;color:${color};">${label}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">
            Nu: ${formatPrice(calcRealPrice(currentSpot))} → ${formatPrice(calcRealPrice(nextHourAvg))}
          </div>
        </div>
      </div>
    </div>`;
}

function _wBestTime(config) {
  const hours  = config.hours || 1;
  const prices = _filteredDay(state.todayPrices);
  const avg    = _avgOf(prices);
  const best   = _bestBlock(prices, hours);
  if (!best) return '';
  const cls    = _priceClass(best.avg, avg);
  return `
    <div class="card">
      <div class="card-title">Bästa tid idag · ${hours}h</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:20px;font-weight:600;">
            ${formatTime(best.entry.time_start)} – ${formatTime(new Date(new Date(best.entry.time_start).getTime() + hours * 3600000))}
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">${formatPrice(calcRealPrice(best.avg))}</div>
        </div>
        <div class="badge price-badge-${cls}">${_priceLabel(cls)}</div>
      </div>
    </div>`;
}

function _wWorstTime(config) {
  const hours  = config.hours || 1;
  const prices = _filteredDay(state.todayPrices);
  const avg    = _avgOf(prices);
  const worst  = _worstBlock(prices, hours);
  if (!worst) return '';
  const cls    = _priceClass(worst.avg, avg);
  return `
    <div class="card">
      <div class="card-title">Sämsta tid idag · ${hours}h</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:20px;font-weight:600;">
            ${formatTime(worst.entry.time_start)} – ${formatTime(new Date(new Date(worst.entry.time_start).getTime() + hours * 3600000))}
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">${formatPrice(calcRealPrice(worst.avg))}</div>
        </div>
        <div class="badge price-badge-${cls}">${_priceLabel(cls)}</div>
      </div>
    </div>`;
}

function _wCountdown() {
  const prices = _filteredDay(state.todayPrices);
  const avg    = _avgOf(prices);
  const now    = new Date();
  const next   = prices.find(p =>
    new Date(p.time_start) > now && parseFloat(p.SEK_per_kWh) / avg < THRESHOLDS.cheap
  );
  if (!next) return `
    <div class="card">
      <div class="card-title">Nedräkning</div>
      <div style="color:var(--text-secondary);font-size:14px;">Ingen billig period återstår idag.</div>
    </div>`;
  return `
    <div class="card">
      <div class="card-title">Nedräkning — nästa billiga period</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:28px;font-weight:700;color:#8bc34a;">${_msDiff(new Date(next.time_start) - now)}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">
            Kl. ${formatTime(next.time_start)} · ${formatPrice(calcRealPrice(parseFloat(next.SEK_per_kWh)))}
          </div>
        </div>
        <i class="ti ti-hourglass" style="font-size:32px;color:#8bc34a;"></i>
      </div>
    </div>`;
}

function _wNextExpensive() {
  const prices = _filteredDay(state.todayPrices);
  const avg    = _avgOf(prices);
  const now    = new Date();
  const next   = prices.find(p =>
    new Date(p.time_start) > now && parseFloat(p.SEK_per_kWh) / avg >= THRESHOLDS.medium
  );
  if (!next) return `
    <div class="card">
      <div class="card-title">Nästa dyra period</div>
      <div style="color:var(--text-secondary);font-size:14px;">Inga dyra perioder återstår idag.</div>
    </div>`;
  return `
    <div class="card">
      <div class="card-title">Nästa dyra period</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:20px;font-weight:600;color:#ef5350;">Om ${_msDiff(new Date(next.time_start) - now)}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">
            Kl. ${formatTime(next.time_start)} · ${formatPrice(calcRealPrice(parseFloat(next.SEK_per_kWh)))}
          </div>
        </div>
        <i class="ti ti-alert-triangle" style="font-size:32px;color:#ef5350;"></i>
      </div>
    </div>`;
}

function _wPriceAlarm(widgetId, config) {
  const threshold    = config.threshold || 50;
  const thresholdSEK = threshold / 100;
  const cur          = _currentEntry();
  const currentSpot  = cur ? parseFloat(cur.SEK_per_kWh) : null;
  const isTriggered  = currentSpot !== null && currentSpot <= thresholdSEK;
  return `
    <div class="card${isTriggered ? ' alarm-active' : ''}">
      <div class="card-title">Prisalarm</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:16px;font-weight:600;">Under ${threshold} öre/kWh</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">
            Spotpris just nu: ${currentSpot !== null ? (currentSpot * 100).toFixed(1) + ' öre' : '—'}
          </div>
        </div>
        <div class="badge ${isTriggered ? 'badge-green' : 'badge-orange'}">${isTriggered ? 'Aktivt!' : 'Väntar'}</div>
      </div>
    </div>`;
}

function _wTimeAlarm(widgetId, config) {
  const alarmTime = config.alarmTime || '07:00';
  const [h, m]    = alarmTime.split(':').map(Number);
  const now       = new Date();
  const target    = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const isToday  = target.toDateString() === now.toDateString();
  const alarmSet = alarmTimeouts[widgetId] != null;
  return `
    <div class="card">
      <div class="card-title">Klockalarm</div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:32px;font-weight:700;">${alarmTime}</div>
        <div style="font-size:13px;color:var(--text-secondary);text-align:right;">
          ${isToday ? `Om ${_msDiff(target - now)}` : 'Imorgon'}
        </div>
      </div>
      <button class="primary" style="${alarmSet ? 'background:#8bc34a;color:#000;' : ''}"
        onclick="homeSetClockAlarm('${widgetId}', '${alarmTime}')">
        <i class="ti ti-bell"></i> ${alarmSet ? 'Avbryt alarm' : 'Ställ in alarm'}
      </button>
    </div>`;
}

function _wAppliance(config) {
  const appliances = loadAppliances();
  const appId      = config.applianceId || appliances[0]?.id;
  const hours      = config.hours || 1;
  const appliance  = appliances.find(a => a.id === appId);
  if (!appliance) return `
    <div class="card">
      <div class="card-title">Apparat</div>
      <div style="color:var(--text-secondary);font-size:14px;">Välj en apparat i inställningarna för widgeten.</div>
    </div>`;
  const prices  = _filteredDay(state.todayPrices);
  const avg     = _avgOf(prices);
  const best    = _bestBlock(prices, hours);
  if (!best) return '';
  const now        = new Date();
  const curEntry   = prices.find(p => now >= new Date(p.time_start) && now < new Date(p.time_end)) || prices[0];
  const kwhTotal   = appliance.kw * hours;
  const bestCost   = calcRealPrice(best.avg) * kwhTotal;
  const currentCost = calcRealPrice(parseFloat(curEntry?.SEK_per_kWh || 0)) * kwhTotal;
  const saving     = currentCost - bestCost;
  const cls        = _priceClass(best.avg, avg);
  return `
    <div class="card">
      <div class="card-title">${appliance.name} · ${hours}h</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:18px;font-weight:600;">
            ${formatTime(best.entry.time_start)} – ${formatTime(new Date(new Date(best.entry.time_start).getTime() + hours * 3600000))}
          </div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">
            ${kwhTotal.toFixed(1)} kWh · ${bestCost.toFixed(2)} kr
          </div>
        </div>
        <div class="badge price-badge-${cls}">
          ${saving <= 0 ? 'Nu billigast!' : `Spara ${saving.toFixed(2)} kr`}
        </div>
      </div>
    </div>`;
}

function _wTomorrow() {
  const todayPrices    = _filteredDay(state.todayPrices);
  const tomorrowPrices = _filteredDay(state.tomorrowPrices);
  const todayAvg       = _avgOf(todayPrices);
  if (!tomorrowPrices.length) return `
    <div class="card">
      <div class="card-title">Imorgon</div>
      <div style="color:var(--text-secondary);font-size:13px;">Publiceras runt 13:00.</div>
    </div>`;
  const tomorrowAvg = _avgOf(tomorrowPrices);
  const diff        = tomorrowAvg - todayAvg;
  const diffPct     = todayAvg > 0 ? Math.abs((diff / todayAvg) * 100).toFixed(0) : 0;
  const color       = diff < 0 ? '#8bc34a' : '#ef5350';
  const trendText   = diff < 0 ? `${diffPct}% billigare` : diff > 0 ? `${diffPct}% dyrare` : 'Ungefär samma';
  return `
    <div class="card">
      <div class="card-title">Imorgon</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:20px;font-weight:600;">${formatPrice(calcRealPrice(tomorrowAvg))}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">snitt inom tidsfönstret</div>
        </div>
        <div style="font-size:14px;font-weight:600;color:${color};">${trendText} än idag</div>
      </div>
    </div>`;
}

function _renderWidget(widget) {
  switch (widget.type) {
    case 'current-price':  return _wCurrentPrice();
    case 'day-chart':      return _wDayChart();
    case 'day-summary':    return _wDaySummary();
    case 'price-trend':    return _wPriceTrend();
    case 'best-time':      return _wBestTime(widget.config);
    case 'worst-time':     return _wWorstTime(widget.config);
    case 'countdown':      return _wCountdown();
    case 'next-expensive': return _wNextExpensive();
    case 'price-alarm':    return _wPriceAlarm(widget.id, widget.config);
    case 'time-alarm':     return _wTimeAlarm(widget.id, widget.config);
    case 'appliance':      return _wAppliance(widget.config);
    case 'tomorrow':       return _wTomorrow();
    default: return '';
  }
}

// ── Edit mode actions ───────────────────────────────────────────────────────

function homeToggleEdit() {
  homeEditMode = !homeEditMode;
  renderHome(document.getElementById('tabContent'));
}

function homeAddWidget(type) {
  const reg    = WIDGET_REGISTRY.find(r => r.type === type);
  if (!reg) return;
  const config = { ...reg.defaultConfig };
  if (type === 'appliance' && !config.applianceId) {
    const appliances = loadAppliances();
    if (appliances.length) config.applianceId = appliances[0].id;
  }
  const widgets = loadHomeWidgets();
  widgets.push({ id: 'w_' + Date.now(), type, config });
  saveHomeWidgets(widgets);
  renderHome(document.getElementById('tabContent'));
}

function homeRemoveWidget(id) {
  if (alarmTimeouts[id]) { clearTimeout(alarmTimeouts[id]); delete alarmTimeouts[id]; }
  saveHomeWidgets(loadHomeWidgets().filter(w => w.id !== id));
  renderHome(document.getElementById('tabContent'));
}

function homeMoveWidget(id, dir) {
  const widgets = loadHomeWidgets();
  const idx     = widgets.findIndex(w => w.id === id);
  const newIdx  = idx + dir;
  if (idx < 0 || newIdx < 0 || newIdx >= widgets.length) return;
  [widgets[idx], widgets[newIdx]] = [widgets[newIdx], widgets[idx]];
  saveHomeWidgets(widgets);
  renderHome(document.getElementById('tabContent'));
}

function homeSaveConfig(id, key, value) {
  const widgets = loadHomeWidgets();
  const w       = widgets.find(w => w.id === id);
  if (!w) return;
  w.config[key] = value;
  saveHomeWidgets(widgets);
  renderHome(document.getElementById('tabContent'));
}

function homeSetClockAlarm(widgetId, alarmTime) {
  if (alarmTimeouts[widgetId]) {
    clearTimeout(alarmTimeouts[widgetId]);
    delete alarmTimeouts[widgetId];
    renderHome(document.getElementById('tabContent'));
    return;
  }
  if (!('Notification' in window)) { alert('Din webbläsare stödjer inte notiser.'); return; }
  Notification.requestPermission().then(perm => {
    if (perm !== 'granted') { alert('Notiser blockerade — tillåt notiser i webbläsaren.'); return; }
    const [h, m] = alarmTime.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target <= new Date()) target.setDate(target.getDate() + 1);
    const delay = target.getTime() - Date.now();
    if (delay <= 0) return;
    alarmTimeouts[widgetId] = setTimeout(() => {
      new Notification('Elpriskollen', { body: `Alarm — kl. ${alarmTime}` });
      delete alarmTimeouts[widgetId];
      renderHome(document.getElementById('tabContent'));
    }, delay);
    renderHome(document.getElementById('tabContent'));
  });
}

// ── Main render ─────────────────────────────────────────────────────────────

function renderHome(el) {
  if (state.loading) { el.innerHTML = '<div class="loading">Hämtar prisdata...</div>'; return; }
  if (!state.todayPrices) {
    el.innerHTML = `
      <div class="error">Prisdata ej tillgänglig.</div>
      <button class="primary" style="margin-top:12px;" onclick="loadPrices()">Försök igen</button>`;
    return;
  }

  const widgets    = loadHomeWidgets();
  const addedTypes = new Set(widgets.map(w => w.type));

  const widgetsHTML = widgets.map((w, i) => {
    const content = _renderWidget(w);
    if (!homeEditMode) return content || '';

    const reg        = WIDGET_REGISTRY.find(r => r.type === w.type);
    const displayContent = content || `
      <div class="card" style="opacity:0.5;">
        <div class="card-title">${reg?.label || w.type}</div>
        <div style="color:var(--text-secondary);font-size:13px;">Inget att visa just nu.</div>
      </div>`;
    const configHTML = (reg?.configFields || []).map(f => {
      if (f.type === 'number') return `
        <div class="widget-config-row">
          <span>${f.label}</span>
          <input type="number" class="setting-input" value="${w.config[f.key] ?? f.default}"
            onchange="homeSaveConfig('${w.id}','${f.key}',parseFloat(this.value)||${f.default})"
            style="width:70px;">
        </div>`;
      if (f.type === 'time') return `
        <div class="widget-config-row">
          <span>${f.label}</span>
          <input type="time" class="setting-input" value="${w.config[f.key] ?? f.default}"
            onchange="homeSaveConfig('${w.id}','${f.key}',this.value)"
            style="width:90px;">
        </div>`;
      if (f.type === 'appliance-select') return `
        <div class="widget-config-row">
          <span>${f.label}</span>
          <select class="setting-select" onchange="homeSaveConfig('${w.id}','${f.key}',this.value)">
            ${loadAppliances().map(a =>
              `<option value="${a.id}"${w.config[f.key] === a.id ? ' selected' : ''}>${a.name}</option>`
            ).join('')}
          </select>
        </div>`;
      return '';
    }).join('');

    const hasConfig     = configHTML.length > 0;
    const controlsStyle = hasConfig
      ? 'border-radius:0;margin-bottom:0;'
      : 'border-radius:0 0 var(--radius) var(--radius);margin-bottom:12px;';

    return `
      <div class="widget-edit-block">
        ${displayContent}
        <div class="widget-controls" style="${controlsStyle}">
          <div style="display:flex;gap:6px;">
            <button class="icon-btn" onclick="homeMoveWidget('${w.id}',-1)"${i === 0 ? ' disabled' : ''}>
              <i class="ti ti-chevron-up"></i>
            </button>
            <button class="icon-btn" onclick="homeMoveWidget('${w.id}',1)"${i === widgets.length - 1 ? ' disabled' : ''}>
              <i class="ti ti-chevron-down"></i>
            </button>
          </div>
          <button class="icon-btn danger" onclick="homeRemoveWidget('${w.id}')">
            <i class="ti ti-trash"></i>
          </button>
        </div>
        ${hasConfig ? `<div class="widget-config">${configHTML}</div>` : ''}
      </div>`;
  }).join('');

  const pickerHTML = homeEditMode ? `
    <div class="card">
      <div class="card-title">Lägg till widget</div>
      <div class="widget-picker-grid">
        ${WIDGET_REGISTRY.map(reg => {
          const disabled = reg.unique && addedTypes.has(reg.type);
          return `
            <button class="widget-picker-item${disabled ? ' disabled' : ''}"
              ${disabled ? 'disabled' : `onclick="homeAddWidget('${reg.type}')"`}>
              <i class="ti ti-${reg.icon}" style="font-size:20px;"></i>
              <span>${reg.label}</span>
            </button>`;
        }).join('')}
      </div>
    </div>` : '';

  el.innerHTML = `
    <div class="home-edit-bar">
      <button class="icon-btn" onclick="homeToggleEdit()" title="${homeEditMode ? 'Klar' : 'Anpassa startsidan'}">
        <i class="ti ti-${homeEditMode ? 'check' : 'layout-grid-add'}"></i>
      </button>
    </div>
    ${widgetsHTML}
    ${pickerHTML}`;
}
