import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CamposDoJogador from './CamposDoJogador.jsx'
import { useGrupo } from './GrupoContext.jsx'
import { entrarNoGrupo, verConvite } from './groupsApi.js'
import { alerta, botaoPrincipal, cartao } from './estilos.js'

// Tela do link de convite (/convite/:codigo): mostra o grupo e a pessoa confirma com o apelido.
export default function InvitePage() {
  const { codigo } = useParams()
  const { trocarGrupo, recarregar } = useGrupo()
  const navegar = useNavigate()
  const [convite, setConvite] = useState(null)
  const [erro, setErro] = useState('')
  const [jogador, setJogador] = useState({ nickname: '', position: '' })
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    verConvite(codigo)
      .then((c) => ativo && setConvite(c))
      .catch((e) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
  }, [codigo])

  async function abrirGrupo(id) {
    await recarregar()
    trocarGrupo(id)
    navegar('/')
  }

  async function entrar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const grupo = await entrarNoGrupo(codigo, jogador)
      await abrirGrupo(grupo.id)
    } catch (e) {
      setErro(e.message)
      setEnviando(false)
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 pb-16" aria-labelledby="titulo-convite">
      <h2 id="titulo-convite" className="text-2xl font-bold">
        Convite
      </h2>

      {erro && (
        <p role="alert" className={alerta}>
          {erro}
        </p>
      )}

      {!convite && !erro && <p className="mt-6 text-green-200">Carregando…</p>}
      {!convite && erro && (
        <Link to="/grupos" className="mt-4 inline-block underline">
          Voltar para Meus grupos
        </Link>
      )}

      {convite && convite.alreadyMember && (
        <div className={`${cartao} mt-4`}>
          <p>
            Você já participa de <strong>{convite.name}</strong>.
          </p>
          <button type="button" className={`${botaoPrincipal} mt-3`} onClick={() => abrirGrupo(convite.id)}>
            Abrir o grupo
          </button>
        </div>
      )}

      {convite && !convite.alreadyMember && (
        <form onSubmit={entrar} className={`${cartao} mt-4 grid gap-3`}>
          <p>
            Você foi convidado para <strong>{convite.name}</strong> ({convite.totalMembers}{' '}
            {convite.totalMembers === 1 ? 'pessoa' : 'pessoas'}).
          </p>
          <CamposDoJogador valor={jogador} aoMudar={setJogador} />
          <div>
            <button type="submit" disabled={enviando} className={botaoPrincipal}>
              Entrar no grupo
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
