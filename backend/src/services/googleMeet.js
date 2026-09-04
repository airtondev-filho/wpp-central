import { google } from 'googleapis'
import { getOAuthClient } from './googleCalendar.js'

const CODIGO_REGEX = /meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i

// Junta todas as páginas de uma lista paginada da API do Meet.
async function listarTudo(fn, { campo, ...params }) {
  const itens = []
  let pageToken
  do {
    const { data } = await fn({ ...params, pageToken })
    itens.push(...(data[campo] || []))
    pageToken = data.nextPageToken
  } while (pageToken)
  return itens
}

function nomeParticipante(participante) {
  return participante?.signedinUser?.displayName
    || participante?.anonymousUser?.displayName
    || participante?.phoneUser?.displayName
    || 'Desconhecido'
}

// Escolhe a sessão da sala mais próxima da data do treinamento (ou a mais recente, se a data não estiver definida).
function escolherConferencia(registros, dataTreinamento) {
  if (!registros.length) return null
  if (!dataTreinamento) return registros[registros.length - 1]

  const alvo = new Date(dataTreinamento).getTime()
  return registros.reduce((maisProximo, atual) => {
    const diffAtual = Math.abs(new Date(atual.startTime).getTime() - alvo)
    const diffAtual2 = Math.abs(new Date(maisProximo.startTime).getTime() - alvo)
    return diffAtual < diffAtual2 ? atual : maisProximo
  })
}

// Busca a transcrição de uma reunião do Meet vinculada ao treinamento.
// Retorna { texto, conferenceRecordName } ou null quando não há transcrição disponível.
export async function buscarTranscricao(treinamento) {
  if (!treinamento.googleMeetLink) return null

  const codigo = treinamento.googleMeetLink.match(CODIGO_REGEX)?.[1]
  if (!codigo) return null

  const auth = await getOAuthClient()
  if (!auth) return null

  const meet = google.meet({ version: 'v2', auth })

  const { data: space } = await meet.spaces.get({ name: `spaces/${codigo}` })

  const registros = await listarTudo(
    (params) => meet.conferenceRecords.list(params),
    { filter: `space.name = "${space.name}"`, campo: 'conferenceRecords' },
  )
  const registro = escolherConferencia(registros, treinamento.data)
  if (!registro) return null

  const transcricoes = await listarTudo(
    (params) => meet.conferenceRecords.transcripts.list(params),
    { parent: registro.name, campo: 'transcripts' },
  )
  const transcricao = transcricoes.find(t => t.state === 'ENDED') || transcricoes[0]
  if (!transcricao) return null

  const [entradas, participantes] = await Promise.all([
    listarTudo(
      (params) => meet.conferenceRecords.transcripts.entries.list(params),
      { parent: transcricao.name, campo: 'transcriptEntries' },
    ),
    listarTudo(
      (params) => meet.conferenceRecords.participants.list(params),
      { parent: registro.name, campo: 'participants' },
    ),
  ])

  const mapaParticipantes = new Map(participantes.map(p => [p.name, nomeParticipante(p)]))
  entradas.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

  const texto = entradas
    .map(e => `${mapaParticipantes.get(e.participant) || 'Desconhecido'}: ${e.text}`)
    .join('\n')

  return { texto, conferenceRecordName: registro.name }
}
