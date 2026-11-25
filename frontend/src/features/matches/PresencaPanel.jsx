import { useEffect, useState } from 'react'
import Icone from '../../ui/Icones.jsx'
import { buscarPresencas, confirmarConvidado, confirmarPresenca, levarConvidado, sairDaLista, tirarConvidado } from './matchesApi.js'
import { POSICOES } from '../players/PlayerForm.jsx'
import { nomeDoConvidado, textoDaLista } from './lances.js'
import { formatarData } from './textos.js'
import Avatar from '../../ui/Avatar.jsx'

const botao = 'rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50'

// Lista de presença da partida agendada (substitui a "lista do fut" do WhatsApp).
// Cada um confirma o próprio nome; passou das vagas, vai para a espera e sobe sozinho quando
// alguém sai. Quem não sabe se vai marca "talvez": fica na espera mesmo com vaga, até confirmar.
// Convidados (gente de fora do grupo) entram nas vagas que sobram depois do pessoal do grupo.
// O admin também põe e tira qualquer jogador (o amigo sem conta) e qualquer convidado.
// `aoMudar` avisa a página da lista nova (a escalação usa os confirmados).
export default function PresencaPanel({ partida, ehOrganizador, meuJogadorId, jogadores = [], aoMudar }) {
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [adicionar, setAdicionar] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [convidado, setConvidado] = useState('')
  // Posição escolhida para cada convidado que vai para os confirmados (vira jogador do grupo).
  const [posicaoDoConvidado, setPosicaoDoConvidado] = useState({})

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

  const podeLevarConvidado = Boolean(meuJogadorId) || ehOrganizador
  const convidados = lista.guests ?? []
  // Confirmados = pessoal do grupo + convidados que pegaram vaga.
  const totalDentro = lista.confirmed.length + convidados.filter((g) => g.status === 'CONFIRMED').length

  const linha = (l, i) => (
    <li key={l.playerId} className="flex items-center justify-between gap-2 rounded-lg bg-green-950 px-3 py-1.5">
      <span>
        <span className="tabular-nums text-green-300">{i + 1}.</span> <Avatar jogador={l} className="mr-1" />
        {l.nickname}
        {l.maybe && <span className="text-yellow-200"> (talvez)</span>}
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
              ? `· ${totalDentro}/${lista.maxPlayers} confirmados`
              : `· ${totalDentro} confirmados (sem limite de vagas)`}
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
            <>
              <button
                type="button"
                disabled={enviando}
                onClick={() => executar(() => confirmarPresenca(partida.id))}
                className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}
              >
                {lotada ? 'Entrar na lista de espera' : 'Confirmar presença'}
              </button>
              <button
                type="button"
                disabled={enviando}
                onClick={() => executar(() => confirmarPresenca(partida.id, { maybe: true }))}
                className={`${botao} bg-yellow-200 text-yellow-900 hover:bg-yellow-100`}
              >
                Talvez (fico na espera)
              </button>
            </>
          ) : (
            <>
              <span className="text-sm font-medium">
                {lista.me === 'CONFIRMED'
                  ? '✓ Você está confirmado'
                  : lista.me === 'MAYBE'
                    ? `Você está como talvez (${minhaPosicaoNaEspera}º da espera)`
                    : `Você é o ${minhaPosicaoNaEspera}º da lista de espera`}
              </span>
              {lista.me === 'MAYBE' && (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => executar(() => confirmarPresenca(partida.id, { maybe: false }))}
                  className={`${botao} bg-green-500 text-green-950 hover:bg-green-400`}
                >
                  {lotada ? 'Vou! Entrar na fila de espera' : 'Vou! Confirmar presença'}
                </button>
              )}
              {lista.me === 'CONFIRMED' && (
                <button
                  type="button"
                  disabled={enviando}
                  onClick={() => executar(() => confirmarPresenca(partida.id, { maybe: true }))}
                  className={`${botao} bg-yellow-200 text-yellow-900 hover:bg-yellow-100`}
                >
                  Mudar para talvez
                </button>
              )}
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
              {lista.maxPlayers ? 'Ninguém na espera.' : 'Sem limite de vagas: só fica na espera quem marcou talvez.'}
            </p>
          ) : (
            <ol className="mt-1 grid gap-1 text-sm" aria-label="Lista de espera">
              {lista.waitlist.map(linha)}
            </ol>
          )}
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-green-200">Convidados</h4>
        <p className="text-xs text-green-300">
          Gente de fora do grupo. Entra nas vagas que sobram depois do pessoal do grupo. Para ele entrar na escalação,
          clique em Confirmar: ele vira jogador do grupo.
        </p>
        {convidados.length === 0 ? (
          <p className="mt-1 text-sm text-green-200">Nenhum convidado.</p>
        ) : (
          <ol className="mt-1 grid gap-1 text-sm" aria-label="Convidados">
            {convidados.map((g, i) => {
              const podeTirar = ehOrganizador || (meuJogadorId && g.invitedBy?.playerId === meuJogadorId)
              return (
                <li key={g.id} className="flex items-center justify-between gap-2 rounded-lg bg-green-950 px-3 py-1.5">
                  <span>
                    <span className="tabular-nums text-green-300">{i + 1}.</span> {nomeDoConvidado(g)}
                    {g.status === 'WAITLIST' && <span className="text-yellow-200"> · na espera</span>}
                  </span>
                  {podeTirar && (
                    <span className="flex flex-wrap items-center gap-1">
                      {/* Vira jogador do grupo e entra nos confirmados (e assim na escalação). */}
                      <select
                        aria-label={`Posição de ${g.name}`}
                        value={posicaoDoConvidado[g.id] ?? 'MIDFIELDER'}
                        onChange={(e) => setPosicaoDoConvidado((atual) => ({ ...atual, [g.id]: e.target.value }))}
                        className="rounded bg-green-900 px-1 py-0.5 text-xs ring-1 ring-green-700"
                      >
                        {Object.entries(POSICOES).map(([valor, texto]) => (
                          <option key={valor} value={valor}>
                            {texto}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() =>
                          executar(() => confirmarConvidado(partida.id, g.id, posicaoDoConvidado[g.id] ?? 'MIDFIELDER'))
                        }
                        aria-label={`Pôr ${g.name} nos confirmados`}
                        className="rounded bg-green-700 px-2 py-0.5 text-xs font-semibold hover:bg-green-600 disabled:opacity-50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        disabled={enviando}
                        onClick={() => executar(() => tirarConvidado(partida.id, g.id))}
                        aria-label={`Tirar o convidado ${g.name}`}
                        className="rounded p-1 text-green-300 hover:bg-green-800 hover:text-white disabled:opacity-50"
                      >
                        <Icone nome="fechar" tamanho={16} />
                      </button>
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {podeLevarConvidado && (
          <form
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (await executar(() => levarConvidado(partida.id, convidado))) setConvidado('')
            }}
          >
            <label className="text-sm">
              Levar um convidado
              <input
                value={convidado}
                onChange={(e) => setConvidado(e.target.value)}
                minLength={2}
                maxLength={40}
                placeholder="Nome do convidado"
                className="mt-1 block rounded-lg bg-green-950 px-3 py-2 text-white ring-1 ring-green-700"
              />
            </label>
            <button
              type="submit"
              disabled={enviando || convidado.trim().length < 2}
              className={`${botao} bg-green-800 hover:bg-green-700`}
            >
              Adicionar convidado
            </button>
          </form>
        )}
      </div>

      {ehOrganizador && foraDaLista.length > 0 && (
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            if (await executar(() => confirmarPresenca(partida.id, { playerId: Number(adicionar) }))) setAdicionar('')
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
