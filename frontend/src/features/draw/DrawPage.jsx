import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { criarPartida, definirEscalacao } from '../matches/matchesApi.js'
import { POSICOES } from '../players/PlayerForm.jsx'
import { listarJogadores } from '../players/playersApi.js'
import { maximoParaSortear, minimoParaSortear, sortearTimes } from './drawApi.js'
import AbasDePartidas from '../matches/AbasDePartidas.jsx'
import Avatar from '../../ui/Avatar.jsx'

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'
const botao = 'rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50'

// Times do sorteio como lista ({ name, players, strength }); a resposta de 2 times também traz teamA/teamB.
const timesDoResultado = (r) =>
  r.teams ?? [
    { name: 'A', ...r.teamA },
    { name: 'B', ...r.teamB },
  ]

function CartaoDoTime({ nome, time }) {
  return (
    <div className="rounded-xl bg-green-900 p-4 ring-1 ring-green-700">
      <h4 className="font-semibold">
        {nome} <span className="text-sm font-normal text-green-200">(força média {time.strength.toFixed(2)})</span>
      </h4>
      <ul className="mt-2 text-sm">
        {time.players.map((p) => (
          <li key={p.id} className="flex justify-between gap-3">
            <span>
              <Avatar jogador={p} className="mr-1.5" />
              {p.nickname} <span className="text-green-300">· {POSICOES[p.position] ?? p.position}</span>
            </span>
            <span className="tabular-nums text-green-200">{p.strength.toFixed(1)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Sorteio de times equilibrado (só organizador). O cálculo é do back-end; aqui o organizador
// escolhe quem está presente, vê a sugestão, sorteia de novo se quiser e a transforma numa partida.
export default function DrawPage() {
  const navegar = useNavigate()
  const [jogadores, setJogadores] = useState([])
  const [presentes, setPresentes] = useState(() => new Set())
  const [quantosTimes, setQuantosTimes] = useState(2) // 2 = jogo único; 3 a 6 = pelada
  const [resultado, setResultado] = useState(null)
  const [data, setData] = useState('')
  const [local, setLocal] = useState('')
  const [erro, setErro] = useState('')
  const [partidaCriada, setPartidaCriada] = useState(null) // id, se a escalação falhar depois de criar
  const [enviando, setEnviando] = useState(false)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    listarJogadores({ apenasAtivos: true })
      .then((lista) => ativo && setJogadores(lista))
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  function alternar(id) {
    setPresentes((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
    setResultado(null) // mudou quem está presente: o sorteio anterior não vale mais
  }

  const quantos = presentes.size
  const MIN_JOGADORES = minimoParaSortear(quantosTimes)
  const MAX_JOGADORES = maximoParaSortear(quantosTimes)
  const quantidadeValida = quantos >= MIN_JOGADORES && quantos <= MAX_JOGADORES

  async function sortear() {
    setErro('')
    setEnviando(true)
    try {
      setResultado(await sortearTimes([...presentes], quantosTimes))
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  // Cria a partida e já escala os dois times do sorteio. São duas chamadas: se a segunda falhar,
  // a partida existe (agendada, sem escalação) e o organizador pode escalar na súmula.
  async function usarSorteio(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)
    let id = null
    try {
      const times = timesDoResultado(resultado)
      const formato = times.length > 2 ? { format: 'PELADA', teamCount: times.length } : {}
      const partida = await criarPartida({ date: new Date(data).toISOString(), location: local, ...formato })
      id = partida.id
      await definirEscalacao(id, Object.fromEntries(times.map((t) => [`team${t.name}`, t.players.map((p) => p.id)])))
      navegar(`/partidas/${id}`)
    } catch (e) {
      setErro(e.message)
      setPartidaCriada(id)
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-sorteio">
      <AbasDePartidas />
      <h2 id="titulo-sorteio" className="text-2xl font-bold">
        🎲 Sorteio de times
      </h2>
      <p className="mt-1 text-sm text-green-200">
        Marque quem está presente. Os times saem equilibrados pela nota de 0 a 5 que os admins deram a cada um (quem
        ainda não tem nota entra com 2,5; a nota se dá na tela de Jogadores) e, havendo 2 goleiros, cada time fica com um.
      </p>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
          {partidaCriada && (
            <>
              {' '}
              <Link to={`/partidas/${partidaCriada}`} className="underline">
                Abrir a partida #{partidaCriada}
              </Link>
            </>
          )}
        </p>
      )}

      {carregando ? (
        <p className="mt-6 text-green-200">Carregando…</p>
      ) : jogadores.length === 0 ? (
        <p className="mt-6 text-green-200">Cadastre jogadores ativos para poder sortear.</p>
      ) : (
        <fieldset className="mt-4 rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
          <legend className="px-2 font-semibold">Presentes</legend>
          <ul className="grid gap-2 sm:grid-cols-3">
            {jogadores.map((j) => (
              <li key={j.id}>
                <label className="flex items-center gap-2 rounded-lg bg-green-950 px-3 py-2 text-sm">
                  <input type="checkbox" checked={presentes.has(j.id)} onChange={() => alternar(j.id)} />
                  <Avatar jogador={j} />
                  {j.nickname}
                  <span className="text-green-300">· {POSICOES[j.position] ?? j.position}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="text-sm">
              Quantos times
              <select
                value={quantosTimes}
                onChange={(e) => {
                  setQuantosTimes(Number(e.target.value))
                  setResultado(null)
                }}
                className="ml-2 rounded-lg bg-green-950 px-2 py-1.5 text-white ring-1 ring-green-700"
              >
                <option value={2}>2 (jogo único)</option>
                {[3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} (pelada)
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!quantidadeValida || enviando}
              onClick={sortear}
              className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}
            >
              {resultado ? 'Sortear de novo' : 'Sortear times'}
            </button>
            <span className="text-sm text-green-200">
              {quantos} {quantos === 1 ? 'selecionado' : 'selecionados'} (de {MIN_JOGADORES} a {MAX_JOGADORES})
            </span>
          </div>
        </fieldset>
      )}

      {resultado && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Times sugeridos</h3>
          <div className={`mt-2 grid gap-3 sm:grid-cols-2 ${timesDoResultado(resultado).length > 2 ? 'lg:grid-cols-3' : ''}`}>
            {timesDoResultado(resultado).map((t) => (
              <CartaoDoTime key={t.name} nome={`Time ${t.name}`} time={t} />
            ))}
          </div>
          <p className="mt-2 text-sm text-green-200">
            Diferença de força entre os times: {resultado.difference.toFixed(2)}
          </p>

          <form
            onSubmit={usarSorteio}
            className="mt-4 grid gap-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700 sm:grid-cols-3"
          >
            <h3 className="font-semibold sm:col-span-3">Usar este sorteio</h3>
            <label className="text-sm">
              Data e hora
              <input
                type="datetime-local"
                className={campo}
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </label>
            <label className="text-sm">
              Local
              <input
                className={campo}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={enviando}
                className={`${botao} bg-blue-200 text-blue-950 hover:bg-blue-100`}
              >
                {timesDoResultado(resultado).length > 2 ? 'Criar pelada com estes times' : 'Criar partida com estes times'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
