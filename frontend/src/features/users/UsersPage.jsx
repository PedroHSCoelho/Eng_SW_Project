import { useEffect, useState } from 'react'
import { listarJogadores } from '../players/playersApi.js'
import { alterarPapel, listarUsuarios, vincularJogador } from './usersApi.js'
import {
  aprovarPedido,
  listarPedidosPendentes,
  recusarPedido,
} from '../organizerRequests/organizerRequestsApi.js'

const PAPEIS = { ORGANIZER: 'Organizador', PLAYER: 'Jogador' }
const seletor =
  'rounded-lg bg-green-950 px-2 py-1.5 text-sm text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

// Gestão de usuários (só organizador vê): muda o papel de cada um e vincula a um jogador.
// Quem decide e valida é o back-end; aqui só mostramos a mensagem se ele recusar
// (ex.: rebaixar o último organizador).
export default function UsersPage() {
  const [usuarios, setUsuarios] = useState([])
  const [jogadores, setJogadores] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    Promise.all([listarUsuarios(), listarJogadores(), listarPedidosPendentes()])
      .then(([u, j, p]) => {
        if (!ativo) return
        setUsuarios(u)
        setJogadores(j)
        setPedidos(p)
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [versao])

  async function executar(acao) {
    setErro('')
    try {
      await acao()
      setVersao((v) => v + 1)
    } catch (e) {
      setErro(e.message)
      setVersao((v) => v + 1) // recarrega para o seletor voltar ao valor real do servidor
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-usuarios">
      <h2 id="titulo-usuarios" className="text-2xl font-bold">
        🔑 Usuários
      </h2>
      <p className="mt-1 text-sm text-green-200">
        Defina quem é organizador e a qual jogador cada conta pertence.
      </p>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      {pedidos.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold">Pedidos de organizador ({pedidos.length})</h3>
          <ul className="mt-2 grid gap-3">
            {pedidos.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-900 p-4 ring-1 ring-yellow-300"
              >
                <div>
                  <p className="font-semibold">
                    {p.user.name} <span className="text-sm text-green-200">({p.user.email})</span>
                  </p>
                  <p className="text-sm text-green-200">“{p.message}”</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => executar(() => aprovarPedido(p.id))}
                    className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-green-950 hover:bg-green-400"
                    aria-label={`Aprovar pedido de ${p.user.name}`}
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => executar(() => recusarPedido(p.id))}
                    className="rounded-lg bg-red-200 px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-100"
                    aria-label={`Recusar pedido de ${p.user.name}`}
                  >
                    Recusar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {carregando ? (
        <p className="mt-6 text-green-200">Carregando…</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {usuarios.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-900 p-4 ring-1 ring-green-700"
            >
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="text-sm text-green-200">{u.email}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="text-xs">
                  Papel de {u.name}
                  <select
                    className={`${seletor} mt-1 block`}
                    value={u.role}
                    onChange={(e) => executar(() => alterarPapel(u.id, e.target.value))}
                  >
                    {Object.entries(PAPEIS).map(([valor, rotulo]) => (
                      <option key={valor} value={valor}>
                        {rotulo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  Jogador de {u.name}
                  <select
                    className={`${seletor} mt-1 block`}
                    value={u.playerId ?? ''}
                    onChange={(e) =>
                      executar(() =>
                        vincularJogador(u.id, e.target.value === '' ? null : Number(e.target.value)),
                      )
                    }
                  >
                    <option value="">Sem vínculo</option>
                    {jogadores.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.nickname} ({j.name})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
