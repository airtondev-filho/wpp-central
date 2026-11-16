/**
 * AGENDA DE REUNIÕES COMPARTILHADA - SUPERVISOR ILEVA
 * Cole este código em: Planilha Google > Extensões > Apps Script (substitua tudo) e publique como "App da Web".
 * A aba "Reuniões" é criada sozinha. Pode consultar a planilha à vontade; evite editar a coluna ID.
 */
// >>> COLE AQUI o link do webhook do espaço da equipe no Google Chat (entre as aspas) <<<
const CHAT_WEBHOOK = '';

const KEY = 'E8jLhSxPN7hvnW-PpVzQVNFR'; // precisa ser igual à SHARED_KEY do script do Supervisor
const ABA = 'Reuniões';
const ABA_FIN = 'Atendimentos finalizados';
const CAB_FIN = ['Grupo', 'Finalizado em', 'Por', 'Reaberto', 'ts (não editar)'];
const CAB = ['ID', 'Cliente', 'Data e hora', 'Responsável', 'Assunto', 'Atualizado em', 'Excluída', 'ts (não editar)', 'upd (não editar)', 'Finalizada em', 'fin (não editar)', 'Iniciada em', 'live (não editar)', 'Finalizada por'];

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA);
  if (!sh) {
    sh = ss.insertSheet(ABA);
    sh.getRange(1, 1, 1, CAB.length).setValues([CAB]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('C:C').setNumberFormat('dd/MM/yyyy HH:mm');
    sh.getRange('F:F').setNumberFormat('dd/MM/yyyy HH:mm:ss');
    sh.getRange('J:J').setNumberFormat('dd/MM/yyyy HH:mm');
  }
  if (sh.getLastColumn() < CAB.length) { sh.getRange(1, 1, 1, CAB.length).setValues([CAB]).setFontWeight('bold'); sh.getRange('J:J').setNumberFormat('dd/MM/yyyy HH:mm'); sh.getRange('L:L').setNumberFormat('dd/MM/yyyy HH:mm'); }
  return sh;
}
const num_ = (n, d) => { const x = Number(n); if (x > 0) return x; if (d instanceof Date) return d.getTime(); const t = d ? new Date(d).getTime() : 0; return isNaN(t) ? 0 : t; };

function abaFin_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_FIN);
  if (!sh) {
    sh = ss.insertSheet(ABA_FIN);
    sh.getRange(1, 1, 1, CAB_FIN.length).setValues([CAB_FIN]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.getRange('B:B').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
  return sh;
}
function listaFin_() {
  const sh = abaFin_(), limite = Date.now() - 2 * 24 * 3600 * 1000;
  return sh.getDataRange().getValues().slice(1).filter(r => r[0] && num_(r[4], r[1]) > limite)
    .map(r => ({ name: String(r[0]), ts: num_(r[4], r[1]), by: String(r[2] || ''), del: String(r[3] || '').trim() ? 1 : 0 }));
}
function salvarFin_(d) {
  if (!d || !d.name || !d.ts) throw new Error('dados incompletos');
  const sh = abaFin_();
  const nomes = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues().map(r => String(r[0]));
  const i = nomes.indexOf(String(d.name));
  if (i > 0) { const tsAnt = Number(sh.getRange(i + 1, 5).getValue()) || 0; if (tsAnt > Number(d.ts)) return; }
  const linha = [String(d.name).slice(0, 200), new Date(Number(d.ts)), String(d.by || '').slice(0, 60), d.del ? 'sim' : '', Number(d.ts)];
  if (i > 0) sh.getRange(i + 1, 1, 1, linha.length).setValues([linha]); else sh.appendRow(linha);
}

// ===== Lembretes de cobrança (compartilhados com a equipe) =====
const ABA_LEMB = 'Lembretes';
const CAB_LEMB = ['ID', 'O que cobrar', 'Cobrar de quem', 'Cliente', 'Cobrar em', 'Responsável', 'Situação', 'Criado por', 'Atualizado', 'dados (não editar)'];
function abaLemb_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_LEMB);
  if (!sh) {
    sh = ss.insertSheet(ABA_LEMB);
    sh.getRange(1, 1, 1, CAB_LEMB.length).setValues([CAB_LEMB]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.getRange('E:E').setNumberFormat('dd/MM/yyyy HH:mm'); sh.getRange('I:I').setNumberFormat('dd/MM/yyyy HH:mm');
  }
  return sh;
}
function listaLemb_() {
  const limite = Date.now() - 15 * 24 * 3600 * 1000, out = [];
  abaLemb_().getDataRange().getValues().slice(1).forEach(r => {
    try { const o = JSON.parse(String(r[9] || '{}')); if (o.id && !(o.del && (o.upd || 0) < limite) && !(o.done && o.done < limite)) out.push(o); } catch (e) { }
  });
  return out;
}
function salvarLemb_(d) {
  if (!d || !d.id) throw new Error('dados incompletos');
  const sh = abaLemb_();
  const ids = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues().map(r => String(r[0]));
  const i = ids.indexOf(String(d.id));
  if (i > 0) { try { const ant = JSON.parse(String(sh.getRange(i + 1, 10).getValue() || '{}')); if ((ant.upd || 0) > (d.upd || 0)) return; } catch (e) { } }
  const sit = d.del ? 'Excluído' : d.done ? 'Resolvido por ' + (d.doneBy || '') : 'Pendente' + (d.cobrancas ? ' (' + d.cobrancas + ' cobrança(s))' : '');
  const linha = [String(d.id), String(d.titulo || '').slice(0, 300), String(d.equipe || '').slice(0, 100), String(d.cliente || '').slice(0, 100),
    d.quando ? new Date(Number(d.quando)) : '', String(d.resp || '').slice(0, 60), sit, String(d.criadoPor || '').slice(0, 60), new Date(Number(d.upd) || Date.now()), JSON.stringify(d).slice(0, 45000)];
  if (i > 0) sh.getRange(i + 1, 1, 1, linha.length).setValues([linha]); else sh.appendRow(linha);
}

