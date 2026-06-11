function renderInstallningar(el) {
  el.innerHTML = `
    <div class="card">
      <div class="card-title">Utseende</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Tema</div>
          <div class="setting-sub">Mörkt eller ljust läge</div>
        </div>
        <div class="toggle-group">
          <button class="toggle-btn ${settings.theme === 'dark' ? 'active' : ''}" onclick="saveSetting('theme', 'dark')">Mörkt</button>
          <button class="toggle-btn ${settings.theme === 'light' ? 'active' : ''}" onclick="saveSetting('theme', 'light')">Ljust</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Elområde</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Område</div>
          <div class="setting-sub">Välj ditt elområde</div>
        </div>
        <select class="setting-select" onchange="saveSetting('zone', this.value); loadPrices();">
          <option value="SE1" ${settings.zone === 'SE1' ? 'selected' : ''}>SE1 — Luleå</option>
          <option value="SE2" ${settings.zone === 'SE2' ? 'selected' : ''}>SE2 — Sundsvall</option>
          <option value="SE3" ${settings.zone === 'SE3' ? 'selected' : ''}>SE3 — Stockholm</option>
          <option value="SE4" ${settings.zone === 'SE4' ? 'selected' : ''}>SE4 — Malmö</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Visning</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Valuta</div>
          <div class="setting-sub">Visa pris i kronor eller öre</div>
        </div>
        <div class="toggle-group">
          <button class="toggle-btn ${settings.currency === 'kr' ? 'active' : ''}" onclick="saveSetting('currency', 'kr')">kr</button>
          <button class="toggle-btn ${settings.currency === 'öre' ? 'active' : ''}" onclick="saveSetting('currency', 'öre')">öre</button>
        </div>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Tidsformat</div>
          <div class="setting-sub">24-timmars eller 12-timmars</div>
        </div>
        <div class="toggle-group">
          <button class="toggle-btn ${settings.timeFormat === '24h' ? 'active' : ''}" onclick="saveSetting('timeFormat', '24h')">24h</button>
          <button class="toggle-btn ${settings.timeFormat === '12h' ? 'active' : ''}" onclick="saveSetting('timeFormat', '12h')">12h</button>
        </div>
      </div>
    </div>
  <div class="card">
      <div class="card-title">Elkostnader</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Påslag elhandlare</div>
          <div class="setting-sub">öre/kWh</div>
        </div>
        <input type="number" class="setting-input" value="${settings.markup || 0}" 
          onchange="saveSetting('markup', parseFloat(this.value) || 0)">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Elcertifikat</div>
          <div class="setting-sub">öre/kWh</div>
        </div>
        <input type="number" class="setting-input" value="${settings.certificate || 0}"
          onchange="saveSetting('certificate', parseFloat(this.value) || 0)">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Energiskatt</div>
          <div class="setting-sub">öre/kWh</div>
        </div>
        <input type="number" class="setting-input" value="${settings.energyTax || 0}"
          onchange="saveSetting('energyTax', parseFloat(this.value) || 0)">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Nätavgift</div>
          <div class="setting-sub">öre/kWh</div>
        </div>
        <input type="number" class="setting-input" value="${settings.gridFee || 0}"
          onchange="saveSetting('gridFee', parseFloat(this.value) || 0)">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Moms</div>
          <div class="setting-sub">% på spotpris + pålägg</div>
        </div>
        <input type="number" class="setting-input" value="${settings.vat ?? 25}"
          onchange="saveSetting('vat', parseFloat(this.value || '25'))">
      </div>
    </div>
    <div class="card">
      <div class="card-title">Tidsintervall</div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Från</div>
          <div class="setting-sub">Tidigaste timme · Tomt = från midnatt</div>
        </div>
        <input type="number" class="setting-input" min="0" max="23"
          value="${settings.startHour}"
          onchange="saveSetting('startHour', this.value === '' ? 0 : parseInt(this.value))">
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <div class="setting-label">Till</div>
          <div class="setting-sub">Senaste timme (exkl.) · Tomt = till midnatt</div>
        </div>
        <input type="number" class="setting-input" min="1" max="24"
          value="${settings.endHour}"
          onchange="saveSetting('endHour', this.value === '' ? 24 : parseInt(this.value))">
      </div>
    </div>
    `;
}