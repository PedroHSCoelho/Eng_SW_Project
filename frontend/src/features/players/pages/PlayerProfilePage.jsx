import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { buscarEstatisticas, buscarJogador } from '../../rankings/api/rankingApi.js'
import { POSICOES } from '../domain/positions.js'
import FotoDoJogador from '../../photos/components/FotoDoJogador.jsx'

const PERIODOS = { tudo: 'Tudo', ano: 'Este ano', mes: 'Este mês' }

// 3.5 -> "3,5"; 4 -> "4"
export const formatarNota = (nota) => nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const RESULTADOS = {
  V: { nome: 'Vitória', classe: 'bg-green-500 text-green-950' },
  E: { nome: 'Empate', classe: 'bg-yellow-200 text-yellow-900' },
  D: { nome: 'Derrota', classe: 'bg-red-200 text-red-900' },
}

function Numero({ rotulo, valor }) {
  return (
    <div className="rounded-xl bg-green-900 p-4 text-center ring-1 ring-green-700">
      <p className="text-2xl font-bold tabular-nums">{valor}</p>
      <p className="text-xs text-green-200">{rotulo}</p>
    </div>
  )
}

export default function PlayerProfilePage() {
  const { id } = useParams()
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [periodo, setPeriodo] = useState('tudo')
  const [erroDoPeriodo, setErroDoPeriodo] = useState('')
  // Número do último pedido de estatísticas: uma resposta antiga não sobrescreve a mais nova.
  const pedido = useRef(0)

  useEffect(() => {
    let ativo = true
    setDados(null)
    setErro('')
    setPeriodo('tudo')
    setErroDoPeriodo('')
    // As duas consultas são independentes: rodam juntas e a tela só aparece quando as duas voltam.
    Promise.all([buscarJogador(id), buscarEstatisticas(id)])
      .then(([jogador, stats]) => ativo && setDados({ jogador, stats }))
      .catch((e) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [id])

  // Troca o período e busca de novo SÓ as estatísticas (o restante da tela continua como está).
  async function trocarPeriodo(novo) {
    setPeriodo(novo)
    setErroDoPeriodo('')
    const numero = ++pedido.current
    try {
      const stats = await buscarEstatisticas(id, novo)
      if (numero === pedido.current) setDados((atual) => ({ ...atual, stats }))
    } catch (e) {
      if (numero === pedido.current) setErroDoPeriodo(e.message)
    }
  }

  if (erro) {
    return (
      <p role="alert" className="mx-auto max-w-5xl px-4 text-red-200">
        {erro}
      </p>
    )
  }
  if (!dados) return <p className="text-center text-green-200">Carregando…</p>

  const { jogador, stats } = dados
  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-perfil">
      <Link to="/ranking" className="text-sm underline">
        ← Voltar ao ranking
      </Link>
      <div className="mt-3">
        <FotoDoJogador jogador={jogador} />
      </div>
      <h2 id="titulo-perfil" className="mt-3 text-2xl font-bold">
        {jogador.nickname}
      </h2>
      <p className="text-green-200">
        {jogador.name} · {POSICOES[jogador.position] ?? jogador.position}
        {!jogador.active && ' · Inativo'}
      </p>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-lg font-semibold">Estatísticas</h3>
        <label className="text-sm">
          Período
          <select
            className="ml-2 rounded-lg bg-green-950 px-3 py-1.5 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={periodo}
            onChange={(e) => trocarPeriodo(e.target.value)}
          >
            {Object.entries(PERIODOS).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>
      {erroDoPeriodo && (
        <p role="alert" className="mt-2 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erroDoPeriodo}
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* "Jogos" e não "Partidas": numa pelada cada jogo da noite conta, então Jogos = V + E + D. */}
        <Numero rotulo="Jogos" valor={stats.matches} />
        <Numero rotulo="Vitórias" valor={stats.wins} />
        <Numero rotulo="Empates" valor={stats.draws} />
        <Numero rotulo="Derrotas" valor={stats.losses} />
        <Numero rotulo="Gols" valor={stats.goals} />
        <Numero rotulo="Assistências" valor={stats.assists} />
        <Numero rotulo="Gols por jogo" valor={stats.goalsPerMatch.toFixed(2)} />
        <Numero rotulo="Saldo de gols" valor={stats.goalDifference} />
        <Numero rotulo="Defesas difíceis" valor={stats.difficultSaves ?? 0} />
        <Numero rotulo="Cartões amarelos" valor={stats.yellowCards ?? 0} />
        <Numero rotulo="Cartões vermelhos" valor={stats.redCards ?? 0} />
      </div>

      {/* A API só manda a nota do admin para quem é admin; para os outros o campo nem existe. */}
      {'skill' in jogador && (
        <>
          <h3 className="mt-6 text-lg font-semibold">Nota do admin</h3>
          <p className="text-xs text-green-300">Só os admins veem. É ela que equilibra o sorteio dos times.</p>
          <p className="mt-2 text-green-100">
            {jogador.skill === null ? (
              <span className="text-green-200">Ainda sem nota (no sorteio conta como 2,5).</span>
            ) : (
              <>
                <span className="text-3xl font-bold tabular-nums">{formatarNota(jogador.skill)}</span>{' '}
                <span className="text-sm text-green-200">de 5</span>
              </>
            )}
          </p>
        </>
      )}

      <h3 className="mt-6 text-lg font-semibold">Últimas partidas</h3>
      {stats.recentes.length === 0 ? (
        <p className="mt-2 text-green-200">Ainda não jogou nenhuma partida finalizada.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {stats.recentes.map((r) =>
            r.format === 'PELADA' ? (
              // Pelada: vários jogos na noite, então mostra a campanha (ex.: 3V 0E 2D), sem placar somado.
              <li
                key={r.matchId}
                className="rounded-lg bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-900"
                aria-label={`Pelada em ${new Date(r.date).toLocaleDateString('pt-BR')}: ${r.wins} vitórias, ${r.draws} empates e ${r.losses} derrotas`}
              >
                Pelada <span className="font-normal">{r.wins}V {r.draws}E {r.losses}D</span>
              </li>
            ) : (
              <li
                key={r.matchId}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${RESULTADOS[r.resultado].classe}`}
                aria-label={`${RESULTADOS[r.resultado].nome}, ${r.golsPro} a ${r.golsContra}, em ${new Date(r.date).toLocaleDateString('pt-BR')}`}
              >
                {r.resultado} <span className="font-normal">{r.golsPro}x{r.golsContra}</span>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  )
}