// ===== Tarefas com prazo (compartilhadas com a equipe) =====
const ABA_TAR = 'Tarefas';
const CAB_TAR = ['ID', 'Tarefa', 'Associação', 'Solicitante', 'Responsável', 'Prazo (dias úteis)', 'Entrega até', 'Situação', 'Cadastrada por', 'Atualizado', 'dados (não editar)'];
function abaTar_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA_TAR);
  if (!sh) {
    sh = ss.insertSheet(ABA_TAR);
    sh.getRange(1, 1, 1, CAB_TAR.length).setValues([CAB_TAR]).setFontWeight('bold');
    sh.setFrozenRows(1); sh.getRange('G:G').setNumberFormat('dd/MM/yyyy HH:mm'); sh.getRange('J:J').setNumberFormat('dd/MM/yyyy HH:mm');
  }
  return sh;
}
function listaTar_() {
  const limite = Date.now() - 30 * 24 * 3600 * 1000, out = [];
  abaTar_().getDataRange().getValues().slice(1).forEach(r => {
    try { const o = JSON.parse(String(r[10] || '{}')); if (o.id && !(o.del && (o.upd || 0) < limite) && !(o.status === 'concluida' && (o.done || 0) < limite)) out.push(o); } catch (e) { }
  });
  return out;
}
function salvarTar_(d) {
  if (!d || !d.id) throw new Error('dados incompletos');
  const sh = abaTar_();
  const ids = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues().map(r => String(r[0]));
  const i = ids.indexOf(String(d.id));
  if (i > 0) { try { const ant = JSON.parse(String(sh.getRange(i + 1, 11).getValue() || '{}')); if ((ant.upd || 0) > (d.upd || 0)) return; } catch (e) { } }
  const sit = d.del ? 'Excluída' : d.status === 'concluida' ? ('Concluída por ' + (d.doneBy || '') + (d.noPrazo ? ' (no prazo)' : ' (fora do prazo)')) : d.status === 'aguardando' ? 'Entregue · aguardando aprovação' : (d.exec ? 'Em execução' : 'Aberta');
  const linha = [String(d.id), String(d.titulo || '').slice(0, 300), String(d.assoc || '').slice(0, 120), String(d.solic || '').slice(0, 120), String(d.resp || '').slice(0, 80),
    Number(d.dias) || '', d.due ? new Date(Number(d.due)) : '', sit, String(d.criadoPor || '').slice(0, 60), new Date(Number(d.upd) || Date.now()), JSON.stringify(d).slice(0, 45000)];
  if (i > 0) sh.getRange(i + 1, 1, 1, linha.length).setValues([linha]); else sh.appendRow(linha);
}

function lista_(sh) {
  const v = sh.getDataRange().getValues().slice(1);
  const limite = Date.now() - 2 * 24 * 3600 * 1000;
  return v.filter(r => r[0] && !String(r[6] || '').trim() && num_(r[7], r[2]) > limite)
    .map(r => ({ id: String(r[0]), cliente: String(r[1]), ts: num_(r[7], r[2]), resp: String(r[3] || ''), assunto: String(r[4] || ''),
      upd: num_(r[8], r[5]), fin: num_(r[10], r[9]), live: num_(r[12], r[11]), finBy: String(r[13] || '') }));
}

