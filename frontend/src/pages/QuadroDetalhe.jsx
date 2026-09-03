import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faPlus } from '@fortawesome/free-solid-svg-icons'
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useAuthStore } from '../stores/index.js'
import ListaColuna from '../components/tarefas/ListaColuna.jsx'
import MembrosPopover from '../components/tarefas/MembrosPopover.jsx'
import FiltrosBar from '../components/tarefas/FiltrosBar.jsx'
import TarefaModal from '../components/tarefas/TarefaModal.jsx'
import TarefaDrawer from '../components/tarefas/TarefaDrawer.jsx'

const FILTROS_INICIAIS = { busca: '', responsavelId: '', prioridade: '', minhas: false, atrasadas: false, semResponsavel: false }

function tarefaVisivel(t, filtros, userId) {
  if (filtros.busca) {
    const q = filtros.busca.toLowerCase()
    const tags = (t.tags || []).map(tag => tag.nome).join(' ')
    const alvo = `${t.titulo} ${t.responsavel?.nome || ''} ${tags}`.toLowerCase()
    if (!alvo.includes(q)) return false
  }
  if (filtros.responsavelId && String(t.responsavel?.id) !== String(filtros.responsavelId)) return false
  if (filtros.prioridade && t.prioridade !== filtros.prioridade) return false
  if (filtros.minhas && t.responsavel?.id !== userId) return false
  if (filtros.atrasadas && !(t.prazo && !t.concluidoEm && new Date(t.prazo) < new Date())) return false
  if (filtros.semResponsavel && t.responsavel) return false
  return true
}

