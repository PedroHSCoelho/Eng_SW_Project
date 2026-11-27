import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ehOrganizadorDo, useGrupo } from '../../groups/context/GrupoContext.jsx'
import { criarPartida, listarPartidas } from '../api/matchesApi.js'
import { STATUS, formatarData, nomeDoTime } from '../domain/textos.js'
import SeletorDeFormato from '../components/SeletorDeFormato.jsx'
import NomesDosTimes, { nomesParaEnviar } from '../components/NomesDosTimes.jsx'
import AbasDePartidas from '../components/AbasDePartidas.jsx'

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

export default function MatchesPage() {
  const ehOrganizador = ehOrganizadorDo(useGrupo().grupo)
  const navegar = useNavigate()
  const [partidas, setPartidas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [data, setData] = useState('')
  const [local, setLocal] = useState('')
  const [vagas, setVagas] = useState('')
  const [formato, setFormato] = useState({ format: 'SINGLE_GAME', teamCount: 2 })
  const [nomes, setNomes] = useState({})
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    listarPartidas()
      .then((lista) => ativo && setPartidas(lista))
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [])

  async function criar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      // O campo "datetime-local" é a hora do navegador; mandamos em ISO para o back-end não adivinhar o fuso.
      const nova = await criarPartida({
        date: new Date(data).toISOString(),
        location: local,
        maxPlayers: vagas === '' ? null : Number(vagas),
        ...formato,
        // Nomes livres dos times só vão quando alguém preencheu.
        ...(nomesParaEnviar(formato, nomes) && { teamNames: nomesParaEnviar(formato, nomes) }),
      })
      navegar(`/partidas/${nova.id}`) // já abre a súmula para escalar os times
    } catch (e) {
      setErro(e.message)
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-partidas">
      <AbasDePartidas />
      <h2 id="titulo-partidas" className="text-2xl font-bold">
        📋 Partidas
      </h2>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      {ehOrganizador && (
        <form
          onSubmit={criar}
          className="mt-4 grid gap-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700 sm:grid-cols-4"
        >
          <h3 className="font-semibold sm:col-span-4">Nova partida</h3>
          <SeletorDeFormato valor={formato} aoMudar={setFormato} className="sm:col-span-4" />
          <NomesDosTimes formato={formato} valor={nomes} aoMudar={setNomes} className="sm:col-span-4" />
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
          <label className="text-sm">
            Vagas (vazio = sem limite)
            <input
              type="number"
              inputMode="numeric"
              min="2"
              max="100"
              placeholder="ex.: 14"
              className={campo}
              value={vagas}
              onChange={(e) => setVagas(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-green-950 hover:bg-green-400 disabled:opacity-50"
            >
              Criar partida
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="mt-6 text-green-200">Carregando…</p>
      ) : partidas.length === 0 ? (
        <p className="mt-6 text-green-200">Nenhuma partida registrada ainda.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {partidas.map((p) => (
            <li key={p.id}>
              <Link
                to={`/partidas/${p.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-green-900 p-4 ring-1 ring-green-700 hover:bg-green-800"
              >
                <span>
                  <span className="block font-semibold">{formatarData(p.date)}</span>
                  <span className="text-sm text-green-200">{p.location}</span>
                  {/* Agendada: quantos já estão na lista (confirmados + espera) e as vagas. */}
                  {p.status === 'SCHEDULED' && p.attendance && (
                    <span className="block text-sm text-green-300">
                      {p.attendance.maxPlayers
                        ? `${Math.min(p.attendance.total, p.attendance.maxPlayers)}/${p.attendance.maxPlayers} na lista`
                        : `${p.attendance.total} na lista`}
                      {p.attendance.maxPlayers && p.attendance.total > p.attendance.maxPlayers
                        ? ` · ${p.attendance.total - p.attendance.maxPlayers} na espera`
                        : ''}
                    </span>
                  )}
                </span>
                <span className="text-right">
                  {/* O placar só faz sentido depois que a partida começou (e nunca na cancelada). */}
                  {p.format === 'PELADA' ? (
                    <span className="mb-1 block text-sm font-semibold">
                      Pelada · {p.teamCount} times
                      {['IN_PROGRESS', 'FINISHED'].includes(p.status) && ` · ${p.gamesCount ?? 0} jogo(s)`}
                    </span>
                  ) : (
                    p.score &&
                    ['IN_PROGRESS', 'FINISHED'].includes(p.status) && (
                      <span className="mb-1 block font-bold tabular-nums">
                        {nomeDoTime(p, 'A')} {p.score.A} x {p.score.B} {nomeDoTime(p, 'B')}
                      </span>
                    )
                  )}
                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${STATUS[p.status].classe}`}>
                    {STATUS[p.status].nome}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
