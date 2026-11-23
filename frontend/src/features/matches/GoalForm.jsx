import { useState } from 'react'

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50'

// Formulário de gol (só com a partida em andamento). `escalacao` é a lista da partida:
// [{ playerId, team, player: { nickname } }]. A assistência só oferece jogadores do MESMO time
// do autor (a regra de verdade é do back-end; aqui só evitamos erro óbvio).
export default function GoalForm({ escalacao, enviando, aoLancar }) {
  const [autorId, setAutorId] = useState('')
  const [assistenteId, setAssistenteId] = useState('')
  const [minuto, setMinuto] = useState('')
  const [golContra, setGolContra] = useState(false)

  const autor = escalacao.find((e) => String(e.playerId) === autorId)
  const candidatos = autor
    ? escalacao.filter((e) => e.team === autor.team && e.playerId !== autor.playerId)
    : []

  async function enviar(evento) {
    evento.preventDefault()
    const gol = { scorerId: Number(autorId), ownGoal: golContra }
    if (assistenteId && !golContra) gol.assistId = Number(assistenteId)
    if (minuto !== '') gol.minute = Number(minuto)
    const ok = await aoLancar(gol)
    if (ok) {
      setAutorId('')
      setAssistenteId('')
      setMinuto('')
      setGolContra(false)
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-4 grid gap-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700 sm:grid-cols-4"
    >
      <h3 className="font-semibold sm:col-span-4">Lançar gol</h3>
      <label className="text-sm">
        Autor
        <select
          className={campo}
          value={autorId}
          onChange={(e) => {
            setAutorId(e.target.value)
            setAssistenteId('') // o time pode ter mudado
          }}
          required
        >
          <option value="">Escolha…</option>
          {escalacao.map((e) => (
            <option key={e.playerId} value={e.playerId}>
              {e.player.nickname} (Time {e.team})
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Assistência
        <select
          className={campo}
          value={assistenteId}
          onChange={(e) => setAssistenteId(e.target.value)}
          disabled={!autor || golContra}
        >
          <option value="">Sem assistência</option>
          {candidatos.map((e) => (
            <option key={e.playerId} value={e.playerId}>
              {e.player.nickname}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Minuto (opcional)
        <input
          type="number"
          min="0"
          max="200"
          className={campo}
          value={minuto}
          onChange={(e) => setMinuto(e.target.value)}
        />
      </label>
      <div className="flex items-end gap-3">
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={golContra}
            onChange={(e) => {
              setGolContra(e.target.checked)
              setAssistenteId('') // gol contra não tem assistência
            }}
          />
          Gol contra
        </label>
        <button
          type="submit"
          disabled={enviando || !autor}
          className="rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-green-950 hover:bg-green-400 disabled:opacity-50"
        >
          Lançar gol
        </button>
      </div>
    </form>
  )
}
