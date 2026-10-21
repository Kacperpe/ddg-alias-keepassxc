const $ = id => document.getElementById(id);
const send = msg => chrome.runtime.sendMessage(msg);
const show = (id, on) => $(id).classList.toggle('hidden', !on);

function setStatus(id, text, kind) {
  const el = $(id);
  el.textContent = text;
  el.className = 'status' + (kind ? ' ' + kind : '');
}

async function busy(btn, label, fn) {
  const old = btn.textContent;
  btn.disabled = true; btn.textContent = label;
  try { return await fn(); } finally { btn.disabled = false; btn.textContent = old; }
}

// ---------- 1. DuckDuckGo ----------
async function ddgRefresh() {
  const { ddgToken, ddgUser } = await chrome.storage.local.get(['ddgToken', 'ddgUser']);
  const logged = !!ddgToken;
  $('cardDdg').classList.toggle('done', logged);
  show('ddgLoggedIn', logged);
  show('ddgLoginForm', !logged);
  if (ddgUser && !$('ddgUser').value) $('ddgUser').value = ddgUser + '@duck.com';
  if (logged) setStatus('ddgStatus', '✅ Zalogowano' + (ddgUser ? ' jako ' + ddgUser + '@duck.com' : '') + '.', 'ok');
  else setStatus('ddgStatus', 'Wpisz swój adres Duck – DuckDuckGo wyśle Ci kod na maila.', '');
}

$('ddgSend').onclick = () => busy($('ddgSend'), 'Wysyłam…', async () => {
  const r = await send({ type: 'ddgSendCode', user: $('ddgUser').value });
  if (!r.ok) return setStatus('ddgStatus', '❌ ' + r.error, 'err');
  setStatus('ddgStatus', `📧 Wysłano kod na skrzynkę powiązaną z ${r.user}@duck.com. Wpisz go poniżej.`, 'warn');
  show('ddgCodeBox', true);
  $('ddgCode').focus();
});

$('ddgLogin').onclick = () => busy($('ddgLogin'), 'Loguję…', async () => {
  const r = await send({ type: 'ddgLogin', user: $('ddgUser').value, code: $('ddgCode').value });
  if (!r.ok) return setStatus('ddgStatus', '❌ ' + r.error, 'err');
  $('ddgCode').value = '';
  show('ddgCodeBox', false);
  ddgRefresh();
});

$('ddgUser').onkeydown = e => { if (e.key === 'Enter') $('ddgSend').click(); };
$('ddgCode').onkeydown = e => { if (e.key === 'Enter') $('ddgLogin').click(); };

$('ddgTest').onclick = () => busy($('ddgTest'), 'Generuję…', async () => {
  const r = await send({ type: 'generate', site: '(test)' });
  if (r.ok) setStatus('ddgStatus', '✅ Działa! Testowy adres: ' + r.alias, 'ok');
  else setStatus('ddgStatus', '❌ ' + r.error, 'err');
  loadHistory();
});

$('ddgLogout').onclick = async () => { await send({ type: 'ddgLogout' }); ddgRefresh(); };

$('saveToken').onclick = async () => {
  const t = $('token').value.replace(/^\s*Bearer\s+/i, '').replace(/[^A-Za-z0-9]/g, '');
  if (!t) return setStatus('ddgStatus', '❌ Token jest pusty.', 'err');
  await chrome.storage.local.set({ ddgToken: t });
  $('token').value = '';
  ddgRefresh();
};

