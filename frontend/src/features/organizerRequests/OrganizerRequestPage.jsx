import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext.jsx'
import { buscarMeuPedido, solicitarOrganizador } from './organizerRequestsApi.js'

const campo =
  'mt-1 w-full rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

const data = (iso) => new Date(iso).toLocaleDateString('pt-BR')

// Tela "Ser organizador": mostra em que pé está o pedido da pessoa e, quando permitido,
// o formulário. As regras (vínculo com jogador, espera de 7 dias...) são do back-end;
// aqui só exibimos a mensagem que ele devolver.
export default function OrganizerRequestPage() {
  const { usuario, recarregar } = useAuth()
  const [pedido, setPedido] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    buscarMeuPedido()
      .then((p) => {
        if (!ativo) return
        setPedido(p)
        // Pedido aprovado, mas a tela ainda acha que a pessoa é jogador: atualiza o usuário.
        if (p?.status === 'APPROVED' && usuario?.role !== 'ORGANIZER') recarregar()
      })
      .catch((e) => ativo && setErro(e.message))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- só ao abrir a tela

  async function enviar(evento) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      setPedido(await solicitarOrganizador(motivo))
      setMotivo('')
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  let conteudo
  if (carregando) {
    conteudo = <p className="text-green-200">Carregando…</p>
  } else if (usuario?.role === 'ORGANIZER') {
    conteudo = <p className="text-green-200">Você já é organizador. 🎉</p>
  } else if (pedido?.status === 'PENDING') {
    conteudo = (
      <div className="rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
        <p className="font-semibold">Pedido em análise</p>
        <p className="mt-1 text-sm text-green-200">
          Enviado em {data(pedido.createdAt)}: “{pedido.message}”
        </p>
      </div>
    )
  } else if (!usuario?.playerId) {
    conteudo = (
      <p className="rounded-xl bg-green-900 p-5 text-green-200 ring-1 ring-green-700">
        Para pedir, sua conta precisa estar vinculada a um jogador. Peça a um organizador para fazer
        o vínculo.
      </p>
    )
  } else {
    conteudo = (
      <>
        {pedido?.status === 'REJECTED' && (
          <p className="mb-4 rounded-lg bg-yellow-100 px-4 py-2 text-sm text-yellow-800">
            Seu último pedido foi recusado em {data(pedido.decidedAt)}. Você pode tentar de novo
            depois de 7 dias.
          </p>
        )}
        <form
          onSubmit={enviar}
          className="space-y-3 rounded-xl bg-green-900 p-5 ring-1 ring-green-700"
        >
          <label className="block text-sm">
            Motivo do pedido
            <textarea
              className={campo}
              rows={3}
              maxLength={200}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-lg bg-green-500 px-3 py-2 font-medium text-green-950 hover:bg-green-400 disabled:opacity-50"
          >
            Enviar pedido
          </button>
        </form>
      </>
    )
  }

  return (
    <section className="mx-auto max-w-xl px-4 pb-16" aria-labelledby="titulo-pedido">
      <h2 id="titulo-pedido" className="text-2xl font-bold">
        🧑‍⚖️ Ser organizador
      </h2>
      <p className="mt-1 mb-4 text-sm text-green-200">
        Organizadores cadastram jogadores e gerem as partidas. Um organizador analisa seu pedido.
      </p>
      {erro && (
        <p role="alert" className="mb-4 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}
      {conteudo}
    </section>
  )
}
