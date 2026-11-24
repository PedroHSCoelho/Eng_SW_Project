import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { listarJogadores } from '../players/playersApi.js'
import { ehOrganizadorDo, useGrupo } from './GrupoContext.jsx'
import { alterarMembro, gerarNovoConvite, listarMembros, removerMembro } from './groupsApi.js'
import { alerta, botaoSecundario, campo, cartao } from './estilos.js'

const PAPEL = { ORGANIZER: 'Organizador', MEMBER: 'Membro' }

// Membros do grupo atual. Todos veem a lista e podem sair; o organizador também convida,
// muda papéis, vincula conta a jogador e remove pessoas. As regras (ex.: nunca ficar sem
// organizador) são do back-end: aqui só mostramos o motivo quando ele recusa.
export default function MembersPage() {
  const { usuario } = useAuth()
  const { grupo, recarregar } = useGrupo()
  const ehOrganizador = ehOrganizadorDo(grupo)
  const navegar = useNavigate()
  const [membros, setMembros] = useState([])
  const [jogadores, setJogadores] = useState([])
  const [codigo, setCodigo] = useState(grupo.inviteCode ?? '')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let ativo = true
    Promise.all([listarMembros(grupo.id), ehOrganizador ? listarJogadores() : []])
      .then(([m, j]) => {
        if (!ativo) return
        setMembros(m)
        setJogadores(j)
      })
      .catch((e) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [grupo.id, ehOrganizador, versao])

  const link = codigo ? `${window.location.origin}/convite/${codigo}` : ''

  async function executar(acao, depois) {
    setErro('')
    setAviso('')
    try {
      const resultado = await acao()
      setVersao((v) => v + 1)
      await depois?.(resultado)
    } catch (e) {
      setErro(e.message)
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setAviso('Link copiado. É só colar no grupo do WhatsApp.')
    } catch {
      setAviso('Não deu para copiar automaticamente; selecione o link e copie.')
    }
  }

  // Ocupados por outra pessoa não aparecem na lista de vínculo.
  const jogadoresLivres = (atual) =>
    jogadores.filter((j) => j.id === atual || !membros.some((m) => m.playerId === j.id))

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-membros">
      <h2 id="titulo-membros" className="text-2xl font-bold">
        {grupo.name}
      </h2>
      <p className="text-sm text-texto-suave">Membros, convite e ajustes do grupo.</p>
      {/* Atalhos do grupo: o que antes ficava escondido em ícones no topo. */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/grupos" className={botaoSecundario}>
          Trocar de grupo ou criar outro
        </Link>
        {ehOrganizador && (
          <Link to="/sorteio" className={botaoSecundario}>
            Sortear times
          </Link>
        )}
      </div>

      {erro && (
        <p role="alert" className={alerta}>
          {erro}
        </p>
      )}
      {aviso && <p className="mt-4 rounded-lg bg-green-800 px-4 py-2 text-sm">{aviso}</p>}

      {ehOrganizador && (
        <div className={`${cartao} mt-4 grid gap-3`}>
          <h3 className="font-semibold">Convidar</h3>
          <p className="text-sm text-green-200">
            Mande o link (ou o código) para quem vai jogar. Quem entra vira membro e escolhe o próprio apelido.
          </p>
          <p>
            Código: <strong className="font-mono text-lg tracking-widest">{codigo}</strong>
          </p>
          <input className={campo} value={link} readOnly aria-label="Link de convite" onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={botaoSecundario} onClick={copiar}>
              Copiar link
            </button>
            <button
              type="button"
              className={botaoSecundario}
              onClick={() =>
                executar(
                  () => gerarNovoConvite(grupo.id),
                  (g) => {
                    setCodigo(g.inviteCode)
                    setAviso('Novo código gerado. O link antigo não funciona mais.')
                  },
                )
              }
            >
              Gerar novo código
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 grid gap-3">
        {membros.map((m) => {
          const souEu = m.userId === usuario?.id
          return (
            <li key={m.userId} className={`${cartao} flex flex-wrap items-center justify-between gap-3`}>
              <span>
                <span className="block font-semibold">
                  {m.user.name}
                  {souEu && ' (você)'}
                </span>
                <span className="text-sm text-green-200">
                  {PAPEL[m.role]} · {m.player ? `joga como ${m.player.nickname}` : 'sem jogador'}
                </span>
              </span>

              <span className="flex flex-wrap items-center gap-2">
                {ehOrganizador && (
                  <>
                    <select
                      aria-label={`Papel de ${m.user.name}`}
                      className="rounded-lg bg-green-950 px-2 py-1 text-sm ring-1 ring-green-700"
                      value={m.role}
                      onChange={(e) => {
                        const role = e.target.value
                        executar(() => alterarMembro(grupo.id, m.userId, { role }), () => souEu && recarregar())
                      }}
                    >
                      <option value="MEMBER">Membro</option>
                      <option value="ORGANIZER">Organizador</option>
                    </select>
                    <select
                      aria-label={`Jogador de ${m.user.name}`}
                      className="rounded-lg bg-green-950 px-2 py-1 text-sm ring-1 ring-green-700"
                      value={m.playerId ?? ''}
                      onChange={(e) => {
                        const playerId = e.target.value ? Number(e.target.value) : null
                        executar(() => alterarMembro(grupo.id, m.userId, { playerId }), () => souEu && recarregar())
                      }}
                    >
                      <option value="">Sem jogador</option>
                      {jogadoresLivres(m.playerId).map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nickname}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {(souEu || ehOrganizador) && (
                  <button
                    type="button"
                    className={botaoSecundario}
                    onClick={() =>
                      executar(
                        () => removerMembro(grupo.id, m.userId),
                        async () => {
                          if (!souEu) return
                          await recarregar()
                          navegar('/grupos')
                        },
                      )
                    }
                  >
                    {souEu ? 'Sair do grupo' : 'Remover'}
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
