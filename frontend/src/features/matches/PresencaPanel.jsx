import { useEffect, useState } from 'react'
import Icone from '../../ui/Icones.jsx'
import { buscarPresencas, confirmarPresenca, sairDaLista } from './matchesApi.js'
import { textoDaLista } from './lances.js'
import { formatarData } from './textos.js'

const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

// Lista de presença da partida agendada (substitui a "lista do fut" do WhatsApp).
// Cada um confirma o próprio nome; passou das vagas, vai para a espera e sobe sozinho quando
// alguém sai. O organizador também põe e tira qualquer jogador (o amigo sem conta).
// `aoMudar` avisa a página da lista nova (a escalação usa os confirmados).
export default function PresencaPanel({ partida, ehOrganizador, meuJogadorId, jogadores = [], aoMudar }) {
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [adicionar, setAdicionar] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let ativo = true
    buscarPresencas(partida.id)
      .then((l) => {
        if (!ativo) return
        setLista(l)
        aoMudar?.(l)
      })
      .catch((e) => ativo && setErro(e.message))
    return () => {
      ativo = false
    }
    // aoMudar muda a cada render da página; a lista só precisa ser buscada de novo se a partida mudar.
  }, [partida.id])

  async function executar(acao) {
    setErro('')
    setEnviando(true)
    try {
      const nova = await acao()
      setLista(nova)
      aoMudar?.(nova)
      return true
    } catch (e) {
      setErro(e.message)
      return false
    } finally {
      setEnviando(false)
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoDaLista({ partida, lista, formatarData }))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setErro('Não foi possível copiar; selecione a lista e copie manualmente')
    }
  }

  if (!lista) {
    return (
      <div className="mt-4 rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
        <h3 className="font-semibold">Lista de presença</h3>
        <p className="mt-1 text-sm text-green-200">{erro || 'Carregando…'}</p>
      </div>
    )
  }

  const naLista = new Set([...lista.confirmed, ...lista.waitlist].map((l) => l.playerId))
  const foraDaLista = jogadores.filter((j) => !naLista.has(j.id))
  const lotada = lista.openSpots === 0
  const minhaPosicaoNaEspera = lista.waitlist.findIndex((l) => l.playerId === meuJogadorId) + 1

  const linha = (l, i) => (
    <li key={l.playerId} className="flex items-center justify-between gap-2 rounded-lg bg-green-950 px-3 py-1.5">
      <span>
        <span className="tabular-nums text-green-300">{i + 1}.</span> {l.nickname}
        {l.playerId === meuJogadorId && <span className="text-green-300"> (você)</span>}
      </span>
      {ehOrganizador && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => executar(() => sairDaLista(partida.id, l.playerId))}
          aria-label={`Tirar ${l.nickname} da lista`}
          className="rounded p-1 text-green-300 hover:bg-green-800 hover:text-white disabled:opacity-50"
        >
          <Icone nome="fechar" tamanho={16} />
        </button>
      )}
    </li>
  )

  return (
    <div className="mt-4 rounded-xl bg-green-900 p-5 ring-1 ring-green-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">
          Lista de presença{' '}
          <span className="font-normal text-green-200">
            {lista.maxPlayers
              ? `· ${lista.confirmed.length}/${lista.maxPlayers} confirmados`
              : `· ${lista.confirmed.length} confirmados (sem limite de vagas)`}
          </span>
        </h3>
        <button type="button" onClick={copiar} className={`${botao} flex items-center gap-1.5 bg-green-800 hover:bg-green-700`}>
          <Icone nome="copiar" tamanho={16} />
          {copiado ? 'Lista copiada!' : 'Copiar para o WhatsApp'}
        </button>
      </div>

      {erro && <p className="mt-2 rounded-lg bg-red-100 px-3 py-1.5 text-sm text-red-800">{erro}</p>}

      {/* Meu nome: confirmar, entrar na espera ou sair. */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {meuJogadorId ? (
          lista.me === null ? (
            <button
              type="button"
              disabled={enviando}
              onClick={() => executar(() => confirmarPresenca(partida.id))}
              className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}
            >
              {lotada ? 'Entrar na lista de espera' : 'Confirmar presença'}
            </button>
          ) : (
            <>
              <span className="text-sm font-medium">
                {lista.me === 'CONFIRMED'
                  ? '✓ Você está confirmado'
                  : `Você é o ${minhaPosicaoNaEspera}º da lista de espera`}
              </span>
              <button
                type="button"
                disabled={enviando}
                onClick={() => executar(() => sairDaLista(partida.id, meuJogadorId))}
                className={`${botao} bg-red-200 text-red-900 hover:bg-red-100`}
              >
                Sair da lista
              </button>
            </>
          )
        ) : (
          <span className="text-sm text-green-200">
            Sua conta não está ligada a um jogador deste grupo, então você não entra na lista.
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-sm font-semibold text-green-200">Confirmados</h4>
          {lista.confirmed.length === 0 ? (
            <p className="mt-1 text-sm text-green-200">Ninguém confirmou ainda.</p>
          ) : (
            <ol className="mt-1 grid gap-1 text-sm" aria-label="Confirmados">
              {lista.confirmed.map(linha)}
            </ol>
          )}
          {lista.openSpots > 0 && (
            <p className="mt-1 text-sm text-green-300">
              {lista.openSpots === 1 ? 'Falta 1 vaga' : `Faltam ${lista.openSpots} vagas`}
            </p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-green-200">Lista de espera</h4>
          {lista.waitlist.length === 0 ? (
            <p className="mt-1 text-sm text-green-200">
              {lista.maxPlayers ? 'Ninguém na espera.' : 'Sem limite de vagas: todo mundo entra.'}
            </p>
          ) : (
            <ol className="mt-1 grid gap-1 text-sm" aria-label="Lista de espera">
              {lista.waitlist.map(linha)}
            </ol>
          )}
        </div>
      </div>

      {ehOrganizador && foraDaLista.length > 0 && (
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await executar(() => confirmarPresenca(partida.id, Number(adicionar)))) setAdicionar('')
          }}
        >
          <label className="text-sm">
            Pôr na lista
            <select
              value={adicionar}
              onChange={(e) => setAdicionar(e.target.value)}
              className="mt-1 block rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700"
            >
              <option value="">Escolha um jogador…</option>
              {foraDaLista.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nickname}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={enviando || !adicionar} className={`${botao} bg-green-800 hover:bg-green-700`}>
            Adicionar
          </button>
        </form>
      )}
    </div>
  )
}
