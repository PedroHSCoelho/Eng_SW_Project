// Seletor do formato da partida: jogo único (2 times) ou pelada (3 a 6 times, vários jogos).
// `valor` e `aoMudar` usam o mesmo formato da API: { format, teamCount }.
const opcao = (ativo) =>
  `flex-1 cursor-pointer rounded-xl px-3 py-2 text-sm ring-1 transition-colors ${
    ativo ? 'bg-gramado text-gramado-tinta ring-gramado' : 'bg-green-950 text-texto-suave ring-green-700 hover:text-texto'
  }`

export default function SeletorDeFormato({ valor, aoMudar, className = '' }) {
  const pelada = valor.format === 'PELADA'
  return (
    <fieldset className={`flex flex-wrap items-end gap-3 ${className}`}>
      <legend className="mb-1 text-sm">Formato</legend>
      <div className="flex min-w-64 flex-1 gap-2" role="radiogroup" aria-label="Formato">
        <label className={opcao(!pelada)}>
          <input
            type="radio"
            name="formato"
            className="sr-only"
            checked={!pelada}
            onChange={() => aoMudar({ format: 'SINGLE_GAME', teamCount: 2 })}
          />
          <span className="block font-semibold">Jogo único</span>
          <span className="block text-xs opacity-80">Time A x Time B, um placar</span>
        </label>
        <label className={opcao(pelada)}>
          <input
            type="radio"
            name="formato"
            className="sr-only"
            checked={pelada}
            onChange={() => aoMudar({ format: 'PELADA', teamCount: pelada ? valor.teamCount : 3 })}
          />
          <span className="block font-semibold">Pelada</span>
          <span className="block text-xs opacity-80">Vários times, quem ganha fica</span>
        </label>
      </div>
      {pelada && (
        <label className="text-sm">
          Times
          <select
            value={valor.teamCount}
            onChange={(e) => aoMudar({ format: 'PELADA', teamCount: Number(e.target.value) })}
            className="mt-1 block rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700"
          >
            {[3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} times
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  )
}
