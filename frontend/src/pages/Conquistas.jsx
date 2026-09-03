import React, { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faAward, faLock, faCircleCheck, faBoxOpen } from '@fortawesome/free-solid-svg-icons'
import { useAuthStore } from '../stores/index.js'
import { StatCard, Modal, Moldura, TituloBadge, BannerPreview } from '../components/ui/index.jsx'
import { iconeDe } from '../utils/gamificacaoIcons.js'
import { temaMoldura } from '../utils/molduras.js'
import imgColecionador from '../assets/baus/colecionador.png'
import imgPoliglota from '../assets/baus/poliglota.png'
import imgFocoTotal from '../assets/baus/focototal.png'
import imgAscensao from '../assets/baus/Ascensao.png'

// Arte de baú enviada pelo time — quando não houver uma pra um slug, cai no
// desenho em SVG como reserva.
const BAU_IMAGEM = {
  colecionador_badges: imgColecionador,
  multi_grupos: imgPoliglota,
  melhor_dia: imgFocoTotal,
  ascensao_1000: imgAscensao,
}

// Baú estilizado — usa a arte enviada quando existir; senão desenha em SVG
// (corpo, tampa arredondada, friso metálico e emblema central temático).
function ChestIcon({ tema, slug, size = 84 }) {
  const imagem = BAU_IMAGEM[slug]
  if (imagem) {
    return <img src={imagem} alt="" style={{ width: size, height: size }} className="flex-shrink-0 object-contain drop-shadow-lg" />
  }

  const cor = tema?.cor || '#8b8b9a'
  const id = `chest-${cor.replace('#', '')}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
      <defs>
        <linearGradient id={`${id}-corpo`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={cor} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${id}-tampa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity="1" />
          <stop offset="100%" stopColor={cor} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="88" rx="30" ry="4.5" fill="black" opacity="0.28" />
      <rect x="18" y="48" width="64" height="34" rx="8" fill={`url(#${id}-corpo)`} stroke={cor} strokeWidth="1.5" />
      <path d="M16 48 Q16 23 50 23 Q84 23 84 48 Z" fill={`url(#${id}-tampa)`} stroke={cor} strokeWidth="1.5" />
      <rect x="16" y="45" width="68" height="7" rx="2.5" fill="#e2e8f0" opacity="0.55" />
      <rect x="44" y="23" width="12" height="59" fill="#e2e8f0" opacity="0.3" />
      <circle cx="50" cy="50" r="13" fill="#0b0b10" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.92" />
      <foreignObject x="38" y="38" width="24" height="24">
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {tema?.icone && <FontAwesomeIcon icon={tema.icone} style={{ color: cor, fontSize: 13 }} />}
        </div>
      </foreignObject>
    </svg>
  )
}

// Cartão de baú — vitrine no estilo "loja de baús": cor cheia mesmo fechado,
// cadeado/aberto no canto, nome em caps e status colorido embaixo.
function BauCard({ slug, nome, aberto, onClick }) {
  const tema = temaMoldura(slug)
  const cor = tema?.cor || '#8b8b9a'
  return (
    <button onClick={onClick}
      className="relative rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:-translate-y-0.5"
      style={{
        background: `linear-gradient(160deg, ${cor}17, ${cor}05)`,
        border: `1.5px solid ${cor}55`,
        boxShadow: aberto ? `0 4px 12px rgba(0,0,0,0.22)` : `0 0 0 2px ${cor}, 0 8px 18px ${cor}25`,
      }}>
      <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ background: `${cor}25`, border: `1px solid ${cor}55` }}>
        <FontAwesomeIcon icon={aberto ? faBoxOpen : faLock} style={{ color: cor }} className="text-[10px]" />
      </div>
      {!aberto && (
        <span className="absolute top-2.5 left-2.5 w-3.5 h-3.5 rounded-full bg-accent text-black text-[9px] font-bold flex items-center justify-center">!</span>
      )}
      <ChestIcon tema={tema} slug={slug} size={76} />
      <div className="text-center leading-tight">
        <div className="text-[11px] font-black uppercase tracking-wide text-ink">{nome}</div>
        <div className="text-[10px] font-semibold mt-0.5" style={{ color: cor }}>{aberto ? 'Aberto' : 'Fechado'}</div>
      </div>
    </button>
  )
}

