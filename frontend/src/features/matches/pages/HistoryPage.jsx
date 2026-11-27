import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarJogadores } from '../../players/api/playersApi.js'
import { buscarHistorico } from '../api/historyApi.js'
import { formatarData, nomeDoTime, textoDoResultadoDaPartida } from '../domain/textos.js'
import AbasDePartidas from '../components/AbasDePartidas.jsx'

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'
const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 bg-green-800 hover:bg-green-700'

export default function HistoryPage() {
  const [jogadores, setJogadores] = useState([])
  const [filtros, setFiltros] = useState({ playerId: '', de: '', ate: '' })
  const [pagina, setPagina] = useState(1)
  const [historico, setHistorico] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)

  // A lista de jogadores só alimenta o filtro; se falhar, o histórico continua funcionando.
  useEffect(() => {
    listarJogadores().then(setJogadores).catch(() => {})
  }, [])

  useEffect(() => {
    // "ativo" evita que uma resposta antiga sobrescreva a nova (filtro mudado rápido).
    let ativo = true
    setCarregando(true)
    buscarHistorico({ ...filtros, page: pagina })
      .then((dados) => {
        if (!ativo) return
        setHistorico(dados)
        setErro('')
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [filtros, pagina])

  // Mudar qualquer filtro volta para a página 1 (a página 4 do filtro antigo pode nem existir no novo).
  function mudarFiltro(nome, valor) {
    setFiltros((atual) => ({ ...atual, [nome]: valor }))
    setPagina(1)
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-historico">
      <AbasDePartidas />
      <h2 id="titulo-historico" className="text-2xl font-bold">
        🗂️ Histórico de partidas
      </h2>

      <div className="mt-4 grid gap-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700 sm:grid-cols-3">
        <label className="text-sm">
          Jogador
          <select className={campo} value={filtros.playerId} onChange={(e) => mudarFiltro('playerId', e.target.value)}>
            <option value="">Todos</option>
            {jogadores.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          De
          <input type="date" className={campo} value={filtros.de} onChange={(e) => mudarFiltro('de', e.target.value)} />
        </label>
        <label className="text-sm">
          Até
          <input type="date" className={campo} value={filtros.ate} onChange={(e) => mudarFiltro('ate', e.target.value)} />
        </label>
      </div>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      {carregando && !historico ? (
        <p className="mt-6 text-green-200">Carregando…</p>
      ) : historico && historico.items.length === 0 ? (
        <p className="mt-6 text-green-200">Nenhuma partida finalizada encontrada.</p>
      ) : (
        historico && (
          <>
            <ul className="mt-4 grid gap-3">
              {historico.items.map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/partidas/${p.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-900 p-4 ring-1 ring-green-700 hover:bg-green-800"
                  >
                    <span>
                      <span className="block font-semibold">{formatarData(p.date)}</span>
                      <span className="text-sm text-green-200">{p.location}</span>
                    </span>
                    <span className="text-right">
                      {p.format === 'PELADA' ? (
                        <>
                          <span className="block text-xl font-bold">Pelada · {p.gamesCount} jogo(s)</span>
                          <span className="text-sm text-green-200">
                            {p.leader ? `${nomeDoTime(p, p.leader)} terminou na frente` : 'Sem jogos encerrados'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="block text-xl font-bold tabular-nums">
                            {nomeDoTime(p, 'A')} {p.score.A} x {p.score.B} {nomeDoTime(p, 'B')}
                          </span>
                          <span className="text-sm text-green-200">{textoDoResultadoDaPartida(p)}</span>
                        </>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <nav aria-label="Paginação" className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                className={botao}
                disabled={pagina <= 1 || carregando}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </button>
              <span className="text-sm text-green-200">
                Página {historico.page} de {historico.totalPages} ({historico.total}{' '}
                {historico.total === 1 ? 'partida' : 'partidas'})
              </span>
              <button
                type="button"
                className={botao}
                disabled={pagina >= historico.totalPages || carregando}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </button>
            </nav>
          </>
        )
      )}
    </section>
  )
}
