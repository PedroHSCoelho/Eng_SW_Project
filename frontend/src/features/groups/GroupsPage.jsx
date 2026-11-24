import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CamposDoJogador from './CamposDoJogador.jsx'
import { useGrupo } from './GrupoContext.jsx'
import { criarGrupo } from './groupsApi.js'
import { alerta, botaoPrincipal, botaoSecundario, campo, cartao } from './estilos.js'

const PAPEL = { ORGANIZER: 'Organizador', MEMBER: 'Membro' }

// "Meus grupos": abrir um grupo, criar um novo (vira organizador) ou entrar com um código.
export default function GroupsPage() {
  const { grupos, grupo: atual, carregando, trocarGrupo, recarregar } = useGrupo()
  const navegar = useNavigate()
  const [nome, setNome] = useState('')
  const [jogo, setJogo] = useState(true)
  const [jogador, setJogador] = useState({ nickname: '', position: '' })
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  function abrir(id) {
    trocarGrupo(id)
    navegar('/')
  }

  async function criar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const novo = await criarGrupo({ name: nome, ...(jogo && jogador) })
      await recarregar()
      abrir(novo.id)
    } catch (e) {
      setErro(e.message)
      setEnviando(false)
    }
  }

  function irParaConvite(evento) {
    evento.preventDefault()
    const limpo = codigo.trim()
    if (limpo) navegar(`/convite/${encodeURIComponent(limpo)}`)
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-16" aria-labelledby="titulo-grupos">
      <h2 id="titulo-grupos" className="text-2xl font-bold">
        Meus grupos
      </h2>
      <p className="mt-1 text-sm text-green-200">
        Cada grupo é uma pelada ou campeonato, com os seus jogadores, partidas e ranking.
      </p>

      {erro && (
        <p role="alert" className={alerta}>
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="mt-6 text-green-200">Carregando…</p>
      ) : grupos.length === 0 ? (
        <p className="mt-6 text-green-200">Você ainda não participa de nenhum grupo.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {grupos.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onClick={() => abrir(g.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-xl p-4 text-left ring-1 hover:bg-green-800 ${
                  g.id === atual?.id ? 'bg-green-800 ring-green-400' : 'bg-green-900 ring-green-700'
                }`}
              >
                <span className="font-semibold">{g.name}</span>
                <span className="text-sm text-green-200">
                  {PAPEL[g.myRole]}
                  {g.id === atual?.id && ' · aberto'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <form onSubmit={criar} className={`${cartao} grid gap-3`} aria-label="Criar grupo">
          <h3 className="font-semibold">Criar um grupo</h3>
          <p className="text-sm text-green-200">Você vira o organizador e convida a galera pelo código.</p>
          <label className="text-sm">
            Nome do grupo
            <input
              className={campo}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              minLength={3}
              maxLength={60}
              required
              placeholder="Pelada de quinta"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={jogo} onChange={(e) => setJogo(e.target.checked)} />
            Eu também jogo neste grupo
          </label>
          {jogo && <CamposDoJogador valor={jogador} aoMudar={setJogador} />}
          <div>
            <button type="submit" disabled={enviando} className={botaoPrincipal}>
              Criar grupo
            </button>
          </div>
        </form>

        <form onSubmit={irParaConvite} className={`${cartao} grid content-start gap-3`} aria-label="Entrar com código">
          <h3 className="font-semibold">Tenho um código de convite</h3>
          <p className="text-sm text-green-200">Peça o código (ou o link) para quem organiza o grupo.</p>
          <label className="text-sm">
            Código
            <input
              className={`${campo} uppercase tracking-widest`}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              maxLength={12}
              required
              placeholder="ABCD2345"
            />
          </label>
          <div>
            <button type="submit" className={botaoSecundario}>
              Ver convite
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