// Cartão de recompensa revelada dentro do baú aberto — moldura / título / banner.
function RecompensaCard({ tipo, cor, equipado, carregando, onEquipar, delay, animar, children }) {
  return (
    <div className={`rounded-2xl p-3 flex flex-col items-center gap-2 ${animar ? 'animate-card-pop' : ''}`}
      style={{
        animationDelay: delay,
        background: `linear-gradient(160deg, ${cor}17, ${cor}05)`,
        border: `1.5px solid ${cor}55`,
        boxShadow: equipado ? `0 0 0 2px ${cor}, 0 8px 16px ${cor}25` : `0 4px 10px rgba(0,0,0,0.2)`,
      }}>
      <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: cor }}>{tipo}</span>
      <div className="flex items-center justify-center h-14">{children}</div>
      <button onClick={onEquipar} disabled={carregando}
        className="w-full text-[11px] font-semibold py-1.5 rounded-lg disabled:opacity-50 transition-opacity"
        style={equipado ? { border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', background: 'transparent' } : { background: cor, color: '#000' }}>
        {equipado ? 'Remover' : 'Equipar'}
      </button>
    </div>
  )
}

export default function Conquistas() {
  const { authHeaders, user, equipar: equiparApi, abrirBau: abrirBauApi } = useAuthStore()
  const [perfil, setPerfil] = useState(null)
  const [equipando, setEquipando] = useState(null)
  const [moldurAberta, setMoldurAberta] = useState(null)
  const [bannerAberto, setBannerAberto] = useState(null)
  const [bauSelecionado, setBauSelecionado] = useState(null)
  const [fase, setFase] = useState('fechado') // fechado | abrindo | estourando | revelando
  const [toques, setToques] = useState(0)
  const META_TOQUES = 5

  const carregar = () => fetch('/api/gamificacao/me', { headers: authHeaders() }).then(r => r.json()).then(setPerfil)

  useEffect(() => { carregar() }, [])
  useEffect(() => { setFase('fechado'); setToques(0) }, [bauSelecionado])

  // Molduras de badge ficam na vitrine de Molduras; as de missão são exclusivas
  // dos Baús (não aparecem duplicadas aqui — fazem parte da surpresa do baú).
  const molduraSlugsDesbloqueados = new Set((perfil?.molduras || []).map(x => x.slug))
  const itensMolduras = (perfil?.badges || []).map(b => ({ ...b, temMoldura: molduraSlugsDesbloqueados.has(b.slug) }))

  const equipar = async (tipo, slug) => {
    const campo = { moldura: 'molduraEquipada', titulo: 'tituloEquipado', banner: 'bannerEquipado' }[tipo]
    const jaEquipado = user?.[campo] === slug
    setEquipando(`${tipo}:${slug}`)
    try { await equiparApi(tipo, jaEquipado ? null : slug) }
    catch (err) { alert(err.message) }
    finally { setEquipando(null) }
  }

  const tocarBau = (slug) => {
    if (fase !== 'fechado') return
    const proximo = toques + 1
    setToques(proximo)
    if (proximo >= META_TOQUES) abrirBau(slug)
  }

  const abrirBau = async (slug) => {
    setFase('abrindo')
    const esperaMinima = new Promise(r => setTimeout(r, 750))
    try {
      const [novoPerfil] = await Promise.all([abrirBauApi(slug), esperaMinima])
      setPerfil(novoPerfil)
      setFase('estourando')
      setTimeout(() => setFase('revelando'), 400)
    } catch (err) {
      alert(err.message)
      setFase('fechado')
    }
  }

  const bauAtual = perfil?.baus?.find(b => b.slug === bauSelecionado) || null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgb(var(--ink-rgb) / 6%)' }}>
        <h1 className="text-lg font-bold text-ink"><FontAwesomeIcon icon={faAward}/> Conquistas</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {user?.bannerEquipado && <BannerPreview slug={user.bannerEquipado} nome={perfil?.banners?.find(b => b.slug === user.bannerEquipado)?.nome} className="h-20" />}

        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Pontos" value={perfil?.pontos} color="text-accent" />
          <StatCard label="Nível" value={perfil?.nivel} color="text-amber-400"
            sub={perfil?.progresso?.proximo ? `Faltam ${perfil.progresso.faltam} pontos para ${perfil.progresso.proximo}` : 'Nível máximo'} />
        </div>

        {user?.tituloEquipado && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/40">Título atual:</span>
            <TituloBadge slug={user.tituloEquipado} />
          </div>
        )}

        {perfil?.progresso?.proximo && (
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-ink/40 mb-2">
              <span>{perfil.progresso.atual}</span>
              <span>{perfil.progresso.proximo}</span>
            </div>
            <div className="h-2 bg-ink/5 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${perfil.progresso.pct}%` }}/>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">Badges</h3>
          <p className="text-xs text-ink/40 -mt-2 mb-3">Clique numa badge desbloqueada para equipar seu banner de perfil.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(perfil?.badges || []).map(b => (
              <button key={b.slug} onClick={() => setBannerAberto(b)}
                className={`glass rounded-xl p-4 flex items-center gap-3 text-left transition-all hover:bg-ink/[0.06] cursor-pointer ${!b.desbloqueado && 'opacity-40'} ${user?.bannerEquipado === b.slug ? 'ring-1 ring-accent' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${b.desbloqueado ? 'bg-amber-400/15 text-amber-400' : 'bg-ink/5 text-ink/30'}`}>
                  <FontAwesomeIcon icon={b.desbloqueado ? iconeDe(b.icone) : faLock}/>
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{b.nome}</div>
                  <div className="text-xs text-ink/40">{b.descricao}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">Missões</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(perfil?.missoes || []).map(m => {
              const pct = Math.round((m.progresso / m.meta) * 100)
              return (
                <div key={m.slug} className={`glass rounded-xl p-4 flex flex-col gap-2 ${!m.desbloqueado && 'opacity-60'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${m.desbloqueado ? 'bg-amber-400/15 text-amber-400' : 'bg-ink/5 text-ink/30'}`}>
                      <FontAwesomeIcon icon={m.desbloqueado ? iconeDe(m.icone) : faLock}/>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate">{m.nome}</div>
                      <div className="text-xs text-ink/40">{m.descricao}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-ink/5 rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full transition-all duration-700" style={{ width: `${pct}%` }}/>
                    </div>
                    <span className="text-[10px] text-ink/30 flex-shrink-0">{m.progresso}/{m.meta}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">Baús</h3>
          <p className="text-xs text-ink/40 -mt-2 mb-3">Ganhos ao concluir missões. Abra para liberar título, banner e moldura.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {(perfil?.baus || []).map(b => (
              <BauCard key={b.slug} slug={b.slug} nome={b.nome} aberto={b.aberto} onClick={() => setBauSelecionado(b.slug)} />
            ))}
            {!perfil?.baus?.length && (
              <div className="col-span-full text-xs text-ink/30 text-center py-6">Nenhum baú ainda — conclua uma missão para ganhar o primeiro.</div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">Molduras</h3>
          <p className="text-xs text-ink/40 -mt-2 mb-3">Desbloqueadas ao completar badges. As de missão são a surpresa dos baús. Clique para ver de perto.</p>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {itensMolduras.map(m => {
              const equipada = user?.molduraEquipada === m.slug
              return (
                <button key={m.slug} onClick={() => setMoldurAberta(m)}
                  className={`glass rounded-xl p-3 flex flex-col items-center gap-2 transition-all hover:bg-ink/[0.06] cursor-pointer ${!m.temMoldura ? 'opacity-60' : ''} ${equipada ? 'ring-1 ring-accent' : ''}`}>
                  <Moldura slug={m.slug} size={48}>
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent overflow-hidden">
                        {user?.avatar
                          ? <img src={user.avatar} alt={user.nome} className="w-full h-full object-cover" />
                          : user?.nome?.charAt(0).toUpperCase()}
                      </div>
                      {!m.temMoldura && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                          <FontAwesomeIcon icon={faLock} className="text-[10px] text-ink/70"/>
                        </div>
                      )}
                      {equipada && (
                        <FontAwesomeIcon icon={faCircleCheck} className="absolute -bottom-0.5 -right-0.5 text-accent text-xs bg-[var(--surface)] rounded-full"/>
                      )}
                    </div>
                  </Moldura>
                  <span className="text-[11px] text-ink/60 text-center truncate w-full">{m.nome}</span>
                </button>
              )
            })}
          </div>
        </div>

        {moldurAberta && (
          <Modal title="Moldura" onClose={() => setMoldurAberta(null)}>
            <div className="flex flex-col items-center gap-4">
              <Moldura slug={moldurAberta.slug} size={112}>
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-accent/20 flex items-center justify-center text-3xl font-bold text-accent overflow-hidden">
                    {user?.avatar
                      ? <img src={user.avatar} alt={user.nome} className="w-full h-full object-cover" />
                      : user?.nome?.charAt(0).toUpperCase()}
                  </div>
                  {!moldurAberta.temMoldura && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                      <FontAwesomeIcon icon={faLock} className="text-lg text-ink/70"/>
                    </div>
                  )}
                </div>
              </Moldura>
              <div className="text-center">
                <div className="text-base font-bold text-ink">{moldurAberta.nome}</div>
                <div className="text-xs text-ink/40 mt-1">
                  {moldurAberta.temMoldura
                    ? `Desbloqueada ao completar a badge "${moldurAberta.nome}"`
                    : `Complete a badge "${moldurAberta.nome}" para desbloquear`}
                </div>
                <div className="text-xs text-ink/50 mt-2">{moldurAberta.descricao}</div>
              </div>
              {moldurAberta.temMoldura && (
                <button onClick={() => equipar('moldura', moldurAberta.slug)} disabled={equipando === `moldura:${moldurAberta.slug}`}
                  className={`px-6 py-2 text-sm font-semibold rounded-xl transition-opacity disabled:opacity-50 ${
                    user?.molduraEquipada === moldurAberta.slug
                      ? 'border border-red-400/30 text-red-400 hover:bg-red-400/10'
                      : 'bg-accent text-black hover:opacity-90'
                  }`}>
                  {user?.molduraEquipada === moldurAberta.slug ? 'Remover moldura' : 'Equipar moldura'}
                </button>
              )}
            </div>
          </Modal>
        )}

        {bannerAberto && (
          <Modal title="Banner" onClose={() => setBannerAberto(null)}>
            <div className="flex flex-col items-center gap-4">
              <BannerPreview slug={bannerAberto.slug} nome={bannerAberto.nome} className="h-20 w-full" />
              <div className="text-center">
                <div className="text-base font-bold text-ink">{bannerAberto.nome}</div>
                <div className="text-xs text-ink/40 mt-1">
                  {bannerAberto.desbloqueado
                    ? `Desbloqueado ao completar a badge "${bannerAberto.nome}"`
                    : `Complete a badge "${bannerAberto.nome}" para desbloquear`}
                </div>
                <div className="text-xs text-ink/50 mt-2">{bannerAberto.descricao}</div>
              </div>
              {bannerAberto.desbloqueado && (
                <button onClick={() => equipar('banner', bannerAberto.slug)} disabled={equipando === `banner:${bannerAberto.slug}`}
                  className={`px-6 py-2 text-sm font-semibold rounded-xl transition-opacity disabled:opacity-50 ${
                    user?.bannerEquipado === bannerAberto.slug
                      ? 'border border-red-400/30 text-red-400 hover:bg-red-400/10'
                      : 'bg-accent text-black hover:opacity-90'
                  }`}>
                  {user?.bannerEquipado === bannerAberto.slug ? 'Remover banner' : 'Equipar banner'}
                </button>
              )}
            </div>
          </Modal>
        )}

        {bauAtual && (() => {
          const tema = temaMoldura(bauAtual.slug)
          const revelado = bauAtual.aberto // já tinha sido aberto antes, ou acabou de ser
          const mostrarCartas = fase === 'revelando' || (revelado && fase === 'fechado')

          return (
            <Modal title={mostrarCartas ? 'Baú aberto' : 'Baú fechado'} onClose={() => setBauSelecionado(null)}>
              {/* fechado — toque repetido no baú até abrir */}
              {fase === 'fechado' && !revelado && (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-32 h-32 flex items-center justify-center cursor-pointer select-none"
                    onClick={() => tocarBau(bauAtual.slug)}>
                    <svg className="absolute inset-0" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="46" fill="none" stroke={`${tema?.cor}22`} strokeWidth="5" />
                      <circle cx="50" cy="50" r="46" fill="none" stroke={tema?.cor} strokeWidth="5" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 46}
                        strokeDashoffset={2 * Math.PI * 46 * (1 - toques / META_TOQUES)}
                        style={{ transition: 'stroke-dashoffset 0.2s ease-out' }} />
                    </svg>
                    <div key={toques} className={toques > 0 ? 'animate-chest-tap' : ''}>
                      <ChestIcon tema={tema} slug={bauAtual.slug} size={92} />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-bold text-ink">{bauAtual.nome}</div>
                    <div className="text-xs text-ink/40 mt-1">Ganho ao concluir a missão "{bauAtual.nome}"</div>
                    <div className="text-xs text-ink/50 mt-2">Contém: título, banner e moldura temáticos.</div>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: tema?.cor }}>
                    Toque no baú para abrir ({toques}/{META_TOQUES})
                  </div>
                </div>
              )}

              {/* abrindo — baú chacoalhando */}
              {fase === 'abrindo' && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="animate-chest-shake">
                    <ChestIcon tema={tema} slug={bauAtual.slug} size={92} />
                  </div>
                </div>
              )}

              {/* estourando — flash de luz */}
              {fase === 'estourando' && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-20 h-20 rounded-full animate-chest-burst" style={{ background: tema?.cor }}/>
                </div>
              )}

              {/* revelando / já aberto — as 3 cartas de recompensa */}
              {mostrarCartas && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Moldura slug={bauAtual.slug} size={56}>
                      <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent overflow-hidden">
                        {user?.avatar
                          ? <img src={user.avatar} alt={user.nome} className="w-full h-full object-cover" />
                          : user?.nome?.charAt(0).toUpperCase()}
                      </div>
                    </Moldura>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink">{bauAtual.nome}</div>
                      <div className="text-xs text-ink/40">Moldura, título e banner liberados</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <RecompensaCard tipo="Moldura" cor={tema?.cor} delay="0ms" animar={fase === 'revelando'}
                      equipado={user?.molduraEquipada === bauAtual.slug} carregando={equipando === `moldura:${bauAtual.slug}`}
                      onEquipar={() => equipar('moldura', bauAtual.slug)}>
                      <Moldura slug={bauAtual.slug} size={52}>
                        <div className="w-[52px] h-[52px] rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent overflow-hidden">
                          {user?.avatar
                            ? <img src={user.avatar} alt={user.nome} className="w-full h-full object-cover" />
                            : user?.nome?.charAt(0).toUpperCase()}
                        </div>
                      </Moldura>
                    </RecompensaCard>

                    <RecompensaCard tipo="Título" cor={tema?.cor} delay="150ms" animar={fase === 'revelando'}
                      equipado={user?.tituloEquipado === bauAtual.slug} carregando={equipando === `titulo:${bauAtual.slug}`}
                      onEquipar={() => equipar('titulo', bauAtual.slug)}>
                      <TituloBadge slug={bauAtual.slug} />
                    </RecompensaCard>

                    <RecompensaCard tipo="Banner" cor={tema?.cor} delay="300ms" animar={fase === 'revelando'}
                      equipado={user?.bannerEquipado === bauAtual.slug} carregando={equipando === `banner:${bauAtual.slug}`}
                      onEquipar={() => equipar('banner', bauAtual.slug)}>
                      <div className="w-14 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: `linear-gradient(120deg, ${tema?.cor}55, ${tema?.cor}15)` }}>
                        {tema?.icone && <FontAwesomeIcon icon={tema.icone} style={{ color: tema.cor }} className="text-sm" />}
                      </div>
                    </RecompensaCard>
                  </div>
                </div>
              )}
            </Modal>
          )
        })()}

        <div>
          <h3 className="text-sm font-semibold text-ink mb-3">Histórico recente</h3>
          <div className="flex flex-col gap-2">
            {(perfil?.historico || []).map(h => (
              <div key={h.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-ink/50">Atendimento finalizado</span>
                <span className="text-accent font-semibold">+{h.pontos}</span>
              </div>
            ))}
            {!perfil?.historico?.length && (
              <div className="text-center py-10 text-ink/20 text-sm">Sem histórico ainda</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
