# Supervisor Ileva

Painel de atendimento da Ileva Gestão: lê o WhatsApp Web (somente leitura) e mostra atendimentos,
reuniões, tarefas, lembretes, Raio-X e alertas, também nas outras abas do navegador.
Roda como extensão própria do Chrome/Edge (Manifest V3) e, em modo legado, como script do Tampermonkey.

## Estrutura

| Arquivo / pasta | O que é |
| --- | --- |
| `ileva-supervisor-core.js` | Código-fonte principal (versão do gestor). **Toda mudança começa aqui.** |
| `gerar-versao-colaborador.py` | Gera `ileva-supervisor-colaborador.user.js` (versão da equipe) a partir do core. |
| `build-extensao.py` | Gera as extensões `extensao-gestor/` e `extensao-equipe/` e os zips de instalação. |
| `extensao-base/` | Partes fixas da extensão: `prelude.js` (armazenamento e conexões), `background.js`, `flag.js`, ícones. |
| `agenda-planilha-google.gs` | Backend atual (Google Apps Script da planilha compartilhada). Será trocado pelo Supabase. |
| `COMO-*.txt` / `.png` | Guias de instalação e configuração. |

## Gerar uma nova versão

```
python gerar-versao-colaborador.py
python build-extensao.py
```

A extensão do gestor (pasta `extensao-gestor`) se atualiza sozinha em até 1 minuto.
Os zips gerados são distribuídos para a equipe (não ficam no Git).

## Segurança

- Repositório **privado**. O core contém a chave de acesso da planilha atual (`SHARED_KEY`).
- Nunca versionar senhas, a chave `service_role`/secret do Supabase nem arquivos `.env`.
