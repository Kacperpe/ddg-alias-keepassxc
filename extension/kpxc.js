// Klient protokołu KeePassXC (ten sam, którego używa KeePassXC-Browser).
// Szyfrowanie: NaCl box (tweetnacl). Działa w service workerze rozszerzenia
// i w Node (testy) – transport podaje się z zewnątrz.
/* global nacl */
(function (root) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const b64 = u8 => {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  const ERRORS = {
    1: 'Baza KeePassXC jest zablokowana – odblokuj ją.',
    6: 'Odrzucono w KeePassXC.',
    7: 'Nie udało się zaszyfrować wiadomości do KeePassXC.',
    8: 'Połączenie z KeePassXC nie powiodło się – połącz ponownie w ustawieniach rozszerzenia.',
    10: 'KeePassXC nie rozpoznał klucza – połącz ponownie w ustawieniach rozszerzenia.',
    11: 'Ta baza nie jest połączona – kliknij „Połącz z KeePassXC” w ustawieniach rozszerzenia.',
    15: 'Brak zapisanych kont dla tej strony.'
  };
  const err = (msg, code) => Object.assign(new Error(msg), { code });

  class KpxcSession {
    // transport: { send(obj), onMessage(cb), onDisconnect(cb), close() }
    constructor(transport) {
      this.t = transport;
      this.waiters = [];
      this.closed = null;
      transport.onMessage(m => this._onMessage(m));
      transport.onDisconnect(err => {
        this.closed = err || 'Rozłączono z KeePassXC';
        for (const w of this.waiters.splice(0)) w.reject(new Error(this.closed));
      });
    }

    _onMessage(m) {
      // KeePassXC wysyła też komunikaty bez pytania (np. database-locked) – pomijamy je
      const i = this.waiters.findIndex(w => w.action === m.action);
      if (i === -1) return;
      const [w] = this.waiters.splice(i, 1);
      clearTimeout(w.timer);
      w.resolve(m);
    }

    _send(msg, timeout = 20000) {
      if (this.closed) return Promise.reject(new Error(this.closed));
      return new Promise((resolve, reject) => {
        const w = { action: msg.action, resolve, reject };
        w.timer = setTimeout(() => {
          const i = this.waiters.indexOf(w);
          if (i !== -1) this.waiters.splice(i, 1);
          reject(new Error('KeePassXC nie odpowiada – czy jest uruchomiony i ma włączoną integrację z przeglądarką?'));
        }, timeout);
        this.waiters.push(w);
        this.t.send(msg);
      });
    }

    async handshake() {
      this.keys = nacl.box.keyPair();
      this.clientID = b64(nacl.randomBytes(24));
      const r = await this._send({
        action: 'change-public-keys',
        publicKey: b64(this.keys.publicKey),
        nonce: b64(nacl.randomBytes(24)),
        clientID: this.clientID
      });
      if (!r.publicKey) throw new Error(r.error || 'KeePassXC nie przesłał klucza');
      this.hostKey = unb64(r.publicKey);
      this.version = r.version;
      return r;
    }

    async call(action, data = {}, timeout) {
      const nonce = nacl.randomBytes(24);
      const plain = enc.encode(JSON.stringify(Object.assign({ action }, data)));
      const box = nacl.box(plain, nonce, this.hostKey, this.keys.secretKey);
      const r = await this._send({
        action,
        message: b64(box),
        nonce: b64(nonce),
        clientID: this.clientID,
        triggerUnlock: 'true'
      }, timeout);
      if (!r.message) {
        const code = r.errorCode !== undefined ? +r.errorCode : null;
        throw err(ERRORS[code] || r.error || 'Błąd KeePassXC', code);
      }
      const opened = nacl.box.open(unb64(r.message), unb64(r.nonce), this.hostKey, this.keys.secretKey);
      if (!opened) throw new Error('Nie udało się odszyfrować odpowiedzi KeePassXC');
      const out = JSON.parse(dec.decode(opened));
      if (out.success !== 'true' && out.success !== true) {
        throw err(ERRORS[+out.errorCode] || out.error || 'KeePassXC odrzucił żądanie', +out.errorCode);
      }
      return out;
    }

    getDatabaseHash() {
      return this.call('get-databasehash').then(r => r.hash);
    }

    // Pokazuje w KeePassXC okno "nowe połączenie" – użytkownik nadaje nazwę i zatwierdza
    async associate() {
      const idKeys = nacl.box.keyPair();
      const r = await this.call('associate', {
        key: b64(this.keys.publicKey),
        idKey: b64(idKeys.publicKey)
      }, 180000);
      return { id: r.id, key: b64(idKeys.publicKey), hash: r.hash };
    }

    testAssociate(assoc) {
      return this.call('test-associate', { id: assoc.id, key: assoc.key });
    }

    // uuid pusty = nowy wpis
    setLogin({ assoc, url, submitUrl, login, password, group = '', groupUuid = '', uuid = '' }) {
      return this.call('set-login', {
        id: assoc.id, url, submitUrl: submitUrl || url, login, password,
        group, groupUuid, uuid, downloadFavicon: 'true'
      }, 60000);
    }

    getLogins({ assoc, url, submitUrl }) {
      return this.call('get-logins', {
        url, submitUrl: submitUrl || url,
        keys: [{ id: assoc.id, key: assoc.key }]
      }, 60000);
    }

    close() { try { this.t.close(); } catch (e) { /* już zamknięte */ } }
  }

  root.KpxcSession = KpxcSession;
})(typeof self !== 'undefined' ? self : globalThis);
