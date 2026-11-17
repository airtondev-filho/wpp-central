# Gera "ileva-supervisor-colaborador.user.js" a partir de "ileva-supervisor-core.js".
# O arquivo do administrador (core) NÃO é alterado. Rode de novo sempre que o core mudar.
import re, pathlib, sys
base = pathlib.Path(__file__).resolve().parent
src = (base / 'ileva-supervisor-core.js').read_text(encoding='utf-8')
out = src

def rep(old, new, desc):
    global out
    n = out.count(old)
    if n != 1:
        sys.exit(f'ERRO: trecho "{desc}" encontrado {n}x (esperado 1). O core mudou; ajuste o gerador.')
    out = out.replace(old, new)

def drop_line(substr, desc):
    global out
    lines = out.split('\n')
    hits = [i for i, l in enumerate(lines) if substr in l]
    if len(hits) != 1:
        sys.exit(f'ERRO: linha "{desc}" encontrada {len(hits)}x (esperado 1).')
    del lines[hits[0]]
    out = '\n'.join(lines)

# 1) Cabeçalho próprio (nome diferente, para não conflitar com a versão do administrador)
m = re.search(r'\(function \(\) \{', out)
header = """// ==UserScript==
// @name         Ileva - Alertas de Atendimento (Equipe)
// @namespace    https://ileva.com.br/supervisor-equipe
// @version      2.0.0
// @description  Versão para colaboradores: mostra só os atendimentos em aberto / aguardando resposta, com o menu de prazo. Sem configurações, sem revisão de tom, sem base, sem relatórios. SOMENTE LEITURA.
// @match        *://*/*
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @run-at       document-idle
// ==/UserScript==
/* Gerado automaticamente a partir do ileva-supervisor-core.js. Não edite este arquivo à mão. */
"""
out = header + out[m.start():]

rep("const VERSION = '1.5.0';", "const VERSION = '1.5.0-equipe';", 'versão')
# 2) Configuração fixa: o colaborador não altera nada; notificação ligada, ronda automática desligada
rep("let cfg = Object.assign({}, DEFAULT_CFG, lsGet(LS_CFG, {}));",
    "let cfg = Object.assign({}, DEFAULT_CFG, { notify: true, autoRound: false });", 'cfg')
# 3) Sem leitura automática das 08:15 (não abre grupos sozinho na máquina do colaborador)
rep("function morningDue() {", "function morningDue() { return false;", 'morningDue')
# 4) Cabeçalho do painel: tira relatório, exportação p/ Claude e configurações
drop_line("title: 'Copiar relatório completo'", 'botão relatório')
drop_line("title: 'Copiar dados para análise do Claude'", 'botão Claude')
drop_line("title: 'Configurações'", 'botão configurações')
drop_line("title: 'Frases de encerramento aprendidas'", 'menu base de encerramento (só gestor)')
drop_line("title: 'Bloquear YouTube e Spotify para a equipe'", 'botão bloqueio (só gestor)')
rep("h('b', {}, '🛡️ Supervisor Ileva')", "h('b', {}, '🛡️ Alertas Ileva')", 'título')
# 5) Só a aba Atendimentos e os 3 contadores de prazo
rep("""      chip('purple', st.promises.length + st.waiting.length, 'retorno/aguard.', 'atend', 'retorno'),
      chip('blue', st.tone.length, 'tom equipe', 'tom', null, false));""",
    """      chip('purple', st.promises.length + st.waiting.length, 'retorno/aguard.', 'atend', 'retorno'));""", 'chips')
rep("""      tab('atend', 'Atendimentos', pendCount, st.reds.length > 0),
      tab('rx', '🩻 Raio-X', null),
      tab('manha', '🌅 Início', st.morningInfo ? st.morning.length : null, st.morning.length > 0),
      tab('tom', 'Tom', st.tone.length, st.editable.length > 0),
      tab('tar', 'Tarefas', tarAll().filter(tarOpen).length || null, tarAll().some(x => tarOpen(x) && tarState(x) === 'late')),
      tab('lemb', '🔔 Lembretes', lembDue().length || null, lembDue().length > 0),
      tab('reun', '📅 Reuniões', meets.filter(m => !m.done && !m.del && m.ts + MEET_AFTER >= Date.now() && isoDay(new Date(m.ts)) === isoDay(new Date())).length || null, activeMeets(Date.now()).length > 0),
      ...(CHAT_ON ? [tab('chat', '💬 Equipe', null)] : []),
      tab('base', '📚 Base', null),
      tab('resumo', 'Resumo', null));""",
    """      tab('atend', 'Atendimentos', pendCount, st.reds.length > 0),
      tab('rx', '🩻 Raio-X', null),
      tab('tar', 'Tarefas', tarAll().filter(tarOpen).length || null, tarAll().some(x => tarOpen(x) && tarState(x) === 'late')),
      tab('lemb', '🔔 Lembretes', lembDue().length || null, lembDue().length > 0),
      tab('reun', '📅 Reuniões', meets.filter(m => !m.done && !m.del && m.ts + MEET_AFTER >= Date.now() && isoDay(new Date(m.ts)) === isoDay(new Date())).length || null, activeMeets(Date.now()).length > 0),
      ...(CHAT_ON ? [tab('chat', '💬 Equipe', null)] : []));""", 'abas')
