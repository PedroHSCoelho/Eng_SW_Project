import { useEffect, useRef, useState } from 'react'
import Icone from '../../../ui/Icones.jsx'
import { numerosDosJogadores } from '../domain/lances.js'
import { jogoAberto } from '../domain/pelada.js'
import { ehPelada, nomeDoTime, timesDaPartida } from '../domain/textos.js'
import Avatar from '../../../ui/Avatar.jsx'

// Súmula ao vivo: um "box" por jogador escalado, separado por time, com o que ele já fez na
// partida. Com `editavel` (organizador, partida em andamento), clicar no box abre o drill-down
// para lançar gol, assistência, cartão ou defesa difícil sem preencher formulário.
// As regras de verdade (mesmo time, expulso, súmula aberta) são do back-end, que responde 422.
// Na pelada, só os jogadores dos dois times do jogo que está rolando ficam clicáveis
// (e esses dois times aparecem primeiro); os outros times estão esperando.
// `erro`: a mensagem do back-end da última ação. Com o painel do jogador aberto, ela aparece
// DENTRO do painel (antes ficava na página, escondida atrás do modal).
export default function SumulaAoVivo({ partida, editavel = false, enviando = false, erro = '', aoLancarGol, aoLancarLance }) {
  const [aberto, setAberto] = useState(null) // playerId do box aberto
  const numeros = numerosDosJogadores(partida)
  // Quem saiu numa substituição (benched) fica fora dos boxes do time até voltar.
  const doTime = (time) => partida.players.filter((p) => p.team === time && !p.benched)
  const escalado = partida.players.find((p) => p.playerId === aberto)
  const pelada = ehPelada(partida)
  const jogo = pelada ? jogoAberto(partida) : null
  const emCampo = (time) => !pelada || (jogo && (jogo.homeTeam === time || jogo.awayTeam === time))
  const times = timesDaPartida(partida)
  const ordem = pelada && jogo ? [jogo.homeTeam, jogo.awayTeam, ...times.filter((t) => !emCampo(t))] : times

  return (
    <div className="mt-4">
      {editavel && (!pelada || jogo) && (
        <p className="mb-2 text-sm text-texto-suave">Toque no jogador para lançar gol, assistência, cartão ou defesa.</p>
      )}
      {editavel && pelada && !jogo && (
        <p className="mb-2 text-sm text-texto-suave">Comece um jogo para lançar gols e lances.</p>
      )}
      <div className={`grid gap-3 sm:grid-cols-2 ${times.length > 2 ? 'xl:grid-cols-3' : ''}`}>
        {ordem.map((time) => (
          <div
            key={time}
            className={`rounded-xl bg-green-900 p-4 ring-1 ${pelada && jogo && emCampo(time) ? 'ring-gramado' : 'ring-green-700'}`}
          >
            <h3 className="font-semibold">
              {nomeDoTime(partida, time)}
              {pelada && jogo && (
                <span className="ml-2 text-xs font-normal text-texto-suave">{emCampo(time) ? 'em campo' : 'esperando'}</span>
              )}
            </h3>
            {doTime(time).length === 0 ? (
              <p className="text-sm text-green-200">Ninguém escalado.</p>
            ) : (
              <ul className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
                {doTime(time).map((p) => (
                  <li key={p.playerId}>
                    <BoxDoJogador
                      escalado={p}
                      numeros={numeros[p.playerId]}
                      editavel={editavel && emCampo(time)}
                      aoAbrir={() => setAberto(p.playerId)}
                    />
                  </li>
                ))}
              </ul>
            )}
            {partida.players.some((p) => p.team === time && p.benched) && (
              <p className="mt-2 text-xs text-texto-suave">
                Saíram:{' '}
                {partida.players
                  .filter((p) => p.team === time && p.benched)
                  .map((p) => p.player?.nickname)
                  .join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>

      {editavel && escalado && (
        <DrillDown
          escalado={escalado}
          nomeDoTimeDele={nomeDoTime(partida, escalado.team)}
          numeros={numeros[escalado.playerId]}
          colegas={doTime(escalado.team).filter((p) => p.playerId !== escalado.playerId)}
          enviando={enviando}
          erro={erro}
          aoFechar={() => setAberto(null)}
          aoLancarGol={aoLancarGol}
          aoLancarLance={aoLancarLance}
        />
      )}
    </div>
  )
}

const ehGoleiro = (escalado) => escalado.player?.position === 'GOALKEEPER'

// Minuto opcional: vazio vale; senão, inteiro de 0 a 120 (o mesmo limite do back-end).
export function erroNoMinuto(minuto) {
  if (minuto === '') return ''
  const n = Number(minuto)
  return Number.isInteger(n) && n >= 0 && n <= 120 ? '' : 'O minuto vai de 0 a 120'
}

// Marcadores do box: só aparece o que o jogador já fez (box limpo para quem não fez nada).
function Numeros({ numeros }) {
  const itens = [
    numeros.gols > 0 && { chave: 'gols', texto: `⚽ ${numeros.gols}`, nome: `${numeros.gols} gol(s)` },
    numeros.assistencias > 0 && { chave: 'ast', texto: `🅰️ ${numeros.assistencias}`, nome: `${numeros.assistencias} assistência(s)` },
    numeros.defesas > 0 && { chave: 'def', texto: `🧤 ${numeros.defesas}`, nome: `${numeros.defesas} defesa(s) difícil(eis)` },
    numeros.contra > 0 && { chave: 'contra', texto: `GC ${numeros.contra}`, nome: `${numeros.contra} gol(s) contra` },
  ].filter(Boolean)
  return (
    <span className="mt-1 flex min-h-5 flex-wrap items-center justify-center gap-1.5 text-xs tabular-nums text-texto-suave">
      {itens.map((i) => (
        <span key={i.chave} title={i.nome}>
          <span aria-hidden="true">{i.texto}</span>
          <span className="sr-only">{i.nome}</span>
        </span>
      ))}
      {Array.from({ length: numeros.amarelos }, (_, i) => (
        <span key={`am${i}`} className="inline-block h-3.5 w-2.5 rounded-sm bg-yellow-400" title="Cartão amarelo">
          <span className="sr-only">cartão amarelo</span>
        </span>
      ))}
      {Array.from({ length: numeros.vermelhos }, (_, i) => (
        <span key={`vm${i}`} className="inline-block h-3.5 w-2.5 rounded-sm bg-red-500" title="Cartão vermelho">
          <span className="sr-only">cartão vermelho</span>
        </span>
      ))}
    </span>
  )
}

function BoxDoJogador({ escalado, numeros, editavel, aoAbrir }) {
  const conteudo = (
    <>
      {/* Foto em cima e o nome inteiro embaixo (quebra só entre palavras, nunca no meio). */}
      <span className="relative flex flex-col items-center gap-1 text-center">
        <Avatar jogador={escalado.player} tamanho="m" className="h-12 w-12 text-sm" />
        <span className="w-full font-semibold leading-tight [overflow-wrap:normal] [word-break:keep-all] text-sm">
          {escalado.player.nickname}
        </span>
        {ehGoleiro(escalado) && (
          <span className="absolute -top-1 right-0 rounded bg-superficie-2 px-1 text-[10px] font-bold text-ouro" title="Goleiro">
            GOL
          </span>
        )}
      </span>
      <Numeros numeros={numeros} />
      {numeros.expulso && <span className="text-center text-xs font-semibold text-red-300">Expulso</span>}
    </>
  )
  const classe = `flex w-full flex-col rounded-lg px-3 py-2 text-left ring-1 ${
    numeros.expulso ? 'bg-red-950/40 ring-red-800 opacity-75' : 'bg-green-950 ring-green-800'
  }`
  if (!editavel) return <div className={classe}>{conteudo}</div>
  return (
    <button
      type="button"
      onClick={aoAbrir}
      aria-label={`Lances de ${escalado.player.nickname}`}
      aria-haspopup="dialog"
      className={`${classe} min-h-16 transition-colors hover:bg-green-800 hover:ring-gramado focus-visible:outline-2 focus-visible:outline-gramado`}
    >
      {conteudo}
    </button>
  )
}

const acao =
  'flex min-h-14 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition-colors disabled:opacity-50'
const secundaria = 'rounded-lg px-3 py-1.5 text-sm text-texto-suave ring-1 ring-borda hover:text-texto disabled:opacity-50'

// Painel do jogador (bottom sheet no celular, janela no meio no computador).
// Passos: escolher o lance -> (gol) quem deu a assistência / (assistência) quem fez o gol.
function DrillDown({ escalado, nomeDoTimeDele, numeros, colegas, enviando, erro, aoFechar, aoLancarGol, aoLancarLance }) {
  const [passo, setPasso] = useState('lances') // 'lances' | 'assistDoGol' | 'autorDoGol'
  const [minuto, setMinuto] = useState('')
  // Só mostra o erro da página depois de este painel ter enviado algo (não um erro antigo).
  const [enviou, setEnviou] = useState(false)
  const [erroDoMinuto, setErroDoMinuto] = useState('')
  const primeiro = useRef(null)
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar
  const nome = escalado.player.nickname
  const goleiro = ehGoleiro(escalado)
  const comMinuto = (dados) => (minuto === '' ? dados : { ...dados, minute: Number(minuto) })

  // Foco no primeiro botão ao abrir (e ao voltar para a lista de lances); Esc fecha.
  useEffect(() => {
    if (passo === 'lances') primeiro.current?.focus()
  }, [passo])
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && fechar.current()
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  // Fecha só se o back-end aceitou; se recusou, o erro aparece aqui dentro e o painel fica aberto.
  // O minuto é conferido antes (mesma regra do back-end: inteiro de 0 a 120), sem ir à API.
  async function enviar(acaoDaApi) {
    const erroLocal = erroNoMinuto(minuto)
    setErroDoMinuto(erroLocal)
    if (erroLocal) {
      setPasso('lances')
      return
    }
    setEnviou(true)
    if (await acaoDaApi()) aoFechar()
  }
  const mensagem = erroDoMinuto || (enviou ? erro : '')
  const gol = (dados) => enviar(() => aoLancarGol(comMinuto(dados)))
  const lance = (type) => enviar(() => aoLancarLance(comMinuto({ type, playerId: escalado.playerId })))

  // Gol sem colegas no time (ou gol contra) não tem assistência: lança direto.
  function aoClicarGol() {
    if (colegas.length === 0) gol({ scorerId: escalado.playerId })
    else setPasso('assistDoGol')
  }

  const botaoGol = (
    <button ref={primeiro} type="button" disabled={enviando} onClick={aoClicarGol} className={`${acao} bg-gramado text-gramado-tinta ring-gramado`}>
      <span aria-hidden="true">⚽</span> Gol
    </button>
  )
  const botaoAssistencia = (
    <button
      type="button"
      disabled={enviando || colegas.length === 0}
      onClick={() => setPasso('autorDoGol')}
      className={`${acao} bg-superficie-2 ring-borda hover:ring-gramado`}
    >
      <span aria-hidden="true">🅰️</span> Assistência
    </button>
  )
  const botaoDefesa = (
    <button type="button" disabled={enviando} onClick={() => lance('DIFFICULT_SAVE')} className={`${acao} bg-superficie-2 ring-borda hover:ring-gramado`}>
      <Icone nome="luva" tamanho={18} /> Defesa difícil
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-drilldown"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-2xl bg-superficie p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] ring-1 ring-borda sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="titulo-drilldown" className="text-lg font-bold">
              {nome}
            </h3>
            <p className="text-sm text-texto-suave">
              {nomeDoTimeDele}
              {goleiro ? ' · goleiro' : ''}
            </p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-lg p-1.5 text-texto-suave hover:bg-superficie-2">
            <Icone nome="fechar" />
          </button>
        </div>

        {mensagem && (
          <p role="alert" className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800">
            {mensagem}
          </p>
        )}

        {numeros.expulso ? (
          <p className="mt-4 rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {nome} foi expulso e não recebe mais lances nesta partida. Para corrigir, remova o cartão na lista de lances.
          </p>
        ) : passo === 'lances' ? (
          <>
            <label className="mt-4 block text-sm text-texto-suave">
              Minuto (opcional)
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="120"
                value={minuto}
                onChange={(e) => setMinuto(e.target.value)}
                className="ml-2 w-20 rounded-lg bg-fundo px-2 py-1 text-texto ring-1 ring-borda focus:outline-none focus:ring-gramado"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {botaoGol}
              {goleiro ? botaoDefesa : botaoAssistencia}
              <button type="button" disabled={enviando} onClick={() => lance('YELLOW_CARD')} className={`${acao} bg-yellow-400 text-yellow-950 ring-yellow-300`}>
                <span className="inline-block h-4 w-3 rounded-sm bg-yellow-950/30" aria-hidden="true" /> Amarelo
              </button>
              <button type="button" disabled={enviando} onClick={() => lance('RED_CARD')} className={`${acao} bg-red-600 text-white ring-red-500`}>
                <span className="inline-block h-4 w-3 rounded-sm bg-white/40" aria-hidden="true" /> Vermelho
              </button>
            </div>
            {/* Menos comuns: gol contra e o lance "do outro papel" (o goleiro reveza na pelada). */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={enviando} onClick={() => gol({ scorerId: escalado.playerId, ownGoal: true })} className={secundaria}>
                Gol contra
              </button>
              {goleiro ? (
                <button type="button" disabled={enviando || colegas.length === 0} onClick={() => setPasso('autorDoGol')} className={secundaria}>
                  Assistência
                </button>
              ) : (
                <button type="button" disabled={enviando} onClick={() => lance('DIFFICULT_SAVE')} className={secundaria}>
                  Defesa difícil (no gol hoje)
                </button>
              )}
            </div>
          </>
        ) : (
          <EscolherColega
            titulo={passo === 'assistDoGol' ? `Gol de ${nome}. Quem deu a assistência?` : `Assistência de ${nome}. Quem fez o gol?`}
            colegas={colegas}
            enviando={enviando}
            semNinguem={passo === 'assistDoGol' ? 'Sem assistência' : null}
            aoEscolher={(colegaId) =>
              passo === 'assistDoGol'
                ? gol({ scorerId: escalado.playerId, ...(colegaId && { assistId: colegaId }) })
                : gol({ scorerId: colegaId, assistId: escalado.playerId })
            }
            aoVoltar={() => setPasso('lances')}
          />
        )}
      </div>
    </div>
  )
}

function EscolherColega({ titulo, colegas, enviando, semNinguem, aoEscolher, aoVoltar }) {
  const primeiro = useRef(null)
  useEffect(() => primeiro.current?.focus(), [])
  return (
    <div className="mt-4">
      <p className="text-sm font-medium">{titulo}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {colegas.map((c, i) => (
          <button
            key={c.playerId}
            ref={i === 0 ? primeiro : undefined}
            type="button"
            disabled={enviando}
            onClick={() => aoEscolher(c.playerId)}
            className={`${acao} bg-superficie-2 ring-borda hover:ring-gramado`}
          >
            <Avatar jogador={c.player} className="mr-1.5" />
            {c.player.nickname}
          </button>
        ))}
        {semNinguem && (
          <button type="button" disabled={enviando} onClick={() => aoEscolher(null)} className={`${acao} bg-gramado text-gramado-tinta ring-gramado`}>
            {semNinguem}
          </button>
        )}
      </div>
      <button type="button" onClick={aoVoltar} className={`${secundaria} mt-3`}>
        ← Voltar
      </button>
    </div>
  )
}
