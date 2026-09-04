import { gerarAvaliacao as gerarAvaliacaoClaude } from './claude.js'
import { gerarAvaliacao as gerarAvaliacaoRag } from './rag.js'

// Troca de provedor via AVALIACAO_PROVIDER=claude|rag — a rota de treinamentos
// não precisa saber qual dos dois está por trás.
const PROVIDER = process.env.AVALIACAO_PROVIDER || 'claude'

export function gerarAvaliacao(treinamento, transcricao) {
  if (PROVIDER === 'rag') return gerarAvaliacaoRag(treinamento, transcricao)
  return gerarAvaliacaoClaude(treinamento, transcricao)
}
