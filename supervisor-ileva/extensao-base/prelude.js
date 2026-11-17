// ===== Extensão Ileva Supervisor: substitui o Tampermonkey =====
// Oferece ao painel as mesmas funções que o Tampermonkey oferecia (GM_getValue, GM_setValue,
// GM_addValueChangeListener e GM_xmlhttpRequest), usando o armazenamento da própria extensão.
var __ILEVA_EXT__ = 1;
var __ilvCache = {}, __ilvMine = {}, __ilvLis = {}, __ilvLisId = 0;
function __ilvAlive() { try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; } }
function GM_getValue(k, d) { return Object.prototype.hasOwnProperty.call(__ilvCache, k) ? __ilvCache[k] : d; }
function GM_setValue(k, v) {
  const old = __ilvCache[k];
  __ilvCache[k] = v;
  if (__ilvAlive()) {
    (__ilvMine[k] = __ilvMine[k] || []).push(v);
    try { chrome.storage.local.set({ [k]: v }); } catch (e) { }
  }
  const L = __ilvLis[k]; if (L) for (const id in L) setTimeout(() => { try { L[id](k, old, v, false); } catch (e) { } }, 0);
}
function GM_deleteValue(k) { delete __ilvCache[k]; try { chrome.storage.local.remove(k); } catch (e) { } }
function GM_addValueChangeListener(k, cb) { const id = ++__ilvLisId; (__ilvLis[k] = __ilvLis[k] || {})[id] = cb; return id; }
function GM_xmlhttpRequest(o) {
  const msg = { t: 'ilv-xhr', url: o.url, method: o.method || 'GET', headers: o.headers || {}, data: o.data == null ? null : String(o.data), timeout: o.timeout || 30000, anonymous: !!o.anonymous };
  try {
    chrome.runtime.sendMessage(msg, r => {
      const le = chrome.runtime.lastError;
      if (le || !r) { o.onerror && o.onerror({ error: le ? le.message : 'sem resposta' }); return; }
      if (r.timeout) { (o.ontimeout || o.onerror) && (o.ontimeout || o.onerror)({}); return; }
      if (r.err) { o.onerror && o.onerror({ error: r.err }); return; }
      o.onload && o.onload({ status: r.status, responseText: r.text, finalUrl: r.url, readyState: 4 });
    });
  } catch (e) { setTimeout(() => o.onerror && o.onerror({ error: String(e) }), 0); }
}
chrome.storage.onChanged.addListener((ch, area) => {
  if (area !== 'local') return;
  for (const k in ch) {
    const nv = ch[k].newValue, mine = __ilvMine[k];
    if (mine && mine.length && mine[0] === nv) { mine.shift(); continue; } // gravação feita por esta própria aba
    const old = __ilvCache[k];
    if (nv === undefined) delete __ilvCache[k]; else __ilvCache[k] = nv;
    const L = __ilvLis[k]; if (L) for (const id in L) { try { L[id](k, old, nv, true); } catch (e) { } }
  }
});
// Quando a extensão é atualizada, as abas abertas ficam com a versão antiga desligada da extensão.
// Aba em segundo plano: recarrega sozinha. Aba na frente: avisa para apertar F5.
setInterval(() => {
  if (__ilvAlive()) return;
  if (document.visibilityState === 'hidden') { location.reload(); return; }
  if (document.getElementById('ileva-ext-upd')) return;
  const d = document.createElement('div'); d.id = 'ileva-ext-upd';
  d.textContent = '🛡️ O Supervisor Ileva foi atualizado. Aperte F5 para carregar a nova versão.';
  d.style.cssText = 'position:fixed;z-index:2147483647;left:50%;top:14px;transform:translateX(-50%);background:#3d0f5c;color:#fff;font:600 14px Segoe UI,sans-serif;padding:10px 18px;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.4);cursor:pointer';
  d.onclick = () => location.reload();
  document.documentElement.appendChild(d);
}, 5000);
function __ilvStart(core) {
  if (window.top !== window) return;
  chrome.storage.local.get(null, items => {
    __ilvCache = items || {};
    // Primeira vez: traz as reuniões, preferências e tarefas que estavam guardadas no Tampermonkey
    const isWA = location.hostname === 'web.whatsapp.com';
    const migrate = () => {
      try {
        const raw = localStorage.getItem('ilevaSup.migr.v1'); if (!raw) return false;
        const j = JSON.parse(raw);
        if (j && j.d && !__ilvCache['ilevaExt.migrated']) {
          const put = Object.assign({}, j.d, { 'ilevaExt.migrated': Date.now() });
          for (const k in j.d) if (!Object.prototype.hasOwnProperty.call(__ilvCache, k)) __ilvCache[k] = j.d[k]; else delete put[k];
          __ilvCache['ilevaExt.migrated'] = put['ilevaExt.migrated'];
          chrome.storage.local.set(put);
        }
        localStorage.setItem('ilevaSup.migr.v1', JSON.stringify({ done: Date.now() }));
        return true;
      } catch (e) { return false; }
    };
    let waited = 0;
    const go = () => {
      // Tampermonkey antigo ainda ligado e já mostrando o painel: não abre um segundo painel
      if (document.getElementById('ileva-supervisor-host')) {
        if (isWA) console.warn('[Ileva] Desative o script "Supervisor" no Tampermonkey: a extensão Ileva Supervisor já faz o trabalho dele.');
        if (waited < 60000) { waited += 5000; setTimeout(go, 5000); }
        return;
      }
      core();
    };
    if (isWA && !__ilvCache['ilevaExt.migrated'] && !migrate()) {
      // espera até 4 s o Tampermonkey (se ainda estiver instalado) entregar os dados guardados nele
      let n = 0; const t = setInterval(() => { if (migrate() || ++n >= 8) {
        clearInterval(t);
        if (!__ilvCache['ilevaExt.migrated']) { __ilvCache['ilevaExt.migrated'] = -1; try { chrome.storage.local.set({ 'ilevaExt.migrated': -1 }); } catch (e) { } }
        go();
      } }, 500);
    } else setTimeout(go, isWA ? 1500 : 800);
  });
}
__ilvStart(function () {
