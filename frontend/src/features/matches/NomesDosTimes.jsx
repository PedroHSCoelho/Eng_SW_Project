import { timesDaPartida } from './textos.js'

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

// Campos livres para dar nome a cada time ("Amarelo", "Com camisa"). Vazio = "Time A".
// `formato` = { format, teamCount } (mostra um campo por time); `valor` = { A: '...', B: '...' }.
export default function NomesDosTimes({ formato, valor, aoMudar, className = '' }) {
  return (
    <fieldset className={`grid gap-2 sm:grid-cols-3 ${className}`}>
      <legend className="mb-1 text-sm">Nomes dos times (opcional)</legend>
      {timesDaPartida(formato).map((t) => (
        <label key={t} className="text-sm">
          <span className="sr-only">Nome do Time {t}</span>
          <input
            className={campo}
            value={valor[t] ?? ''}
            maxLength={20}
            placeholder={`Time ${t}`}
            aria-label={`Nome do Time ${t}`}
            onChange={(e) => aoMudar({ ...valor, [t]: e.target.value })}
          />
        </label>
      ))}
    </fieldset>
  )
}

// Só os nomes preenchidos dos times da partida; sem nenhum = null (a API usa "Time A").
export function nomesParaEnviar(formato, valor) {
  const nomes = {}
  for (const t of timesDaPartida(formato)) {
    const nome = (valor[t] ?? '').trim()
    if (nome) nomes[t] = nome
  }
  return Object.keys(nomes).length > 0 ? nomes : null
}