export default function QuadroDetalhe() {
  const { id } = useParams()
  const { authHeaders, user } = useAuthStore()
  const { refreshKey } = useOutletContext()
  const navigate = useNavigate()

  const [quadro, setQuadro] = useState(null)
  const [novaListaNome, setNovaListaNome] = useState('')
  const [addListaAberto, setAddListaAberto] = useState(false)
  const [novaTarefaListaId, setNovaTarefaListaId] = useState(null)
  const [drawerTarefaId, setDrawerTarefaId] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [activeTarefa, setActiveTarefa] = useState(null)
  const [activeLista, setActiveLista] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const load = useCallback(async () => {
    const r = await fetch(`/api/quadros/${id}`, { headers: authHeaders() })
    if (r.ok) setQuadro(await r.json())
  }, [id])

  useEffect(() => { load() }, [load, refreshKey])
  useEffect(() => { setFiltros(FILTROS_INICIAIS) }, [id])

  const criarLista = async () => {
    if (!novaListaNome.trim()) return
    await fetch(`/api/quadros/${id}/listas`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ nome: novaListaNome }) })
    setNovaListaNome('')
    setAddListaAberto(false)
    load()
  }

  const concluirTarefa = async (tarefaId) => {
    await fetch(`/api/tarefas/${tarefaId}/concluir`, { method: 'PATCH', headers: authHeaders() })
    load()
  }

  const excluirTarefa = async (tarefaId) => {
    if (!confirm('Excluir esta tarefa?')) return
    await fetch(`/api/tarefas/${tarefaId}`, { method: 'DELETE', headers: authHeaders() })
    load()
  }

  const findLista = (tarefaId) => quadro?.listas.find(l => l.tarefas.some(t => t.id === tarefaId))

  // resolve a que lista pertence o alvo do "over", venha ele do cabeçalho da lista,
  // da área vazia da coluna ou de um card — evita depender de acertar exatamente o cabeçalho
  const resolveListaIdFromOver = (over) => {
    const d = over?.data.current
    if (!d) return null
    if (d.type === 'lista' || d.type === 'lista-body' || d.type === 'tarefa') return d.listaId
    return null
  }

  const handleDragStart = (event) => {
    const { active } = event
    if (active.data.current?.type === 'tarefa') {
      const lista = findLista(active.data.current.tarefaId)
      setActiveTarefa(lista?.tarefas.find(t => t.id === active.data.current.tarefaId) || null)
    } else if (active.data.current?.type === 'lista') {
      setActiveLista(quadro.listas.find(l => l.id === active.data.current.listaId) || null)
    }
  }

  // durante o arraste: quando a tarefa cruza para outra coluna, move-a otimisticamente
  // (reordenar dentro da MESMA coluna fica visualmente a cargo do SortableContext e é
  // persistido só no drop, em handleDragEnd)
  const handleDragOver = (event) => {
    const { active, over } = event
    if (!over || active.data.current?.type !== 'tarefa') return

    const activeTarefaId = active.data.current.tarefaId
    const overData = over.data.current
    const origemLista = findLista(activeTarefaId)
    if (!origemLista) return

    const destinoListaId = resolveListaIdFromOver(over)
    if (destinoListaId == null || origemLista.id === destinoListaId) return

    setQuadro(prev => {
      const listas = prev.listas.map(l => ({ ...l, tarefas: [...l.tarefas] }))
      const origem = listas.find(l => l.id === origemLista.id)
      const destino = listas.find(l => l.id === destinoListaId)
      const idx = origem.tarefas.findIndex(t => t.id === activeTarefaId)
      if (idx === -1) return prev
      const [tarefa] = origem.tarefas.splice(idx, 1)
      const overIdx = overData.type === 'tarefa' ? destino.tarefas.findIndex(t => t.id === overData.tarefaId) : -1
      destino.tarefas.splice(overIdx === -1 ? destino.tarefas.length : overIdx, 0, tarefa)
      return { ...prev, listas }
    })
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event
    const activeType = active.data.current?.type
    setActiveTarefa(null)
    setActiveLista(null)
    if (!over) return

    if (activeType === 'lista') {
      const oldIndex = quadro.listas.findIndex(l => l.id === active.data.current.listaId)
      const overListaId = resolveListaIdFromOver(over)
      const newIndex = overListaId == null ? -1 : quadro.listas.findIndex(l => l.id === overListaId)
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

      const novaOrdem = arrayMove(quadro.listas, oldIndex, newIndex)
      setQuadro(prev => ({ ...prev, listas: novaOrdem }))
      await fetch(`/api/quadros/${id}/listas/reordenar`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ ids: novaOrdem.map(l => l.id) }),
      })
      return
    }

    if (activeType === 'tarefa') {
      const tarefaId = active.data.current.tarefaId
      const listas = quadro.listas.map(l => ({ ...l, tarefas: [...l.tarefas] }))
      const listaAtual = listas.find(l => l.tarefas.some(t => t.id === tarefaId))
      if (!listaAtual) return

      const overData = over.data.current
      if (overData?.type === 'tarefa' && overData.listaId === listaAtual.id) {
        const oldIndex = listaAtual.tarefas.findIndex(t => t.id === tarefaId)
        const newIndex = listaAtual.tarefas.findIndex(t => t.id === overData.tarefaId)
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          listaAtual.tarefas = arrayMove(listaAtual.tarefas, oldIndex, newIndex)
        }
      }

      setQuadro(prev => ({ ...prev, listas }))
      const indiceFinal = listaAtual.tarefas.findIndex(t => t.id === tarefaId)
      await fetch(`/api/tarefas/${tarefaId}/mover`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ listaId: listaAtual.id, posicao: indiceFinal }),
      })
    }
  }

  if (!quadro) return <div className="flex-1 flex items-center justify-center text-ink/30 text-sm">Carregando…</div>

  const membros = quadro.membros.map(m => m.user)
  const filtrosAtivos = Boolean(
    filtros.busca || filtros.responsavelId || filtros.prioridade || filtros.minhas || filtros.atrasadas || filtros.semResponsavel
  )
  const listaIds = quadro.listas.map(l => `lista-${l.id}`)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex items-center gap-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <button onClick={() => navigate('/tarefas')} className="text-ink/40 hover:text-ink transition-colors">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: quadro.cor }} />
        <h1 className="text-lg font-bold text-ink truncate">{quadro.nome}</h1>
        <div className="ml-auto">
          <MembrosPopover quadroId={id} membros={membros} criadorId={quadro.criadorId} authHeaders={authHeaders} onChange={load} />
        </div>
      </div>

      <FiltrosBar membros={membros} filtros={filtros} onChange={patch => setFiltros(f => ({ ...f, ...patch }))} />

      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 p-6 h-full min-w-max">
            <SortableContext items={listaIds} strategy={horizontalListSortingStrategy}>
              {quadro.listas.map(lista => (
                <ListaColuna key={lista.id} lista={lista}
                  tarefas={lista.tarefas.filter(t => tarefaVisivel(t, filtros, user?.id))}
                  arrastavel={!filtrosAtivos}
                  onAdicionarTarefa={setNovaTarefaListaId}
                  onEditarTarefa={tarefa => setDrawerTarefaId(tarefa.id)}
                  onConcluirTarefa={concluirTarefa}
                  onExcluirTarefa={excluirTarefa} />
              ))}
            </SortableContext>

            {/* Nova lista */}
            <div className="w-72 flex-shrink-0">
              {addListaAberto ? (
                <div className="glass rounded-xl p-3 flex flex-col gap-2">
                  <input value={novaListaNome} onChange={e => setNovaListaNome(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && criarLista()}
                    placeholder="Nome da lista" autoFocus
                    className="input-glass px-3 py-2 text-sm w-full rounded-lg" />
                  <div className="flex gap-2">
                    <button onClick={criarLista} className="px-3 py-1.5 text-xs bg-accent text-black font-semibold rounded-lg hover:opacity-90">Adicionar</button>
                    <button onClick={() => { setAddListaAberto(false); setNovaListaNome('') }} className="px-3 py-1.5 text-xs text-ink/40 hover:text-ink/70">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddListaAberto(true)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-ink/30 hover:text-ink/60 hover:bg-ink/5 transition-colors text-left">
                  <FontAwesomeIcon icon={faPlus} className="mr-1.5" /> Adicionar lista
                </button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeTarefa && (
            <div className="glass-strong rounded-xl p-3.5 w-72 text-sm font-medium text-ink/90 shadow-glass rotate-2">
              {activeTarefa.titulo}
            </div>
          )}
          {activeLista && (
            <div className="glass-strong rounded-xl px-4 py-2.5 w-80 text-sm font-semibold text-ink/80 shadow-glass rotate-1">
              {activeLista.nome}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {novaTarefaListaId && (
        <TarefaModal listaId={novaTarefaListaId} membros={membros}
          onClose={() => setNovaTarefaListaId(null)} onSaved={load} />
      )}

      {drawerTarefaId && (
        <TarefaDrawer tarefaId={drawerTarefaId} membros={membros}
          onClose={() => setDrawerTarefaId(null)} onChanged={load} />
      )}
    </div>
  )
}
