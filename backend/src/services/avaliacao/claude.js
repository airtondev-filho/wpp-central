import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM = `Você avalia reuniões de treinamento de uma empresa a partir da transcrição do Google Meet.
Responda em português, em Markdown, com estas seções:
## Resumo
## Pontos abordados
## Pontos fortes
## Pontos de melhoria
## Nota geral (0 a 10) e justificativa
Seja objetivo e baseie-se apenas no que está na transcrição.`

// Gera uma avaliação em texto (Markdown) da reunião a partir da transcrição, chamando o Claude diretamente.
export async function gerarAvaliacao(treinamento, transcricao) {
  const contexto = [
    `Treinamento: ${treinamento.nome}`,
    treinamento.conteudo && `Conteúdo planejado: ${treinamento.conteudo}`,
    treinamento.descricao && `Descrição: ${treinamento.descricao}`,
  ].filter(Boolean).join('\n')

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: `${contexto}\n\nTranscrição da reunião:\n${transcricao}`,
    }],
  })

  return response.content.find(b => b.type === 'text')?.text || ''
}
