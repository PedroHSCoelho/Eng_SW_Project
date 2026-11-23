import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { buscarEstatisticas, buscarJogador, buscarNotas } from '../rankings/rankingApi.js'
import { POSICOES } from './PlayerForm.jsx'

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

  useEffect(() => {
    let ativo = true
    setDados(null)
    setErro('')
    // As três consultas são independentes: rodam juntas e a tela só aparece quando todas voltam.
    Promise.all([buscarJogador(id), buscarEstatisticas(id), buscarNotas(id)])
      .then(([jogador, stats, notas]) => ativo && setDados({ jogador, stats, notas }))
      .catch((e) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [id])

  if (erro) {
    return (
      <p role="alert" className="mx-auto max-w-5xl px-4 text-red-200">
        {erro}
      </p>
    )
  }
  if (!dados) return <p className="text-center text-green-200">Carregando…</p>

  const { jogador, stats, notas } = dados
  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-perfil">
      <Link to="/ranking" className="text-sm underline">
        ← Voltar ao ranking
      </Link>
      <h2 id="titulo-perfil" className="mt-3 text-2xl font-bold">
        {jogador.nickname}
      </h2>
      <p className="text-green-200">
        {jogador.name} · {POSICOES[jogador.position] ?? jogador.position}
        {!jogador.active && ' · Inativo'}
      </p>

      <h3 className="mt-6 text-lg font-semibold">Estatísticas</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Numero rotulo="Partidas" valor={stats.matches} />
        <Numero rotulo="Vitórias" valor={stats.wins} />
        <Numero rotulo="Empates" valor={stats.draws} />
        <Numero rotulo="Derrotas" valor={stats.losses} />
        <Numero rotulo="Gols" valor={stats.goals} />
        <Numero rotulo="Assistências" valor={stats.assists} />
        <Numero rotulo="Gols por partida" valor={stats.goalsPerMatch.toFixed(2)} />
        <Numero rotulo="Saldo de gols" valor={stats.goalDifference} />
      </div>

      <h3 className="mt-6 text-lg font-semibold">Média de notas</h3>
      {notas.geral.average === null ? (
        <p className="mt-2 text-green-200">{notas.mensagem ?? 'sem avaliações suficientes'}</p>
      ) : (
        <p className="mt-2 text-green-100">
          <span className="text-3xl font-bold tabular-nums">{notas.geral.average.toFixed(1)}</span>{' '}
          <span className="text-sm text-green-200">em {notas.geral.count} avaliações</span>
        </p>
      )}

      <h3 className="mt-6 text-lg font-semibold">Últimas partidas</h3>
      {stats.recentes.length === 0 ? (
        <p className="mt-2 text-green-200">Ainda não jogou nenhuma partida finalizada.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {stats.recentes.map((r) => (
            <li
              key={r.matchId}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${RESULTADOS[r.resultado].classe}`}
              aria-label={`${RESULTADOS[r.resultado].nome}, ${r.golsPro} a ${r.golsContra}, em ${new Date(r.date).toLocaleDateString('pt-BR')}`}
            >
              {r.resultado} <span className="font-normal">{r.golsPro}x{r.golsContra}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
