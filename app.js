const settings = {
  zone:        localStorage.getItem('zone')        || 'SE1',
  theme:       localStorage.getItem('theme')       || 'dark',
  currency:    localStorage.getItem('currency')    || 'kr',
  timeFormat:  localStorage.getItem('timeFormat')  || '24h',
  markup:      parseFloat(localStorage.getItem('markup'))      || 0,
  certificate: parseFloat(localStorage.getItem('certificate')) || 0,
  energyTax:   parseFloat(localStorage.getItem('energyTax'))   || 0,
  gridFee:     parseFloat(localStorage.getItem('gridFee'))     || 0,
  vat:         parseFloat(localStorage.getItem('vat')         ?? '25'),
  startHour: (v => (v >= 0 && v <= 23) ? v : 8) (parseInt(localStorage.getItem('startHour') ?? '')),
  endHour:   (v => (v >= 1 && v <= 24) ? v : 22)(parseInt(localStorage.getItem('endHour')   ?? '')),
};
// Global state — delas mellan alla flikar
const state = {
  todayPrices: null,
  tomorrowPrices: null,
  loading: false,
};
// Priströskelsvärden — justera dessa efter eget tycke
const THRESHOLDS = {
  cheap: 0.80,   // under 80% av dagssnittet = billig
  medium: 1.20,  // under 120% av dagssnittet = medium, över = dyr
};
function saveSetting(key, value) {
  settings[key] = value;
  localStorage.setItem(key, value);
  applySettings();
  renderActiveTab();
}


// Spara zon när den ändras
document.getElementById('zoneSelect').value = settings.zone;
document.getElementById('zoneSelect').addEventListener('change', e => {
  saveSetting('zone', e.target.value);
  loadPrices();
});

// Hjälpfunktioner tillgängliga globalt
function getHourSE(dateStr) {
  return parseInt(new Date(dateStr).toLocaleString('sv-SE', {
    timeZone: 'Europe/Stockholm', hour: 'numeric', hour12: false
  }));
}

// Hämta prisdata
async function loadPrices() {
  state.loading = true;
  renderActiveTab();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const fetchDay = async (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const url = `https://www.elprisetjustnu.se/api/v1/prices/${y}/${m}-${d}_${settings.zone}.json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
  };

  try {
    [state.todayPrices, state.tomorrowPrices] = await Promise.all([
      fetchDay(today),
      fetchDay(tomorrow),
    ]);
  } catch {
    state.todayPrices    = null;
    state.tomorrowPrices = null;
  }
  state.loading = false;
  renderActiveTab();
}

// Flik-hantering
let activeTab = 'home';

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  renderActiveTab();
}
// Formatera pris baserat på inställning
function formatPrice(sekPerKwh) {
  if (settings.currency === 'öre') {
    return (sekPerKwh * 100).toFixed(1) + ' öre/kWh';
  }
  return sekPerKwh.toFixed(2) + ' kr/kWh';
}

// Formatera tid baserat på inställning
function formatTime(date) {
  return new Date(date).toLocaleTimeString('sv-SE', {
    timeZone: 'Europe/Stockholm',
    hour: '2-digit',
    minute: '2-digit',
    hour12: settings.timeFormat === '12h'
  });
}
function calcRealPrice(spotSEK) {
  // Alla tillägg är i öre, konvertera till kr
  const addons = (settings.markup + settings.certificate + settings.energyTax + settings.gridFee) / 100;
  const beforeVat = spotSEK + addons;
  const withVat = beforeVat * (1 + settings.vat / 100);
  return withVat;
}
function renderActiveTab() {
  const content = document.getElementById('tabContent');
  const renderers = {
    home:          renderHome,
    tider:         renderTider,
    priser:        renderPriser,
    apparater:     renderApparater,
    installningar: renderInstallningar,
  };
  if (renderers[activeTab]) renderers[activeTab](content);
}

// Nav-knappar
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function applySettings() {
  // Tema
  document.body.setAttribute('data-theme', settings.theme);
  
  // Uppdatera zon-väljaren i headern
  document.getElementById('zoneSelect').value = settings.zone;
}
window.addEventListener('DOMContentLoaded', () => {
  applySettings();
  loadPrices();
});