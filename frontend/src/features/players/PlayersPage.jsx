import { useEffect, useState } from 'react'
import {
  atualizarJogador,
  criarJogador,
  excluirJogador,
  inativarJogador,
  listarJogadores,
} from './playersApi.js'

// Os valores são os do enum Position do back-end; o texto é o que a tela mostra.
const POSICOES = {
  GOALKEEPER: 'Goleiro',
  DEFENDER: 'Defensor',
  MIDFIELDER: 'Meio-campista',
  FORWARD: 'Atacante',
}

const FORM_VAZIO = { name: '', nickname: '', position: '' }

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'
const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

export default function PlayersPage() {
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [apenasAtivos, setApenasAtivos] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState(null)
  const [confirmandoId, setConfirmandoId] = useState(null) // exclusão em dois cliques
  const [enviando, setEnviando] = useState(false)
  // Mudar este número força recarregar a lista depois de criar/editar/inativar/excluir.
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    // "ativo" evita que uma resposta antiga sobrescreva a mais nova (busca digitada rápido).
    let ativo = true
    setCarregando(true)
    listarJogadores({ busca, apenasAtivos })
      .then((lista) => {
        if (!ativo) return
        setJogadores(lista)
        setErro('')
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [busca, apenasAtivos, versao])

  function atualizarCampo(nome, valor) {
    setForm((atual) => ({ ...atual, [nome]: valor }))
  }

  function limparFormulario() {
    setForm(FORM_VAZIO)
    setEditandoId(null)
  }

  // Roda uma ação na API; se der certo recarrega a lista, se der errado mostra a mensagem do back-end.
  async function executar(acao) {
    setErro('')
    setEnviando(true)
    try {
      await acao()
      setConfirmandoId(null)
      setVersao((v) => v + 1)
      return true
    } catch (e) {
      setErro(e.message)
      return false
    } finally {
      setEnviando(false)
    }
  }

  async function salvar(evento) {
    evento.preventDefault()
    const dados = { name: form.name, nickname: form.nickname, position: form.position }
    const ok = await executar(() =>
      editandoId ? atualizarJogador(editandoId, dados) : criarJogador(dados),
    )
    if (ok) limparFormulario()
  }

  function comecarEdicao(jogador) {
    setErro('')
    setEditandoId(jogador.id)
    setForm({ name: jogador.name, nickname: jogador.nickname, position: jogador.position })
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-jogadores">
      <h2 id="titulo-jogadores" className="text-2xl font-bold">
        👤 Jogadores
      </h2>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      <form
        onSubmit={salvar}
        className="mt-4 grid gap-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700 sm:grid-cols-4"
      >
        <h3 className="font-semibold sm:col-span-4">
          {editandoId ? 'Editar jogador' : 'Novo jogador'}
        </h3>
        <label className="text-sm">
          Nome
          <input
            className={campo}
            value={form.name}
            onChange={(e) => atualizarCampo('name', e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          Apelido
          <input
            className={campo}
            value={form.nickname}
            onChange={(e) => atualizarCampo('nickname', e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          Posição
          <select
            className={campo}
            value={form.position}
            onChange={(e) => atualizarCampo('position', e.target.value)}
            required
          >
            <option value="" disabled>
              Escolha…
            </option>
            {Object.entries(POSICOES).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={enviando}
            className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}
          >
            {editandoId ? 'Salvar alterações' : 'Cadastrar'}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={limparFormulario}
              className={`${botao} bg-green-800 hover:bg-green-700`}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex-1 text-sm">
          Buscar por nome ou apelido
          <input
            className={campo}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 pt-5 text-sm">
          <input
            type="checkbox"
            checked={apenasAtivos}
            onChange={(e) => setApenasAtivos(e.target.checked)}
          />
          Mostrar só ativos
        </label>
      </div>

      {carregando ? (
        <p className="mt-6 text-green-200">Carregando…</p>
      ) : jogadores.length === 0 ? (
        <p className="mt-6 text-green-200">Nenhum jogador encontrado.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {jogadores.map((j) => (
            <li
              key={j.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-green-900 p-4 ring-1 ring-green-700"
            >
              <div>
                <p className="font-semibold">
                  {j.nickname}{' '}
                  {!j.active && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      Inativo
                    </span>
                  )}
                </p>
                <p className="text-sm text-green-200">
                  {j.name} · {POSICOES[j.position] ?? j.position}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => comecarEdicao(j)}
                  className={`${botao} bg-green-800 hover:bg-green-700`}
                  aria-label={`Editar ${j.nickname}`}
                >
                  Editar
                </button>
                {j.active && (
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => executar(() => inativarJogador(j.id))}
                    className={`${botao} bg-yellow-200 text-yellow-900 hover:bg-yellow-100`}
                    aria-label={`Inativar ${j.nickname}`}
                  >
                    Inativar
                  </button>
                )}
                {confirmandoId === j.id ? (
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => executar(() => excluirJogador(j.id))}
                    className={`${botao} bg-red-600 hover:bg-red-500`}
                    aria-label={`Confirmar exclusão de ${j.nickname}`}
                  >
                    Confirmar exclusão
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoId(j.id)}
                    className={`${botao} bg-red-200 text-red-900 hover:bg-red-100`}
                    aria-label={`Excluir ${j.nickname}`}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
