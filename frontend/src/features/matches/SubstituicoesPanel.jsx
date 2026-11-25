import { useEffect, useState } from 'react'
import { buscarPresencas } from './matchesApi.js'
import { nomeDoTime, timesDaPartida } from './textos.js'

const campo =
  'rounded-lg bg-green-950 px-2 py-1 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

// Substituições com a partida em andamento (só admin). Quem sai fica "Sem Time" (continua na
// súmula, porque jogou) e pode voltar depois. Também serve para pôr alguém que chegou atrasado
// num time, trocar alguém de time ou só tirar alguém de campo. As regras são do back-end (422).
// `jogadores`: jogadores ativos do grupo. Os confirmados na lista de presença aparecem primeiro.
export default function SubstituicoesPanel({ partida, jogadores = [], enviando = false, aoSubstituir }) {
  const [confirmados, setConfirmados] = useState([])
  const [entra, setEntra] = useState('')
  const [sai, setSai] = useState('')
  const times = timesDaPartida(partida)
  const [time, setTime] = useState(times[0])

  useEffect(() => {
    let ativo = true
    buscarPresencas(partida.id)
      .then((l) => ativo && setConfirmados(l.confirmed.map((c) => c.playerId)))
      // Sem a lista, só perde a ordem (confirmados primeiro).
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [partida.id])

  const emCampo = partida.players.filter((p) => !p.benched)
  const idsEmCampo = new Set(emCampo.map((p) => p.playerId))
  const nome = (id) =>
    jogadores.find((j) => j.id === id)?.nickname ?? partida.players.find((p) => p.playerId === id)?.player?.nickname ?? `#${id}`
  // Sem Time: confirmados que não estão em campo e quem saiu numa substituição.
  const saiuDeCampo = partida.players.filter((p) => p.benched).map((p) => p.playerId)
  const semTime = [...new Set([...confirmados.filter((id) => !idsEmCampo.has(id)), ...saiuDeCampo])]
  const outros = jogadores.filter((j) => !idsEmCampo.has(j.id) && !semTime.includes(j.id)).map((j) => j.id)

  async function confirmar(e) {
    e.preventDefault()
    const corpo = {
      ...(entra && { entraId: Number(entra) }),
      ...(sai ? { saiId: Number(sai) } : { team: time }),
    }
    if (await aoSubstituir(corpo)) {
      setEntra('')
      setSai('')
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
      <h3 className="font-semibold">Substituições</h3>
      <p className="mt-1 text-sm text-green-200">
        Sem Time: {semTime.length === 0 ? 'ninguém' : semTime.map(nome).join(', ')}
      </p>
      <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={confirmar}>
        <label className="grid gap-1 text-sm">
          Quem entra
          <select className={campo} value={entra} onChange={(e) => setEntra(e.target.value)}>
            <option value="">Ninguém (só sai)</option>
            {semTime.length > 0 && (
              <optgroup label="Sem Time">
                {semTime.map((id) => (
                  <option key={id} value={id}>
                    {nome(id)}
                  </option>
                ))}
              </optgroup>
            )}
            {outros.length > 0 && (
              <optgroup label="Outros do grupo">
                {outros.map((id) => (
                  <option key={id} value={id}>
                    {nome(id)}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Trocar de time">
              {emCampo.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {nome(p.playerId)} ({nomeDoTime(partida, p.team)})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Quem sai
          <select className={campo} value={sai} onChange={(e) => setSai(e.target.value)}>
            <option value="">Ninguém (só entra)</option>
            {times.map((t) => (
              <optgroup key={t} label={nomeDoTime(partida, t)}>
                {emCampo
                  .filter((p) => p.team === t)
                  .map((p) => (
                    <option key={p.playerId} value={p.playerId}>
                      {nome(p.playerId)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        {!sai && (
          <label className="grid gap-1 text-sm">
            Time de quem entra
            <select className={campo} value={time} onChange={(e) => setTime(e.target.value)}>
              {times.map((t) => (
                <option key={t} value={t}>
                  {nomeDoTime(partida, t)}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="submit"
          disabled={enviando || (!entra && !sai)}
          className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-green-950 hover:bg-green-400 disabled:opacity-50"
        >
          {entra && sai ? 'Substituir' : entra ? 'Pôr no time' : 'Tirar de campo'}
        </button>
      </form>
    </div>
  )
}
