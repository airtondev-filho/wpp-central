const API_BASE = 'https://api.clickup.com/api/v2'
const API_TOKEN = process.env.CLICKUP_API_TOKEN
const LIST_ID = process.env.CLICKUP_LIST_ID

// Status da lista "ILEVA SISTEMA" no ClickUp — ajustar se o LIST_ID mudar para uma lista com outros status
const STATUS_MAP = {
  ABERTA: 'solicitações sup',
  EM_ANDAMENTO: 'em execução',
  CONCLUIDA: 'em produção',
}

const PRIORIDADE_MAP = {
  URGENTE: 1,
  ALTA: 2,
  NORMAL: 3,
  BAIXA: 4,
}

async function chamarClickup(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: API_TOKEN, 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) throw new Error(`ClickUp API ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

function toTaskBody(requisicao) {
  return {
    name: requisicao.nome,
    description: requisicao.descricao || '',
    priority: PRIORIDADE_MAP[requisicao.prioridade] ?? null,
    due_date: requisicao.prazo ? new Date(requisicao.prazo).getTime() : null,
    status: STATUS_MAP[requisicao.status],
  }
}

// Cria a task no ClickUp e retorna o id, ou null se a integração não estiver configurada.
export async function criarTaskClickup(requisicao) {
  if (!API_TOKEN || !LIST_ID) return null
  const task = await chamarClickup(`/list/${LIST_ID}/task`, {
    method: 'POST',
    body: JSON.stringify(toTaskBody(requisicao)),
  })
  return task.id
}

export async function atualizarTaskClickup(requisicao) {
  if (!API_TOKEN || !requisicao.clickupTaskId) return
  await chamarClickup(`/task/${requisicao.clickupTaskId}`, {
    method: 'PUT',
    body: JSON.stringify(toTaskBody(requisicao)),
  })
}

export async function excluirTaskClickup(requisicao) {
  if (!API_TOKEN || !requisicao.clickupTaskId) return
  try {
    await chamarClickup(`/task/${requisicao.clickupTaskId}`, { method: 'DELETE' })
  } catch (err) {
    if (!String(err.message).startsWith('ClickUp API 404')) throw err
  }
}
