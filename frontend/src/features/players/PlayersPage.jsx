import { useEffect, useState } from 'react'
import {
  atualizarJogador,
  criarJogador,
  excluirJogador,
  inativarJogador,
  listarJogadores,
} from './playersApi.js'
import PlayerForm, { POSICOES } from './PlayerForm.jsx'
import { useAuth } from '../auth/AuthContext.jsx'

const FORM_VAZIO = { name: '', nickname: '', position: '' }

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'
const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

export default function PlayersPage() {
  // Só o organizador cadastra/edita/inativa/exclui. Esconder os botões é conforto: o back-end responde 403 de qualquer jeito.
  const ehOrganizador = useAuth().usuario?.role === 'ORGANIZER'
  const [jogadores, setJogadores] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [apenasAtivos, setApenasAtivos] = useState(false)
  const [form, setForm] = useState(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState(null)
  // Ação destrutiva em dois cliques: guarda qual jogador e qual ação ('inativar' | 'excluir') aguardam confirmação.
  const [confirmando, setConfirmando] = useState(null)
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
      setConfirmando(null)
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

      {ehOrganizador && (
        <PlayerForm
          valores={form}
          editando={Boolean(editandoId)}
          enviando={enviando}
          aoMudar={atualizarCampo}
          aoEnviar={salvar}
          aoCancelar={limparFormulario}
        />
      )}

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
              {ehOrganizador && (
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => comecarEdicao(j)}
                  className={`${botao} bg-green-800 hover:bg-green-700`}
                  aria-label={`Editar ${j.nickname}`}
                >
                  Editar
                </button>
                {confirmando?.id === j.id ? (
                  <>
                    <button
                      type="button"
                      disabled={enviando}
                      onClick={() =>
                        executar(() =>
                          confirmando.acao === 'inativar'
                            ? inativarJogador(j.id)
                            : excluirJogador(j.id),
                        )
                      }
                      className={`${botao} bg-red-600 hover:bg-red-500`}
                      aria-label={`Confirmar ${confirmando.acao === 'inativar' ? 'inativação' : 'exclusão'} de ${j.nickname}`}
                    >
                      Confirmar {confirmando.acao === 'inativar' ? 'inativação' : 'exclusão'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmando(null)}
                      className={`${botao} bg-green-800 hover:bg-green-700`}
                      aria-label={`Cancelar ${confirmando.acao === 'inativar' ? 'inativação' : 'exclusão'} de ${j.nickname}`}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    {j.active && (
                      <button
                        type="button"
                        onClick={() => setConfirmando({ id: j.id, acao: 'inativar' })}
                        className={`${botao} bg-yellow-200 text-yellow-900 hover:bg-yellow-100`}
                        aria-label={`Inativar ${j.nickname}`}
                      >
                        Inativar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmando({ id: j.id, acao: 'excluir' })}
                      className={`${botao} bg-red-200 text-red-900 hover:bg-red-100`}
                      aria-label={`Excluir ${j.nickname}`}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
