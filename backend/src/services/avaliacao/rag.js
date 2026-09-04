// Ponto de integração com o RAG próprio. Ajuste o formato da requisição/resposta
// conforme o contrato real do seu RAG antes de ativar AVALIACAO_PROVIDER=rag.
const RAG_API_URL = process.env.RAG_API_URL
const RAG_API_KEY = process.env.RAG_API_KEY

export async function gerarAvaliacao(treinamento, transcricao) {
  if (!RAG_API_URL) throw new Error('RAG_API_URL não configurada')

  const resp = await fetch(RAG_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(RAG_API_KEY && { Authorization: `Bearer ${RAG_API_KEY}` }),
    },
    body: JSON.stringify({
      treinamento: { nome: treinamento.nome, conteudo: treinamento.conteudo, descricao: treinamento.descricao },
      transcricao,
    }),
  })

  if (!resp.ok) throw new Error(`RAG respondeu ${resp.status}: ${await resp.text()}`)

  const { avaliacao } = await resp.json()
  return avaliacao
}
