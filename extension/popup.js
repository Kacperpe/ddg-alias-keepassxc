const out = document.getElementById('out');

function rnd(n) {
  const lim = Math.floor(0x100000000 / n) * n;
  const a = new Uint32Array(1);
  do crypto.getRandomValues(a); while (a[0] >= lim);
  return a[0] % n;
}
function genPassword(len, symbols) {
  const sets = ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789'];
  if (symbols) sets.push('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
  const all = sets.join('');
  const o = sets.map(s => s[rnd(s.length)]);
  while (o.length < len) o.push(all[rnd(all.length)]);
  for (let i = o.length - 1; i > 0; i--) { const j = rnd(i + 1); [o[i], o[j]] = [o[j], o[i]]; }
  return o.join('');
}

document.getElementById('gen').onclick = async () => {
  out.textContent = '…';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let site = '';
  try { site = new URL(tab.url).hostname; } catch {}
  const res = await chrome.runtime.sendMessage({ type: 'generate', site });
  if (res.ok) {
    await navigator.clipboard.writeText(res.alias);
    out.textContent = res.alias + ' (skopiowano)';
  } else {
    out.textContent = 'Błąd: ' + res.error;
  }
};

document.getElementById('pw').onclick = async () => {
  const { pwLength = 64, pwSymbols = true } = await chrome.storage.local.get(['pwLength', 'pwSymbols']);
  const pw = genPassword(pwLength, pwSymbols);
  await navigator.clipboard.writeText(pw);
  out.textContent = 'Hasło skopiowane (pamiętaj zapisać w KeePassXC)';
};

document.getElementById('opt').onclick = () => chrome.runtime.openOptionsPage();