// ---------- 2. KeePassXC ----------
async function kpRefresh() {
  setStatus('kpStatus', 'Sprawdzam połączenie z KeePassXC…', '');
  ['kpNoBridge', 'kpNotRunning', 'kpNeedAssoc'].forEach(id => show(id, false));
  const r = await send({ type: 'kpxcStatus' });
  let done = false;
  if (r.ok && r.associated) {
    setStatus('kpStatus', `✅ Połączono z KeePassXC ${r.version} (jako „${r.name}”).`, 'ok');
    done = true;
  } else if (r.ok) {
    setStatus('kpStatus', 'KeePassXC działa – zostało tylko połączyć go z rozszerzeniem.', 'warn');
    show('kpNeedAssoc', true);
  } else if (/mostka|install\.bat/i.test(r.error)) {
    setStatus('kpStatus', 'Został jeden dwuklik, żeby przeglądarka mogła rozmawiać z KeePassXC:', 'warn');
    show('kpNoBridge', true);
  } else if (/zablokowana/i.test(r.error)) {
    setStatus('kpStatus', '🔒 Odblokuj swoją bazę w KeePassXC.', 'warn');
  } else {
    setStatus('kpStatus', 'Nie widzę KeePassXC.', 'warn');
    show('kpNotRunning', true);
  }
  $('cardKp').classList.toggle('done', done);
  return done;
}

$('kpCheck').onclick = () => busy($('kpCheck'), 'Sprawdzam…', kpRefresh);

$('kpConnect').onclick = () => busy($('kpConnect'), 'Czekam na KeePassXC…', async () => {
  setStatus('kpStatus', '👉 Przejdź do okna KeePassXC, wpisz nazwę i kliknij „Zapisz i zezwól”.', 'warn');
  const r = await send({ type: 'kpxcAssociate' });
  if (!r.ok) setStatus('kpStatus', '❌ ' + r.error, 'err');
  else kpRefresh();
});

// sprawdzaj co kilka sekund, dopóki KeePassXC nie jest połączony (np. po install.bat)
let kpTimer = setInterval(async () => {
  if (document.hidden || $('kpConnect').disabled) return;
  if (await kpRefresh()) clearInterval(kpTimer);
}, 5000);

// ---------- Ustawienia ----------
async function loadSettings() {
  const s = await chrome.storage.local.get(['showOnFocus', 'pwLength', 'pwSymbols', 'kpxcAutoSave', 'kpxcGroup', 'autoSubmit', 'suggestLogins']);
  $('kpxcAutoSave').checked = s.kpxcAutoSave !== false;
  $('autoSubmit').checked = s.autoSubmit !== false;
  $('suggestLogins').checked = s.suggestLogins !== false;
  $('showOnFocus').checked = s.showOnFocus !== false;
  $('pwSymbols').checked = s.pwSymbols !== false;
  $('pwLength').value = s.pwLength || 64;
  $('kpxcGroup').value = s.kpxcGroup || '';
}

let markTimer;
async function saveSettings() {
  const len = Math.max(8, Math.min(128, parseInt($('pwLength').value, 10) || 64));
  $('pwLength').value = len;
  await chrome.storage.local.set({
    kpxcAutoSave: $('kpxcAutoSave').checked,
    autoSubmit: $('autoSubmit').checked,
    suggestLogins: $('suggestLogins').checked,
    showOnFocus: $('showOnFocus').checked,
    pwSymbols: $('pwSymbols').checked,
    pwLength: len,
    kpxcGroup: $('kpxcGroup').value.trim()
  });
  show('savedMark', true);
  clearTimeout(markTimer);
  markTimer = setTimeout(() => show('savedMark', false), 1500);
}
['kpxcAutoSave', 'autoSubmit', 'suggestLogins', 'showOnFocus', 'pwSymbols', 'pwLength', 'kpxcGroup'].forEach(id => { $(id).onchange = saveSettings; });

// ---------- Historia ----------
async function loadHistory() {
  const { history = [] } = await chrome.storage.local.get('history');
  $('hist').innerHTML = '';
  for (const h of history) {
    const tr = document.createElement('tr');
    for (const v of [h.alias, h.site, new Date(h.date).toLocaleString('pl-PL')]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    $('hist').appendChild(tr);
  }
}

$('export').onclick = async () => {
  const { history = [] } = await chrome.storage.local.get('history');
  const csv = 'alias,site,date\n' + history.map(h => [h.alias, h.site, h.date].join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'ddg-aliasy.csv';
  a.click();
};

chrome.storage.onChanged.addListener(ch => { if (ch.ddgToken) ddgRefresh(); if (ch.history) loadHistory(); });

ddgRefresh();
kpRefresh();
loadSettings();
loadHistory();
