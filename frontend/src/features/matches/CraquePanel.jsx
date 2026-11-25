import { useEffect, useState } from 'react'
import { buscarCraque, votarNoCraque } from './matchesApi.js'
import { formatarData, nomeDoTime } from './textos.js'
import Avatar from '../../ui/Avatar.jsx'

const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

// Votação do craque, depois que a partida (ou a pelada) é encerrada.
// Quem jogou vota em outro jogador da partida (pode trocar até a votação fechar, 48 h depois).
// Todo mundo do grupo vê o resultado. As regras ficam no back-end; aqui só mostramos o motivo quando ele recusa.
export default function CraquePanel({ partida, meuJogadorId }) {
  const [votacao, setVotacao] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    buscarCraque(partida.id)
      .then((v) => ativo && setVotacao(v))
      .catch((e) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [partida.id])

  async function votar(playerId) {
    setErro('')
    setEnviando(true)
    try {
      setVotacao(await votarNoCraque(partida.id, playerId))
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  if (!votacao) {
    return (
      <div className="mt-6 rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
        <h3 className="font-semibold">Craque da {partida.format === 'PELADA' ? 'pelada' : 'partida'}</h3>
        <p className="mt-1 text-sm text-green-200">{erro || 'Carregando…'}</p>
      </div>
    )
  }

  const craques = votacao.craques ?? []
  const nomesDosCraques = craques.map((c) => c.nickname).join(' e ')

  return (
    <div className="mt-6 rounded-xl bg-green-900 p-5 ring-1 ring-green-700" aria-label="Votação do craque">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Craque da {partida.format === 'PELADA' ? 'pelada' : 'partida'}</h3>
        <span className="text-sm text-green-200">
          {votacao.totalVotes} de {votacao.totalVoters} votaram
          {votacao.deadline && ` · ${votacao.open ? 'vota até' : 'fechou em'} ${formatarData(votacao.deadline)}`}
        </span>
      </div>

      <p className="mt-2 text-lg" aria-live="polite">
        {craques.length === 0
          ? 'Ninguém votou ainda.'
          : craques.length === 1
            ? `🏆 ${nomesDosCraques}, com ${craques[0].votes} ${craques[0].votes === 1 ? 'voto' : 'votos'}`
            : `🏆 Empate: ${nomesDosCraques}, com ${craques[0].votes} ${craques[0].votes === 1 ? 'voto' : 'votos'} cada`}
      </p>

      {erro && <p className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 text-sm text-red-800">{erro}</p>}

      {votacao.canVote ? (
        <p className="mt-3 text-sm text-green-200">
          {votacao.myVote ? 'Seu voto está marcado. Pode trocar até a votação fechar.' : 'Quem foi o craque? Você não pode votar em si mesmo.'}
        </p>
      ) : (
        votacao.open && (
          <p className="mt-3 text-sm text-green-200">Só quem jogou a partida vota. Você acompanha o resultado aqui.</p>
        )
      )}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-label="Candidatos a craque">
        {votacao.candidates.map((c) => {
          const souEu = c.playerId === meuJogadorId
          const meuVoto = votacao.myVote === c.playerId
          return (
            <li key={c.playerId} className="flex items-center justify-between gap-2 rounded-lg bg-green-950 px-3 py-2">
              <span>
                <Avatar jogador={c} className="mr-1.5" />
                <strong>{c.nickname}</strong>
                <span className="text-sm text-green-300"> · {nomeDoTime(partida, c.team)}</span>
                <span className="block text-sm tabular-nums text-green-200">
                  {c.votes} {c.votes === 1 ? 'voto' : 'votos'}
                  {meuVoto && ' · seu voto'}
                </span>
              </span>
              {votacao.canVote && !souEu && (
                <button
                  type="button"
                  disabled={enviando || meuVoto}
                  onClick={() => votar(c.playerId)}
                  aria-label={`Votar em ${c.nickname}`}
                  className={`${botao} ${meuVoto ? 'bg-yellow-300 text-green-950' : 'bg-green-500 text-green-950 hover:bg-green-400'}`}
                >
                  {meuVoto ? 'Votado' : 'Votar'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
