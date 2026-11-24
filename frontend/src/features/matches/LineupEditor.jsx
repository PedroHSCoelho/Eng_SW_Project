import { useState } from 'react'

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
export default function LineupEditor({ jogadores, escalacao, enviando, aoSalvar, aoIniciar }) {
  const salva = deEscalacao(escalacao)
  const [selecao, setSelecao] = useState(salva)
  const alterada = !iguais(selecao, salva)

  const idsDoTime = (time) =>
    Object.entries(selecao)
      .filter(([, t]) => t === time)
      .map(([id]) => Number(id))

  function escolher(id, time) {
    setSelecao((atual) => {
      const nova = { ...atual }
      if (time) nova[id] = time
      else delete nova[id] // "Fora" = não joga
      return nova
    })
  }

  return (
    <div className="mt-4 rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
      <h3 className="font-semibold">Escalação</h3>
      <p className="mt-1 text-sm text-green-200">
        Time A: {idsDoTime('A').length} · Time B: {idsDoTime('B').length} (mínimo de 3 por time para começar)
      </p>
      {jogadores.length === 0 ? (
        <p className="mt-3 text-green-200">Cadastre jogadores ativos para montar os times.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {jogadores.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-3 rounded-lg bg-green-950 px-3 py-2">
              <label htmlFor={`time-${j.id}`}>{j.nickname}</label>
              <select
                id={`time-${j.id}`}
                className={campo}
                value={selecao[j.id] ?? ''}
                onChange={(e) => escolher(j.id, e.target.value)}
              >
                <option value="">Fora</option>
                <option value="A">Time A</option>
                <option value="B">Time B</option>
              </select>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={enviando || !alterada}
          onClick={() => aoSalvar({ teamA: idsDoTime('A'), teamB: idsDoTime('B') })}
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
      </div>
    </div>
  )
}
