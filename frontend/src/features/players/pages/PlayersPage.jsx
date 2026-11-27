import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  atualizarJogador,
  criarJogador,
  definirNota,
  excluirJogador,
  inativarJogador,
  listarJogadores,
  reativarJogador,
} from '../api/playersApi.js'
import PlayerForm from '../components/PlayerForm.jsx'
import { POSICOES } from '../domain/positions.js'
import { ehOrganizadorDo, useGrupo } from '../../groups/context/GrupoContext.jsx'
import { alterarMembro, listarMembros } from '../../groups/api/groupsApi.js'
import { useAuth } from '../../auth/context/AuthContext.jsx'
import Avatar from '../../../ui/Avatar.jsx'

const FORM_VAZIO = { name: '', nickname: '', position: '' }

// Notas que o admin pode dar: 0; 0,5; 1; ... 5.
const NOTAS = Array.from({ length: 11 }, (_, i) => i / 2)
const textoDaNota = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const campo =
  'w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'
const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

export default function PlayersPage() {
  // Só admin (papel ORGANIZER do grupo) cadastra/edita/inativa/exclui e dá ou tira admin.
  // Esconder os botões é conforto: o back-end responde 403 de qualquer jeito.
  const { grupo } = useGrupo()
  const { usuario } = useAuth()
  const ehOrganizador = ehOrganizadorDo(grupo)
  // Contas do grupo, para saber quais jogadores têm conta e quais são admin.
  const [membros, setMembros] = useState([])
  const [aviso, setAviso] = useState('')
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
  // Onde está o formulário: ao clicar em "Editar" num jogador do fim da lista, a tela rola até ele.
  const formulario = useRef(null)

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

  useEffect(() => {
    let ativo = true
    listarMembros(grupo.id)
      .then((m) => ativo && setMembros(Array.isArray(m) ? m : []))
      // Sem a lista de contas a página continua útil; só não mostra quem é admin.
      .catch(() => ativo && setMembros([]))
    return () => {
      ativo = false
    }
  }, [grupo.id, versao])

  const contaDoJogador = new Map(membros.filter((m) => m.playerId).map((m) => [m.playerId, m]))

  async function mudarAdmin(membro) {
    const role = membro.role === 'ORGANIZER' ? 'MEMBER' : 'ORGANIZER'
    await executar(() => alterarMembro(grupo.id, membro.userId, { role }))
  }

  const linkDoConvite = grupo.inviteCode ? `${window.location.origin}/convite/${grupo.inviteCode}` : ''

  async function copiarConvite() {
    try {
      await navigator.clipboard.writeText(linkDoConvite)
      setAviso('Link copiado. É só mandar para quem vai entrar no grupo.')
    } catch {
      setAviso('Não deu para copiar automaticamente; o link está em Grupo.')
    }
  }

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
    // `?.`: o jsdom dos testes não implementa scrollIntoView.
    formulario.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  // O cartão do próprio admin não tem Inativar/Excluir: um clique errado tiraria a pessoa do grupo
  // dela mesma (o jogador some da escalação e da presença). Outro admin pode fazer, se precisar.
  const ehOProprio = (jogador) =>
    jogador.id === grupo?.myPlayerId || (usuario && contaDoJogador.get(jogador.id)?.userId === usuario.id)

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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-green-900 p-4 ring-1 ring-green-700">
          <div>
            <h3 className="font-semibold">Adicionar pessoas</h3>
            <p className="text-sm text-green-200">
              Quem tem celular entra pelo link de convite e cria a própria conta. Para quem não tem conta, cadastre o
              jogador abaixo. Admins podem criar partidas, cadastrar jogadores e dar admin para outros. A nota de 0 a 5 de
              cada jogador só aparece para admins e equilibra o sorteio dos times.
            </p>
            {aviso && <p className="mt-1 text-sm text-green-300">{aviso}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {linkDoConvite && (
              <button type="button" onClick={copiarConvite} className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}>
                Copiar link de convite
              </button>
            )}
            <Link to="/membros" className={`${botao} bg-green-800 hover:bg-green-700`}>
              Ver membros
            </Link>
          </div>
        </div>
      )}

      {ehOrganizador && (
        <div ref={formulario} className="scroll-mt-24">
          <PlayerForm
            valores={form}
            editando={Boolean(editandoId)}
            enviando={enviando}
            aoMudar={atualizarCampo}
            aoEnviar={salvar}
            aoCancelar={limparFormulario}
          />
        </div>
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
              <div className="flex min-w-0 items-center gap-3">
                <Avatar jogador={j} tamanho="m" />
                <div className="min-w-0">
                  <p className="font-semibold">
                    <Link to={`/jogadores/${j.id}`} className="underline">
                      {j.nickname}
                    </Link>{' '}
                    {contaDoJogador.get(j.id)?.role === 'ORGANIZER' && (
                      <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-xs font-bold text-green-950">Admin</span>
                    )}{' '}
                    {!j.active && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Inativo
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-green-200">
                    {`${j.name} · ${POSICOES[j.position] ?? j.position}${ehOrganizador && !contaDoJogador.has(j.id) ? ' · sem conta' : ''}`}
                  </p>
                  {/* Nota do admin: só admin vê e muda (a API nem manda o campo para os outros). */}
                  {ehOrganizador && (
                    <label className="mt-1 flex items-center gap-2 text-sm text-green-200">
                      Nota
                      <select
                        aria-label={`Nota de ${j.nickname}`}
                        disabled={enviando}
                        value={j.skill ?? ''}
                        onChange={(e) =>
                          executar(() => definirNota(j.id, e.target.value === '' ? null : Number(e.target.value)))
                        }
                        className="rounded-lg bg-green-950 px-2 py-1 text-white ring-1 ring-green-700"
                      >
                        <option value="">sem nota</option>
                        {NOTAS.map((n) => (
                          <option key={n} value={n}>
                            {textoDaNota(n)}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
              {ehOrganizador && (
              <div className="flex flex-wrap justify-end gap-2">
                {/* Ninguém tira o próprio admin (o back-end também recusa). */}
                {contaDoJogador.has(j.id) && contaDoJogador.get(j.id).userId !== usuario?.id && (
                  <button
                    type="button"
                    disabled={enviando}
                    onClick={() => mudarAdmin(contaDoJogador.get(j.id))}
                    className={`${botao} bg-green-800 hover:bg-green-700`}
                  >
                    {contaDoJogador.get(j.id).role === 'ORGANIZER' ? `Tirar admin de ${j.nickname}` : `Tornar ${j.nickname} admin`}
                  </button>
                )}
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
                ) : ehOProprio(j) ? (
                  <span className="self-center text-xs text-green-300">Seu jogador</span>
                ) : (
                  <>
                    {!j.active && (
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() => executar(() => reativarJogador(j.id))}
                        className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}
                        aria-label={`Reativar ${j.nickname}`}
                      >
                        Reativar
                      </button>
                    )}
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
