(() => {
  if (window.__ddgAliasLoaded) return;
  window.__ddgAliasLoaded = true;

  // ---------- ustawienia ----------
  const settings = { showOnFocus: true, pwLength: 64, pwSymbols: true };
  chrome.storage.local.get(Object.keys(settings)).then(s => {
    for (const k in s) if (s[k] !== undefined) settings[k] = s[k];
  });
  chrome.storage.onChanged.addListener(ch => {
    for (const k in ch) if (k in settings) settings[k] = ch[k].newValue;
  });

  // ---------- rozpoznawanie pól ----------
  const USER_HINT = /e-?mail|mail|login|user|username|konto|account|identifier|nick|użytkownik|uzytkownik/i;
  const SKIP_HINT = /search|szukaj|query|coupon|kupon|promo|otp|captcha|one.?time|2fa|totp|verification|weryfik/i;
  const SIGNUP_HINT = /regist|rejestr|sign.?up|create.?account|new.?account|utw[oó]rz|za[lł][oó][zż]|nowe konto|join|do[lł][aą]cz|enroll/i;
  const ICON_GAP = 34; // miejsce na ikonę KeePassXC-Browser przy prawej krawędzi pola

  const ac = el => (el.getAttribute('autocomplete') || '').toLowerCase();
  const rootOf = el => el.form || el.closest('form') || document;
  function visible(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 60 || r.height < 16) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  }
  const passwordsIn = root => [...root.querySelectorAll('input[type=password]')].filter(visible);

  function isSignup(el) {
    if (ac(el).includes('new-password')) return true;
    const root = rootOf(el);
    const pw = passwordsIn(root);
    if (pw.length >= 2) return true;
    if (pw.some(p => ac(p).includes('new-password'))) return true;
    let text = location.pathname + ' ' + document.title;
    if (root !== document) {
      text += ' ' + (root.getAttribute('action') || '') + ' ' + (root.id || '') + ' ' +
        (typeof root.className === 'string' ? root.className : '') + ' ' +
        (root.innerText || '').slice(0, 1500);
    }
    return SIGNUP_HINT.test(text);
  }

  // 'email' (login/e-mail) | 'password' | null
  function fieldKind(el) {
    if (!(el instanceof HTMLInputElement) || el.disabled || el.readOnly) return null;
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (type === 'password') return 'password';
    if (!['text', 'email', 'tel'].includes(type)) return null;
    const attrs = [el.name, el.id, ac(el), el.placeholder, el.getAttribute('aria-label')].join(' ');
    if (SKIP_HINT.test(attrs)) return null;
    if (type === 'email' || USER_HINT.test(attrs)) return 'email';
    // pierwsze pole tekstowe w formularzu z hasłem = login
    const root = rootOf(el);
    if (root !== document && passwordsIn(root).length) {
      const texts = [...root.querySelectorAll('input')].filter(i =>
        ['text', 'email', 'tel'].includes((i.getAttribute('type') || 'text').toLowerCase()) && visible(i));
      if (texts[0] === el) return 'email';
    }
    return null;
  }

  function newPwFields(root, el) {
    let pw = passwordsIn(root);
    if (pw.length >= 2) pw = pw.filter(p => !ac(p).includes('current-password')); // zmiana hasła
    return pw.filter(p => p === el || !p.value);
  }

  // ---------- generator hasła ----------
  function rnd(n) {
    const lim = Math.floor(0x100000000 / n) * n;
    const a = new Uint32Array(1);
    do crypto.getRandomValues(a); while (a[0] >= lim);
    return a[0] % n;
  }
  function newPassword(field) {
    let len = Math.max(8, Math.min(128, +settings.pwLength || 64));
    // jeśli strona ogranicza długość pola (maxlength), dopasuj się do limitu
    if (field && field.maxLength > 0 && field.maxLength < len) len = Math.max(8, field.maxLength);
    const sets = ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789'];
    if (settings.pwSymbols !== false) sets.push('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
    const all = sets.join('');
    const out = sets.map(s => s[rnd(s.length)]);
    while (out.length < len) out.push(all[rnd(all.length)]);
    for (let i = out.length - 1; i > 0; i--) { const j = rnd(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
    return out.join('');
  }

  // ---------- wpisywanie wartości (działa z React/Vue/Angular) ----------
  let filling = false;
  function setValue(el, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    el.focus({ preventScroll: true });
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---------- ikony ----------
  const SVG_AT = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#DE5833"/><path d="M15.2 12a3.2 3.2 0 1 1-1-2.3V12c0 1 .6 1.6 1.4 1.6 1 0 1.6-.9 1.6-2.4a5.2 5.2 0 1 0-2.4 4.4" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  const SVG_KEY = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#DE5833"/><g fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.6" cy="12" r="2.9"/><path d="M11.5 12h7M16.3 12v2.6M18.5 12v1.8"/></g></svg>`;
  const SVG_BOTH = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#DE5833"/><path d="M12.6 10.6a2.4 2.4 0 1 1-.8-1.7v1.7c0 .8.4 1.2 1 1.2.8 0 1.2-.7 1.2-1.8a3.9 3.9 0 1 0-1.8 3.3" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" transform="translate(-2.5 -1)"/><g fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round"><circle cx="14.5" cy="15.5" r="1.6"/><path d="M16.1 15.5h3.4M18.4 15.5v1.3"/></g></svg>`;
  const SVG_REFRESH = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#8a8a8a"/><g fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M16.8 10.2A5 5 0 1 0 17 13.4"/><path d="M17.2 6.8v3.6h-3.6"/></g></svg>`;

  // ---------- UI w Shadow DOM ----------
  const host = document.createElement('ddg-alias-ui');
  host.style.cssText = 'all:initial;position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;';
  const shadow = host.attachShadow({ mode: 'closed' });
  shadow.innerHTML = `
  <style>
    * { box-sizing: border-box; }
    .fi {
      position: fixed; display: none; padding: 0; margin: 0; border: 0; background: transparent;
      cursor: pointer; border-radius: 50%; align-items: center; justify-content: center;
      box-shadow: 0 1px 2px rgba(0,0,0,.18); transition: transform .12s ease, box-shadow .12s ease;
    }
    .fi:hover { transform: scale(1.12); box-shadow: 0 2px 6px rgba(222,88,51,.45); }
    .fi svg { width: 100%; height: 100%; display: block; }
    .menu {
      position: fixed; display: none; background: #fff; color: #1c1c1c;
      border-radius: 12px; padding: 6px;
      box-shadow: 0 0 0 1px rgba(0,0,0,.06), 0 4px 10px rgba(0,0,0,.08), 0 14px 36px rgba(0,0,0,.18);
      font: 13px/1.35 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      animation: pop .12s ease-out;
    }
    @keyframes pop { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    .item { display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px; border-radius: 8px; cursor: pointer; }
    .item.sel { background: #f2f2f2; }
    .item .ic { flex: 0 0 26px; width: 26px; height: 26px; margin-top: 1px; }
    .item .ic svg { width: 100%; height: 100%; display: block; }
    .item .tx { min-width: 0; }
    .t { font-weight: 600; font-size: 14px; }
    .s { color: #6b6b6b; font-size: 12px; margin-top: 2px; }
    .pw { font: 13px ui-monospace, "Cascadia Mono", Consolas, monospace; margin-top: 3px; word-break: break-all; color: #1c1c1c; }
    .busy { opacity: .6; pointer-events: none; }
    .err { color: #c62828; }
    .sep { height: 1px; background: #ececec; margin: 4px 8px; }
    .foot { padding: 6px 12px 4px; color: #8a8a8a; font-size: 11px; }
    .toast {
      position: fixed; right: 16px; bottom: 16px; max-width: 380px; display: none;
      background: #1f1f1f; color: #fff; padding: 12px 14px; border-radius: 12px;
      font: 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif;
      box-shadow: 0 8px 28px rgba(0,0,0,.35); animation: pop .15s ease-out;
    }
    .toast button {
      margin: 8px 8px 0 0; background: #DE5833; color: #fff; border: 0; border-radius: 6px;
      padding: 5px 12px; cursor: pointer; font: 600 12px system-ui, sans-serif;
    }
    .toast button.ghost { background: transparent; color: #bbb; padding-left: 0; }
    @media (prefers-color-scheme: dark) {
      .menu { background: #2a2a2a; color: #eee; box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 14px 36px rgba(0,0,0,.5); }
      .item.sel { background: #3a3a3a; }
      .s, .foot { color: #a8a8a8; } .pw { color: #eee; } .sep { background: #3a3a3a; }
    }
  </style>
  <div class="layer"></div>
  <div class="menu" role="listbox"></div>
  <div class="toast" role="status"></div>`;
  const layer = shadow.querySelector('.layer');
  const menu = shadow.querySelector('.menu');
  const toast = shadow.querySelector('.toast');
  for (const n of [menu, toast]) n.addEventListener('mousedown', e => e.preventDefault()); // nie zabieraj focusu

  let mounted = false;
  const mount = () => { if (!mounted) { document.documentElement.appendChild(host); mounted = true; } };

  const tracked = new Map(); // input -> { kind, icon }
  const dismissed = new WeakSet();
  let openFor = null;
  let menuItems = [];
  let sel = 0;

  function track(el) {
    if (tracked.has(el)) return;
    const kind = fieldKind(el);
    if (!kind) return;
    mount();
    const b = document.createElement('button');
    b.className = 'fi';
    b.type = 'button';
    b.tabIndex = -1;
    b.title = kind === 'email' ? 'Adres Duck + silne hasło' : 'Silne hasło';
    b.innerHTML = kind === 'email' ? SVG_AT : SVG_KEY;
    b.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (openFor === el) { closeMenu(); return; }
      el.focus({ preventScroll: true });
      openMenu(el);
    });
    layer.appendChild(b);
    tracked.set(el, { kind, icon: b });
  }

  function scan() {
    for (const el of document.querySelectorAll('input')) {
      if (!tracked.has(el) && visible(el)) track(el);
    }
    layout();
  }

  function layout() {
    for (const [el, t] of tracked) {
      if (!el.isConnected) { t.icon.remove(); tracked.delete(el); continue; }
      const r = el.getBoundingClientRect();
      const ok = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && visible(el);
      if (!ok) { t.icon.style.display = 'none'; continue; }
      const size = Math.round(Math.min(Math.max(r.height * 0.6, 16), 24));
      const s = t.icon.style;
      s.display = 'flex';
      s.width = s.height = size + 'px';
      s.top = Math.round(r.top + (r.height - size) / 2) + 'px';
      s.left = Math.round(r.right - size - ICON_GAP) + 'px';
    }
    if (openFor) placeMenu(openFor);
  }

  let raf = 0;
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; layout(); }); };

  // ---------- menu ----------
  function addItem({ svg, title, sub, pw, onPick, keepOpen }) {
    const d = document.createElement('div');
    d.className = 'item';
    d.setAttribute('role', 'option');
    d.innerHTML = `<div class="ic"></div><div class="tx"><div class="t"></div></div>`;
    d.querySelector('.ic').innerHTML = svg;
    d.querySelector('.t').textContent = title;
    const tx = d.querySelector('.tx');
    if (pw !== undefined) { const p = document.createElement('div'); p.className = 'pw'; p.textContent = pw; tx.appendChild(p); }
    if (sub) { const s = document.createElement('div'); s.className = 's'; s.textContent = sub; tx.appendChild(s); }
    const idx = menuItems.length;
    d.addEventListener('mouseenter', () => select(idx));
    d.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); onPick(d); });
    d._pick = () => onPick(d);
    d._keepOpen = keepOpen;
    menu.appendChild(d);
    menuItems.push(d);
    return d;
  }

  function select(i) {
    if (!menuItems.length) return;
    sel = (i + menuItems.length) % menuItems.length;
    menuItems.forEach((m, k) => m.classList.toggle('sel', k === sel));
  }

  function openMenu(el) {
    const kind = (tracked.get(el) || {}).kind || fieldKind(el);
    if (!kind) return;
    mount();
    openFor = el;
    menu.innerHTML = '';
    menuItems = [];
    const others = newPwFields(rootOf(el), el).filter(p => p !== el);

    if (kind === 'email') {
      if (others.length) {
        addItem({ svg: SVG_BOTH, title: 'Adres Duck + silne hasło',
          sub: 'Nowy alias @duck.com tutaj i silne hasło w polu hasła',
          onPick: d => fillAlias(el, d, true) });
        addItem({ svg: SVG_AT, title: 'Tylko prywatny adres Duck',
          sub: 'Nowy alias @duck.com przekierowany na Twoją skrzynkę',
          onPick: d => fillAlias(el, d, false) });
      } else {
        addItem({ svg: SVG_AT, title: 'Wygeneruj prywatny adres Duck',
          sub: 'Nowy alias @duck.com przekierowany na Twoją skrzynkę',
          onPick: d => fillAlias(el, d, false) });
      }
    } else {
      let pw = newPassword(el);
      const main = addItem({ svg: SVG_KEY, title: 'Użyj silnego hasła', pw,
        onPick: () => fillPassword(el, pw) });
      addItem({ svg: SVG_REFRESH, title: 'Wygeneruj inne', keepOpen: true,
        onPick: () => { pw = newPassword(el); main.querySelector('.pw').textContent = pw; } });
    }
    const sep = document.createElement('div'); sep.className = 'sep'; menu.appendChild(sep);
    const foot = document.createElement('div'); foot.className = 'foot';
    foot.textContent = 'Po wysłaniu formularza login i hasło zapiszą się w KeePassXC.';
    menu.appendChild(foot);

    menu.style.display = 'block';
    select(0);
    placeMenu(el);
  }

  function placeMenu(el) {
    const r = el.getBoundingClientRect();
    const w = Math.min(Math.max(r.width, 320), 420, innerWidth - 16);
    menu.style.width = w + 'px';
    const h = menu.offsetHeight;
    let top = r.bottom + 6;
    if (top + h > innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
    const left = Math.max(8, Math.min(r.left, innerWidth - w - 8));
    menu.style.top = Math.round(top) + 'px';
    menu.style.left = Math.round(left) + 'px';
  }

  function closeMenu() {
    menu.style.display = 'none';
    openFor = null;
    menuItems = [];
  }

  // ---------- akcje ----------
  async function fillAlias(el, item, withPassword) {
    item.classList.add('busy');
    let s = item.querySelector('.s');
    if (s) s.textContent = 'Generuję adres…';
    const res = await chrome.runtime.sendMessage({ type: 'generate', site: location.hostname });
    item.classList.remove('busy');
    if (!res || !res.ok) {
      if (s) { s.textContent = 'Błąd: ' + (res ? res.error : 'brak odpowiedzi'); s.classList.add('err'); }
      return;
    }
    filling = true;
    try {
      setValue(el, res.alias);
      let pw = null;
      if (withPassword) {
        const targets = newPwFields(rootOf(el), el).filter(p => p !== el);
        if (targets.length) { pw = newPassword(targets.reduce((a, p) => (p.maxLength > 0 && (!(a.maxLength > 0) || p.maxLength < a.maxLength)) ? p : a)); for (const p of targets) setValue(p, pw); }
      }
      el.focus({ preventScroll: true });
      closeMenu();
      pending = { root: rootOf(el), userEl: el, alias: res.alias, pw, saved: false, saving: false };
      showToast(pw ? 'Wstawiono adres Duck i silne hasło.' : 'Wstawiono adres Duck.', res.alias, pw, true);
    } finally {
      setTimeout(() => { filling = false; }, 50);
    }
  }

  function fillPassword(el, pw) {
    filling = true;
    try {
      const targets = newPwFields(rootOf(el), el);
      if (!targets.includes(el)) targets.unshift(el);
      for (const p of targets) setValue(p, pw);
      el.focus({ preventScroll: true });
      closeMenu();
      const root = rootOf(el);
      const prev = pending && pending.root === root && !pending.saved ? pending : null;
      pending = { root, userEl: prev ? prev.userEl : null, alias: prev ? prev.alias : null, pw, saved: false, saving: false };
      showToast('Wstawiono silne hasło.', null, pw, true);
    } finally {
      setTimeout(() => { filling = false; }, 50);
    }
  }

  // ---------- zapis do KeePassXC ----------
  let pending = null; // dane wygenerowane na tej stronie, czekające na zapis
  const SUBMIT_TEXT = /zarejestr|rejestr|za[lł][oó][zż]|utw[oó]rz|sign.?up|register|create|join|continue|dalej|kontynuuj|submit|wy[sś]lij|zapisz|next|start|zaloguj|log.?in|sign.?in/i;

  function findUserField(root) {
    return [...root.querySelectorAll('input')].find(i => fieldKind(i) === 'email' && i.value);
  }

  async function trySave(manual) {
    const p = pending;
    if (!p || p.saved || p.saving) return;
    const root = p.root === document || p.root.isConnected ? p.root : document;
    const pwEl = passwordsIn(root).find(e => e.value);
    const password = (pwEl && pwEl.value) || p.pw;
    const userEl = p.userEl && p.userEl.isConnected && p.userEl.value ? p.userEl : findUserField(root);
    const login = (userEl && userEl.value) || p.alias || '';
    if (!password) { if (manual) showToast('Brak hasła do zapisania – wpisz je najpierw.'); return; }
    p.saving = true;
    let res;
    try {
      res = await chrome.runtime.sendMessage({
        type: 'saveLogin', manual: !!manual,
        url: location.href,
        submitUrl: (p.root !== document && p.root.action) || location.href,
        login, password
      });
    } catch (e) { res = { ok: false, error: e.message }; }
    p.saving = false;
    if (res && res.ok && res.saved) {
      p.saved = true;
      showToast('Zapisano w KeePassXC ✔', login);
    } else if (!(res && res.ok && res.skipped)) {
      showToast('Nie zapisano w KeePassXC: ' + (res ? res.error : 'brak odpowiedzi'), null, password, true);
    }
  }

  let toastTimer = null;
  function showToast(msg, alias, pw, offerSave) {
    mount();
    toast.textContent = '';
    const line = document.createElement('div');
    line.textContent = msg + (alias ? ' ' + alias : '');
    toast.appendChild(line);
    if (pw) {
      const hint = document.createElement('div');
      hint.style.cssText = 'color:#bbb;font-size:12px;margin-top:4px';
      hint.textContent = 'Login, hasło i adres strony zapiszą się w KeePassXC automatycznie po wysłaniu formularza.';
      toast.appendChild(hint);
      if (offerSave) {
        const save = document.createElement('button');
        save.textContent = 'Zapisz teraz';
        save.onclick = () => { save.textContent = 'Zapisuję…'; trySave(true); };
        toast.appendChild(save);
      }
      const copy = document.createElement('button');
      copy.textContent = 'Kopiuj hasło';
      copy.onclick = async () => {
        try { await navigator.clipboard.writeText(pw); copy.textContent = 'Skopiowano ✔'; }
        catch { copy.textContent = 'Nie udało się'; }
      };
      toast.appendChild(copy);
    }
    const close = document.createElement('button');
    close.className = 'ghost';
    close.textContent = 'Zamknij';
    close.onclick = () => { toast.style.display = 'none'; };
    toast.appendChild(close);
    toast.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, pw ? 15000 : 5000);
  }

  // ---------- zdarzenia ----------
  document.addEventListener('focusin', e => {
    const el = e.composedPath ? e.composedPath()[0] : e.target;
    if (!(el instanceof HTMLInputElement)) return;
    if (!tracked.has(el)) { track(el); layout(); }
    if (openFor && openFor !== el) closeMenu();
    const t = tracked.get(el);
    if (!t || filling || openFor === el) return;
    // jak w DuckDuckGo: na formularzu rejestracji menu otwiera się samo
    if (settings.showOnFocus && !el.value && !dismissed.has(el) && isSignup(el)) openMenu(el);
  }, true);

  document.addEventListener('mousedown', e => {
    if (!openFor) return;
    const path = e.composedPath();
    if (path.includes(host) || path.includes(openFor)) return;
    closeMenu();
  }, true);

  document.addEventListener('keydown', e => {
    if (!openFor) return;
    if (e.key === 'Escape') { dismissed.add(openFor); closeMenu(); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { select(sel + 1); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { select(sel - 1); e.preventDefault(); }
    else if (e.key === 'Enter' && menuItems[sel]) { e.preventDefault(); e.stopPropagation(); menuItems[sel]._pick(); }
    else if (e.key !== 'Shift' && e.key !== 'Tab') { closeMenu(); } // zaczął pisać sam
  }, true);

  // wysłanie formularza → zapis do KeePassXC
  document.addEventListener('submit', e => {
    if (!pending || pending.saved) return;
    const f = e.target;
    if (pending.root === document || f === pending.root || (pending.userEl && f.contains(pending.userEl))) trySave(false);
  }, true);

  document.addEventListener('click', e => {
    if (!pending || pending.saved) return;
    const btn = e.composedPath().find(n => n instanceof HTMLElement &&
      n.matches('button, input[type=submit], input[type=button], [role=button], a'));
    if (!btn) return;
    const inRoot = pending.root !== document && pending.root.contains(btn);
    const label = (btn.innerText || btn.value || btn.getAttribute('aria-label') || '').trim();
    if ((inRoot && btn.type === 'submit') || ((inRoot || pending.root === document) && SUBMIT_TEXT.test(label))) trySave(false);
  }, true);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || openFor || !pending || pending.saved) return;
    const t = e.target;
    if (t instanceof HTMLInputElement && (pending.root === document || pending.root.contains(t))) trySave(false);
  }, true);

  window.addEventListener('pagehide', () => trySave(false));

  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);

  let scanTimer = null;
  new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 150);
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'type'] });
  setInterval(scan, 1500); // animacje, zmiany layoutu bez mutacji DOM
  scan();

  // menu kontekstowe (prawy przycisk)
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type !== 'fillFocused') return;
    const el = document.activeElement;
    if (!(el instanceof HTMLInputElement)) return;
    if ((el.getAttribute('type') || '').toLowerCase() === 'password') {
      fillPassword(el, newPassword(el));
    } else {
      const fake = document.createElement('div');
      fillAlias(el, fake, true);
    }
  });
})();
