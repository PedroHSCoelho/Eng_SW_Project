import { useState } from 'react'
import SeletorDeFormato from './SeletorDeFormato.jsx'

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

// O campo "datetime-local" quer "AAAA-MM-DDTHH:mm" na hora do navegador; a API guarda em ISO (UTC).
function paraCampoLocal(iso) {
  const d = new Date(iso)
  const dois = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`
}

// Edita data e local da partida (só enquanto agendada; depois disso o back-end responde 422).
// Componente de apresentação: quem chama a API é a página.
export default function MatchEditForm({ partida, enviando, aoSalvar }) {
  const inicial = { data: paraCampoLocal(partida.date), local: partida.location, vagas: String(partida.maxPlayers ?? '') }
  const [data, setData] = useState(inicial.data)
  const [local, setLocal] = useState(inicial.local)
  const [vagas, setVagas] = useState(inicial.vagas)
  const formatoInicial = { format: partida.format ?? 'SINGLE_GAME', teamCount: partida.teamCount ?? 2 }
  const [formato, setFormato] = useState(formatoInicial)
  const alterado =
    data !== inicial.data ||
    local !== inicial.local ||
    vagas !== inicial.vagas ||
    formato.format !== formatoInicial.format ||
    formato.teamCount !== formatoInicial.teamCount

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        aoSalvar({
          date: new Date(data).toISOString(),
          location: local,
          maxPlayers: vagas === '' ? null : Number(vagas),
          ...formato,
        })
      }}
      className="mt-4 grid gap-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700 sm:grid-cols-4"
    >
      <h3 className="font-semibold sm:col-span-4">Data, local e vagas</h3>
      <SeletorDeFormato valor={formato} aoMudar={setFormato} className="sm:col-span-4" />
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
        Vagas na lista (vazio = sem limite)
        <input
          type="number"
          inputMode="numeric"
          min="2"
          max="100"
          className={campo}
          value={vagas}
          onChange={(e) => setVagas(e.target.value)}
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={enviando || !alterado}
          className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-green-950 hover:bg-green-400 disabled:opacity-50"
        >
          Salvar alterações
        </button>
      </div>
    </form>
  )
}
