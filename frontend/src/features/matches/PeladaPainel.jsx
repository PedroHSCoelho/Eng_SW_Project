import { useState } from 'react'
import { jogoAberto, sugerirProximoJogo, textoDoResultado } from './pelada.js'
import { nomeDoTime, timesDaPartida } from './textos.js'

const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'
const campo = 'mt-1 block rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700'

// Pelada: o jogo que está rolando (placar grande), começar o próximo jogo (com a sugestão do
// "quem ganha fica"), a lista de jogos da noite e a classificação por time.
// O placar e o resultado de cada jogo vêm calculados do back-end (games[].score e standings).
export default function PeladaPainel({ partida, ehOrganizador, enviando, aoComecar, aoEncerrarJogo }) {
  const aberto = jogoAberto(partida)
  const jogos = partida.games ?? []
  const podeMexer = ehOrganizador && partida.status === 'IN_PROGRESS'

  return (
    <div className="mt-4 grid gap-4">
      {aberto ? (
        <div className="rounded-xl bg-green-900 p-5 text-center ring-1 ring-green-700">
          <p className="text-sm text-green-200">Jogo {aberto.number} · rolando agora</p>
          <p className="text-4xl font-bold tabular-nums" aria-label="Placar do jogo">
            {nomeDoTime(partida, aberto.homeTeam)} {aberto.score?.home ?? 0} x {aberto.score?.away ?? 0}{' '}
            {nomeDoTime(partida, aberto.awayTeam)}
          </p>
          {podeMexer && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => aoEncerrarJogo(aberto.id)}
              className={`${botao} mt-3 bg-yellow-200 text-yellow-900 hover:bg-yellow-100`}
            >
              Encerrar jogo {aberto.number}
            </button>
          )}
        </div>
      ) : (
        podeMexer && (
          <ComecarJogo
            // A chave recomeça a sugestão a cada jogo encerrado.
            key={jogos.length}
            partida={partida}
            enviando={enviando}
            aoComecar={aoComecar}
          />
        )
      )}

      {jogos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-green-900 p-4 ring-1 ring-green-700">
            <h3 className="font-semibold">Jogos da noite</h3>
            <ol className="mt-2 grid gap-1 text-sm" aria-label="Jogos da noite">
              {jogos.map((j) => (
                <li key={j.id} className="flex justify-between gap-2 rounded-lg bg-green-950 px-3 py-1.5">
                  <span>
                    <span className="text-green-300">{j.number}.</span> {nomeDoTime(partida, j.homeTeam)}{' '}
                    <strong className="tabular-nums">
                      {j.score?.home ?? 0} x {j.score?.away ?? 0}
                    </strong>{' '}
                    {nomeDoTime(partida, j.awayTeam)}
                  </span>
                  <span className="text-green-200">{textoDoResultado(j, partida)}</span>
                </li>
              ))}
            </ol>
          </div>
          <Classificacao linhas={partida.standings ?? []} partida={partida} />
        </div>
      )}
    </div>
  )
}

function ComecarJogo({ partida, enviando, aoComecar }) {
  const sugestao = sugerirProximoJogo(partida)
  const [casa, setCasa] = useState(sugestao.homeTeam)
  const [fora, setFora] = useState(sugestao.awayTeam)
  const times = timesDaPartida(partida)
  const numero = (partida.games ?? []).length + 1

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        aoComecar({ homeTeam: casa, awayTeam: fora })
      }}
      className="flex flex-wrap items-end gap-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700"
    >
      <div className="w-full">
        <h3 className="font-semibold">Jogo {numero}</h3>
        <p className="text-sm text-green-200">
          {numero === 1
            ? 'Escolha os dois primeiros times.'
            : 'Sugestão do "quem ganha fica": o vencedor continua e entra quem está esperando. Pode trocar.'}
        </p>
      </div>
      <label className="text-sm">
        Fica em campo
        <select value={casa} onChange={(e) => setCasa(e.target.value)} className={campo}>
          {times.map((t) => (
            <option key={t} value={t}>
              {nomeDoTime(partida, t)}
            </option>
          ))}
        </select>
      </label>
      <span className="pb-2 text-green-300">x</span>
      <label className="text-sm">
        Entra
        <select value={fora} onChange={(e) => setFora(e.target.value)} className={campo}>
          {times.map((t) => (
            <option key={t} value={t}>
              {nomeDoTime(partida, t)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={enviando || casa === fora}
        className={`${botao} bg-green-500 py-2 text-green-950 hover:bg-green-400`}
      >
        Começar jogo {numero}
      </button>
      {casa === fora && <span className="text-sm text-yellow-200">Escolha dois times diferentes.</span>}
    </form>
  )
}

function Classificacao({ linhas, partida }) {
  return (
    <div className="rounded-xl bg-green-900 p-4 ring-1 ring-green-700">
      <h3 className="font-semibold">Classificação da noite</h3>
      <table className="mt-2 w-full text-sm tabular-nums">
        <thead className="text-green-300">
          <tr>
            <th className="text-left font-medium">Time</th>
            <th className="font-medium" title="Jogos">J</th>
            <th className="font-medium" title="Vitórias">V</th>
            <th className="font-medium" title="Empates">E</th>
            <th className="font-medium" title="Derrotas">D</th>
            <th className="font-medium" title="Saldo de gols">SG</th>
            <th className="font-medium" title="Pontos">Pts</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.team} className="border-t border-green-800 text-center">
              <td className="py-1 text-left font-semibold">{nomeDoTime(partida, l.team)}</td>
              <td>{l.games}</td>
              <td>{l.wins}</td>
              <td>{l.draws}</td>
              <td>{l.losses}</td>
              <td>{l.goalsFor - l.goalsAgainst}</td>
              <td className="font-bold">{l.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
