// ==UserScript==
// @name         Ileva - Supervisor de Atendimento
// @namespace    https://ileva.com.br/supervisor
// @version      1.5.0
// @description  Painel em tempo real dos atendimentos nos grupos de clientes no WhatsApp Web. SOMENTE LEITURA: nunca envia, edita ou apaga mensagens.
// @match        https://web.whatsapp.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
 * SUPERVISOR DE ATENDIMENTO ILEVA (v1.4.0)
 * ----------------------------------------
 * O que faz:
 *  - Lê a lista de conversas e a conversa aberta no WhatsApp Web, a cada 5 segundos.
 *  - Mostra um painel com:
 *      🚨 alertas urgentes | 📋 atendimentos em aberto (🟢🟡🔴) |
 *      ✍️ respostas sugeridas | 🗣️ revisão de tom da equipe | 📊 resumo.
 *  - "Ronda agora": abre um a um os grupos de clientes com atividade recente para ler o histórico
 *    (marca como lidas, como acontece ao abrir um grupo). A ronda automática fica desligada por padrão.
 *
 * O que NUNCA faz:
 *  - Não digita, não envia, não edita, não apaga e não reage a mensagens.
 *  - Não envia dados para fora do seu navegador; tudo fica no armazenamento local do WhatsApp Web.
 */