rep("const content = ui.tab === 'tom' ? renderTom(st) : ui.tab === 'resumo' ? renderResumo(st) : ui.tab === 'manha' ? renderManha(st) : ui.tab === 'base' ? renderBase(st) : ui.tab === 'reun' ? renderMeet() : ui.tab === 'lemb' ? renderLemb() : ui.tab === 'tar' ? renderTar() : ui.tab === 'encerr' ? renderCloseKb() : ui.tab === 'chat' && CHAT_ON ? renderChat() : ui.tab === 'rx' ? renderRx(st) : renderAtend(st);",
    "const content = ui.tab === 'reun' ? renderMeet() : ui.tab === 'lemb' ? renderLemb() : ui.tab === 'tar' ? renderTar() : ui.tab === 'chat' && CHAT_ON ? renderChat() : ui.tab === 'rx' ? renderRx(st) : renderAtend(st);", 'conteúdo')
rep("const saveUi = () => lsSet(LS_UI, ui);", "const saveUi = () => lsSet(LS_UI, ui);\n  if (!['reun', 'rx', 'lemb', 'tar', 'chat'].includes(ui.tab)) ui.tab = 'atend'; if (ui.filter && !['red', 'prazo', 'retorno'].includes(ui.filter)) ui.filter = null;", 'aba fixa')
rep("function setTab(t, filter) { ui.tab = t;", "function setTab(t, filter) { t = ['reun', 'rx', 'lemb', 'tar', 'chat'].includes(t) ? t : 'atend'; ui.tab = t;", 'setTab')
# 6) Botão flutuante: sem selos de tom/início
drop_line("st.editable.length ? h('span', { class: 'b' }", 'selo tom')
drop_line("st.morning.length ? h('span', { class: 'b', title: 'Pendências da leitura", 'selo início')
rep("""      h('span', { class: 'b' }, `${st.open.length} em aberto`),""",
    """      h('span', { class: 'b' }, `${st.open.length} em aberto`));""", 'fim do fab')
# 7) Cartão: só o alerta (sem resposta sugerida / base). Mantém "Abrir conversa" e "Finalizar".
rep("    const { s, sims } = bestSuggestion(g, mode);\n    let color, pill", "    let color, pill", 'sugestão')
rep("""      h('details', { open: !isCorp() && mode === 'open' && g.level !== 'green' },
        h('summary', {}, mode === 'promise' ? 'Ver mensagem de retorno sugerida' : 'Ver resposta sugerida'),
        h('pre', {}, s.text),
        imgsBlock(s.imgs, true),
        (!s.kb || s.note) ? h('div', { class: 'warn' }, '⚠️ ' + (s.note || 'Confirme com o setor responsável.')) : null,
        s.src ? h('div', { class: 'src' }, 'Base: ' + s.src) : null),
      simBlock(g, sims),
""", "", 'bloco sugestão')
drop_line("h('button', { class: 'btn pri', onclick: e => copy(s.text, e.currentTarget) }, '📋 Copiar resposta'),", 'copiar resposta')
# 8) Pede permissão de notificação do Windows na primeira vez que abrir o painel
rep("function setOpen(v) { ui.open = !!v;",
    "function setOpen(v) { if (v && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { } } ui.open = !!v;", 'notificação')
rep("console.log('[Supervisor Ileva] ativo — somente leitura. v' + VERSION);",
    "console.log('[Alertas Ileva - Equipe] ativo — somente leitura. v' + VERSION);", 'log')

dest = base / 'ileva-supervisor-colaborador.user.js'
dest.write_text(out, encoding='utf-8')
print('OK ->', dest.name, len(out.splitlines()), 'linhas')
