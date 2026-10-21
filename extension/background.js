importScripts('nacl-fast.min.js', 'kpxc.js');

const QUACK = 'https://quack.duckduckgo.com/api';
const NATIVE_HOST = 'com.kacperpe.ddg_alias';

// ---------- DuckDuckGo ----------
// token DDG to same litery i cyfry – usuwamy "Bearer", spacje, cudzysłowy, niewidoczne znaki itp.
const cleanToken = t => (t || '').replace(/^\s*Bearer\s+/i, '').replace(/[^A-Za-z0-9]/g, '');
const cleanUser = u => (u || '').trim().toLowerCase().replace(/@duck\.com$/, '').replace(/[^a-z0-9._-]/g, '');

class NeedsSetup extends Error {}

async function generateAlias(site) {
  const ddgToken = cleanToken((await chrome.storage.local.get('ddgToken')).ddgToken);
  if (!ddgToken) throw new NeedsSetup('Najpierw zaloguj się do DuckDuckGo – otworzyłem ustawienia rozszerzenia.');

  let res;
  try {
    res = await fetch(QUACK + '/email/addresses', { method: 'POST', headers: { Authorization: 'Bearer ' + ddgToken } });
  } catch (e) {
    throw new Error('Brak połączenia z DuckDuckGo – sprawdź internet.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new NeedsSetup('Sesja DuckDuckGo wygasła – zaloguj się ponownie (otworzyłem ustawienia).');
  }
  if (!res.ok) throw new Error('DuckDuckGo nie wygenerował adresu (błąd ' + res.status + '). Spróbuj za chwilę.');

  const { address } = await res.json();
  const alias = address + '@duck.com';

  const { history = [] } = await chrome.storage.local.get('history');
  history.unshift({ alias, site: site || '', date: new Date().toISOString() });
  await chrome.storage.local.set({ history: history.slice(0, 500) });
  return alias;
}

// Logowanie jak w aplikacji DuckDuckGo: adres Duck → kod (kilka słów) na maila → token
async function ddgSendCode(user) {
  const u = cleanUser(user);
  if (!u) throw new Error('Wpisz swój adres Duck, np. kacper@duck.com');
  let r;
  try { r = await fetch(QUACK + '/auth/loginlink?user=' + encodeURIComponent(u)); }
  catch (e) { throw new Error('Brak połączenia z DuckDuckGo – sprawdź internet.'); }
  if (!r.ok) {
    throw new Error(r.status === 400 || r.status === 404
      ? 'Nie znaleziono takiego adresu Duck. Sprawdź pisownię.'
      : 'DuckDuckGo nie wysłał kodu (błąd ' + r.status + '). Spróbuj za minutę.');
  }
  await chrome.storage.local.set({ ddgUser: u });
  return { user: u };
}

async function ddgLogin(user, code) {
  const u = cleanUser(user);
  const otp = (code || '').trim().toLowerCase().replace(/[^a-ząćęłńóśźż ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!otp) throw new Error('Wpisz kod z maila od DuckDuckGo.');
  const r = await fetch(QUACK + '/auth/login?user=' + encodeURIComponent(u) + '&otp=' + encodeURIComponent(otp));
  if (!r.ok) throw new Error('Kod nie pasuje albo wygasł. Wyślij nowy kod i spróbuj ponownie.');
  const j = await r.json();
  if (!j.token) throw new Error('Kod nie pasuje albo wygasł. Wyślij nowy kod i spróbuj ponownie.');
  const d = await fetch(QUACK + '/email/dashboard', { headers: { Authorization: 'Bearer ' + j.token } });
  if (!d.ok) throw new Error('Nie udało się pobrać danych konta DuckDuckGo (błąd ' + d.status + ').');
  const dj = await d.json();
  const token = cleanToken(dj.user && dj.user.access_token);
  if (!token) throw new Error('DuckDuckGo nie zwrócił tokenu. Spróbuj ponownie.');
  await chrome.storage.local.set({ ddgToken: token, ddgUser: u });
  return { user: u };
}

// ---------- KeePassXC ----------
function nativeTransport() {
  const port = chrome.runtime.connectNative(NATIVE_HOST);
  let onMsg = () => {}, onDisc = () => {};
  port.onMessage.addListener(m => onMsg(m));
  port.onDisconnect.addListener(() => {
    const e = chrome.runtime.lastError && chrome.runtime.lastError.message;
    const noBridge = !!(e && /not found|not allowed|forbidden/i.test(e));
    if (noBridge) chrome.storage.local.set({ kpxcBridge: false });
    onDisc(noBridge
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
  chrome.storage.local.set({ kpxcBridge: true });
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

  // zapisane konta dla strony (dopasowanie po polu URL wpisu – robi to KeePassXC)
  logins: ({ url, submitUrl }) => withSession(async s => {
    const { assoc } = await getAssocFor(s);
    try {
      const r = await s.getLogins({ assoc, url, submitUrl });
      return {
        entries: (r.entries || []).map(e => ({
          login: e.login, password: e.password, name: e.name, uuid: e.uuid,
          skipAutoSubmit: e.skipAutoSubmit === 'true'
        }))
      };
    } catch (e) {
      if (e.code === 15) return { entries: [] };
      throw e;
    }
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
  ddgSendCode: msg => ddgSendCode(msg.user),
  ddgLogin: msg => ddgLogin(msg.user, msg.code),
  ddgLogout: () => chrome.storage.local.remove('ddgToken').then(() => ({})),
  kpxcStatus: () => kpxc.status(),
  getLogins: async (msg, sender) => {
    const { kpxcBridge, kpxcAssoc } = await chrome.storage.local.get(['kpxcBridge', 'kpxcAssoc']);
    if (kpxcBridge === false || !kpxcAssoc || !Object.keys(kpxcAssoc).length) return { entries: [], unavailable: true };
    const url = (sender.tab && sender.tab.url) || msg.url;
    return kpxc.logins({ url, submitUrl: msg.submitUrl || url });
  },
  kpxcAssociate: () => kpxc.associate(),
  saveLogin: async msg => {
    const { kpxcAutoSave = true, kpxcBridge } = await chrome.storage.local.get(['kpxcAutoSave', 'kpxcBridge']);
    if (!kpxcAutoSave && !msg.manual) return { skipped: true };
    // tryb prosty (bez install.bat): zapis robi KeePassXC-Browser, więc nie przeszkadzamy
    if (kpxcBridge === false && !msg.manual) return { skipped: true };
    return kpxc.save(msg);
  }
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const h = handlers[msg.type];
  if (!h) return;
  Promise.resolve()
    .then(() => h(msg, sender))
    .then(r => sendResponse(Object.assign({ ok: true }, r)))
    .catch(e => {
      if (e instanceof NeedsSetup) chrome.runtime.openOptionsPage();
      sendResponse({ ok: false, error: e.message });
    });
  return true;
});

// po starcie przeglądarki sprawdź mostek od nowa (np. po uruchomieniu install.bat)
chrome.runtime.onStartup.addListener(() => chrome.storage.local.remove('kpxcBridge'));

// ---------- menu kontekstowe + kreator po instalacji ----------
chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') chrome.runtime.openOptionsPage();
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
