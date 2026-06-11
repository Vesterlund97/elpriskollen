function loadCards() {
  const saved = localStorage.getItem('priceCards');
  if (saved) return JSON.parse(saved);
  return [];
}

function saveCards(cards) {
  localStorage.setItem('priceCards', JSON.stringify(cards));
}

function renderPriser(el) {
  const cards = loadCards();
  const appliances = loadAppliances();

  el.innerHTML = `
    <div class="day-toggle">
      <button class="day-btn active" id="priserToday">Idag</button>
      <button class="day-btn" id="priserTomorrow">Imorgon</button>
    </div>
    <div id="cardsContent"></div>
    <button class="primary" style="margin-top:8px;" onclick="showAddCard()">
      <i class="ti ti-plus"></i> Lägg till kort
    </button>
    <div id="addCardForm" style="display:none;">
      <div class="card" style="margin-top:12px;">
        <div class="card-title">Nytt kort</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <input type="text" id="cardName" placeholder="Kortnamn (ex. Eco 3h)" class="setting-input" style="width:100%;">
          <select id="cardAppliance" class="setting-select" style="width:100%;">
            ${appliances.map(a => `<option value="${a.id}">${a.name} (${a.kw} kW)</option>`).join('')}
          </select>
          <div style="display:flex; gap:8px;">
            <input type="number" id="cardHours" placeholder="Timmar" class="setting-input" style="flex:1;">
            <button class="primary" style="flex:1;" onclick="addCard()">Spara</button>
          </div>
        </div>
      </div>
    </div>
  `;

  let selectedDay = 'today';

  function renderCards() {
    const prices = selectedDay === 'today' ? state.todayPrices : state.tomorrowPrices;
    const container = document.getElementById('cardsContent');

    if (!prices) {
      container.innerHTML = `<div class="error">${selectedDay === 'today' ? 'Prisdata saknas för idag.' : 'Morgondagens priser publiceras runt 13:00.'}</div>`;
      return;
    }

    if (cards.length === 0) {
      container.innerHTML = '<div class="loading">Inga kort ännu — lägg till ett!</div>';
      return;
    }

    const filteredPrices = prices.filter(p => {
        const h = getHourSE(p.time_start);
        return h >= settings.startHour && h < settings.endHour;
    });

    if (!filteredPrices.length) {
      container.innerHTML = '<div class="error">Inga priser i det valda tidsfönstret.</div>';
      return;
    }

    const dailyAvg = filteredPrices.reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / filteredPrices.length;

    container.innerHTML = cards.map((card, i) => {
      const appliance = appliances.find(a => a.id === card.applianceId);
      if (!appliance) return '';

      const cardBlockSize = Math.round(card.hours * 4);
      const blocks = [];
      for (let j = 0; j <= filteredPrices.length - cardBlockSize; j++) {
        const block = filteredPrices.slice(j, j + cardBlockSize);
        const avg = block.reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / cardBlockSize;
        blocks.push({ avg, entry: filteredPrices[j] });
      }
      blocks.sort((a, b) => a.avg - b.avg);
      const best = blocks[0];

      const bestSpot = best.avg;

      const now = new Date();
      const currentIdx = filteredPrices.findIndex(p =>
        now >= new Date(p.time_start) && now < new Date(p.time_end)
      );
      const startIdx = currentIdx >= 0 ? currentIdx : 0;
      const currentWindow = filteredPrices.slice(startIdx, startIdx + cardBlockSize);
      const currentAvg = currentWindow.reduce((s, p) => s + parseFloat(p.SEK_per_kWh), 0) / currentWindow.length;

      const bestReal = calcRealPrice(bestSpot);
      const currentReal = calcRealPrice(currentAvg);

      const kwhTotal = appliance.kw * card.hours;
      const bestCost = bestReal * kwhTotal;
      const currentCost = currentReal * kwhTotal;
      const saving = currentCost - bestCost;
      const savingPct = Math.abs((saving / currentCost) * 100).toFixed(1);
      const isAlreadyBest = saving <= 0;

      const bestTime = formatTime(best.entry.time_start);
      const bestEnd = formatTime(new Date(new Date(best.entry.time_start).getTime() + card.hours * 3600000));

      return `
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <div>
        <div style="font-size:16px; font-weight:600;">${card.name}</div>
        <div style="font-size:12px; color:var(--text-secondary);">${appliance.name} · ${appliance.kw} kW · ${card.hours}h · ${kwhTotal.toFixed(1)} kWh</div>
      </div>
      <button class="icon-btn danger" onclick="deleteCard(${i})"><i class="ti ti-trash"></i></button>
    </div>
    <div class="price-compare">
      <div class="price-compare-item best">
        <div class="compare-label">Bästa tid</div>
        <div class="compare-time">${bestTime} – ${bestEnd}</div>
        <div class="compare-cost">${bestCost.toFixed(2)} kr</div>
        <div style="font-size:12px; color:var(--text-secondary);">${formatPrice(bestCost / kwhTotal)}</div>
        ${isAlreadyBest
          ? '<div class="badge badge-green">Nu billigast!</div>'
          : `<div class="badge badge-green">-${savingPct}%</div>`}
      </div>
      <div class="price-compare-item current">
        <div class="compare-label">Kör nu</div>
        <div class="compare-time">Just nu</div>
        <div class="compare-cost">${currentCost.toFixed(2)} kr</div>
        <div style="font-size:12px; color:var(--text-secondary);">${formatPrice(currentCost / kwhTotal)}</div>
      </div>
    </div>
    <div style="margin-top:10px; font-size:13px; color:var(--text-secondary);">
      ${isAlreadyBest
        ? '<span style="color:#8bc34a; font-weight:600;">Nu är det billigast att köra!</span>'
        : `Besparing: <span style="color:#8bc34a; font-weight:600;">${saving.toFixed(2)} kr</span>
           <span style="color:var(--text-secondary); font-size:12px;"> (${formatPrice(saving / kwhTotal)})</span>`}
    </div>
  </div>
`;
    }).join('');
  }

  renderCards();

  document.getElementById('priserToday').addEventListener('click', () => {
    selectedDay = 'today';
    document.getElementById('priserToday').classList.add('active');
    document.getElementById('priserTomorrow').classList.remove('active');
    renderCards();
  });

  document.getElementById('priserTomorrow').addEventListener('click', () => {
    selectedDay = 'tomorrow';
    document.getElementById('priserTomorrow').classList.add('active');
    document.getElementById('priserToday').classList.remove('active');
    renderCards();
  });
}

function showAddCard() {
  const form = document.getElementById('addCardForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function addCard() {
  const name = document.getElementById('cardName').value.trim();
  const applianceId = document.getElementById('cardAppliance').value;
  const hours = parseFloat(document.getElementById('cardHours').value);
  if (!name || !applianceId || !hours) return;

  const cards = loadCards();
  cards.push({ name, applianceId, hours });
  saveCards(cards);
  renderPriser(document.getElementById('tabContent'));
}

function deleteCard(index) {
  const cards = loadCards();
  cards.splice(index, 1);
  saveCards(cards);
  renderPriser(document.getElementById('tabContent'));
}