// ==UserScript==
// @name         Ileva - Supervisor de Atendimento
// @namespace    https://ileva.com.br/supervisor
// @version      3.0.0
// @description  Carrega o painel do Supervisor Ileva a partir da pasta Documentos\IlevaSupervisor. Atualizações chegam sozinhas: basta recarregar o WhatsApp (F5). Somente leitura.
// @match        *://*/*
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @run-at       document-idle
// @require      file:///C:/Users/ileva/Documents/IlevaSupervisor/ileva-supervisor-core.js
// ==/UserScript==
// Este arquivo é só o "carregador". Todo o painel fica em:
//   C:\Users\ileva\Documents\IlevaSupervisor\ileva-supervisor-core.js
// Quando o Claude atualiza esse arquivo, a nova versão entra em vigor ao recarregar o WhatsApp Web.
