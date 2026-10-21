const $ = id => document.getElementById(id);

async function load() {
  const s = await chrome.storage.local.get(['ddgToken', 'history', 'showOnFocus', 'pwLength', 'pwSymbols', 'kpxcAutoSave', 'kpxcGroup']);
  $('token').value = s.ddgToken || '';
  $('kpxcAutoSave').checked = s.kpxcAutoSave !== false;
  $('kpxcGroup').value = s.kpxcGroup || '';
  $('showOnFocus').checked = s.showOnFocus !== false;
  $('pwLength').value = s.pwLength || 64;
  $('pwSymbols').checked = s.pwSymbols !== false;

  $('hist').innerHTML = '';
  for (const h of s.history || []) {
    const tr = document.createElement('tr');
    for (const v of [h.alias, h.site, new Date(h.date).toLocaleString('pl-PL')]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    $('hist').appendChild(tr);
  }
}

$('save').onclick = async () => {
  const t = $('token').value.trim().replace(/^Bearer\s+/i, '');
  await chrome.storage.local.set({ ddgToken: t });
  $('status').textContent = 'Zapisano ✔';
};

$('test').onclick = async () => {
  $('status').textContent = '…';
  const res = await chrome.runtime.sendMessage({ type: 'generate', site: '(test)' });
  $('status').textContent = res.ok ? 'OK: ' + res.alias : 'Błąd: ' + res.error;
  load();
};

$('saveSettings').onclick = async () => {
  const len = Math.max(8, Math.min(128, parseInt($('pwLength').value, 10) || 64));
  await chrome.storage.local.set({
    showOnFocus: $('showOnFocus').checked,
    pwLength: len,
    pwSymbols: $('pwSymbols').checked
  });
  $('pwLength').value = len;
  $('status2').textContent = 'Zapisano ✔';
};

$('export').onclick = async () => {
  const { history = [] } = await chrome.storage.local.get('history');
  const csv = 'alias,site,date\n' + history.map(h => [h.alias, h.site, h.date].join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'ddg-aliasy.csv';
  a.click();
};

// ---------- KeePassXC ----------
async function kpStatus() {
  $('kpStatus').textContent = 'Sprawdzam połączenie…';
  const r = await chrome.runtime.sendMessage({ type: 'kpxcStatus' });
  if (!r.ok) {
    $('kpStatus').textContent = '❌ ' + r.error;
  } else if (r.associated) {
    $('kpStatus').textContent = `✅ Połączono z KeePassXC ${r.version} jako „${r.name}”.`;
  } else {
    $('kpStatus').textContent = `⚠️ KeePassXC ${r.version} działa, ale ta baza nie jest jeszcze połączona – kliknij „Połącz z KeePassXC”.`;
  }
}

$('kpCheck').onclick = kpStatus;

$('kpConnect').onclick = async () => {
  $('kpStatus').textContent = 'Zatwierdź połączenie w oknie KeePassXC (wpisz nazwę i kliknij „Zapisz i zezwól”)…';
  const r = await chrome.runtime.sendMessage({ type: 'kpxcAssociate' });
  if (r.ok) kpStatus();
  else $('kpStatus').textContent = '❌ ' + r.error;
};

$('kpxcAutoSave').onchange = () => chrome.storage.local.set({ kpxcAutoSave: $('kpxcAutoSave').checked });
$('kpxcGroup').onchange = () => chrome.storage.local.set({ kpxcGroup: $('kpxcGroup').value.trim() });

load();
kpStatus();
