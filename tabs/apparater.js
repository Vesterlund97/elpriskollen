const DEFAULT_APPLIANCES = [
  { id: 'diskmaskin',       name: 'Diskmaskin',       kw: 1.5 },
  { id: 'tvattmaskin',      name: 'Tvättmaskin',      kw: 2.0 },
  { id: 'torktumlare',      name: 'Torktumlare',      kw: 3.0 },
  { id: 'elbil',            name: 'Elbil',            kw: 7.0 },
  { id: 'varmvatten',       name: 'Varmvattenberedare', kw: 3.0 },
];

function loadAppliances() {
  const saved = localStorage.getItem('appliances');
  if (saved) return JSON.parse(saved);
  return DEFAULT_APPLIANCES;
}

function saveAppliances(list) {
  localStorage.setItem('appliances', JSON.stringify(list));
}

function renderApparater(el) {
  const appliances = loadAppliances();

  el.innerHTML = `
    <div class="card">
      <div class="card-title">Mina apparater</div>
      <div id="applianceList">
        ${appliances.map((a, i) => `
          <div class="appliance-row" id="appliance-${i}">
            <div class="appliance-info">
              <div class="appliance-name">${a.name}</div>
              <div class="appliance-kw">${a.kw} kW</div>
            </div>
            <div class="appliance-actions">
              <button class="icon-btn" onclick="editAppliance(${i})"><i class="ti ti-pencil"></i></button>
              <button class="icon-btn danger" onclick="deleteAppliance(${i})"><i class="ti ti-trash"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card" id="addCard">
      <div class="card-title">Lägg till apparat</div>
      <div class="add-form">
        <input type="text" id="newName" placeholder="Namn" class="setting-input" style="width:100%; margin-bottom:8px;">
        <div style="display:flex; gap:8px;">
          <input type="number" id="newKw" placeholder="kW" class="setting-input" style="flex:1;">
          <button class="primary" style="flex:1;" onclick="addAppliance()">Lägg till</button>
        </div>
      </div>
    </div>
  `;
}

function addAppliance() {
  const name = document.getElementById('newName').value.trim();
  const kw = parseFloat(document.getElementById('newKw').value);
  if (!name || !kw) return;

  const appliances = loadAppliances();
  appliances.push({ id: 'custom_' + Date.now(), name, kw });
  saveAppliances(appliances);
  renderApparater(document.getElementById('tabContent'));
}

function deleteAppliance(index) {
  const appliances = loadAppliances();
  appliances.splice(index, 1);
  saveAppliances(appliances);
  renderApparater(document.getElementById('tabContent'));
}

function editAppliance(index) {
  const appliances = loadAppliances();
  const a = appliances[index];
  const row = document.getElementById(`appliance-${index}`);
  row.innerHTML = `
    <div style="display:flex; gap:8px; width:100%; align-items:center;">
      <input type="text" id="editName-${index}" value="${a.name}" class="setting-input" style="flex:2;">
      <input type="number" id="editKw-${index}" value="${a.kw}" class="setting-input" style="flex:1;">
      <button class="icon-btn" onclick="saveEditAppliance(${index})"><i class="ti ti-check"></i></button>
      <button class="icon-btn" onclick="renderApparater(document.getElementById('tabContent'))"><i class="ti ti-x"></i></button>
    </div>
  `;
}

function saveEditAppliance(index) {
  const name = document.getElementById(`editName-${index}`).value.trim();
  const kw = parseFloat(document.getElementById(`editKw-${index}`).value);
  if (!name || !kw) return;

  const appliances = loadAppliances();
  appliances[index] = { ...appliances[index], name, kw };
  saveAppliances(appliances);
  renderApparater(document.getElementById('tabContent'));
}