// reuniões excluídas nos últimos dias (para sumir também dos outros computadores)
function listaDel_(sh) {
  const v = sh.getDataRange().getValues().slice(1);
  const limite = Date.now() - 4 * 24 * 3600 * 1000;
  return v.filter(r => r[0] && String(r[6] || '').trim() && (num_(r[8], r[5]) > limite || num_(r[7], r[2]) > Date.now()))
    .map(r => ({ id: String(r[0]), cliente: String(r[1]), ts: num_(r[7], r[2]), upd: num_(r[8], r[5]) }));
}

function salvar_(sh, d) {
  if (!d || !d.id || !d.cliente || !d.ts) throw new Error('dados incompletos');
  const ids = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues().map(r => String(r[0]));
  const linha = [d.id, String(d.cliente).slice(0, 200), new Date(Number(d.ts)), String(d.resp || '').slice(0, 100),
    String(d.assunto || '').slice(0, 500), new Date(Number(d.upd) || Date.now()), d.del ? 'sim' : '',
    Number(d.ts), Number(d.upd) || Date.now(), Number(d.fin) ? new Date(Number(d.fin)) : '', Number(d.fin) || '',
    Number(d.live) ? new Date(Number(d.live)) : '', Number(d.live) || '', String(d.finBy || '').slice(0, 60)];
  const i = ids.indexOf(String(d.id));
  if (i > 0) sh.getRange(i + 1, 1, 1, linha.length).setValues([linha]);
  else sh.appendRow(linha);
}

function chat_(p) {
  if (!CHAT_WEBHOOK) throw new Error('falta colar o link do webhook do Google Chat no Apps Script (linha CHAT_WEBHOOK)');
  const texto = String(p.text || '').slice(0, 4000);
  if (!texto.trim()) throw new Error('mensagem vazia');
  const chave = String(p.ckey || '').slice(0, 200);
  const cache = CacheService.getScriptCache();
  if (chave) { // cada aviso automático sai uma vez só, mesmo com vários computadores ligados
    const ck = 'ck_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, chave));
    if (cache.get(ck)) return { enviado: false, repetido: true };
    cache.put(ck, '1', 21600);
  }
  const r = UrlFetchApp.fetch(CHAT_WEBHOOK, { method: 'post', contentType: 'application/json; charset=UTF-8', payload: JSON.stringify({ text: texto }), muteHttpExceptions: true });
  if (r.getResponseCode() >= 300) throw new Error('o Google Chat recusou (' + r.getResponseCode() + '): confira o link do webhook');
  return { enviado: true };
}

// ===== Configurações definidas pelo gestor (ex.: bloqueio de YouTube/Spotify para a equipe) =====
function cfgGet_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('cfg') || '{}'); } catch (e) { return {}; } }
function cfgSet_(d) { const c = cfgGet_(); Object.assign(c, d || {}); c.at = Date.now(); PropertiesService.getScriptProperties().setProperty('cfg', JSON.stringify(c)); return c; }

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.key !== KEY) return json_({ ok: false, err: 'chave inválida' });
  const lock = LockService.getScriptLock();
  try {
    if (p.action === 'chat') return json_({ ok: true, chat: chat_(p) });
    if (p.action === 'cfg') return json_({ ok: true, cfg: cfgGet_() });
    if (p.action === 'cfgset') return json_({ ok: true, cfg: cfgSet_(JSON.parse(p.data || '{}')) });
    lock.waitLock(15000);
    const sh = aba_();
    if (p.action === 'save') salvar_(sh, JSON.parse(p.data || '{}'));
    if (p.action === 'fin') salvarFin_(JSON.parse(p.data || '{}'));
    if (p.action === 'lemb') salvarLemb_(JSON.parse(p.data || '{}'));
    if (p.action === 'tar') salvarTar_(JSON.parse(p.data || '{}'));
    if (p.action === 'debug') return json_({ ok: true, versao: 11, linhas: sh.getLastRow(), aba: sh.getName(),
      amostra: sh.getDataRange().getValues().slice(0, 4).map(r => r.map(c => (c instanceof Date ? 'Date:' : typeof c + ':') + String(c))) });
    return json_({ ok: true, items: lista_(sh), dels: listaDel_(sh), fins: listaFin_(), lembs: listaLemb_(), tars: listaTar_(), cfg: cfgGet_(), at: Date.now() });
  } catch (err) {
    return json_({ ok: false, err: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) { }
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
