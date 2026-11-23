import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import RatingsPanel from '../ratings/RatingsPanel.jsx'
import { listarJogadores } from '../players/playersApi.js'
import {
  buscarPartida,
  definirEscalacao,
  encerrarPartida,
  iniciarPartida,
  lancarGol,
  removerGol,
} from './matchesApi.js'
import GoalForm from './GoalForm.jsx'
import LineupEditor from './LineupEditor.jsx'
import { RESULTADO, STATUS, formatarData } from './textos.js'

const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

// Súmula da partida. O estado é só a `partida`: cada ação na API devolve a partida inteira
// (com placar calculado no back-end) e a tela apenas troca o que tem pela resposta.
export default function MatchPage() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const ehOrganizador = usuario?.role === 'ORGANIZER'
  const [partida, setPartida] = useState(null)
  const [jogadores, setJogadores] = useState([])
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmandoEncerrar, setConfirmandoEncerrar] = useState(false)

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
  const doTime = (time) => partida.players.filter((p) => p.team === time)

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
      </p>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      {partida.status !== 'SCHEDULED' && (
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
        <LineupEditor
          jogadores={jogadores}
          escalacao={partida.players}
          enviando={enviando}
          aoSalvar={(times) => executar(() => definirEscalacao(partida.id, times))}
          aoIniciar={() => executar(() => iniciarPartida(partida.id))}
        />
      )}

      {/* Quem não organiza (ou já passou da fase de escalar) vê os times só para leitura. */}
      {!(ehOrganizador && partida.status === 'SCHEDULED') && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {['A', 'B'].map((time) => (
            <div key={time} className="rounded-xl bg-green-900 p-4 ring-1 ring-green-700">
              <h3 className="font-semibold">Time {time}</h3>
              {doTime(time).length === 0 ? (
                <p className="text-sm text-green-200">Ninguém escalado.</p>
              ) : (
                <ul className="mt-1 text-sm">
                  {doTime(time).map((p) => (
                    <li key={p.playerId}>{p.player.nickname}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {ehOrganizador && partida.status === 'IN_PROGRESS' && (
        <GoalForm
          escalacao={partida.players}
          enviando={enviando}
          aoLancar={(gol) => executar(() => lancarGol(partida.id, gol))}
        />
      )}

      {partida.status !== 'SCHEDULED' && (
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
                    <span className="text-green-300"> · ponto do Time {g.team}</span>
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

      {/* Depois do encerramento: destaque para todos; avaliar só para quem jogou (a API confere de novo). */}
      {partida.status === 'FINISHED' && (
        <RatingsPanel
          matchId={partida.id}
          podeAvaliar={partida.players.some((p) => p.playerId === usuario?.playerId)}
        />
      )}

      {ehOrganizador && partida.status === 'IN_PROGRESS' && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {confirmandoEncerrar ? (
            <>
              <span className="text-sm text-yellow-200">
                Encerrar com o placar {partida.score.A} x {partida.score.B}? Depois a súmula não muda mais.
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
              Encerrar partida
            </button>
          )}
        </div>
      )}
    </section>
  )
}
