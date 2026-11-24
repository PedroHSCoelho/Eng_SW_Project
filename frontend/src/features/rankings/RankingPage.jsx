import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { POSICOES } from '../players/PlayerForm.jsx'
import { buscarRanking } from './rankingApi.js'

const PERIODOS = { mes: 'Este mês', ano: 'Este ano', tudo: 'Tudo' }

// Cada aba diz de onde vêm as linhas na resposta da API e quais colunas mostrar.
const ABAS = {
  geral: {
    nome: 'Geral',
    vazio: 'Ninguém tem 3 partidas no período ainda. O ranking geral só inclui quem jogou pelo menos 3.',
    colunas: [
      ['Pts', 'points'],
      ['J', 'matches'],
      ['V', 'wins'],
      ['E', 'draws'],
      ['D', 'losses'],
      ['SG', 'goalDifference'],
      ['Gols', 'goals'],
      ['Ast', 'assists'],
    ],
  },
  artilharia: {
    nome: 'Artilharia',
    vazio: 'Ainda não há gols no período.',
    colunas: [['Gols', 'goals'], ['J', 'matches']],
  },
  assistencias: {
    nome: 'Assistências',
    vazio: 'Ainda não há assistências no período.',
    colunas: [['Ast', 'assists'], ['J', 'matches']],
  },
  defesas: {
    nome: 'Defesas',
    vazio: 'Ainda não há defesas difíceis no período.',
    colunas: [['Def', 'difficultSaves'], ['J', 'matches']],
  },
}

const campo =
  'rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

export default function RankingPage() {
  const [periodo, setPeriodo] = useState('tudo')
  const [posicao, setPosicao] = useState('') // '' = todas as posições
  const [aba, setAba] = useState('geral')
  const [ranking, setRanking] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // "ativo" evita que uma resposta antiga sobrescreva a nova se o período mudar rápido.
    let ativo = true
    setCarregando(true)
    buscarRanking(periodo, posicao)
      .then((dados) => {
        if (!ativo) return
        setRanking(dados)
        setErro('')
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [periodo, posicao])

  const config = ABAS[aba]
  // A API chama a aba "geral" de `geral`, mas as outras em português sem acento.
  const linhas = ranking?.[aba] ?? []

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-ranking">
      <h2 id="titulo-ranking" className="text-2xl font-bold">
        🏆 Ranking
      </h2>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div role="tablist" aria-label="Tipo de ranking" className="flex gap-2">
          {Object.entries(ABAS).map(([chave, { nome }]) => (
            <button
              key={chave}
              type="button"
              role="tab"
              aria-selected={aba === chave}
              onClick={() => setAba(chave)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                aba === chave ? 'bg-green-500 text-green-950' : 'bg-green-800 hover:bg-green-700'
              }`}
            >
              {nome}
            </button>
          ))}
        </div>
        <label className="text-sm">
          Posição
          <select className={`${campo} ml-2`} value={posicao} onChange={(e) => setPosicao(e.target.value)}>
            <option value="">Todas</option>
            {Object.entries(POSICOES).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Período
          <select className={`${campo} ml-2`} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
            {Object.entries(PERIODOS).map(([valor, nome]) => (
              <option key={valor} value={valor}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="mt-6 text-green-200">Carregando…</p>
      ) : !erro && linhas.length === 0 ? (
        <p className="mt-6 text-green-200">{config.vazio}</p>
      ) : (
        !erro && (
          <div className="mt-4 overflow-x-auto rounded-xl ring-1 ring-green-700">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Ranking {config.nome}</caption>
              <thead className="bg-green-800 text-green-100">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    #
                  </th>
                  <th scope="col" className="px-3 py-2">
                    Jogador
                  </th>
                  {config.colunas.map(([titulo]) => (
                    <th key={titulo} scope="col" className="px-3 py-2 text-right">
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-green-900">
                {linhas.map((linha) => (
                  <tr key={linha.playerId} className="border-t border-green-800">
                    <td className="px-3 py-2">{linha.position}</td>
                    <td className="px-3 py-2 font-medium">
                      <Link to={`/jogadores/${linha.playerId}`} className="underline">
                        {linha.nickname}
                      </Link>
                    </td>
                    {config.colunas.map(([titulo, campoDaLinha]) => (
                      <td key={titulo} className="px-3 py-2 text-right tabular-nums">
                        {linha[campoDaLinha]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <p className="mt-3 text-xs text-green-300">
        Pontos: vitória 3, empate 1, derrota 0. Desempate: saldo de gols, gols, assistências e nome. J = jogos, SG
        = saldo de gols.
      </p>
    </section>
  )
}
