importScripts('nacl-fast.min.js', 'kpxc.js');

const API = 'https://quack.duckduckgo.com/api/email/addresses';
const NATIVE_HOST = 'com.kacperpe.ddg_alias';

// ---------- DuckDuckGo ----------
async function generateAlias(site) {
  const { ddgToken } = await chrome.storage.local.get('ddgToken');
  if (!ddgToken) throw new Error('Brak tokenu DDG – ustaw go w opcjach rozszerzenia.');

  const res = await fetch(API, { method: 'POST', headers: { Authorization: 'Bearer ' + ddgToken } });
  if (res.status === 401) throw new Error('Token DDG nieprawidłowy lub wygasł.');
  if (!res.ok) throw new Error('Błąd DDG API: ' + res.status);

  const { address } = await res.json();
  const alias = address + '@duck.com';

  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift({ alias, site: site || '', date: new Date().toISOString() });
  await chrome.storage.local.set({ history: history.slice(0, 500) });
  return alias;
}

// ---------- KeePassXC ----------
function nativeTransport() {
  const port = chrome.runtime.connectNative(NATIVE_HOST);
  let onMsg = () => {}, onDisc = () => {};
  port.onMessage.addListener(m => onMsg(m));
  port.onDisconnect.addListener(() => {
    const e = chrome.runtime.lastError && chrome.runtime.lastError.message;
    onDisc(e && /not found|not allowed|forbidden/i.test(e)
      ? 'Brak mostka do KeePassXC – uruchom install.bat (instrukcja w README).'
      : (e || 'Rozłączono z KeePassXC'));
  });
  return {
    send: o => port.postMessage(o),
    onMessage: cb => { onMsg = cb; },
    onDisconnect: cb => { onDisc = cb; },
    close: () => port.disconnect()
  };
}

async function openSession() {
  const s = new KpxcSession(nativeTransport());
  await s.handshake();
  return s;
}

async function withSession(fn) {
  const s = await openSession();
  try { return await fn(s); } finally { s.close(); }
}

async function getAssocFor(s) {
  const hash = await s.getDatabaseHash();
  const { kpxcAssoc = {} } = await chrome.storage.local.get('kpxcAssoc');
  const assoc = kpxcAssoc[hash];
  if (!assoc) throw new Error('Ta baza nie jest połączona – w opcjach kliknij „Połącz z KeePassXC”.');
  await s.testAssociate(assoc);
  return { hash, assoc };
}

const kpxc = {
  status: () => withSession(async s => {
    const hash = await s.getDatabaseHash();
    const { kpxcAssoc = {} } = await chrome.storage.local.get('kpxcAssoc');
    const assoc = kpxcAssoc[hash];
    let associated = false;
    if (assoc) { try { await s.testAssociate(assoc); associated = true; } catch (e) { /* klucz usunięty w KeePassXC */ } }
    return { version: s.version, associated, name: assoc && assoc.id };
  }),

  associate: () => withSession(async s => {
    const a = await s.associate();
    const { kpxcAssoc = {} } = await chrome.storage.local.get('kpxcAssoc');
    kpxcAssoc[a.hash] = { id: a.id, key: a.key };
    await chrome.storage.local.set({ kpxcAssoc });
    return { name: a.id };
  }),

  save: ({ url, submitUrl, login, password }) => withSession(async s => {
    const { assoc } = await getAssocFor(s);
    const { kpxcGroup = '' } = await chrome.storage.local.get('kpxcGroup');
    await s.setLogin({ assoc, url, submitUrl, login, password, group: kpxcGroup });
    return { saved: true };
  })
};

// ---------- wiadomości ----------
const handlers = {
  generate: (msg, sender) => {
    const site = msg.site || (sender.tab && sender.tab.url ? new URL(sender.tab.url).hostname : '');
    return generateAlias(site).then(alias => ({ alias }));
  },
  kpxcStatus: () => kpxc.status(),
  kpxcAssociate: () => kpxc.associate(),
  saveLogin: async msg => {
    const { kpxcAutoSave = true } = await chrome.storage.local.get('kpxcAutoSave');
    if (!kpxcAutoSave && !msg.manual) return { skipped: true };
    return kpxc.save(msg);
  }
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const h = handlers[msg.type];
  if (!h) return;
  Promise.resolve()
    .then(() => h(msg, sender))
    .then(r => sendResponse(Object.assign({ ok: true }, r)))
    .catch(e => sendResponse({ ok: false, error: e.message }));
  return true;
});

// ---------- menu kontekstowe ----------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ddg-fill',
    title: 'Wstaw alias DuckDuckGo / silne hasło',
    contexts: ['editable']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'ddg-fill' && tab) {
    chrome.tabs.sendMessage(tab.id, { type: 'fillFocused' }, { frameId: info.frameId });
  }
});
