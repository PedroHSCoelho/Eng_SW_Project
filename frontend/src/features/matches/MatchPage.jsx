import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ehOrganizadorDo, useGrupo } from '../groups/GrupoContext.jsx'
import RatingsPanel from '../ratings/RatingsPanel.jsx'
import { listarJogadores } from '../players/playersApi.js'
import {
  atualizarPartida,
  buscarPartida,
  cancelarPartida,
  comecarJogo,
  definirEscalacao,
  encerrarJogo,
  encerrarPartida,
  iniciarPartida,
  lancarGol,
  lancarLance,
  removerGol,
  removerLance,
} from './matchesApi.js'
import LineupEditor from './LineupEditor.jsx'
import MatchEditForm from './MatchEditForm.jsx'
import PeladaPainel from './PeladaPainel.jsx'
import PresencaPanel from './PresencaPanel.jsx'
import SumulaAoVivo from './SumulaAoVivo.jsx'
import { NOME_DO_LANCE } from './lances.js'
import { RESULTADO, STATUS, ehPelada, formatarData, timesDaPartida } from './textos.js'

const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

// Súmula da partida. O estado é só a `partida`: cada ação na API devolve a partida inteira
// (com placar calculado no back-end) e a tela apenas troca o que tem pela resposta.
export default function MatchPage() {
  const { id } = useParams()
  const { grupo } = useGrupo()
  const ehOrganizador = ehOrganizadorDo(grupo)
  const [partida, setPartida] = useState(null)
  const [jogadores, setJogadores] = useState([])
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)
  // Ids de quem confirmou presença (vem do painel da lista): a escalação mostra esses primeiro.
  const [confirmados, setConfirmados] = useState([])

  useEffect(() => {
    let ativo = true
    setPartida(null)
    setErro('')
    buscarPartida(id)
      .then((p) => ativo && setPartida(p))
      .catch((e) => ativo && setErro(e.message))
    // A lista de jogadores só serve a quem escala; os demais só leem a partida.
    if (ehOrganizador) {
      listarJogadores({ apenasAtivos: true })
        .then((lista) => ativo && setJogadores(lista))
        .catch((e) => ativo && setErro(e.message))
    }
    return () => {
      ativo = false
    }
  }, [id, ehOrganizador])

  // Roda uma ação; se der certo troca a partida pela resposta, senão mostra a mensagem do back-end.
  async function executar(acao) {
    setErro('')
    setEnviando(true)
    try {
      setPartida(await acao())
      setConfirmandoEncerrar(false)
      setConfirmandoCancelar(false)
      return true
    } catch (e) {
      setErro(e.message)
      return false
    } finally {
      setEnviando(false)
    }
  }

  if (!partida) {
    return erro ? (
      <p role="alert" className="mx-auto max-w-5xl px-4 text-red-200">
        {erro}
      </p>
    ) : (
      <p className="text-center text-green-200">Carregando…</p>
    )
  }

  const status = STATUS[partida.status]
  const lances = partida.events ?? []
  const pelada = ehPelada(partida)
  const numeroDoJogo = (gameId) => partida.games?.find((j) => j.id === gameId)?.number

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-partida">
      <Link to="/partidas" className="text-sm underline">
        ← Partidas
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 id="titulo-partida" className="text-2xl font-bold">
          📋 Partida #{partida.id}
        </h2>
        <span className={`rounded-full px-3 py-0.5 text-sm font-medium ${status.classe}`}>{status.nome}</span>
      </div>
      <p className="text-green-200">
        {formatarData(partida.date)} · {partida.location}
        {pelada && ` · Pelada com ${partida.teamCount} times`}
      </p>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      {partida.status === 'CANCELED' && (
        <p className="mt-4 rounded-xl bg-red-100 px-4 py-3 text-red-800">
          Esta partida foi cancelada. Ela não conta no histórico, nas estatísticas nem no ranking.
        </p>
      )}

      {pelada && !['SCHEDULED', 'CANCELED'].includes(partida.status) && (
        <PeladaPainel
          partida={partida}
          ehOrganizador={ehOrganizador}
          enviando={enviando}
          aoComecar={(jogo) => executar(() => comecarJogo(partida.id, jogo))}
          aoEncerrarJogo={(gameId) => executar(() => encerrarJogo(partida.id, gameId))}
        />
      )}
      {pelada && partida.status === 'FINISHED' && (
        <p className="mt-2 text-green-200">Pelada encerrada · súmula fechada, não pode mais ser alterada</p>
      )}

      {!pelada && !['SCHEDULED', 'CANCELED'].includes(partida.status) && (
        <div className="mt-4 rounded-xl bg-green-900 p-5 text-center ring-1 ring-green-700">
          <p className="text-4xl font-bold tabular-nums" aria-label="Placar">
            Time A {partida.score.A} x {partida.score.B} Time B
          </p>
          {partida.status === 'FINISHED' && (
            <p className="mt-1 text-green-200">
              {RESULTADO[partida.result]} · súmula encerrada, não pode mais ser alterada
            </p>
          )}
        </div>
      )}

      {ehOrganizador && partida.status === 'SCHEDULED' && (
        <MatchEditForm
          // A chave faz o formulário recomeçar com os valores novos depois de salvar.
          key={`${partida.date}-${partida.location}-${partida.maxPlayers}`}
          partida={partida}
          enviando={enviando}
          aoSalvar={(dados) => executar(() => atualizarPartida(partida.id, dados))}
        />
      )}

      {/* Lista de presença: todo mundo vê e confirma o próprio nome enquanto a partida está agendada. */}
      {partida.status === 'SCHEDULED' && (
        <PresencaPanel
          partida={partida}
          ehOrganizador={ehOrganizador}
          meuJogadorId={grupo?.myPlayerId ?? null}
          jogadores={jogadores}
          aoMudar={(lista) => setConfirmados(lista.confirmed.map((l) => l.playerId))}
        />
      )}

      {ehOrganizador && partida.status === 'SCHEDULED' && (
        <LineupEditor
          jogadores={jogadores}
          times={timesDaPartida(partida)}
          confirmados={confirmados}
          escalacao={partida.players}
          enviando={enviando}
          aoSalvar={(times) => executar(() => definirEscalacao(partida.id, times))}
          aoIniciar={() => executar(() => iniciarPartida(partida.id))}
        />
      )}

      {/* Times com um box por jogador. Organizador com a partida em andamento: clica no box e lança
          gol, assistência, cartão ou defesa (súmula ao vivo). Os demais só leem. */}
      {!(ehOrganizador && partida.status === 'SCHEDULED') && (
        <SumulaAoVivo
          partida={partida}
          editavel={ehOrganizador && partida.status === 'IN_PROGRESS'}
          enviando={enviando}
          aoLancarGol={(gol) => executar(() => lancarGol(partida.id, gol))}
          aoLancarLance={(lance) => executar(() => lancarLance(partida.id, lance))}
        />
      )}

      {!['SCHEDULED', 'CANCELED'].includes(partida.status) && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Gols</h3>
          {partida.goals.length === 0 ? (
            <p className="mt-2 text-green-200">Nenhum gol lançado.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {partida.goals.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-green-900 px-4 py-2 ring-1 ring-green-700"
                >
                  <span>
                    {g.minute !== null && <span className="text-green-300">{g.minute}′ </span>}
                    <strong>{g.scorer.nickname}</strong>
                    {g.ownGoal ? ' (gol contra)' : ''}
                    {g.assist && <span className="text-green-200"> · assistência de {g.assist.nickname}</span>}
                    <span className="text-green-300">
                      {' '}
                      · ponto do Time {g.team}
                      {pelada && g.gameId && ` · jogo ${numeroDoJogo(g.gameId)}`}
                    </span>
                  </span>
                  {ehOrganizador && partida.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() => executar(() => removerGol(partida.id, g.id))}
                      className={`${botao} bg-red-200 text-red-900 hover:bg-red-100`}
                      aria-label={`Remover gol de ${g.scorer.nickname}`}
                    >
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!['SCHEDULED', 'CANCELED'].includes(partida.status) && lances.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Cartões e defesas</h3>
          <ul className="mt-2 grid gap-2">
            {lances.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-green-900 px-4 py-2 ring-1 ring-green-700"
              >
                <span>
                  {e.minute !== null && e.minute !== undefined && <span className="text-green-300">{e.minute}′ </span>}
                  {NOME_DO_LANCE[e.type]} · <strong>{e.player?.nickname}</strong>
                </span>
                {ehOrganizador && partida.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => executar(() => removerLance(partida.id, e.id))}
                    className={`${botao} bg-red-200 text-red-900 hover:bg-red-100`}
                    aria-label={`Remover ${NOME_DO_LANCE[e.type].slice(2).toLowerCase()} de ${e.player?.nickname}`}
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Depois do encerramento: destaque para todos; avaliar só para quem jogou, com o MEU jogador
          neste grupo (a API confere de novo). */}
      {partida.status === 'FINISHED' && (
        <RatingsPanel
          matchId={partida.id}
          podeAvaliar={partida.players.some((p) => p.playerId === grupo?.myPlayerId)}
        />
      )}

      {ehOrganizador && partida.status === 'IN_PROGRESS' && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {confirmandoEncerrar ? (
            <>
              <span className="text-sm text-yellow-200">
                {pelada
                  ? 'Encerrar a pelada? O jogo que está rolando é encerrado junto, e depois a súmula não muda mais.'
                  : `Encerrar com o placar ${partida.score.A} x ${partida.score.B}? Depois a súmula não muda mais.`}
              </span>
              <button
                type="button"
                disabled={enviando}
                onClick={() => executar(() => encerrarPartida(partida.id))}
                className={`${botao} bg-red-600 hover:bg-red-500`}
              >
                Confirmar encerramento
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoEncerrar(false)}
                className={`${botao} bg-green-800 hover:bg-green-700`}
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoEncerrar(true)}
              className={`${botao} bg-yellow-200 text-yellow-900 hover:bg-yellow-100`}
            >
              {pelada ? 'Encerrar a pelada' : 'Encerrar partida'}
            </button>
          )}
        </div>
      )}
      {ehOrganizador && ['SCHEDULED', 'IN_PROGRESS'].includes(partida.status) && (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-green-800 pt-4">
          {confirmandoCancelar ? (
            <>
              <span className="text-sm text-yellow-200">
                Cancelar esta partida? Ela deixa de contar no histórico e no ranking e não volta atrás.
              </span>
              <button
                type="button"
                disabled={enviando}
                onClick={() => executar(() => cancelarPartida(partida.id))}
                className={`${botao} bg-red-600 hover:bg-red-500`}
              >
                Confirmar cancelamento
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoCancelar(false)}
                className={`${botao} bg-green-800 hover:bg-green-700`}
              >
                Voltar
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmandoCancelar(true)}
              className={`${botao} bg-red-200 text-red-900 hover:bg-red-100`}
            >
              Cancelar partida
            </button>
          )}
        </div>
      )}
    </section>
  )
}