(function () {
  'use strict';
  if (window.__ilevaSupervisor) return;
  window.__ilevaSupervisor = true;

  const VERSION = '1.5.0';
  const LS_CFG = 'ilevaSup.cfg.v1';
  const LS_DATA = 'ilevaSup.data.v1';
  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  // ------------------------------------------------------------------ CONFIG
  const DEFAULT_CFG = {
    team: [
      'Lucas - Atendimento', 'Adriel - Atendimento', 'Richard - Atendimento',
      'Stony', 'Akim Ileva', 'Francisco - ILEVA', 'Você'
    ],
    teamRegex: 'atendimento ao cliente|ileva\\s*-\\s*atendimento',
    ignoreGroups: ['TIME - ILEVA', 'Ileva - Suporte', 'Clientes Ileva Novos', 'Equipe de Suporte interna'],
    clientGroupRegex: '(&|/)\\s*ileva|ileva\\s*(&|/)',
    autoRound: false,
    idleSec: 120,
    roundEveryMin: 10,
    promiseHours: 2,
    morningTime: '08:15',   // leitura diária de todos os grupos
    morningDays: 7,         // considera grupos com atividade nos últimos N dias
    notify: false
  };

  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* cheio ou bloqueado */ } };

  let cfg = Object.assign({}, DEFAULT_CFG, lsGet(LS_CFG, {}));
  let data = lsGet(LS_DATA, null);
  if (!data || typeof data !== 'object' || !data.groups) data = { groups: {} };
  if (!data.final) data.final = {};      // grupo -> { ts, by } atendimento finalizado manualmente
  if (!data.dismissed) data.dismissed = {}; // chave da mensagem -> ts (alerta de tom já revisado)
  // data.morning = { date:'2026-10-30', at: ts, items:[{name, kind, since}] } – pendências encontradas na leitura das 08:15

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // ------------------------------------------------------------------ TEXT UTILS
  const norm = s => String(s || '').replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim();
  const cleanName = s => norm(s).replace(/^~\s*/, '');
  const lc = s => norm(s).toLowerCase();
  const deacc = s => lc(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const pad = n => String(n).padStart(2, '0');

  function isTeam(sender) {
    const s = cleanName(sender);
    if (!s) return false;
    if (/^você$/i.test(s)) return true;
    const l = s.toLowerCase();
    if (cfg.team.some(t => { const tl = String(t || '').toLowerCase().trim(); return tl && (l.includes(tl) || (l.length >= 3 && (tl === l || tl.startsWith(l + ' ') || tl.startsWith(l + ' -')))); })) return true;
    try { return new RegExp(cfg.teamRegex, 'i').test(s); } catch (e) { return false; }
  }
  function isClientGroup(name) {
    const l = lc(name);
    if (!l) return false;
    if (cfg.ignoreGroups.some(g => g && l.includes(String(g).toLowerCase()))) return false;
    try { return new RegExp(cfg.clientGroupRegex, 'i').test(name); } catch (e) { return false; }
  }
  function shortName(sender) {
    const s = cleanName(sender);
    if (/^você$/i.test(s)) return 'Você';
    return s.split(/\s+-\s+/)[0].trim() || s;
  }
  const isPhone = s => /^\+?[\d\s()-]{8,}$/.test(cleanName(s));

  // Mensagens que não contam como "relevantes" (ok, obrigado, figurinha etc.)
  const TRIVIAL_WORDS = new Set(('ok okk okkk okay oki okey blz beleza certo certinho perfeito show top joia ta ' +
    'entendi entendido ah aa a sim isso valeu vlw obg obgd obrigado obrigada obrigadao obrigados obrigadas ' +
    'brigado brigada grato grata muito mto pelo retorno de nada combinado maravilha otimo e o tudo bem bom tb tbm tambem igualmente td').split(' '));
  const GREET_WORDS = new Set('bom boa dia tarde noite tenha um uma otimo otima excelente feliz bons boas abraco abracos att atenciosamente ate mais logo amanha semana fim final trabalho pessoal ai voce voces tambem igualmente pra para vc vcs'.split(' '));
  const ACK_WORDS = new Set('ok okk okay oki okey blz beleza certo certinho perfeito joia ta entendi entendido valeu vlw obg obgd obrigado obrigada obrigadao obrigados obrigadas brigado brigada grato grata combinado maravilha otimo show top igualmente'.split(' '));
  function isTrivial(text) {
    const t = deacc(text);
    if (!t) return true;
    if (/^aguardando mensagem/.test(t)) return true;
    if (/^(figurinha|sticker|mensagem apagada|esta mensagem foi apagada|voce apagou esta mensagem|\[figurinha\]|\[midia\]|foto|imagem)$/.test(t)) return true;
    const words = t.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
    if (!words.length) return true; // só emoji
    if (words.length > 9) return false;
    if (words.every(w => TRIVIAL_WORDS.has(w))) return true;
    // "Tá bem, obrigada, boa tarde" / "Obrigado, tenha um ótimo dia" -> encerramento
    const hasAck = words.some(w => ACK_WORDS.has(w));
    return hasAck && words.every(w => TRIVIAL_WORDS.has(w) || GREET_WORDS.has(w));
  }
  // Cliente avisou que vai mandar algo -> aguardando o cliente
  const AWAIT_RE = /^(um |so um |s[oó] um )?(momento|momenot|minuto|instante|segundinho|segundo)\b|^(vou|irei) (verificar|ver|olhar|mandar|enviar|pegar|conferir|pedir|checar|solicitar)|^ja (te |lhes? )?(mando|envio|passo)|^solicitei|^estou verificando|^vou providenciar/;
  // Equipe prometeu retorno
  const PROMISE_RE = /(amanha|assim que (tivermos|tiver|recebermos|eles)|quando (tivermos|eles nos|o setor)|informaremos|retornaremos|daremos (um )?retorno|estaremos (lhe )?informando|setor responsavel|devolutiva|aguardando retorno)/;

  // ------------------------------------------------------------------ TIME UTILS
  const TIME_RE = /^\d{1,2}:\d{2}$/;
  const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  function todayAt(h, m) { const d = new Date(); d.setHours(h, m, 0, 0); return d.getTime(); }
  function labelToTs(label) {
    const l = lc(label);
    if (TIME_RE.test(l)) { const [h, m] = l.split(':').map(Number); return { ts: todayAt(h, m), exact: true }; }
    if (l === 'ontem') { const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(12, 0, 0, 0); return { ts: d.getTime(), exact: false, label: 'ontem' }; }
    const wi = WEEKDAYS.indexOf(l);
    if (wi >= 0) { const d = new Date(); let back = (d.getDay() - wi + 7) % 7 || 7; d.setDate(d.getDate() - back); d.setHours(12, 0, 0, 0); return { ts: d.getTime(), exact: false, label: l }; }
    const m = l.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return { ts: new Date(y, +m[2] - 1, +m[1], 12, 0).getTime(), exact: false, label: l }; }
    return { ts: null, exact: false };
  }
  function parsePre(pre) {
    const m = String(pre || '').match(/^\[(\d{1,2}):(\d{2})(?::\d{2})?,\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\]\s*(.*?):\s*$/);
    if (!m) return null;
    let y = +m[5]; if (y < 100) y += 2000;
    return { ts: new Date(y, +m[4] - 1, +m[3], +m[1], +m[2]).getTime(), sender: norm(m[6]) };
  }
  function fmtDur(ms) {
    if (ms < 0) ms = 0;
    const m = Math.floor(ms / MIN);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60), mm = m % 60;
    if (h < 24) return `${h} h ${pad(mm)} min`;
    return `${Math.floor(h / 24)} d ${h % 24} h`;
  }
  function fmtTime(ts, approxLabel) {
    if (approxLabel) return approxLabel;
    const d = new Date(ts), now = new Date();
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (d.toDateString() === now.toDateString()) return hm;
    const y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return `ontem ${hm}`;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${hm}`;
  }
  function saud(ts) { const h = new Date(ts || Date.now()).getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

  // ------------------------------------------------------------------ STORE
  function G(name) { return data.groups[name] || (data.groups[name] = { msgs: [], preview: null, lastChatRead: 0 }); }
  function addMsg(name, msg) {
    const g = G(name);
    msg.text = norm(msg.text);
    const t = msg.text.slice(0, 40);
    const ex = g.msgs.find(m => Math.abs(m.ts - msg.ts) <= MIN && (m.role === msg.role || isTeam(m.sender) === isTeam(msg.sender)) &&
      ((m.text || '').startsWith(t) || msg.text.startsWith((m.text || '').slice(0, 40))));
    if (ex) {
      if (ex.role !== msg.role && msg.role === 'team') ex.role = 'team';
      if (msg.src === 'chat' && ex.src !== 'chat') Object.assign(ex, msg);
      else if (msg.src === ex.src && msg.text.length > (ex.text || '').length) ex.text = msg.text;
      return ex;
    }
    g.msgs.push(msg);
    g.msgs.sort((a, b) => a.ts - b.ts);
    if (g.msgs.length > 400) g.msgs.splice(0, g.msgs.length - 400);
    return msg;
  }
  function prune() {
    const lim = Date.now() - 8 * DAY;
    const lim30 = Date.now() - 30 * DAY;
    for (const k of Object.keys(data.final || {})) if (!data.final[k] || data.final[k].ts < lim30) delete data.final[k];
    for (const k of Object.keys(data.dismissed || {})) if (data.dismissed[k] < lim30) delete data.dismissed[k];
    for (const n of Object.keys(data.groups)) {
      const g = data.groups[n];
      g.msgs = g.msgs.filter(m => m.ts >= lim);
      if (!g.msgs.length && (!g.preview || !g.preview.ts || g.preview.ts < Date.now() - 8 * DAY)) delete data.groups[n];
    }
  }
  let saveTimer = 0;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => lsSet(LS_DATA, data), 500); }

  // ------------------------------------------------------------------ READERS (somente leitura do DOM)
  function listRows() {
    const pane = document.querySelector('#pane-side');
    if (!pane) return [];
    return [...new Set(pane.querySelectorAll('[role="row"],[role="listitem"]'))];
  }
  function parseRow(r) {
    const tEl = r.querySelector('span[title]');
    const lines = (r.innerText || '').split('\n').map(norm).filter(Boolean);
    let name = norm(tEl && tEl.getAttribute('title'));
    if (!name) name = lines.find(l => !/mensage(m|ns) não lida/i.test(l)) || '';
    const timeLabel = lines.find(l => TIME_RE.test(l) || /^ontem$/i.test(l) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(l) || WEEKDAYS.includes(l.toLowerCase())) || '';
    const isDraft = lines.some(l => /^rascunho/i.test(l));
    const isReaction = lines.some(l => /reagiu com/i.test(l));
    const ci = lines.findIndex(l => l === ':');
    let sender = null, text = '';
    if (ci > 0) {
      sender = lines[ci - 1];
      text = lines.slice(ci + 1).filter(l => !/^\d+$/.test(l)).join(' ');
    } else {
      const ti = lines.indexOf(timeLabel);
      text = lines.slice(ti + 1).filter(l => !/^\d+$/.test(l) && !/mensage(m|ns) não lida/i.test(l)).join(' ');
    }
    return { name, timeLabel, sender, text, isDraft, isReaction };
  }
  function ingestList() {
    for (const r of listRows()) {
      const p = parseRow(r);
      if (!p.name || !isClientGroup(p.name)) continue;
      const g = G(p.name);
      if (p.isDraft || p.isReaction) { if (g.preview) g.preview.seen = Date.now(); continue; }
      const t = labelToTs(p.timeLabel);
      const role = p.sender ? (isTeam(p.sender) ? 'team' : 'client') : null;
      g.preview = { sender: p.sender, text: p.text, timeLabel: p.timeLabel, ts: t.ts, exact: t.exact, approxLabel: t.label || null, role, seen: Date.now() };
      if (t.exact && role) addMsg(p.name, { ts: t.ts, sender: p.sender, text: p.text, role, src: 'list' });
    }
  }
  function currentChatName() {
    const h = document.querySelector('#main header');
    if (!h) return null;
    const first = norm((h.innerText || '').split('\n')[0]);
    if (first) return first;
    const t = h.querySelector('span[title]');
    return norm(t && t.getAttribute('title')) || null;
  }
  function composerHasText() {
    const c = document.querySelector('#main footer [contenteditable="true"]');
    return !!(c && norm(c.innerText).length);
  }
  function ingestOpenChat() {
    const main = document.querySelector('#main');
    if (!main) return;
    const name = currentChatName();
    if (!name || !isClientGroup(name)) return;
    const g = G(name);
    const now = Date.now();
    let lastTs = null;
    for (const r of main.querySelectorAll('[role="row"]')) {
      const isOut = !!r.querySelector('.message-out');
      const isIn = !!r.querySelector('.message-in');
      if (!isOut && !isIn) continue;
      const pre = r.querySelector('[data-pre-plain-text]');
      if (pre) {
        const p = parsePre(pre.getAttribute('data-pre-plain-text'));
        if (!p) continue;
        lastTs = p.ts;
        const spans = [...pre.querySelectorAll('span.selectable-text')].filter(s => !s.closest('[role="button"]'));
        let text = spans.length ? spans.map(s => s.innerText).join(' ') : pre.innerText;
        text = norm(text).replace(/\s*Ler mais$/i, '');
        const role = (isOut || isTeam(p.sender)) ? 'team' : 'client';
        addMsg(name, { ts: p.ts, sender: p.sender, text, role, src: 'chat' });
      } else {
        // mídia sem texto: só consideramos áudio (figurinha/foto sem legenda são ignoradas)
        const txt = r.innerText || '';
        const times = txt.match(/\b\d{1,2}:\d{2}\b/g) || [];
        const isAudio = !!r.querySelector('audio,[data-icon*="audio"],[data-icon*="ptt"],[aria-label*="áudio" i],[aria-label*="voz" i]') || times.length >= 2;
        if (!isAudio || !times.length) continue;
        const [hh, mm] = times[times.length - 1].split(':').map(Number);
        const base = lastTs ? new Date(lastTs) : new Date();
        base.setHours(hh, mm, 0, 0);
        let ts = base.getTime();
        if (lastTs && ts < lastTs - MIN) ts += DAY;
        if (ts > now + 5 * MIN) ts -= DAY;
        let sender = isOut ? 'Você' : norm(txt.split('\n')[0]);
        if (!sender || /\d{1,2}:\d{2}/.test(sender)) sender = 'Cliente';
        addMsg(name, { ts, sender, text: '[áudio]', role: (isOut || isTeam(sender)) ? 'team' : 'client', src: 'chat' });
        lastTs = ts;
      }
    }
    g.lastChatRead = now;
    if (g._learnedN !== g.msgs.length) { g._learnedN = g.msgs.length; try { learnGroup(name); } catch (e) { console.warn('[Supervisor Ileva] aprender', e); } }
  }

  // ------------------------------------------------------------------ RONDA (abre grupos – nunca digita)
  let lastInput = Date.now(), rounding = false, manualRound = false, abortRound = false, lastRound = 0, lastSweep = 0, roundInfo = '';
  ['keydown', 'mousedown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, e => {
    if (!e.isTrusted) return;
    const inPanel = host && e.composedPath && e.composedPath().includes(host);
    if (inPanel) return;
    lastInput = Date.now();
    if (rounding && !manualRound) abortRound = true;
  }, true));

  async function sweepList() {
    const pane = document.querySelector('#pane-side');
    if (!pane) return [];
    const start = pane.scrollTop;
    const names = new Set();
    pane.scrollTop = 0; await sleep(300);
    let prev = -1;
    for (let i = 0; i < 80; i++) {
      ingestList();
      for (const r of listRows()) { const p = parseRow(r); if (p.name && isClientGroup(p.name)) names.add(p.name); }
      if (pane.scrollTop === prev || abortRound) break;
      prev = pane.scrollTop;
      pane.scrollTop += Math.max(200, pane.clientHeight * 0.8);
      await sleep(350);
    }
    pane.scrollTop = start;
    lastSweep = Date.now();
    return [...names];
  }
  async function findRow(name) {
    let r = listRows().find(x => parseRow(x).name === name);
    if (r) return r;
    const pane = document.querySelector('#pane-side');
    if (!pane) return null;
    const start = pane.scrollTop;
    pane.scrollTop = 0; await sleep(300);
    let prev = -1;
    for (let i = 0; i < 80; i++) {
      r = listRows().find(x => parseRow(x).name === name);
      if (r) return r;
      if (pane.scrollTop === prev) break;
      prev = pane.scrollTop;
      pane.scrollTop += Math.max(200, pane.clientHeight * 0.8);
      await sleep(300);
    }
    pane.scrollTop = start;
    return null;
  }
  async function openChat(name) {
    if (currentChatName() === name) return true;
    const r = await findRow(name);
    if (!r) return false;
    const t = r.querySelector('span[title]') || r;
    for (const type of ['mousedown', 'mouseup', 'click']) t.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    for (let i = 0; i < 25; i++) { await sleep(200); if (currentChatName() === name) break; }
    await sleep(1200);
    return currentChatName() === name;
  }
  async function round(manual, lookbackMs, label) {
    if (rounding) return;
    rounding = true; manualRound = !!manual; abortRound = false;
    const LB = lookbackMs || 36 * HOUR;
    const tag = label || 'Ronda';
    roundInfo = `${tag}: listando grupos…`; render(true);
    try {
      const original = currentChatName();
      const names = await sweepList();
      const recent = names.filter(n => { const pv = data.groups[n] && data.groups[n].preview; return pv && pv.ts && Date.now() - pv.ts < LB; });
      for (let i = 0; i < recent.length; i++) {
        if (abortRound) break;
        if (!manual && composerHasText()) break;
        roundInfo = `${tag}: ${i + 1}/${recent.length} — ${recent[i]}`; render(true);
        if (await openChat(recent[i])) ingestOpenChat();
      }
      if (original && currentChatName() !== original) await openChat(original);
      lastRound = Date.now();
      return !abortRound;
    } catch (e) { console.warn('[Supervisor Ileva] ronda', e); }
    finally { rounding = false; roundInfo = ''; save(); render(true); }
  }
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  function morningDue() {
    const [hh, mm] = String(cfg.morningTime || '08:15').split(':').map(Number);
    const t = new Date(); t.setHours(hh || 8, mm || 0, 0, 0);
    return Date.now() >= t.getTime() && (!data.morning || data.morning.date !== dayKey());
  }
  let morningRetryAt = 0;
  if (!data.morningInit) {
    data.morningInit = true;
    const [hh, mm] = String(cfg.morningTime || '08:15').split(':').map(Number);
    const t = new Date(); t.setHours(hh || 8, mm || 0, 0, 0);
    if (Date.now() >= t.getTime()) data.morning = { date: dayKey(), at: 0, items: [], pending: true };
    lsSet(LS_DATA, data);
  }
  async function morningRound(manual) {
    if (rounding) return;
    const ok = await round(manual, cfg.morningDays * DAY, '🌅 Leitura do início do dia');
    if (!ok && !manual) { morningRetryAt = Date.now() + 2 * MIN; return; } // interrompida: tenta de novo em 2 min
    try { learnAll(); } catch (e) { }
    snapshotMorning();
  }
  function snapshotMorning() {
    const today0 = startOfToday();
    const items = [];
    for (const n of Object.keys(data.groups)) {
      if (!isClientGroup(n)) continue;
      const c = computeGroup(n);
      if (!c) continue;
      if (c.status === 'open' || c.status === 'await') {
        const since = c.pend[0] ? c.pend[0].ts : (c.lastRel ? c.lastRel.ts : 0);
        const lab = (c.pend[0] && c.pend[0].approxLabel) || (c.lastRel && c.lastRel.approxLabel) || null;
        if (since < today0) items.push({ name: n, kind: c.status, since, label: lab });
      } else if (c.promise && c.promise.since < today0) items.push({ name: n, kind: 'promise', since: c.promise.since });
    }
    items.sort((a, b) => a.since - b.since);
    data.morning = { date: dayKey(), at: Date.now(), items };
    lsSet(LS_DATA, data);
    if (cfg.notify && 'Notification' in window && Notification.permission === 'granted' && items.length) {
      try { new Notification('🌅 Pendências do início do dia', { body: `${items.length} atendimento(s) ficaram em aberto. Veja na aba "Início do dia".`, tag: 'ileva-morning' }); } catch (e) { }
    }
    ui.tab = 'manha'; ui.filter = null; saveUi(); render(true);
  }
  async function maybeAuto() {
    if (rounding) return;
    // leitura diária às 08:15 (ou na primeira vez que o WhatsApp for aberto depois desse horário)
    if (morningDue() && Date.now() >= morningRetryAt) {
      const busy = Date.now() - lastInput < 30 * 1000 || composerHasText();
      if (!busy) { morningRound(false); return; }
    }
    const idle = Date.now() - lastInput > cfg.idleSec * 1000;
    if (!idle || composerHasText()) return;
    if (cfg.autoRound && Date.now() - lastRound > cfg.roundEveryMin * MIN) { round(false); return; }
  }

  // ------------------------------------------------------------------ ANÁLISE DE ATENDIMENTOS
  function computeGroup(name) {
    const g = data.groups[name];
    if (!g) return null;
    const now = Date.now();
    const msgs = g.msgs.filter(m => m.ts > now - 8 * DAY).map(m => Object.assign({}, m));
    const pv = g.preview;
    if (pv && pv.role && !pv.exact && pv.ts && pv.ts > now - 8 * DAY) {
      const t = (pv.text || '').slice(0, 30);
      if (!msgs.some(m => m.role === pv.role && (m.text || '').startsWith(t)))
        msgs.push({ ts: pv.ts, sender: pv.sender, text: pv.text, role: pv.role, src: 'preview', approx: true, approxLabel: pv.approxLabel });
    }
    msgs.forEach(m => { if (m.role !== 'team' && isTeam(m.sender)) m.role = 'team'; });
    msgs.sort((a, b) => a.ts - b.ts);
    // remove duplicadas (mesma mensagem vista na lista e na conversa, ou gravada por versão anterior)
    for (let i = msgs.length - 1; i > 0; i--) {
      for (let j = i - 1; j >= 0 && msgs[i].ts - msgs[j].ts <= MIN; j--) {
        const a = (msgs[i].text || '').slice(0, 40), b = (msgs[j].text || '').slice(0, 40);
        if (msgs[i].role === msgs[j].role && (a.startsWith(b) || b.startsWith(a))) {
          if (msgs[i].src === 'chat' && msgs[j].src !== 'chat') msgs[j] = msgs[i];
          msgs.splice(i, 1); break;
        }
      }
    }
    if (!msgs.length) return null;
    let lastRel = null;
    for (let i = msgs.length - 1; i >= 0; i--) if (!isTrivial(msgs[i].text)) { lastRel = msgs[i]; break; }
    let status = 'closed';
    const pend = [];
    if (lastRel && lastRel.role === 'client') {
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'team' && !isTrivial(msgs[i].text)) break;
        if (msgs[i].role === 'client' && !isTrivial(msgs[i].text)) pend.unshift(msgs[i]);
      }
      status = AWAIT_RE.test(deacc(lastRel.text)) ? 'await' : 'open';
    } else if (!lastRel) status = 'unknown';
    // finalizado manualmente pelo gestor: só reabre se o cliente mandar algo relevante depois
    const fin = data.final && data.final[name];
    let finalized = null;
    if (fin && lastRel && lastRel.ts <= fin.ts) { finalized = fin; if (status === 'open' || status === 'await') status = 'closed'; }
    const since = pend.length ? pend[0] : lastRel;
    const wait = since ? now - since.ts : 0;
    const approx = !!(since && since.approx);
    const level = approx ? 'red' : wait <= 10 * MIN ? 'green' : wait <= 15 * MIN ? 'yellow' : 'red';
    // nome do cliente para @menção
    let clientName = '';
    const cm = [...msgs].reverse().find(m => m.role === 'client' && m.sender);
    if (cm) clientName = cleanName(cm.sender);
    if ((!clientName || isPhone(clientName)) && pv && pv.role === 'client' && pv.sender && !isPhone(pv.sender)) clientName = cleanName(pv.sender);
    // retorno prometido e ainda não dado
    let promise = null;
    if (!finalized && status === 'closed' && lastRel && lastRel.role === 'team' && PROMISE_RE.test(deacc(lastRel.text)) && now - lastRel.ts > cfg.promiseHours * HOUR && now - lastRel.ts < 8 * DAY) {
      promise = { since: lastRel.ts, text: lastRel.text, who: shortName(lastRel.sender) };
      const cl = [...msgs].reverse().find(m => m.role === 'client' && m.sender);
      if (cl) clientName = cleanName(cl.sender);
    }
    return { name, status, msgs, lastRel, pend, wait, approx, level, clientName: clientName || 'cliente', promise, finalized, partial: !g.lastChatRead, lastChatRead: g.lastChatRead };
  }

  // ------------------------------------------------------------------ REVISÃO DE TOM
  const matchCase = (orig, rep) => (orig[0] && orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase()) ? rep[0].toUpperCase() + rep.slice(1) : rep;
  const SLANG = [
    [/\bbeleza\b|\bblz\b/gi, 'Perfeito', '"beleza/blz"'],
    [/\bvlw\b|\bvaleu\b/gi, 'Obrigado', '"vlw/valeu"'],
    [/\bshow\b/gi, 'Perfeito', '"show"'],
    [/\btipo\b(?!\s+(de|do|da|dos|das)\b),?\s*/gi, '', '"tipo"'],
    [/\bpra gente\b/gi, 'para a gente', '"pra"'], [/\bpras\b/gi, 'para as', '"pras"'], [/\bpros\b/gi, 'para os', '"pros"'],
    [/\bpra\b/gi, 'para', '"pra"'], [/\bpro\b(?!-)/gi, 'para o', '"pro"'],
    [/(?<![\p{L}])(tá|ta)(?![\p{L}])/giu, 'está', '"tá"'],
    [/,?\s*(?<![\p{L}])né(?![\p{L}])\??/giu, '', '"né"'],
    [/\bvcs\b/gi, 'vocês', '"vcs"'], [/\bvc\b/gi, 'você', '"vc"'],
    [/\btbm?\b/gi, 'também', '"tb/tbm"'], [/\bpq\b/gi, 'porque', '"pq"'],
    [/\bobg\b/gi, 'obrigado', '"obg"'], [/\bmsm\b/gi, 'mesmo', '"msm"'], [/\bhj\b/gi, 'hoje', '"hj"'],
    [/\btmj\b/gi, 'Conte conosco', '"tmj"'], [/\s*\b(kkk+|rsrs|rs)\b/gi, '', 'risadas ("kkk/rs")']
  ];
  const GER_INF = { ando: 'ar', endo: 'er', indo: 'ir' };
  const PT_FIX = [
    [/\banaliz(\w*)/gi, (m, s) => matchCase(m, 'analis' + s), '"analiz…" → "analis…"'],
    [/\bdemosntr(\w*)/gi, (m, s) => matchCase(m, 'demonstr' + s), '"demosntr…" → "demonstr…"'],
    [/\bconcerteza\b/gi, 'com certeza', '"concerteza" → "com certeza"'],
    [/\bderrepente\b/gi, 'de repente', '"derrepente" → "de repente"'],
    [/\bexcess[ãa]o\b/gi, 'exceção', '"excessão" → "exceção"'],
    [/\batravez\b/gi, 'através', '"atravez" → "através"'],
    [/\bporisso\b/gi, 'por isso', '"porisso" → "por isso"'],
    [/\bseje\b/gi, 'seja', '"seje" → "seja"'], [/\besteje\b/gi, 'esteja', '"esteje" → "esteja"'],
    [/\bmenas\b/gi, 'menos', '"menas" → "menos"'], [/\benchergar\b/gi, 'enxergar', '"enchergar" → "enxergar"'],
    [/\bimpecilho\b/gi, 'empecilho', '"impecilho" → "empecilho"'], [/\bancios(o|a)\b/gi, 'ansios$1', '"ancioso" → "ansioso"'],
    [/\bhouveram\b/gi, 'houve', '"houveram" → "houve"'], [/\ba nível de\b/gi, 'em nível de', '"a nível de" → "em nível de"'],
    [/\bfazem (\d+|alguns|muitos|poucos) (dias|meses|anos|minutos|horas|semanas)\b/gi, 'faz $1 $2', '"fazem X dias" → "faz X dias"'],
    [/\bpara mim (fazer|ver|enviar|verificar|analisar|conferir|olhar|mandar|ajudar|entender|passar|checar)\b/gi, 'para eu $1', '"para mim fazer" → "para eu fazer"'],
    [/\ba (sua |vossa )?disposição/gi, (m, s) => matchCase(m, 'à ' + (s || '') + 'disposição'), 'crase: "à disposição"'],
    [/\b(vou estar|vamos estar|estaremos|estarei|estar)\s+(lhe |lhes |te |os |as |o |a )?(?!quando\b)(\w+?)(ando|endo|indo)\b/gi, (m, aux, pron, stem, end) => {
      const inf = stem + GER_INF[end.toLowerCase()];
      const p = pron ? pron.trim() + ' ' : '';
      const a = aux.toLowerCase();
      const out = a === 'estar' ? p + inf : a === 'vou estar' ? 'vou ' + p + inf : a === 'vamos estar' ? 'vamos ' + p + inf : a === 'estaremos' ? p + inf + 'emos' : p + inf + 'ei';
      return matchCase(m, out);
    }, 'gerundismo ("estar + -ndo")'],
    [/\b(bom dia|boa tarde|boa noite|olá|oi)\s+@/gi, '$1, @', 'falta vírgula antes do nome ("Bom dia, @Nome")'],
    [/\b(perfeito|obrigad[oa]|claro|certo|ótimo|otimo|combinado|entendido|exatamente)\s+@/gi, '$1, @', 'falta vírgula antes do nome ("Perfeito, @Nome")'],
    [/\bPor Nada\b/g, 'Por nada', '"Por Nada" → "Por nada" (sem maiúscula)'],
    [/(?<![\p{L}])mão (será|é|tem|foi|vai|vamos|consegui|conseguimos|há|existe|precisa|deu)(?![\p{L}])/giu, 'não $1', 'digitação: "mão" → "não"'],
    [/\b(deve|devem|vai|vão|pode|podem|irá|irão|precisa|precisam|vamos|poderia|poderiam) (analisa|verifica|envia|libera|atualiza|ajusta|corrige|confere|resolve|implementa|retorna|informa)\b/gi, (m, a, v) => `${a} ${v}r`, 'verbo no infinitivo ("deve analisar")'],
    [/\bum (requisição|solicitação|reunião|configuração|função|opção|situação|alteração|atualização|informação|análise|ligação|dúvida|mensagem|planilha|tela|conta|integração)\b/gi, (m, w) => matchCase(m, 'uma ' + w), 'concordância: "uma requisição"'],
    [/\b(possibilidade|necessidade|forma|opção|maneira) (restringir|alterar|excluir|editar|ativar|desativar|configurar|cadastrar|gerar|emitir|liberar|bloquear|mudar|trocar|incluir|remover)\b/gi, '$1 de $2', 'falta "de" ("possibilidade de restringir")'],
    [/\b(pertenc\w*|referente|devido|junto|igual|semelhante|chegou|chegar|voltou|voltar|retornar|retornou) a (equipe|regional|filial|empresa|associação|tela|página|configuração|situação|data)\b/gi, '$1 à $2', 'crase: "à equipe"'],
    [/\bpoderia por gentileza,/gi, (m) => matchCase(m, 'poderia, por gentileza,'), 'vírgula: "Poderia, por gentileza, …"'],
    [/\bvia email\b|\bpor email\b|\bo email\b|\bseu email\b|\bno email\b/gi, (m) => m.replace(/email/i, 'e-mail'), '"email" → "e-mail"']
  ];
  const INFORMAL_IMP = { faz: 'faça', apaga: 'apague', limpa: 'limpe', manda: 'envie', envia: 'envie', clica: 'clique', tenta: 'tente', coloca: 'coloque', atualiza: 'atualize', abre: 'abra', entra: 'acesse', verifica: 'verifique', olha: 'verifique', refaz: 'refaça', exclui: 'exclua', cadastra: 'cadastre', preenche: 'preencha', seleciona: 'selecione', reinicia: 'reinicie', baixa: 'baixe', salva: 'salve', espera: 'aguarde', aguarda: 'aguarde', confere: 'confira', muda: 'altere', troca: 'altere', desliga: 'desligue', fecha: 'feche', marca: 'marque', desmarca: 'desmarque' };
  const FORMAL_IMP = new Set(['faça', 'apague', 'limpe', 'mande', 'envie', 'clique', 'tente', 'coloque', 'atualize', 'abra', 'acesse', 'verifique', 'refaça', 'exclua', 'cadastre', 'preencha', 'selecione', 'reinicie', 'baixe', 'salve', 'aguarde', 'confira', 'altere', 'feche', 'marque']);
  const POLITE_RE = /(por gentileza|por favor|poderia|poderiam|pode(m)? |consegue|conseguem|gentileza|seria poss[ií]vel|peço que|pedimos que|solicitamos|recomendamos|sugerimos|se poss[ií]vel)/i;
  const EMPATHY = [
    /nao (e|eh) (problema|culpa|responsabilidade|com a gente|conosco|nosso|nossa|da ileva)/,
    /(problema|culpa) (e )?(do|da|dos|das) (banco|cliente|associado|voces|fornecedor)/,
    /sao entre eles/, /nao (temos|tem) (nada a ver|como ajudar|o que fazer)/,
    /nao depende (de nos|da gente|da ileva)/, /isso e com (o|a) (banco|fornecedor|associado|asaas)/,
    /(nos|a gente),? (do|da) ileva,? (apenas|so)\b/, /(verifique|veja|verificar|ver|procure|procurar|verifiquem) com o banco/,
    /(nao sei|sei la)\b/, /\bse vira\b/, /fica (por parte|a cargo) deles/, /nao tenho como (eu )?garantir/, /depende (deles|da equipe de desenvolvimento)/
  ];
  const TECH = [
    { re: /(asaas|sicoob|sicredi?|maps).{0,80}(gerar|enviar|processar|subir|importar|fazer).{0,30}(remessa|retorno)|(gerar|enviar|processar|subir|importar|fazer).{0,30}(remessa|retorno).{0,80}(asaas|sicoob|sicredi?|maps)/, note: 'Treinamento Faturamento §10: ASAAS, SICOOB, SICRED e MAPS IP têm remessa e retorno automáticos (não precisam de tratamento manual).' },
    { re: /(nao precisa|sem precisar|nao e necessario).{0,30}rateio|fechamento.{0,40}(sem|antes de) (fechar )?(o )?rateio/, note: 'Treinamento Faturamento §6: é obrigatório fechar o rateio do mês antes de qualquer fechamento, mesmo com valor fixo.' },
    { re: /(exclu|remov|tir)\w*.{0,25}(veiculo|carro|placa).{0,40}fechamento/, unless: /isenc/, note: 'Treinamento Gestão do Associado §5.2: para tirar o veículo do fechamento por um período, use o campo Isenção (preserva o histórico).' },
    { re: /(previsao de entrega|tempo maximo).{0,60}(bloque|trava|impede)/, unless: /nao (bloque|trava|impede)/, note: 'Treinamento Eventos Inicial §4.3/5.3: previsão de entrega e tempo máximo sugerido são apenas alertas; não bloqueiam o evento.' },
    { re: /(exclu|apag)\w*.{0,25}(documento|arquivo|foto).{0,40}(ilegive|errad|divergen)/, note: 'Treinamento Eventos §4: documentos ilegíveis ou divergentes devem ser Arquivados (não excluídos) e o reenvio solicitado.' },
    { re: /perda total.{0,60}link externo|link externo.{0,60}perda total/, unless: /nao (e )?recomend|evit/, note: 'Treinamento Eventos Inicial §4.3: não é recomendado disponibilizar "Perda total" no link externo.' },
    { re: /(nao (da|tem como|e possivel|conseguimos)).{0,40}(alterar|trocar|mudar|redefinir).{0,20}senha.{0,40}(app|aplicativo|associado)/, note: 'Treinamento Gestão do Associado §4.2: a associação pode alterar a senha do app em Dados de acesso, na ficha do associado.' },
    { re: /fipe.{0,60}(atualiza|muda).{0,30}(semana|todo dia|diariamente|anual|todo ano)/, note: 'Treinamento Comercial Inicial §4.2: a tabela FIPE é atualizada automaticamente todo início de mês.' },
    { re: /repetir veiculo.{0,40}\bsim\b/, note: 'Treinamento Faturamento §7.2: "Repetir veículo(s) na referência" deve ficar como Não na grande maioria dos casos.' },
    { re: /considerar no fechamento.{0,30}\bnao\b.{0,60}(nao|sem) (cobra|duplic)/, note: 'Treinamento Faturamento §8.1: com "Considerar no fechamento" = Não, o veículo é cobrado no avulso E no fechamento.' }
  ];
  const toneCache = new Map();
  function analyzeTone(g, i) {
    const m = g.msgs[i];
    const key = `${g.name}|${m.ts}|${m.text}`;
    const prev = i > 0 ? g.msgs[i - 1] : null;
    const prevKey = prev ? `${prev.role}|${prev.ts}` : '-';
    const cached = toneCache.get(key);
    if (cached && cached.prevKey === prevKey) return cached.res;
    const res = analyzeToneRaw(g, i);
    toneCache.set(key, { prevKey, res });
    return res;
  }
  function analyzeToneRaw(g, i) {
    const m = g.msgs[i];
    const t = m.text || '';
    if (!t || /^\[.*\]$/.test(t) || isTrivial(t) && t.length < 25) return null;
    const issues = [];
    let fixed = t;
    // 1) gírias / informalidade
    for (const [re, rep, label] of SLANG) {
      re.lastIndex = 0;
      if (re.test(t)) { issues.push({ cat: 'Gíria/informalidade', text: label }); re.lastIndex = 0; fixed = fixed.replace(re, (mm) => rep ? matchCase(mm.trim(), rep) + (/\s$/.test(mm) ? ' ' : '') : ''); }
    }
    // 2) português
    for (const [re, rep, label] of PT_FIX) {
      re.lastIndex = 0;
      if (re.test(fixed)) { issues.push({ cat: 'Português', text: label }); re.lastIndex = 0; fixed = fixed.replace(re, rep); }
    }
    // 3) imperativo seco
    const polite = POLITE_RE.test(t);
    const hasList = /(^|\s)\d+[.)]\s/.test(t);
    const sentences = fixed.split(/(?<=[.!?])\s+/);
    let impFound = false;
    const newSent = sentences.map(s => {
      const stripped = s.replace(/^@[^,!?.\n]{1,40}[,!]?\s*/, '').replace(/^(bom dia|boa tarde|boa noite|olá|oi)[,!]?\s*/i, '').replace(/^((perfeito|ok|okay|certo|beleza|blz|então|entao|ah|bom|show|certinho)[,!.]?\s+)+/i, '');
      const w = (stripped.match(/^[\p{L}]+/u) || [''])[0];
      const wl = w.toLowerCase();
      if (INFORMAL_IMP[wl]) {
        impFound = true;
        return s.replace(stripped, 'Por gentileza, ' + INFORMAL_IMP[wl] + stripped.slice(w.length));
      }
      if (FORMAL_IMP.has(wl) && !polite && !hasList && stripped.length < 90) {
        impFound = true;
        return s.replace(stripped, 'Por gentileza, ' + wl + stripped.slice(w.length));
      }
      return s;
    });
    if (impFound) { issues.push({ cat: 'Imperativo seco', text: 'ordem direta sem "por gentileza/poderia"' }); fixed = newSent.join(' '); }
    // 4) empatia / "não é problema nosso"
    const dt = deacc(t);
    if (EMPATHY.some(re => re.test(dt))) {
      issues.push({ cat: 'Falta de empatia', text: 'passa a ideia de "não é problema nosso"; ofereça ajuda e o próximo passo' });
      fixed += '\n\n[Ajuste sugerido: em vez de transferir a responsabilidade, ofereça ajuda. Ex.: "Vamos verificar isso com vocês. Para agilizar, poderiam nos enviar … ? Se for necessário contato com o banco, orientamos o associado sobre o que informar."]';
    }
    // 5) saudação / nome (primeira resposta da equipe após mensagem do cliente)
    const prev = i > 0 ? g.msgs[i - 1] : null;
    const lastTeamBefore = (() => { for (let j = i - 1; j >= 0; j--) if (g.msgs[j].role === 'team') return g.msgs[j]; return null; })();
    const newTurn = prev && prev.role === 'client' && (!lastTeamBefore || m.ts - lastTeamBefore.ts > 60 * MIN);
    if (newTurn) {
      const clientName = cleanName(prev.sender) || g.clientName;
      const first = clientName.split(/\s+/)[0] || '';
      const hasGreet = /(?<![\p{L}])(bom dia|boa tarde|boa noite|olá|ola|oi)(?![\p{L}])/iu.test(t);
      const hasName = /@/.test(t) || (first.length > 2 && !isPhone(first) && lc(t).includes(first.toLowerCase()));
      const nm = isPhone(clientName) ? clientName : clientName;
      if (!hasGreet) {
        issues.push({ cat: 'Saudação/nome', text: 'começou sem saudação' + (hasName ? '' : ' e sem o nome do cliente') });
        const rest = fixed.replace(/^@[^,!?.\n]{1,40}[,!]?\s*/, '');
        fixed = `${saud(m.ts)}, @${nm}! ` + rest.charAt(0).toUpperCase() + rest.slice(1);
      } else if (!hasName) {
        issues.push({ cat: 'Saudação/nome', text: 'faltou o nome do cliente (@menção)' });
        fixed = fixed.replace(/\b(bom dia|boa tarde|boa noite|olá|oi)\b[,!]?\s*/i, (g0, s) => `${s}, @${nm}! `);
      }
    }
    // 5b) saudação no horário errado ("Bom dia" à tarde etc.)
    {
      const hh = new Date(m.ts).getHours();
      const g0 = deacc(t).match(/(?<![a-z])(bom dia|boa tarde|boa noite)(?![a-z])/);
      if (g0) {
        const right = hh < 12 ? 'bom dia' : hh < 18 ? 'boa tarde' : 'boa noite';
        if (g0[1] !== right) {
          issues.push({ cat: 'Saudação/nome', text: `"${g0[1]}" às ${pad(hh)}:${pad(new Date(m.ts).getMinutes())}; o correto seria "${right}"` });
          fixed = fixed.replace(/(bom dia|boa tarde|boa noite)/i, mm => matchCase(mm, right));
        }
      }
    }
    // 6) técnica x treinamentos
    for (const r of TECH) {
      if (r.re.test(dt) && !(r.unless && r.unless.test(dt))) issues.push({ cat: 'Técnico x treinamento', text: r.note });
    }
    if (!issues.length) return null;
    fixed = fixed.replace(/([,;]\s+)Por gentileza/g, '$1por gentileza').replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').replace(/,\s*,/g, ',').trim();
    fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
    // dedupe issues
    const seen = new Set();
    const uniq = issues.filter(x => { const k = x.cat + x.text; if (seen.has(k)) return false; seen.add(k); return true; });
    return { group: g.name, who: shortName(m.sender), sender: m.sender, ts: m.ts, original: t, issues: uniq, fixed };
  }

  // ------------------------------------------------------------------ RESPOSTAS SUGERIDAS (base: treinamentos do projeto)
  const fmtD = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const TOPICS = [
    { id: 'filtroVeiculos', re: /filtro.{0,80}(veiculo|associad)|(veiculo|associad).{0,80}filtro|sem boleto|nao (tem|tenha|possui) boleto|(completa|completou|completaram|fazem|faz) (1|um) ano|mais de (1|um) ano/, kb: true, src: 'Orientação do gestor (30/10/2026)',
      body: () => {
        const now = new Date(), y = new Date(now); y.setFullYear(now.getFullYear() - 1);
        const m0 = new Date(y.getFullYear(), y.getMonth(), 1), m1 = new Date(y.getFullYear(), y.getMonth() + 1, 0);
        return 'Os dois filtros ficam em Associados > Veículos, no botão Filtros:\n\n' +
          '1. Veículos sem boletos gerados\n' +
          '• Selecione o filtro "Possui Boletos" e marque "Não";\n' +
          '• Clique em Buscar. A lista mostrará apenas os veículos que ainda não têm nenhum boleto gerado.\n\n' +
          '2. Veículos que já completaram 1 ano\n' +
          '• Selecione o filtro "Dt. Contrato" (ou "Dt. Ativação Comercial", caso vocês contem o ano a partir da ativação);\n' +
          `• Em "Até", informe a data de exatamente 1 ano atrás (hoje seria ${fmtD(y)}) e deixe o campo "De" em branco;\n` +
          `• Se quiser apenas os que completam 1 ano neste mês, preencha um intervalo, por exemplo: de ${fmtD(m0)} até ${fmtD(m1)}.\n\n` +
          'Vocês podem usar os dois filtros juntos e clicar em "Salvar Filtros" para não precisar montá-los novamente da próxima vez.';
      } },
    { id: 'asaas', re: /asaas.{0,80}(analise|aprova|document|cadastr|verifica)|(analise|aprova).{0,80}asaas/, kb: false,
      body: 'Vamos verificar a situação da análise da conta ASAAS de vocês e retornamos aqui no grupo assim que tivermos uma posição.',
      note: 'Os treinamentos não tratam da análise de cadastro da conta ASAAS. Confirme com o setor responsável antes de enviar.' },
    { id: 'remessa', re: /remessa|arquivo (de )?retorno|\bretornos?\b.{0,20}banc/, kb: true, src: 'Treinamento Faturamento §10',
      body: 'Sobre remessa e retorno: os bancos ASAAS, SICOOB, SICRED e MAPS IP têm remessa e retorno automáticos, sem necessidade de tratamento manual. Para os demais bancos, o processo é feito assim:\n\n1. Acesse Faturamento > Remessas para gerar o arquivo com os boletos a registrar e enviá-lo ao banco;\n2. Em seguida, acesse Faturamento > Retornos para processar o arquivo do banco com os pagamentos e liquidações.\n\nSe preferirem, podemos acompanhar esse processo com vocês.' },
    { id: 'fechamento', re: /fechamento|rateio|fechar o mes/, kb: true, src: 'Treinamento Faturamento §6–7',
      body: 'Para realizar o fechamento, o passo a passo é:\n\n1. Acesse Faturamento > Rateio e feche o rateio do mês de referência (obrigatório, mesmo para quem trabalha com valor fixo);\n2. Em Faturamento > Fechamentos, use "Listar não participantes" e "Conferência" para conferir quais veículos entram;\n3. Clique em "Novo registro", preencha a descrição, a referência do rateio e os demais campos, e liste os veículos;\n4. Confira a listagem e clique em "Gerar fechamento";\n5. Por fim, clique em "Enviar para o banco" para registrar os boletos.\n\nSe o cálculo for por Valor Total ou por Ordens de Compra, podemos agendar um acompanhamento com o nosso suporte.' },
    { id: 'boleto', re: /boleto|pagar|pagamento|linha digitavel|codigo de barras|segunda via|2a via|nosso numero/, kb: true, src: 'Treinamento Faturamento §8',
      body: 'Para verificarmos o que está acontecendo com o boleto, poderia, por gentileza, nos enviar uma das informações abaixo?\n\n1. O link do boleto no sistema (Faturamento > Boletos > abrir o boleto); ou\n2. O nome do associado e o nosso número ou a linha digitável do boleto.\n\nCom esses dados, conferimos o boleto e retornamos o quanto antes.' },
    { id: 'sindicancia', re: /sindicancia|\bsla\b/, kb: true, src: 'Treinamento Eventos Inicial §9.1',
      body: 'Para os documentos de Sindicância e SLA, caso vocês já tenham os modelos prontos, poderiam nos encaminhar aqui no grupo? Nossa equipe faz a implantação diretamente no sistema (Eventos > Documentos) e avisa assim que estiver concluído.' },
    { id: 'orcamento', re: /orcament|ordem de compra|comparativo|fornecedor|oficina|nota fiscal|regulagem/, kb: true, src: 'Treinamento Eventos Completo §6–9',
      body: 'No evento, o fluxo de orçamento funciona assim:\n\n1. Na Regulagem, são listadas as peças e os serviços danificados (quantidade, troca, lanternagem, pintura);\n2. Na Orçamentação, essa lista é enviada para um ou mais fornecedores precificarem;\n3. No Comparativo de Orçamentos, você marca o orçamento recomendado;\n4. Na Ordem de Compra, o fornecedor escolhido é confirmado e, depois do reparo, a oficina envia a nota fiscal pelo link recebido.\n\nPara entendermos o lançamento que você fez, poderia, por gentileza, nos enviar um print da tela ou a placa/evento em questão? Assim verificamos com você o ponto exato.' },
    { id: 'vistoria', re: /vistori/, kb: true, src: 'Treinamento Gestão do Associado §6',
      body: 'Para emitir uma nova vistoria:\n\n1. Abra a ficha do veículo do associado (Gestão do Associado > Veículos);\n2. Clique em "Nova vistoria", selecione a modalidade à distância e o Modelo de Vistoria, e salve;\n3. O sistema gera o link, que pode ser enviado ao associado, ao consultor ou a um vistoriador terceirizado.\n\nCaso seja um vistoriador terceirizado, ele precisa estar cadastrado antes; assim, o link cai automaticamente no aplicativo dele.' },
    { id: 'evento', re: /evento|sinistro|comunicado|acionar|colisao|guincho/, kb: true, src: 'Treinamento Eventos Completo §3–4',
      body: 'Um evento (sinistro) pode ser aberto de três formas: pelo Aplicativo do Associado, pelo Link Externo ou internamente pelo sistema. Para abrir pelo sistema:\n\n1. Acesse Eventos e clique em "Criar comunicado";\n2. Preencha filial, tipo do evento, data, hora e local;\n3. Busque a placa para o sistema preencher os dados do associado;\n4. Marque "Acionamento associado" como Sim se o associado for acionar a proteção;\n5. Informe os terceiros (se houver), escreva o relato e salve.\n\nDepois, na tela de Envolvidos, é possível solicitar a documentação pelo botão "Solicitar arquivos".' },
    { id: 'termo', re: /\btermos?\b/, kb: true, src: 'Treinamento Gestão do Associado §7 / Comercial Inicial §7',
      body: 'Os termos ficam registrados na ficha do associado, no campo Termos. Para reenviar ou emitir um novo termo:\n\n1. Acesse Gestão do Associado > Associados e abra o associado;\n2. No campo Termos, emita o novo termo e envie para assinatura.\n\nO texto oficial do termo de filiação fica em Termos > Modelo de Termos.' },
    { id: 'fipe', re: /fipe|nao aparece.{0,30}(modelo|veiculo|carro|moto)|(modelo|veiculo).{0,30}nao aparece|cotar|cotacao/, kb: true, src: 'Treinamento Comercial Inicial §4.2',
      body: 'Quando um modelo não aparece para cotação no aplicativo, normalmente ele ainda não foi categorizado na tabela FIPE. Para liberar:\n\n1. Acesse Configurações > FIPE > Veículos FIPE;\n2. Filtre por marca, ano e valor FIPE;\n3. Marque os veículos encontrados e clique em "Categorizar em massa", escolhendo a categoria correta.\n\nComo a FIPE é atualizada todo início de mês, os novos modelos precisam ser categorizados sempre que forem publicados.' },
    { id: 'senha', re: /^(?!.*(comercial|consultor)).*((senha|login|acess).{0,40}(app|aplicativo)|(app|aplicativo).{0,40}(senha|login|acess))/, kb: true, src: 'Treinamento Gestão do Associado §4.2',
      body: 'A senha do aplicativo do associado pode ser alterada pela própria associação:\n\n1. Acesse Gestão do Associado > Associados e abra a ficha do associado;\n2. No bloco Dados de acesso, altere a senha e salve;\n3. Informe ao associado a nova senha para acessar o aplicativo.' },
    { id: 'usuario', re: /usuario|permiss|grupo de usuario/, kb: true, src: 'Treinamento Comercial Inicial §3',
      body: 'Para liberar o acesso de um colaborador:\n\n1. Em Cadastro > Grupo de Usuário, confira (ou crie) o grupo com as permissões adequadas;\n2. Em Cadastro > Usuário > Adicionar usuário, preencha os dados e defina usuário e senha;\n3. Marque "Alterar senha no próximo login?" como Sim;\n4. Em Permissões, selecione o grupo correto e salve.' },
    { id: 'titularidade', re: /titularidade|vendeu o (carro|veiculo)|troca de dono/, kb: true, src: 'Treinamento Faturamento §5.2',
      body: 'Para transferir o veículo de um associado para outro:\n\n1. Acesse Gestão do Associado > Ferramentas > Titularidade > Novo Registro;\n2. Informe a placa e o chassi; o sistema busca o modelo e o associado atual;\n3. Informe os dados do novo associado (nome e CPF/CNPJ) e confirme a troca.' },
    { id: 'isencao', re: /isenc|isent/, kb: true, src: 'Treinamento Gestão do Associado §5.2',
      body: 'Para isentar um veículo do fechamento por um período:\n\n1. Abra a ficha do veículo do associado;\n2. No campo Isenção, informe até qual mês ele ficará isento e salve.\n\nEnquanto durar a isenção, o veículo não entra na lista de fechamento de boletos, e o histórico fica preservado.' },
    { id: 'serasa', re: /serasa|\bspc\b|negativ/, kb: true, src: 'Treinamento Faturamento §5.3',
      body: 'Para gerar o arquivo de Serasa/SPC:\n\n1. Acesse Gestão do Associado > Ferramentas > Serasa > Novo Registro;\n2. Escolha se o arquivo é de Inclusão ou de Exclusão;\n3. Filtre os boletos em aberto que devem compor o arquivo e gere o arquivo de remessa para envio ao Serasa/SPC.' },
    { id: 'integracao', re: /integra|rastread|rastreamento|assistencia 24|\bapi\b/, kb: true, src: 'Treinamento Comercial Inicial §4.3',
      body: 'Para integrações com empresas de rastreamento, assistência 24h ou outros parceiros, nossa equipe faz a configuração. Poderiam nos informar o nome do fornecedor? Se ele não estiver na lista de integrações prontas (Configurações > Integrações), também existe a opção de API aberta: enviamos a documentação para o fornecedor se integrar.' },
    { id: 'devolutiva', re: /devolutiva|alguma (novidade|posicao|resposta|atualizacao)|conseguiu(ram)? (ver|verificar|olhar)|tem retorno|algum retorno|\be ai\b|alguma previsao|no aguardo/, kb: false,
      body: 'Agradecemos a paciência! A sua solicitação está com o setor responsável e estamos acompanhando de perto. Assim que tivermos a devolutiva, informaremos aqui no grupo.',
      note: 'Resposta de status. Confirme com o setor responsável a situação real antes de enviar.' },
    { id: 'erro', re: /nao consig|erro|travou|trava|nao funciona|nao carrega|bug|problema|nao abre|nao esta (funcionando|indo|aparecendo)/, kb: true, src: 'Padrão de atendimento Ileva (coleta de informações)',
      body: 'Para conseguirmos analisar o que está acontecendo, poderia, por gentileza, nos enviar um print ou um vídeo curto mostrando o passo a passo até o erro? Se possível, informe também a placa ou o associado envolvido. Com isso, verificamos e retornamos o quanto antes.' }
  ];
  const DEFAULT_TOPIC = { id: 'geral', kb: false,
    body: 'Recebemos a sua mensagem e já estamos verificando. Retornamos aqui no grupo assim que tivermos uma posição.',
    note: 'Não encontrei esse assunto nos treinamentos. Confirme com o setor responsável antes de responder em detalhe.' };

  function pickTopic(text) { const t = deacc(text); return TOPICS.find(x => x.re.test(t)) || null; }
  function suggest(c, mode) {
    const pendText = c.pend.map(m => m.text).join('\n');
    let topic = pickTopic(pendText);
    if (!topic) topic = pickTopic(c.msgs.slice(-8).map(m => m.text).join('\n'));
    if (mode === 'promise') topic = TOPICS.find(t => t.id === 'devolutiva');
    topic = topic || DEFAULT_TOPIC;
    const nome = c.clientName;
    const tb = typeof topic.body === 'function' ? topic.body() : topic.body;
    let body = tb;
    if (mode === 'await') body = 'Ficamos no aguardo das informações para darmos continuidade ao atendimento.' + (topic.id !== 'geral' && topic.id !== 'devolutiva' ? '\n\n' + tb : '');
    if (mode === 'promise') body = 'Conforme combinamos, passamos para dar um retorno sobre a sua solicitação: [descreva aqui a posição do setor responsável]. ' + 'Assim que houver qualquer novidade, informaremos aqui no grupo.';
    const text = `${saud()}, @${nome}! Tudo bem?\n\n${body}\n\nQualquer dúvida, estamos à disposição!`;
    return { text, topic: topic.id, kb: mode === 'promise' ? false : topic.kb, src: topic.src || '', note: mode === 'promise' ? 'Preencha com a posição real do setor responsável antes de enviar.' : (topic.note || '') };
  }

  // ------------------------------------------------------------------ BASE DE CONHECIMENTO (aprende com perguntas e respostas já dadas)
  // Cada item: { id, group, q, qTs, a, aTs, who, resolved, status: 'auto'|'approved'|'rejected', uses }
  const LS_KB = 'ilevaSup.kb.v1';
  let kb = lsGet(LS_KB, []);
  if (!Array.isArray(kb)) kb = [];
  let kbDirty = false, kbSaveTimer = 0;
  function mergeKb() {
    const stored = lsGet(LS_KB, []);
    if (!Array.isArray(stored)) return;
    const byId = new Map(kb.map(x => [x.id, x]));
    for (const y of stored) {
      const x = byId.get(y.id);
      if (!x) { kb.push(y); byId.set(y.id, y); continue; }
      if (x.status === 'auto' && y.status !== 'auto') x.status = y.status; // validação/rejeição feita em outra aba
      if ((y.uses || 0) > (x.uses || 0)) x.uses = y.uses;
    }
  }
  function saveKb() { kbDirty = true; clearTimeout(kbSaveTimer); kbSaveTimer = setTimeout(() => { mergeKb(); lsSet(LS_KB, kb); kbDirty = false; idfCache = null; }, 800); }
  setInterval(() => { if (!kbDirty) { const n = kb.length; mergeKb(); if (kb.length !== n) idfCache = null; } }, 60 * 1000);

  const STOP = new Set(('a o os as um uma uns umas de do da dos das em no na nos nas por pelo pela pelos pelas para pra pro com sem e ou que se ja nao sim mas mais muito muita ' +
    'eu tu ele ela nos voces voce vc vcs eles elas me te lhe meu minha seu sua nosso nossa isso isto esse essa este esta aquele aquela aqui ali la ' +
    'bom dia boa tarde noite pessoal oi ola tudo bem obrigado obrigada por favor gentileza gostaria queria preciso precisamos poderia podem pode ' +
    'tem ter tinha estou esta estao foi ser sao era fica ficou fazer faz faco como onde qual quais quando porque pq porque entao ai ate tambem so ' +
    'consigo consegue conseguimos conseguem ajuda ajudar duvida alguem algum alguma hoje agora ainda vez la ileva sistema').split(' '));
  function stem(w) {
    return w.replace(/(mente|coes|cao|oes|ões|ais|eis|ados|adas|ado|ada|ando|endo|indo|ar|er|ir|ou|am|em|s)$/, '') || w;
  }
  function tokens(text) {
    return [...new Set(deacc(text).replace(/https?:\/\/\S+/g, ' ').replace(/@\S+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)).map(stem).filter(w => w.length > 2))];
  }
  const QUESTION_RE = /\?|^(como|onde|qual|quais|quando|por que|porque|tem como|da pra|da para|consigo|consegue|e possivel|existe|preciso|gostaria|queria|me (ajuda|lembr|explic)|nao (consig|esta|aparece|carrega|funciona|abre|gera)|esta dando|deu erro|erro|problema)/;
  const NON_ANSWER_RE = /(encaminh|vamos verificar|vou verificar|verificando|analis|setor responsavel|assim que tivermos|retornamos|retornaremos|daremos retorno|aguard|um momento|so um minuto|ja vejo|vou ver|irei verificar)/;
  // Só aprende o que for sobre o sistema Ileva (menus, telas, cadastros, financeiro, eventos etc.)
  const SYS_RE = /(boleto|fechament|rateio|vistori|evento|sinistr|associad|veiculo|placa|plano|beneficio|aplicativo|\bapp\b|consultor|indicador|termo|fipe|filtro|relatorio|cadastr|usuario|senha|login|acesso|link|menu|tela|botao|aba\b|campo|integra|asaas|sicoob|sicred|banco|remessa|retorno banc|cota|lead|funil|proposta|cotac|ordem de compra|fornecedor|oficina|orcament|regulagem|regional|filial|situac|serasa|spc|titularidade|isenc|carne|mensalidade|notificac|regua|disparo|webhook|\bapi\b|sistema|configurac|permiss|grupo de usuario|exportar|planilha|importa|financeiro|lancamento|categoria|centro de custo|contrato|desfilia|inadimpl|ativac|ativar|inativ|dashboard|painel|ileva)/;
  const RESOLVED_RE = /(deu certo|funcionou|resolvido|resolveu|consegui|perfeito|show|otimo|ok obrigad|obrigad|valeu|certinho|entendi)/;

  function cleanAnswer(text) {
    let t = norm(text)
      .replace(/^(bom dia|boa tarde|boa noite|ola|olá|oi)(?![\p{L}])[,!]?\s*/iu, '')
      .replace(/^@[^,!?\n]{1,40}?[,!]\s*/, '').replace(/^@\S+\s*/, '')
      .replace(/^(bom dia|boa tarde|boa noite|ola|olá|oi)(?![\p{L}])[,!]?\s*/iu, '')
      .replace(/^(tudo bem|espero que (esteja|estejam) bem)[?!.,]?\s*/iu, '')
      .replace(/^tudo bem\??\s*/i, '')
      .replace(/\s*(qualquer (duvida|dúvida|coisa)[^.!]*[.!]?)\s*$/i, '')
      .trim();
    // aplica as correções de português e informalidade
    for (const [re, rep] of SLANG) { re.lastIndex = 0; t = t.replace(re, mm => rep ? matchCase(mm.trim(), rep) + (/\s$/.test(mm) ? ' ' : '') : ''); }
    for (const [re, rep] of PT_FIX) { re.lastIndex = 0; t = t.replace(re, rep); }
    t = t.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.!?])/g, '$1').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
  }

  // Lê as mensagens guardadas de um grupo e extrai pares pergunta -> resposta da equipe
  function learnGroup(name) {
    const g = data.groups[name];
    if (!g || !g.msgs || g.msgs.length < 2) return 0;
    const msgs = g.msgs.filter(m => m.text && !/^\[.*\]$/.test(m.text)).slice().sort((a, b) => a.ts - b.ts)
      .map(m => Object.assign({}, m, { role: m.role === 'team' || isTeam(m.sender) ? 'team' : 'client' }));
    let added = 0;
    for (let i = 0; i < msgs.length; i++) {
      const q = msgs[i];
      if (q.role !== 'client' || isTrivial(q.text) || q.text.length < 15) continue;
      const qd = deacc(q.text);
      const looksQuestion = QUESTION_RE.test(qd) || /(presumi|achei que|pensei que|nao (encontr|localiz|achei|vejo|aparece)|gostaria de saber|tenho uma duvida|duvida|ajuda|e possivel|seria possivel)/.test(qd) || q.text.length >= 60;
      if (!looksQuestion) continue;
      if (/(algum|alguma|tem|teve|ha) (retorno|novidade|posicao|resposta|previsao|atualizacao)|devolutiva|conseguiu(ram)? (ver|verificar)/.test(qd) && qd.length < 80) continue; // cobrança de status não é conhecimento
      if (!SYS_RE.test(qd) && !(msgs[i + 1] && SYS_RE.test(deacc(msgs.slice(i + 1, i + 5).filter(m => m.role === 'team').map(m => m.text).join(' '))))) continue;
      // junta perguntas seguidas do cliente (até a primeira resposta da equipe)
      let qText = q.text, j = i + 1;
      while (j < msgs.length && msgs[j].role === 'client' && msgs[j].ts - msgs[j - 1].ts < 10 * MIN) { if (!isTrivial(msgs[j].text)) qText += ' ' + msgs[j].text; j++; }
      // respostas da equipe em até 8 h, até o cliente voltar a falar algo relevante
      const ans = []; let k = j, aTs = 0, who = '';
      while (k < msgs.length && msgs[k].ts - q.ts < 8 * HOUR) {
        const m = msgs[k];
        if (m.role === 'client' && !isTrivial(m.text)) break;
        if (m.role === 'team' && !isTrivial(m.text)) {
          const md = deacc(m.text);
          const onlyStall = NON_ANSWER_RE.test(md) && m.text.length < 160;
          if (!onlyStall) { ans.push(m.text); aTs = aTs || m.ts; who = who || shortName(m.sender); }
        }
        k++;
        if (ans.length >= 3) break;
      }
      if (!ans.length) continue;
      const a = cleanAnswer(ans.join('\n'));
      if (a.length < 50) continue;
      if (!SYS_RE.test(deacc(qText + ' ' + a))) continue; // só assuntos do sistema
      // resolvido? cliente agradece / confirma depois da resposta
      let resolved = false;
      for (let r = k; r < msgs.length && msgs[r].ts - aTs < DAY; r++) {
        if (msgs[r].role === 'client') { resolved = RESOLVED_RE.test(deacc(msgs[r].text)); break; }
      }
      if (!resolved && data.final && data.final[name] && data.final[name].ts > aTs) resolved = true;
      const id = `${name}|${q.ts}`;
      const ex = kb.find(x => x.id === id);
      if (ex) {
        if (ex.status === 'auto' && (a.length > ex.a.length || (resolved && !ex.resolved))) { ex.a = a.slice(0, 1500); ex.resolved = ex.resolved || resolved; saveKb(); }
        continue;
      }
      const ctx = msgs.slice(Math.max(0, i - 2), Math.min(msgs.length, k + 2)).map(m => `${m.role === 'team' ? 'EQUIPE' : 'CLIENTE'} ${shortName(m.sender)}: ${norm(m.text).slice(0, 400)}`);
      kb.push({ id, group: name, q: norm(qText).slice(0, 600), qTs: q.ts, a: a.slice(0, 1500), aTs, who, resolved, status: 'auto', uses: 0, ctx, curated: false });
      added++;
    }
    if (added) {
      if (kb.length > 900) { // mantém os validados e os mais recentes
        kb.sort((x, y) => (y.status === 'approved') - (x.status === 'approved') || y.qTs - x.qTs);
        kb = kb.slice(0, 900);
      }
      saveKb();
    }
    return added;
  }
  function learnAll() { let n = 0; for (const name of Object.keys(data.groups)) if (isClientGroup(name)) n += learnGroup(name); return n; }

  // Procura perguntas parecidas já respondidas
  let idfCache = null, idfAt = 0;
  function idf() {
    if (idfCache && Date.now() - idfAt < 60 * 1000 && idfCache.n === kb.length) return idfCache;
    const df = new Map();
    for (const x of kb) { if (x.status === 'rejected') continue; for (const t of (x._t || (x._t = tokens(x.q)))) df.set(t, (df.get(t) || 0) + 1); }
    idfCache = { df, n: kb.length }; idfAt = Date.now();
    return idfCache;
  }
  function findSimilar(text, excludeGroupTs) {
    const qt = tokens(text);
    if (qt.length < 2 || !kb.length) return [];
    const { df } = idf();
    const N = Math.max(1, kb.length);
    const w = t => Math.log(1 + N / (1 + (df.get(t) || 0)));
    const qw = qt.reduce((s, t) => s + w(t), 0);
    const res = [];
    for (const x of kb) {
      if (x.status === 'rejected') continue;
      if (excludeGroupTs && x.id === excludeGroupTs) continue;
      const xt = x._t || (x._t = tokens(x.q));
      const set = new Set(xt);
      let inter = 0; for (const t of qt) if (set.has(t)) inter += w(t);
      if (!inter) continue;
      const xw = xt.reduce((s, t) => s + w(t), 0);
      let score = inter / Math.sqrt(qw * xw);
      if (x.status === 'approved') score *= 1.25;
      if (x.resolved) score *= 1.1;
      if (score >= 0.32) res.push({ item: x, score: Math.min(1, score) });
    }
    res.sort((a, b) => b.score - a.score);
    // evita repetir a mesma resposta
    const seen = new Set(), out = [];
    for (const r of res) { const k = r.item.a.slice(0, 80); if (seen.has(k)) continue; seen.add(k); out.push(r); if (out.length >= 2) break; }
    return out;
  }
  function kbReply(item, clientName) {
    return `${saud()}, @${clientName}! Tudo bem?\n\n${item.a}\n\nQualquer dúvida, estamos à disposição!`;
  }
  function kbSet(id, status) { const x = kb.find(y => y.id === id); if (x) { x.status = status; idfCache = null; saveKb(); render(true); } }

  // "Aprender histórico": rola a conversa aberta para cima para carregar mensagens antigas (somente leitura)
  function chatScroller() {
    const main = document.querySelector('#main');
    if (!main) return null;
    const row = main.querySelector('[role="row"]');
    let el = row ? row.parentElement : null;
    while (el && el !== main) { const cs = getComputedStyle(el); if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 10) return el; el = el.parentElement; }
    return main.querySelector('[tabindex="0"][role="application"]') || null;
  }
  async function learnHistory(name, steps) {
    if (name && currentChatName() !== name && !(await openChat(name))) return 0;
    const sc = chatScroller();
    if (!sc) { ingestOpenChat(); return learnGroup(currentChatName()); }
    let prevH = -1;
    for (let i = 0; i < (steps || 12); i++) {
      if (abortRound) break;
      ingestOpenChat(); learnGroup(currentChatName());
      sc.scrollTop = 0;
      await sleep(1300);
      if (sc.scrollHeight === prevH) break;
      prevH = sc.scrollHeight;
    }
    ingestOpenChat();
    const n = learnGroup(currentChatName());
    sc.scrollTop = sc.scrollHeight; // volta para o fim da conversa
    return n;
  }
  async function learnHistoryAll() {
    if (rounding) return;
    rounding = true; manualRound = true; abortRound = false;
    let total = 0;
    try {
      const original = currentChatName();
      roundInfo = '📚 Aprendendo: listando grupos…'; render(true);
      const all = await sweepList();
      const names = all.filter(n => { const pv = data.groups[n] && data.groups[n].preview; return pv && pv.ts && Date.now() - pv.ts < 30 * DAY; });
      for (let i = 0; i < names.length; i++) {
        if (abortRound) break;
        roundInfo = `📚 Aprendendo histórico: ${i + 1}/${names.length} — ${names[i]} (${total} novas)`; render(true);
        total += await learnHistory(names[i], 6);
      }
      if (original && currentChatName() !== original) await openChat(original);
    } catch (e) { console.warn('[Supervisor Ileva] aprender', e); }
    finally { rounding = false; roundInfo = ''; save(); lsSet(LS_KB, kb); render(true); }
    return total;
  }

  // ------------------------------------------------------------------ CONSOLIDAÇÃO
  function computeAll() {
    const now = Date.now();
    const groups = [];
    for (const n of Object.keys(data.groups)) { if (!isClientGroup(n)) continue; const c = computeGroup(n); if (c) groups.push(c); }
    // Em tempo real só entram conversas de HOJE; pendências antigas ficam na aba "Início do dia" (leitura das 08:15)
    const today0 = startOfToday();
    const sinceOf = g => g.pend[0] ? g.pend[0].ts : (g.lastRel ? g.lastRel.ts : 0);
    const isToday = g => sinceOf(g) >= today0 && !g.approx;
    const open = groups.filter(g => g.status === 'open' && isToday(g)).sort((a, b) => b.wait - a.wait);
    const waiting = groups.filter(g => g.status === 'await' && isToday(g)).sort((a, b) => b.wait - a.wait);
    const promises = groups.filter(g => g.promise && g.promise.since >= today0).sort((a, b) => a.promise.since - b.promise.since);
    // pendências da leitura da manhã que AINDA estão pendentes
    const byName = new Map(groups.map(g => [g.name, g]));
    const mItems = (data.morning && data.morning.date === dayKey() && !data.morning.pending) ? data.morning.items : [];
    const morning = [], morningDone = [];
    for (const it of mItems) {
      const g = byName.get(it.name);
      const still = g && !g.finalized && ((it.kind === 'promise' && g.promise) || ((it.kind === 'open' || it.kind === 'await') && (g.status === 'open' || g.status === 'await') && sinceOf(g) < today0));
      (still ? morning : morningDone).push({ it, g });
    }
    const tone = [];
    for (const g of groups) g.msgs.forEach((m, i) => {
      if (m.role !== 'team' || m.approx || now - m.ts > DAY) return;
      const r = analyzeTone(g, i);
      if (r) { r.key = `${g.name}|${m.ts}|${(m.text || '').slice(0, 40)}`; if (!data.dismissed[r.key]) tone.push(r); }
    });
    tone.sort((a, b) => b.ts - a.ts);
    const perCollab = {};
    tone.forEach(t => { perCollab[t.who] = (perCollab[t.who] || 0) + 1; });
    const reds = open.filter(g => g.level === 'red');
    const editable = tone.filter(t => now - t.ts < 15 * MIN);
    const finalized = groups.filter(g => g.finalized && now - g.finalized.ts < DAY).sort((a, b) => b.finalized.ts - a.finalized.ts);
    return { now, groups, open, waiting, promises, tone, perCollab, reds, editable, finalized, morning, morningDone, morningInfo: data.morning && data.morning.date === dayKey() && !data.morning.pending ? data.morning : null };
  }

  // ------------------------------------------------------------------ RELATÓRIO EM TEXTO
  const LV = { green: '🟢', yellow: '🟡', red: '🔴' };
  function buildTextReport(st) {
    const L = [];
    L.push(`SUPERVISOR ILEVA — ronda de ${fmtTime(st.now)}`);
    L.push('', '🚨 ALERTAS URGENTES');
    const al = [];
    st.reds.forEach(g => al.push(`🔴 ${g.name} — ${g.clientName} aguardando há ${g.approx ? 'mais de ' : ''}${fmtDur(g.wait)}`));
    st.promises.forEach(g => al.push(`⏳ ${g.name} — retorno prometido por ${g.promise.who} (${fmtTime(g.promise.since)}) ainda não dado`));
    st.editable.forEach(t => al.push(`✏️ DÁ PARA EDITAR AINDA — ${t.who} em ${t.group} (${fmtTime(t.ts)}), restam ${Math.max(0, 15 - Math.floor((st.now - t.ts) / MIN))} min`));
    st.tone.filter(t => st.now - t.ts >= 15 * MIN && st.now - t.ts < HOUR).forEach(t => al.push(`🗣️ Tom: ${t.who} em ${t.group} (${fmtTime(t.ts)}) — ${[...new Set(t.issues.map(i => i.cat))].join(', ')}`));
    L.push(...(al.length ? al : ['Nenhum alerta no momento.']));
    if (st.morningInfo) {
      L.push('', `🌅 PENDÊNCIAS DO INÍCIO DO DIA (leitura às ${fmtTime(st.morningInfo.at)})`);
      if (!st.morning.length) L.push('Nenhuma pendência de dias anteriores.');
      st.morning.forEach(({ it, g }) => L.push(`${g.name} | ${it.kind === 'promise' ? 'retorno prometido' : it.kind === 'await' ? 'aguardando cliente' : 'cliente sem resposta'} desde ${it.label ? it.label : fmtTime(it.since) + ` (${fmtDur(st.now - it.since)})`}`));
    }
    L.push('', '📋 ATENDIMENTOS EM ABERTO (HOJE)', 'Grupo | Cliente | Última msg | Espera | Status');
    const rows = [...st.open, ...st.waiting];
    if (!rows.length) L.push('Nenhum atendimento em aberto.');
    rows.forEach(g => L.push(`${g.name} | ${g.clientName} | "${(g.lastRel.text || '').slice(0, 70)}" (${fmtTime(g.lastRel.ts, g.lastRel.approxLabel)}) | ${g.approx ? '+' : ''}${fmtDur(g.wait)} | ${g.status === 'await' ? '⏳ aguardando o cliente' : LV[g.level]}${g.partial ? ' (só prévia)' : ''}`));
    L.push('', '✍️ RESPOSTAS SUGERIDAS');
    const sug = [...st.open.map(g => [g, 'open']), ...st.waiting.map(g => [g, 'await']), ...st.promises.map(g => [g, 'promise'])];
    if (!sug.length) L.push('Nenhuma resposta pendente.');
    sug.forEach(([g, mode]) => { const { s, sims } = bestSuggestion(g, mode); L.push('', `▶ ${g.name}${mode === 'promise' ? ' (retorno prometido)' : ''}`, s.text); if (!s.kb || s.note) L.push(`⚠️ ${s.note || 'Confirme com o setor responsável.'}`); if (s.src) L.push(`Base: ${s.src}`); sims.forEach(r => L.push(`💡 Parecido já respondido em ${r.item.group} (${fmtTime(r.item.qTs)}, ${Math.round(r.score * 100)}%): ${r.item.a.slice(0, 200)}`)); });
    L.push('', '🗣️ REVISÃO DE TOM DA EQUIPE (24h)');
    if (!st.tone.length) L.push('Nenhuma mensagem com problema nas conversas lidas.');
    st.tone.forEach(t => { L.push('', `${t.who} — ${t.group} — ${fmtTime(t.ts)}${st.now - t.ts < 15 * MIN ? '  ✏️ DÁ PARA EDITAR AINDA' : ''}`, `Original: ${t.original}`, `Problema: ${t.issues.map(i => `${i.cat}: ${i.text}`).join('; ')}`, `Corrigida: ${t.fixed}`); });
    L.push('', '📊 RESUMO');
    L.push(`Total em aberto: ${st.open.length} (+${st.waiting.length} aguardando o cliente, ${st.promises.length} retorno(s) prometido(s))`);
    const max = st.open[0];
    L.push(`Maior espera: ${max ? `${max.name} — ${max.approx ? '+' : ''}${fmtDur(max.wait)}` : '—'}`);
    const pc = Object.entries(st.perCollab).sort((a, b) => b[1] - a[1]);
    L.push(`Mensagens com problema: ${pc.length ? pc.map(([k, v]) => `${k} ${v}`).join(', ') : 'nenhuma'}`);
    return L.join('\n');
  }
  function buildClaudeExport(st) {
    const out = { geradoEm: new Date(st.now).toLocaleString('pt-BR'), grupos: st.groups.map(g => ({
      grupo: g.name, status: g.status, historicoCompletoLido: !g.partial,
      mensagens24h: g.msgs.filter(m => st.now - m.ts < DAY).map(m => ({ hora: fmtTime(m.ts, m.approxLabel), remetente: m.sender, equipe: m.role === 'team', texto: m.text }))
    })) };
    return 'Você é o supervisor de atendimento da Ileva Gestão. Use os treinamentos do projeto "Base de conhecimento Ileva". ' +
      'Com os dados abaixo (coletados do WhatsApp Web), entregue: 🚨 alertas urgentes; 📋 tabela de atendimentos em aberto (Grupo | Cliente | Última msg | Espera | Status 🟢≤10min 🟡10–15 🔴>15); ' +
      '✍️ respostas sugeridas prontas para copiar (sem inventar funcionalidades; se não estiver nos treinamentos, indique o setor responsável); ' +
      '🗣️ revisão de tom da equipe (gírias, imperativo seco, falta de empatia, falta de saudação/nome, português, informação técnica contrária aos treinamentos) com versão corrigida; 📊 resumo. ' +
      'Equipe: Lucas, Adriel, Richard, Stony, Akim, Francisco e mensagens "Você". Não envie nada no WhatsApp.\n\nDADOS:\n' + JSON.stringify(out, null, 1);
  }

  // ------------------------------------------------------------------ UI (Shadow DOM, sem innerHTML)
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k === 'open') el.open = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; el.append(k instanceof Node ? k : document.createTextNode(String(k))); }
    return el;
  }
  async function copy(text, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      try { const ta = h('textarea', { style: 'position:fixed;left:-9999px' }); ta.value = text; shadow.append(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e2) { ok = false; }
    }
    if (btn) { const o = btn.textContent; btn.textContent = ok ? '✓ Copiado' : 'Falhou'; setTimeout(() => { btn.textContent = o; }, 1500); }
  }

  // preferências de tela (lembradas neste navegador)
  const LS_UI = 'ilevaSup.ui.v1';
  const ui = Object.assign({ open: false, tab: 'atend', width: 400, filter: null }, lsGet(LS_UI, {}));
  const saveUi = () => lsSet(LS_UI, ui);
  const WIDTHS = [340, 400, 480];

  const CSS = `
  :host{all:initial}
  *{box-sizing:border-box;font-family:Segoe UI,Helvetica Neue,Helvetica,Arial,sans-serif}
  @keyframes blink{0%,100%{background:#3a1418;border-color:#f15c6d}50%{background:#111b21;border-color:#5a2a30}}
  @keyframes blinkPill{0%,100%{background:#f15c6d;color:#fff}50%{background:#5a2a30;color:#ffb3bc}}
  @keyframes blinkFab{0%,100%{background:#f15c6d;box-shadow:0 0 0 0 rgba(241,92,109,.7)}50%{background:#b8323f;box-shadow:0 0 0 10px rgba(241,92,109,0)}}
  .fab{position:fixed;right:18px;bottom:18px;z-index:2147483646;background:#00a884;color:#0b141a;border:0;border-radius:24px;padding:10px 16px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45);display:flex;gap:8px;align-items:center}
  .fab.alarm{animation:blinkFab 1s ease-in-out infinite;color:#fff}
  .fab .b{background:rgba(0,0,0,.35);color:#fff;border-radius:12px;padding:1px 8px;font-size:12px}
  .panel{position:fixed;top:0;right:0;height:100vh;z-index:2147483647;background:#0b141a;color:#e9edef;border-left:1px solid #2a3942;display:flex;flex-direction:column}
  .hd{padding:10px 12px;border-bottom:1px solid #2a3942;background:#111b21;display:flex;flex-direction:column;gap:8px}
  .ttl{display:flex;justify-content:space-between;align-items:center;gap:6px}
  .ttl b{font-size:14px}.ttl small{color:#8696a0;font-size:11px;display:block}
  .icons{display:flex;gap:2px}
  button.ic{background:none;border:0;color:#aebac1;font-size:16px;cursor:pointer;padding:4px 6px;border-radius:6px}
  button.ic:hover{background:#202c33;color:#fff}
  .chips{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .chip{background:#202c33;border-radius:10px;padding:6px 4px;text-align:center;cursor:pointer;border:1px solid transparent}
  .chip:hover{border-color:#3b4a54}
  .chip .n{font-size:20px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums}
  .chip .l{font-size:10.5px;color:#aebac1}
  .chip.red .n{color:#f15c6d}.chip.yellow .n{color:#ffd279}.chip.blue .n{color:#53bdeb}.chip.purple .n{color:#c9a4ff}
  .chip.red.on{animation:blink 1s ease-in-out infinite}
  .chip.sel{border-color:#00a884;box-shadow:0 0 0 2px #00a884 inset}
  .filt{display:flex;justify-content:space-between;align-items:center;gap:8px;background:#182229;border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:12.5px}
  .tabs{display:flex;gap:2px;border-bottom:1px solid #2a3942;padding:0 8px;background:#111b21;overflow-x:auto;scrollbar-width:thin}
  .sim{border-top:1px dashed #2a3942;padding-top:6px;margin-top:6px}
  .tab{background:none;border:0;color:#aebac1;padding:9px 7px;font-size:12.5px;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap}
  .tab.on{color:#e9edef;border-bottom-color:#00a884;font-weight:700}
  .tab .c{background:#f15c6d;color:#fff;border-radius:10px;padding:0 6px;font-size:11px;margin-left:4px}
  .tab .c.g{background:#2a3942;color:#aebac1}
  .bd{overflow:auto;padding:10px 12px 40px;flex:1;font-size:13px;line-height:1.45}
  .grp{font-size:11.5px;text-transform:uppercase;letter-spacing:.6px;color:#8696a0;margin:14px 0 6px;font-weight:700}
  .card{background:#111b21;border:1px solid #2a3942;border-left-width:5px;border-radius:10px;padding:10px;margin:0 0 8px}
  .card.red{border-color:#f15c6d}.card.red.blink{animation:blink 1s ease-in-out infinite}
  .card.yellow{border-color:#d9a400}.card.green{border-color:#25d366}.card.blue{border-color:#53bdeb}.card.purple{border-color:#a77bff}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
  .gname{font-weight:700;font-size:13.5px}
  .wait{font-size:18px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}
  .wait.red{color:#f15c6d}.wait.yellow{color:#ffd279}.wait.green{color:#25d366}.wait.blue{color:#53bdeb}
  .pill{display:inline-block;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700;margin-right:6px;vertical-align:1px}
  .pill.red{background:#f15c6d;color:#fff}.pill.red.blink{animation:blinkPill 1s ease-in-out infinite}
  .pill.yellow{background:#d9a400;color:#111}.pill.green{background:#25d366;color:#0b141a}.pill.blue{background:#53bdeb;color:#0b141a}.pill.purple{background:#a77bff;color:#0b141a}
  .who{color:#aebac1;font-size:12px;margin-top:2px}
  .quote{background:#202c33;border-radius:8px;padding:6px 8px;margin:6px 0;font-size:12.5px;color:#d1d7db;word-break:break-word}
  .actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  button.btn{background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer}
  button.btn:hover{background:#2a3942}
  button.btn.pri{background:#00a884;color:#0b141a;border-color:#00a884;font-weight:700}
  button.btn.ok{border-color:#25d366;color:#9fe3c9}
  button.btn.ok:hover{background:#0f2a22}
  .undo{display:flex;justify-content:space-between;align-items:center;gap:8px;background:#0f2a22;border:1px solid #1e5a46;color:#9fe3c9;border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:12.5px}
  details{margin-top:6px}
  summary{cursor:pointer;color:#53bdeb;font-size:12px;list-style:none}
  summary::-webkit-details-marker{display:none}
  summary::before{content:'▸ ';}details[open] summary::before{content:'▾ ';}
  pre{white-space:pre-wrap;word-break:break-word;background:#202c33;border-radius:8px;padding:8px;margin:6px 0;font-size:12.5px;font-family:inherit;color:#e9edef}
  pre.fix{border-left:3px solid #25d366}
  .warn{color:#ffd279;font-size:12px;margin-top:4px}
  .src{color:#53bdeb;font-size:11px}
  .edit{background:#f15c6d;color:#fff;font-weight:800;border-radius:6px;padding:3px 8px;display:inline-block;margin-bottom:6px;font-size:12px;animation:blinkPill 1s ease-in-out infinite}
  ul.iss{margin:4px 0 0 0;padding-left:18px;color:#ffd279;font-size:12px}
  .lbl{color:#8696a0;font-size:11.5px;margin-top:6px}
  .empty{background:#0f2a22;border:1px solid #1e5a46;color:#9fe3c9;border-radius:10px;padding:12px;text-align:center}
  table{width:100%;border-collapse:collapse;font-size:12.5px}
  td{border-bottom:1px solid #2a3942;padding:6px 4px}
  td.n{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}
  .info{background:#182229;border-radius:8px;padding:8px;color:#8696a0;font-size:12px;margin-top:12px}
  label{display:block;margin:10px 0 4px;color:#8696a0;font-size:12px}
  textarea,input[type=number],input[type=text]{width:100%;background:#202c33;color:#e9edef;border:1px solid #2a3942;border-radius:8px;padding:6px;font-size:12px}
  .chk{display:flex;gap:8px;align-items:center;margin-top:8px;color:#e9edef}
  .round{background:#0f2a22;color:#9fe3c9;font-size:12px;border-radius:8px;padding:6px 8px}
  `;

  let host, shadow, fab, panel, bodyEl, statusEl, chipsEl, tabsEl, roundEl, view = 'main';
  function mountUI() {
    if (host && document.body.contains(host)) return;
    host = h('div', { id: 'ileva-supervisor-host' });
    shadow = host.attachShadow({ mode: 'open' });
    let styled = false;
    try { const sheet = new CSSStyleSheet(); sheet.replaceSync(CSS); shadow.adoptedStyleSheets = [sheet]; styled = true; } catch (e) { }
    if (!styled) { const s = document.createElement('style'); s.textContent = CSS; shadow.append(s); }
    fab = h('button', { class: 'fab', title: 'Abrir o Supervisor de Atendimento', onclick: () => setOpen(true) });
    statusEl = h('small', {});
    chipsEl = h('div', { class: 'chips' });
    tabsEl = h('div', { class: 'tabs' });
    roundEl = h('div', { class: 'round', style: 'display:none' });
    bodyEl = h('div', { class: 'bd' });
    panel = h('div', { class: 'panel', style: 'display:none' },
      h('div', { class: 'hd' },
        h('div', { class: 'ttl' },
          h('div', {}, h('b', {}, '🛡️ Supervisor Ileva'), statusEl),
          h('div', { class: 'icons' },
            h('button', { class: 'ic', title: 'Fazer ronda agora (lê o histórico dos grupos com atividade recente)', onclick: () => { if (rounding) abortRound = true; else round(true); } }, '🔄'),
            h('button', { class: 'ic', title: 'Copiar relatório completo', onclick: e => copy(buildTextReport(computeAll()), e.currentTarget) }, '📄'),
            h('button', { class: 'ic', title: 'Copiar dados para análise do Claude', onclick: e => copy(buildClaudeExport(computeAll()), e.currentTarget) }, '🤖'),
            h('button', { class: 'ic', title: 'Largura do painel', onclick: () => { const i = WIDTHS.indexOf(ui.width); ui.width = WIDTHS[(i + 1) % WIDTHS.length]; saveUi(); render(true); } }, '↔'),
            h('button', { class: 'ic', title: 'Configurações', onclick: () => { view = view === 'cfg' ? 'main' : 'cfg'; render(true); } }, '⚙️'),
            h('button', { class: 'ic', title: 'Minimizar (o WhatsApp volta a ocupar a tela toda)', onclick: () => setOpen(false) }, '—'))),
        chipsEl, roundEl),
      tabsEl, bodyEl);
    shadow.append(fab, panel);
    document.body.append(host);
  }
  function setOpen(v) { ui.open = !!v; saveUi(); render(true); }
  function setTab(t, filter) { ui.tab = t; ui.filter = filter || null; view = 'main'; saveUi(); render(true); if (bodyEl) bodyEl.scrollTop = 0; }

  // Encolhe o WhatsApp para o painel ficar AO LADO da conversa, sem cobrir nada
  let dockedW = null;
  function applyDock() {
    const app = document.getElementById('app');
    if (!app) return;
    const want = ui.open ? ui.width : null;
    if (want === dockedW && (!want || app.style.width)) return;
    if (want) { app.style.setProperty('width', `calc(100% - ${want}px)`, 'important'); app.style.setProperty('right', 'auto', 'important'); }
    else { app.style.removeProperty('width'); app.style.removeProperty('right'); }
    dockedW = want;
    window.dispatchEvent(new Event('resize'));
  }

  let notified = new Set();
  function notifyReds(st) {
    const keyOf = g => g.name + '|' + (g.pend[0] ? g.pend[0].ts : '');
    if (cfg.notify && 'Notification' in window && Notification.permission === 'granted') {
      st.reds.forEach(g => { if (!notified.has(keyOf(g))) { try { new Notification('🔴 ' + g.name, { body: `${g.clientName} aguardando há ${fmtDur(g.wait)}: ${(g.lastRel.text || '').slice(0, 90)}`, tag: 'ileva-' + g.name }); } catch (e) { } } });
    }
    notified = new Set(st.reds.map(keyOf));
  }

  const LEVEL_TXT = { red: 'URGENTE', yellow: 'ATENÇÃO', green: 'NO PRAZO' };
  let lastAction = null; // { kind:'final'|'tone', key, label, at }
  function finalize(name) {
    data.final[name] = { ts: Date.now(), by: 'Supervisor' };
    lastAction = { kind: 'final', key: name, label: `Atendimento de "${name}" finalizado.`, at: Date.now() };
    lsSet(LS_DATA, data); render(true);
  }
  function reopen(name) { delete data.final[name]; lsSet(LS_DATA, data); lastAction = null; render(true); }
  function dismissTone(key) {
    data.dismissed[key] = Date.now();
    lastAction = { kind: 'tone', key, label: 'Alerta de tom marcado como revisado.', at: Date.now() };
    lsSet(LS_DATA, data); render(true);
  }
  function undoLast() {
    if (!lastAction) return;
    if (lastAction.kind === 'final') delete data.final[lastAction.key]; else if (lastAction.kind === 'tone') delete data.dismissed[lastAction.key];
    lastAction = null; lsSet(LS_DATA, data); render(true);
  }
  function undoBar() {
    if (!lastAction || Date.now() - lastAction.at > 15000) return null;
    return h('div', { class: 'undo' }, h('span', {}, '✅ ' + lastAction.label), lastAction.kind === 'info' ? null : h('button', { class: 'btn', onclick: undoLast }, '↩ Desfazer'));
  }
  function openBtn(name) { return h('button', { class: 'btn', title: 'Abre o grupo no WhatsApp (só abre, não envia nada)', onclick: () => openChat(name) }, '💬 Abrir conversa'); }

  function simBlock(g, sims) {
    if (!sims.length) return null;
    return h('details', { open: true },
      h('summary', {}, `💡 Já respondemos algo parecido (${sims.length})`),
      sims.map(({ item, score }) => {
        const txt = kbReply(item, g.clientName);
        return h('div', { class: 'sim' },
          h('div', { class: 'who' }, `${item.group} · ${fmtTime(item.qTs)} · respondido por ${item.who || 'equipe'} · ${Math.round(score * 100)}% parecido${item.status === 'approved' ? ' · ✅ validada' : item.resolved ? ' · resolvido' : ''}`),
          h('div', { class: 'quote' }, 'Pergunta: "' + item.q.slice(0, 160) + (item.q.length > 160 ? '…' : '') + '"'),
          h('pre', {}, txt),
          h('div', { class: 'actions' },
            h('button', { class: 'btn pri', onclick: e => { item.uses = (item.uses || 0) + 1; saveKb(); copy(txt, e.currentTarget); } }, '📋 Copiar esta'),
            item.status !== 'approved' ? h('button', { class: 'btn ok', title: 'Marca como resposta boa: ela passa a ter prioridade', onclick: () => kbSet(item.id, 'approved') }, '👍 Validar') : null,
            h('button', { class: 'btn', title: 'Não sugerir mais esta resposta', onclick: () => kbSet(item.id, 'rejected') }, '👎 Não serve')));
      }));
  }
  function bestSuggestion(g, mode) {
    let s = suggest(g, mode);
    const qText = mode === 'promise' ? '' : g.pend.map(m => m.text).join(' ') || (g.lastRel ? g.lastRel.text : '');
    const sims = qText ? findSimilar(qText) : [];
    if (mode === 'open' && sims.length && (((s.topic === 'geral' || s.topic === 'devolutiva') && sims[0].score >= 0.45) || sims[0].score >= 0.55 || (sims[0].item.status === 'approved' && sims[0].score >= 0.45))) {
      s = { text: kbReply(sims[0].item, g.clientName), topic: 'kb', kb: true, src: `Resposta já dada em ${sims[0].item.group} (${fmtTime(sims[0].item.qTs)})`, note: sims[0].item.status === 'approved' ? '' : 'Baseada em atendimento anterior: confira se o caso é o mesmo antes de enviar.' };
      sims.shift();
    }
    return { s, sims };
  }
  function atendCard(g, mode, st) {
    const { s, sims } = bestSuggestion(g, mode);
    let color, pill, waitTxt, blink = false;
    const sinceLabel = (g.pend[0] && g.pend[0].approxLabel) || (g.lastRel && g.lastRel.approxLabel);
    const fmtWait = () => g.approx ? 'desde ' + (sinceLabel || 'antes') : fmtDur(g.wait);
    if (mode === 'open') { color = g.level; pill = LEVEL_TXT[g.level]; waitTxt = fmtWait(); blink = g.level === 'red'; }
    else if (mode === 'promise') { color = 'purple'; pill = 'RETORNO PROMETIDO'; waitTxt = fmtDur(st.now - g.promise.since); }
    else { color = 'blue'; pill = 'AGUARDANDO CLIENTE'; waitTxt = fmtWait(); }
    const msg = mode === 'promise' ? g.promise.text : (g.lastRel ? g.lastRel.text : '');
    const msgWho = mode === 'promise' ? `${g.promise.who} (${fmtTime(g.promise.since)})` : `${g.clientName} (${g.lastRel ? fmtTime(g.lastRel.ts, g.lastRel.approxLabel) : ''})`;
    const critical = mode === 'open' && (g.wait > 60 * MIN || g.approx);
    return h('div', { class: `card ${color}${blink ? ' blink' : ''}` },
      h('div', { class: 'top' },
        h('div', { style: 'min-width:0' },
          h('div', {}, h('span', { class: `pill ${color}${blink ? ' blink' : ''}` }, critical ? 'CRÍTICO' : pill), h('span', { class: 'gname' }, g.name)),
          h('div', { class: 'who' }, mode === 'promise' ? 'Prometido por ' + msgWho : 'Última mensagem de ' + msgWho)),
        h('div', { class: `wait ${color}`, title: mode === 'promise' ? 'Tempo desde a promessa' : 'Tempo de espera do cliente' }, waitTxt)),
      h('div', { class: 'quote' }, `"${(msg || '').slice(0, 220)}"`),
      g.partial ? h('div', { class: 'warn' }, 'Vimos só a prévia da lista. Abra a conversa para confirmar.') : null,
      h('details', { open: mode === 'open' && g.level !== 'green' },
        h('summary', {}, mode === 'promise' ? 'Ver mensagem de retorno sugerida' : 'Ver resposta sugerida'),
        h('pre', {}, s.text),
        (!s.kb || s.note) ? h('div', { class: 'warn' }, '⚠️ ' + (s.note || 'Confirme com o setor responsável.')) : null,
        s.src ? h('div', { class: 'src' }, 'Base: ' + s.src) : null),
      simBlock(g, sims),
      h('div', { class: 'actions' },
        h('button', { class: 'btn pri', onclick: e => copy(s.text, e.currentTarget) }, '📋 Copiar resposta'),
        openBtn(g.name),
        h('button', { class: 'btn ok', title: 'Use quando o atendimento já foi concluído pela equipe. Se o cliente escrever de novo, ele volta automaticamente.', onclick: () => finalize(g.name) }, '✅ Finalizar')));
  }
  function toneCard(t, st) {
    const editable = st.now - t.ts < 15 * MIN;
    return h('div', { class: 'card ' + (editable ? 'red blink' : 'yellow') },
      editable ? h('div', { class: 'edit' }, `✏️ DÁ PARA EDITAR AINDA — restam ${Math.max(0, 15 - Math.floor((st.now - t.ts) / MIN))} min`) : null,
      h('div', { class: 'top' }, h('div', {}, h('span', { class: 'gname' }, t.who), h('div', { class: 'who' }, `${t.group} · ${fmtTime(t.ts)}`))),
      h('div', { class: 'lbl' }, 'Mensagem enviada:'), h('div', { class: 'quote' }, t.original),
      h('div', { class: 'lbl' }, 'O que ajustar:'),
      h('ul', { class: 'iss' }, t.issues.map(i => h('li', {}, `${i.cat}: ${i.text}`))),
      h('div', { class: 'lbl' }, 'Versão corrigida:'), h('pre', { class: 'fix' }, t.fixed),
      h('div', { class: 'actions' }, h('button', { class: 'btn pri', onclick: e => copy(t.fixed, e.currentTarget) }, '📋 Copiar corrigida'), openBtn(t.group),
        h('button', { class: 'btn ok', title: 'Tira este alerta da lista (já foi tratado com o colaborador ou não é um problema)', onclick: () => dismissTone(t.key) }, '✅ Marcar como revisado')));
  }
  function renderAtend(st) {
    const out = [];
    const reds = st.open.filter(g => g.level === 'red'), others = st.open.filter(g => g.level !== 'red');
    out.push(undoBar());
    const f = ui.filter;
    if (f) {
      const names = { red: '🔴 Urgentes (mais de 15 min)', prazo: '🟡🟢 Em aberto, dentro do prazo', retorno: '🟣🔵 Retorno prometido / aguardando o cliente' };
      out.push(h('div', { class: 'filt' }, h('span', {}, 'Mostrando: ', h('b', {}, names[f])), h('button', { class: 'btn', onclick: () => setTab('atend', null) }, 'Ver todos')));
      let list = [];
      if (f === 'red') list = reds.map(g => atendCard(g, 'open', st));
      if (f === 'prazo') list = others.map(g => atendCard(g, 'open', st));
      if (f === 'retorno') list = [...st.promises.map(g => atendCard(g, 'promise', st)), ...st.waiting.map(g => atendCard(g, 'await', st))];
      return [...out, list.length ? list : h('div', { class: 'empty' }, '✅ Nada nesta lista agora.')];
    }
    if (!st.open.length && !st.promises.length && !st.waiting.length) return [...out, h('div', { class: 'empty' }, '✅ Nenhum atendimento pendente agora.')];
    if (reds.length) out.push(h('div', { class: 'grp', style: 'color:#f15c6d' }, `🔴 Responder já (${reds.length})`), reds.map(g => atendCard(g, 'open', st)));
    if (others.length) out.push(h('div', { class: 'grp' }, `🟡🟢 Em aberto, dentro do prazo (${others.length})`), others.map(g => atendCard(g, 'open', st)));
    if (st.promises.length) out.push(h('div', { class: 'grp' }, `🟣 Retorno prometido e não dado (${st.promises.length})`), st.promises.map(g => atendCard(g, 'promise', st)));
    if (st.waiting.length) out.push(h('div', { class: 'grp' }, `🔵 Aguardando o cliente (${st.waiting.length})`), st.waiting.map(g => atendCard(g, 'await', st)));
    return out;
  }
  function renderTom(st) {
    if (!st.tone.length) return [undoBar(), h('div', { class: 'empty' }, '✅ Nenhuma mensagem da equipe fora do padrão nas conversas lidas (24 h).')];
    const ed = st.tone.filter(t => st.now - t.ts < 15 * MIN), rest = st.tone.filter(t => st.now - t.ts >= 15 * MIN);
    const out = [undoBar()];
    if (ed.length) out.push(h('div', { class: 'grp', style: 'color:#f15c6d' }, `✏️ Ainda dá para editar (${ed.length})`), ed.map(t => toneCard(t, st)));
    if (rest.length) out.push(h('div', { class: 'grp' }, `Últimas 24 h (${rest.length})`), rest.map(t => toneCard(t, st)));
    return out;
  }
  function renderManha(st) {
    const out = [undoBar()];
    const mi = st.morningInfo;
    if (!mi) {
      out.push(h('div', { class: 'card blue' },
        h('div', { class: 'gname' }, `🌅 A leitura de hoje ainda não foi feita`),
        h('div', { class: 'who', style: 'margin-top:4px' }, `Todos os dias às ${cfg.morningTime}, o painel abre os grupos de clientes com atividade nos últimos ${cfg.morningDays} dias e lista aqui o que ficou em aberto. Se o WhatsApp estiver fechado nesse horário, a leitura acontece assim que ele for aberto.`),
        h('div', { class: 'actions' }, h('button', { class: 'btn pri', onclick: () => morningRound(true) }, '🌅 Fazer a leitura agora'))));
      return out;
    }
    out.push(h('div', { class: 'filt' },
      h('span', {}, `Leitura de hoje às ${fmtTime(mi.at)} · `, h('b', {}, `${st.morning.length} pendente${st.morning.length === 1 ? '' : 's'}`), st.morningDone.length ? ` · ${st.morningDone.length} já resolvido${st.morningDone.length === 1 ? '' : 's'}` : ''),
      h('button', { class: 'btn', title: 'Abre de novo todos os grupos e refaz a lista', onclick: () => morningRound(true) }, '🔄 Refazer')));
    if (!st.morning.length) { out.push(h('div', { class: 'empty' }, '✅ Tudo que ficou de ontem já foi tratado.')); return out; }
    const sec = (title, kinds) => {
      const list = st.morning.filter(x => kinds.includes(x.it.kind));
      if (!list.length) return;
      out.push(h('div', { class: 'grp' }, `${title} (${list.length})`));
      list.forEach(({ it, g }) => out.push(atendCard(g, it.kind === 'promise' ? 'promise' : it.kind === 'await' ? 'await' : 'open', st)));
    };
    sec('🔴 Cliente sem resposta', ['open']);
    sec('🟣 Retorno prometido e não dado', ['promise']);
    sec('🔵 Aguardando o cliente', ['await']);
    return out;
  }
  let kbQuery = '';
  function renderBase(st) {
    const appr = kb.filter(x => x.status === 'approved').length, rej = kb.filter(x => x.status === 'rejected').length, res = kb.filter(x => x.resolved).length;
    const search = h('input', { type: 'text', style: 'flex:1;min-width:0', value: kbQuery, placeholder: 'Buscar na base (ex.: boleto, vistoria, senha)…' });
    search.addEventListener('keydown', e => { if (e.key === 'Enter') { kbQuery = search.value; render(true); } });
    let list = kb.filter(x => x.status !== 'rejected');
    if (kbQuery.trim()) { const sims = findSimilar(kbQuery); const ids = new Set(sims.map(r => r.item.id)); const qd = deacc(kbQuery); list = list.filter(x => ids.has(x.id) || deacc(x.q + ' ' + x.a).includes(qd)); }
    list = list.slice().sort((a, b) => (b.status === 'approved') - (a.status === 'approved') || b.qTs - a.qTs).slice(0, 40);
    return [
      h('div', { class: 'card blue' },
        h('div', { class: 'gname' }, '📚 Base de conhecimento dos atendimentos'),
        h('div', { class: 'who', style: 'margin-top:4px' }, `O painel aprende com as perguntas dos clientes e as respostas que a equipe já deu. Quando chega uma pergunta parecida, ele mostra "💡 Já respondemos algo parecido" no cartão do atendimento.`),
        h('div', { style: 'margin-top:6px' }, h('b', {}, String(kb.length - rej)), ' respostas aprendidas · ', h('b', {}, String(appr)), ' validadas · ', h('b', {}, String(res)), ' com cliente satisfeito'),
        h('div', { class: 'actions' },
          h('button', { class: 'btn pri', title: 'Abre cada grupo e rola a conversa para cima para ler o histórico (leva alguns minutos e marca como lidas)', onclick: () => learnHistoryAll() }, rounding ? '⏳ Aprendendo…' : '📚 Aprender histórico de todos os grupos'),
          h('button', { class: 'btn', title: 'Lê o histórico da conversa aberta agora', onclick: async () => { const n = await learnHistory(null, 12); lastAction = { kind: 'info', key: '', label: `${n} nova(s) resposta(s) aprendida(s) nesta conversa.`, at: Date.now() }; render(true); } }, '📖 Aprender desta conversa'))),
      undoBar(),
      h('div', { style: 'display:flex;gap:6px;margin:8px 0' }, search, h('button', { class: 'btn', onclick: () => { kbQuery = search.value; render(true); } }, 'Buscar')),
      list.length ? list.map(x => h('div', { class: 'card ' + (x.status === 'approved' ? 'green' : 'yellow') },
        h('div', { class: 'who' }, `${x.group} · ${fmtTime(x.qTs)} · ${x.who || 'equipe'}${x.status === 'approved' ? ' · ✅ validada' : ''}${x.resolved ? ' · resolvido' : ''}${x.uses ? ` · usada ${x.uses}x` : ''}`),
        h('div', { class: 'lbl' }, 'Pergunta do cliente:'), h('div', { class: 'quote' }, x.q),
        h('div', { class: 'lbl' }, 'Resposta da equipe (já ajustada ao padrão):'), h('pre', { class: 'fix' }, x.a),
        h('div', { class: 'actions' },
          x.status !== 'approved' ? h('button', { class: 'btn ok', onclick: () => kbSet(x.id, 'approved') }, '👍 Validar') : h('button', { class: 'btn', onclick: () => kbSet(x.id, 'auto') }, 'Tirar validação'),
          h('button', { class: 'btn', onclick: () => kbSet(x.id, 'rejected') }, '👎 Não usar')))) :
        h('div', { class: 'empty' }, kb.length ? 'Nada encontrado para essa busca.' : 'Ainda não há respostas aprendidas. Abra conversas ou clique em "Aprender histórico de todos os grupos".')
    ];
  }
  function renderResumo(st) {
    const max = st.open[0];
    const pc = Object.entries(st.perCollab).sort((a, b) => b[1] - a[1]);
    return [
      h('div', { class: 'grp' }, 'Atendimentos'),
      h('table', {}, h('tbody', {},
        h('tr', {}, h('td', {}, 'Total em aberto'), h('td', { class: 'n' }, String(st.open.length))),
        h('tr', {}, h('td', {}, '🔴 Mais de 15 min'), h('td', { class: 'n' }, String(st.reds.length))),
        h('tr', {}, h('td', {}, '🟣 Retornos prometidos pendentes'), h('td', { class: 'n' }, String(st.promises.length))),
        h('tr', {}, h('td', {}, '🔵 Aguardando o cliente'), h('td', { class: 'n' }, String(st.waiting.length))),
        h('tr', {}, h('td', {}, 'Maior espera'), h('td', { class: 'n' }, max ? `${max.name} · ${max.approx ? '+' : ''}${fmtDur(max.wait)}` : '—')))),
      h('div', { class: 'grp' }, `Finalizados manualmente nas últimas 24 h (${st.finalized.length})`),
      st.finalized.length ? h('table', {}, h('tbody', {}, st.finalized.map(g => h('tr', {}, h('td', {}, g.name, h('div', { class: 'who' }, 'às ' + fmtTime(g.finalized.ts))), h('td', { class: 'n' }, h('button', { class: 'btn', onclick: () => reopen(g.name) }, '↩ Reabrir')))))) : h('div', { class: 'who' }, 'Nenhum.'),
      h('div', { class: 'grp' }, 'Mensagens com problema de tom (24 h)'),
      pc.length ? h('table', {}, h('tbody', {}, pc.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', { class: 'n' }, String(v)))))) : h('div', { class: 'empty' }, 'Nenhuma.'),
      h('div', { class: 'actions', style: 'margin-top:12px' },
        h('button', { class: 'btn pri', onclick: e => copy(buildTextReport(computeAll()), e.currentTarget) }, '📄 Copiar relatório completo'),
        h('button', { class: 'btn', onclick: e => copy(buildClaudeExport(computeAll()), e.currentTarget) }, '🤖 Copiar p/ Claude')),
      h('div', { class: 'info' }, `Grupos monitorados: ${st.groups.length} · com histórico lido: ${st.groups.filter(g => !g.partial).length}. ` +
        'Somente leitura: o painel nunca envia, edita ou apaga mensagens. Os grupos marcados como "só prévia" foram vistos apenas na lista; o botão 🔄 lê o histórico deles (e marca como lidos).')
    ];
  }
  function renderCfg() {
    const team = h('textarea', { rows: 6 }); team.value = cfg.team.join('\n');
    const ign = h('textarea', { rows: 4 }); ign.value = cfg.ignoreGroups.join('\n');
    const greg = h('input', { type: 'text', value: cfg.clientGroupRegex });
    const treg = h('input', { type: 'text', value: cfg.teamRegex });
    const auto = h('input', { type: 'checkbox', checked: cfg.autoRound });
    const notif = h('input', { type: 'checkbox', checked: cfg.notify });
    const idle = h('input', { type: 'number', value: cfg.idleSec, min: 30 });
    const every = h('input', { type: 'number', value: cfg.roundEveryMin, min: 3 });
    const prom = h('input', { type: 'number', value: cfg.promiseHours, min: 1 });
    const morn = h('input', { type: 'text', value: cfg.morningTime });
    const mdays = h('input', { type: 'number', value: cfg.morningDays, min: 1, max: 8 });
    return [
      h('div', { class: 'grp' }, '⚙️ Configurações'),
      h('label', {}, 'Equipe Ileva (um por linha; trecho do nome basta)'), team,
      h('label', {}, 'Regra extra para reconhecer a equipe (regex)'), treg,
      h('label', {}, 'Grupos a ignorar (um por linha; trecho do nome basta)'), ign,
      h('label', {}, 'Regra para reconhecer grupos de clientes (regex)'), greg,
      h('label', { class: 'chk' }, notif, 'Notificação do navegador quando um atendimento ficar 🔴'),
      h('label', { class: 'chk' }, auto, 'Ronda automática quando ninguém mexer no WhatsApp (abre os grupos e marca como lidos)'),
      h('label', {}, 'Considerar "sem mexer" após (segundos)'), idle,
      h('label', {}, 'Intervalo da ronda automática (minutos)'), every,
      h('label', {}, 'Alertar retorno prometido após (horas)'), prom,
      h('label', {}, 'Horário da leitura diária de todos os grupos (HH:MM)'), morn,
      h('label', {}, 'Na leitura diária, considerar grupos com atividade nos últimos (dias)'), mdays,
      h('div', { class: 'actions', style: 'margin-top:12px' },
        h('button', { class: 'btn pri', onclick: async () => {
          cfg.team = team.value.split('\n').map(norm).filter(Boolean);
          cfg.ignoreGroups = ign.value.split('\n').map(norm).filter(Boolean);
          cfg.clientGroupRegex = greg.value || DEFAULT_CFG.clientGroupRegex;
          cfg.teamRegex = treg.value || DEFAULT_CFG.teamRegex;
          cfg.autoRound = auto.checked; cfg.notify = notif.checked;
          cfg.idleSec = Math.max(30, +idle.value || 120); cfg.roundEveryMin = Math.max(3, +every.value || 10); cfg.promiseHours = Math.max(1, +prom.value || 2);
          cfg.morningTime = /^\d{1,2}:\d{2}$/.test(morn.value.trim()) ? morn.value.trim() : '08:15';
          cfg.morningDays = Math.min(8, Math.max(1, +mdays.value || 7));
          if (cfg.notify && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (e) { } }
          lsSet(LS_CFG, cfg); toneCache.clear(); view = 'main'; render(true);
        } }, 'Salvar'),
        h('button', { class: 'btn', onclick: () => { cfg = Object.assign({}, DEFAULT_CFG); lsSet(LS_CFG, cfg); toneCache.clear(); render(true); } }, 'Restaurar padrão'),
        h('button', { class: 'btn', onclick: () => { data = { groups: {} }; lsSet(LS_DATA, data); toneCache.clear(); view = 'main'; render(true); } }, 'Limpar dados'),
        h('button', { class: 'btn', onclick: () => { view = 'main'; render(true); } }, 'Voltar')),
      h('div', { class: 'info' }, `Versão ${VERSION}. Os dados ficam só neste navegador e são apagados após 48 h.`)
    ];
  }

  let lastRenderSig = '';
  function render(force) {
    mountUI();
    const st = computeAll();
    const yellows = st.open.filter(g => g.level !== 'red').length;
    // botão flutuante (quando o painel está minimizado)
    const alarm = st.reds.length > 0;
    fab.className = 'fab' + (alarm ? ' alarm' : '');
    fab.style.display = ui.open ? 'none' : 'flex';
    fab.replaceChildren(alarm ? `🚨 ${st.reds.length} urgente${st.reds.length > 1 ? 's' : ''}` : '🛡️ Supervisor',
      h('span', { class: 'b' }, `${st.open.length} em aberto`),
      st.editable.length ? h('span', { class: 'b' }, `✏️ ${st.editable.length}`) : null,
      st.morning.length ? h('span', { class: 'b', title: 'Pendências da leitura do início do dia' }, `🌅 ${st.morning.length}`) : null);
    notifyReds(st);
    panel.style.display = ui.open ? 'flex' : 'none';
    panel.style.width = ui.width + 'px';
    applyDock();
    if (!ui.open) return;
    statusEl.textContent = `Atualizado ${new Date().toLocaleTimeString('pt-BR').slice(0, 5)} · ${st.groups.length} grupos`;
    roundEl.style.display = roundInfo ? 'block' : 'none';
    roundEl.textContent = roundInfo ? roundInfo + ' (clique em 🔄 para parar)' : '';
    // contadores clicáveis
    const chip = (cls, n, l, tab, filter, on) => {
      const sel = view === 'main' && ui.tab === tab && (tab === 'tom' || ui.filter === filter);
      return h('div', { class: `chip ${cls}${on ? ' on' : ''}${sel ? ' sel' : ''}`, title: sel ? 'Clique de novo para ver todos' : 'Ver só esta lista',
        onclick: () => (sel && tab !== 'tom') ? setTab('atend', null) : setTab(tab, filter) }, h('div', { class: 'n' }, String(n)), h('div', { class: 'l' }, l));
    };
    chipsEl.replaceChildren(
      chip('red', st.reds.length, 'urgentes', 'atend', 'red', st.reds.length > 0),
      chip('yellow', yellows, 'no prazo', 'atend', 'prazo'),
      chip('purple', st.promises.length + st.waiting.length, 'retorno/aguard.', 'atend', 'retorno'),
      chip('blue', st.tone.length, 'tom equipe', 'tom', null, false));
    const pendCount = st.open.length + st.promises.length;
    const tab = (id, label, count, red) => h('button', { class: 'tab' + (ui.tab === id && view === 'main' ? ' on' : ''), onclick: () => setTab(id) }, label, count != null ? h('span', { class: 'c' + (red ? '' : ' g') }, String(count)) : null);
    tabsEl.replaceChildren(
      tab('atend', 'Atendimentos', pendCount, st.reds.length > 0),
      tab('manha', '🌅 Início', st.morningInfo ? st.morning.length : null, st.morning.length > 0),
      tab('tom', 'Tom', st.tone.length, st.editable.length > 0),
      tab('base', '📚 Base', null),
      tab('resumo', 'Resumo', null));
    if (view === 'cfg') { if (force || bodyEl.dataset.view !== 'cfg') { bodyEl.replaceChildren(...renderCfg()); bodyEl.dataset.view = 'cfg'; } return; }
    const sel = shadow.getSelection ? shadow.getSelection() : null;
    if (!force && sel && sel.toString()) return;
    // não redesenha enquanto o usuário tiver uma "resposta sugerida" aberta/fechada manualmente, salvo mudança real
    const sig = JSON.stringify([ui.tab, ui.filter, kb.length, kbQuery, rounding, st.morningInfo ? st.morningInfo.at : 0, st.morning.map(x => x.it.name), st.morning.map(x => x.g ? Math.floor((st.now - x.it.since) / HOUR) : 0), lastAction && Date.now() - lastAction.at < 15000 ? lastAction.at : 0, st.finalized.map(g => g.name), st.open.map(g => [g.name, Math.floor(g.wait / MIN), g.level]), st.waiting.map(g => [g.name, Math.floor(g.wait / MIN)]), st.promises.map(g => g.name), st.tone.map(t => [t.group, t.ts, Math.min(16, Math.floor((st.now - t.ts) / MIN))])]);
    if (!force && sig === lastRenderSig && bodyEl.dataset.view === ui.tab) return;
    // preserva quais "detalhes" o usuário abriu/fechou
    const openState = new Map();
    bodyEl.querySelectorAll('details').forEach((d, i) => openState.set(i, d.open));
    const keepManual = bodyEl.dataset.view === ui.tab && !force;
    lastRenderSig = sig;
    const top = bodyEl.scrollTop;
    const content = ui.tab === 'tom' ? renderTom(st) : ui.tab === 'resumo' ? renderResumo(st) : ui.tab === 'manha' ? renderManha(st) : ui.tab === 'base' ? renderBase(st) : renderAtend(st);
    bodyEl.replaceChildren(...content.flat(Infinity).filter(Boolean));
    if (keepManual) bodyEl.querySelectorAll('details').forEach((d, i) => { if (openState.has(i)) d.open = openState.get(i); });
    bodyEl.dataset.view = ui.tab;
    bodyEl.scrollTop = top;
  }
  // ------------------------------------------------------------------ LOOP
  function tick() {
    try {
      if (!rounding) { ingestList(); ingestOpenChat(); }
      prune(); save(); render(false); maybeAuto();
    } catch (e) { console.warn('[Supervisor Ileva]', e); }
  }
  const boot = setInterval(() => {
    if (document.body) { clearInterval(boot); mountUI(); tick(); setInterval(tick, 5000); console.log('[Supervisor Ileva] ativo — somente leitura. v' + VERSION); }
  }, 500);

  // Para testes/diagnóstico no console: window.__ilevaSup.report()
  window.__ilevaSup = { report: () => buildTextReport(computeAll()), data: () => data, round: () => round(true), morning: () => morningRound(true), snapshot: () => snapshotMorning(), kb: () => kb, learnAll: () => learnAll(), version: VERSION };
})();
