import { useState } from 'react'
import { maximoParaSortear, minimoParaSortear, sortearTimes } from '../draw/drawApi.js'
import Avatar from '../../ui/Avatar.jsx'
import { PALETA, corInicial, lerCores, proximaCor, salvarCores } from './coresDosTimes.js'

const campo =
  'rounded-lg bg-green-950 px-2 py-1 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'
const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

// Monta a seleção ({ idDoJogador: 'A' | 'B' }) a partir da escalação já salva na partida.
const deEscalacao = (escalacao) => Object.fromEntries(escalacao.map((e) => [e.playerId, e.team]))

const iguais = (a, b) => {
  const chaves = Object.keys(a)
  return chaves.length === Object.keys(b).length && chaves.every((k) => a[k] === b[k])
}

// Editor da escalação (só enquanto a partida está agendada). Componente de apresentação:
// as regras (mínimo de 3 por time, jogador só em um time) são do back-end, que responde 422.
// Só aparecem os `confirmados` (ids da lista de presença) e quem já está na escalação salva.
// Quem não está em time nenhum fica "Sem Time" (na pelada, quem espera para entrar).
// `times`: ['A', 'B'] no jogo único; na pelada, de 3 a 6 times.
export default function LineupEditor({ partidaId, jogadores, times = ['A', 'B'], nomeDoTime = (t) => `Time ${t}`, confirmados = [], escalacao, enviando, aoSalvar, aoIniciar }) {
  // Cor escolhida de cada time ({ A: índice na paleta }); sem escolha, vale a cor inicial.
  const [cores, setCores] = useState(() => lerCores(partidaId))
  const salva = deEscalacao(escalacao)
  const [selecao, setSelecao] = useState(salva)
  const [sorteando, setSorteando] = useState(false)
  const [erroDoSorteio, setErroDoSorteio] = useState('')
  const alterada = !iguais(selecao, salva)
  const naLista = new Set(confirmados)
  const ordenados = jogadores
    .filter((j) => naLista.has(j.id) || salva[j.id])
    .sort((a, b) => Number(naLista.has(b.id)) - Number(naLista.has(a.id)))
  const minimo = minimoParaSortear(times.length)
  const maximo = maximoParaSortear(times.length)
  const podeSortear = confirmados.length >= minimo && confirmados.length <= maximo

  // Sorteio equilibrado (o mesmo da tela de Sorteio) só com quem confirmou; depois é só salvar.
  async function sortearConfirmados() {
    setErroDoSorteio('')
    setSorteando(true)
    try {
      const r = await sortearTimes(confirmados, times.length)
      const teams = r.teams ?? [{ name: 'A', ...r.teamA }, { name: 'B', ...r.teamB }]
      setSelecao(Object.fromEntries(teams.flatMap((t) => t.players.map((p) => [p.id, t.name]))))
    } catch (e) {
      setErroDoSorteio(e.message)
    } finally {
      setSorteando(false)
    }
  }

  const idsDoTime = (time) =>
    Object.entries(selecao)
      .filter(([, t]) => t === time)
      .map(([id]) => Number(id))

  function mudarCor(time, i) {
    setCores((atual) => {
      const nova = { ...atual, [time]: proximaCor(atual[time] ?? corInicial(nomeDoTime(time), i)) }
      salvarCores(partidaId, nova)
      return nova
    })
  }

  function escolher(id, time) {
    setSelecao((atual) => {
      const nova = { ...atual }
      if (time) nova[id] = time
      else delete nova[id] // "Sem Time" = fora dos times
      return nova
    })
  }

  return (
    <div className="mt-4 rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
      <h3 className="font-semibold">Escalação</h3>
      <p className="mt-1 text-sm text-green-200">
        {times.map((t) => `${nomeDoTime(t)}: ${idsDoTime(t).length}`).join(' · ')} (mínimo de 3 por time para começar)
      </p>
      {ordenados.length === 0 ? (
        <p className="mt-3 text-green-200">
          Ninguém confirmou presença ainda. Confirme os jogadores na lista de presença para montar os times.
        </p>
      ) : (
        // Uma coluna por time (com a cor do time) e, por último, quem está Sem Time.
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...times, ''].map((t, i) => {
            const doTime = ordenados.filter((j) => (selecao[j.id] ?? '') === t)
            if (!t && doTime.length === 0) return null
            const cor = t ? PALETA[cores[t] ?? corInicial(nomeDoTime(t), i)] : null
            return (
              <section
                key={t || 'fora'}
                aria-label={t ? nomeDoTime(t) : 'Sem Time'}
                className="rounded-lg p-2 ring-1 ring-green-700"
                style={cor ? { borderTop: `4px solid ${cor.hex}`, backgroundColor: `${cor.hex}1f` } : undefined}
              >
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <h4 className="text-sm font-semibold">
                    {t ? nomeDoTime(t) : 'Sem Time'} <span className="font-normal text-green-300">({doTime.length})</span>
                  </h4>
                  {cor && (
                    <button
                      type="button"
                      onClick={() => mudarCor(t, i)}
                      aria-label={`Mudar a cor de ${nomeDoTime(t)}`}
                      title={`Cor: ${cor.nome} (clique para trocar)`}
                      className="h-6 w-6 rounded-full ring-2 ring-white/70 hover:scale-110"
                      style={{ backgroundColor: cor.hex }}
                    />
                  )}
                </div>
                <ul className="grid gap-2">
                  {doTime.map((j) => (
                    <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg bg-green-950 px-3 py-2">
                      <label htmlFor={`time-${j.id}`}>
                        <Avatar jogador={j} className="mr-1.5" />
                        {j.nickname}
                        {!naLista.has(j.id) && <span className="text-xs text-yellow-200"> · não confirmado</span>}
                      </label>
                      <select
                        id={`time-${j.id}`}
                        className={campo}
                        value={selecao[j.id] ?? ''}
                        onChange={(e) => escolher(j.id, e.target.value)}
                      >
                        <option value="">Sem Time</option>
                        {times.map((x) => (
                          <option key={x} value={x}>
                            {nomeDoTime(x)}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                  {doTime.length === 0 && <li className="px-1 text-sm text-green-300">Ninguém ainda.</li>}
                </ul>
              </section>
            )
          })}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {confirmados.length > 0 && (
          <button
            type="button"
            disabled={enviando || sorteando || !podeSortear}
            onClick={sortearConfirmados}
            title={podeSortear ? undefined : `O sorteio precisa de ${minimo} a ${maximo} confirmados`}
            className={`${botao} bg-ouro text-fundo hover:brightness-110`}
          >
            Sortear times com os {confirmados.length} confirmados
          </button>
        )}
        <button
          type="button"
          disabled={enviando || !alterada}
          onClick={() => aoSalvar(Object.fromEntries(times.map((t) => [`team${t}`, idsDoTime(t)])))}
          className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}
        >
          Salvar escalação
        </button>
        <button
          type="button"
          disabled={enviando || alterada}
          onClick={aoIniciar}
          className={`${botao} bg-blue-200 text-blue-950 hover:bg-blue-100`}
        >
          Iniciar partida
        </button>
        {alterada && <span className="text-sm text-yellow-200">Salve a escalação antes de iniciar.</span>}
        {erroDoSorteio && <span className="text-sm text-red-300">{erroDoSorteio}</span>}
      </div>
    </div>
  )
}
