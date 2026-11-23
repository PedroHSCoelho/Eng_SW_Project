import { useEffect, useState } from 'react'
import { avaliar, buscarDestaque, buscarMinhas, buscarPendentes } from './ratingsApi.js'

const campo =
  'rounded-lg bg-green-950 px-2 py-1 text-white ring-1 ring-green-700 focus:outline-none focus:ring-2 focus:ring-green-400'

const formatarPrazo = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// Uma linha por jogador: nota de 1 a 5 e comentário opcional. Com `inicial`, é a edição de uma nota já dada.
function LinhaDeAvaliacao({ jogador, inicial, enviando, aoAvaliar }) {
  const [nota, setNota] = useState(inicial ? String(inicial.score) : '')
  const [comentario, setComentario] = useState(inicial?.comment ?? '')

  return (
    <li className="rounded-lg bg-green-950 px-3 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          aoAvaliar({ ratedId: jogador.playerId, score: Number(nota), comment: comentario })
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <span className="w-24 font-semibold">{jogador.nickname}</span>
        <label className="text-sm">
          Nota de {jogador.nickname}
          <select className={`${campo} ml-2`} value={nota} onChange={(e) => setNota(e.target.value)} required>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-sm">
          Comentário (opcional)
          <input
            className={`${campo} ml-2 w-full`}
            value={comentario}
            maxLength={200}
            onChange={(e) => setComentario(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={enviando || !nota}
          className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-green-950 hover:bg-green-400 disabled:opacity-50"
          aria-label={inicial ? `Atualizar nota de ${jogador.nickname}` : `Avaliar ${jogador.nickname}`}
        >
          {inicial ? 'Atualizar' : 'Avaliar'}
        </button>
      </form>
    </li>
  )
}

// Painel pós-partida (só para partida finalizada). Todos veem o destaque; só quem jogou avalia.
// As regras (48h, só participantes, sem autoavaliação) são do back-end; aqui só mostramos o que ele manda.
export default function RatingsPanel({ matchId, podeAvaliar }) {
  const [destaque, setDestaque] = useState(null)
  const [pendentes, setPendentes] = useState(null)
  const [minhas, setMinhas] = useState([])
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let ativo = true
    buscarDestaque(matchId)
      .then((d) => ativo && setDestaque(d))
      .catch((e) => ativo && setErro(e.message))
    if (podeAvaliar) {
      Promise.all([buscarPendentes(matchId), buscarMinhas(matchId)])
        .then(([p, m]) => {
          if (!ativo) return
          setPendentes(p)
          setMinhas(m)
        })
        .catch((e) => ativo && setErro(e.message))
    }
    return () => {
      ativo = false
    }
  }, [matchId, podeAvaliar])

  async function enviar(nota) {
    setErro('')
    setEnviando(true)
    try {
      await avaliar(matchId, nota)
      // Recarrega tudo da API (ela é a fonte da verdade, inclusive para o prazo e para o destaque).
      const [p, m, d] = await Promise.all([buscarPendentes(matchId), buscarMinhas(matchId), buscarDestaque(matchId)])
      setPendentes(p)
      setMinhas(m)
      setDestaque(d)
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviando(false)
    }
  }

  const apelido = (m) => m.nickname ?? `Jogador ${m.ratedId}`

  return (
    <div className="mt-8" aria-labelledby="titulo-avaliacoes" role="region">
      <h3 id="titulo-avaliacoes" className="text-lg font-semibold">
        ⭐ Avaliações
      </h3>

      {erro && (
        <p role="alert" className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm text-red-800">
          {erro}
        </p>
      )}

      {destaque ? (
        <p className="mt-3 rounded-xl bg-yellow-100 px-4 py-3 text-yellow-900">
          🌟 Destaque da partida: <strong>{destaque.nickname ?? `Jogador ${destaque.playerId}`}</strong> (média{' '}
          {destaque.average.toFixed(1)}, {destaque.goals} {destaque.goals === 1 ? 'gol' : 'gols'})
        </p>
      ) : (
        <p className="mt-3 text-sm text-green-200">
          O destaque aparece quando algum jogador tiver pelo menos 3 avaliações.
        </p>
      )}

      {podeAvaliar && pendentes && (
        <div className="mt-4">
          {!pendentes.open ? (
            <p className="text-green-200">O prazo de avaliação desta partida terminou.</p>
          ) : pendentes.pending.length === 0 ? (
            <p className="text-green-200">✅ Você avaliou todos os jogadores desta partida.</p>
          ) : (
            <>
              <p className="text-sm text-green-200">
                Avalie até {formatarPrazo(pendentes.deadline)}.{' '}
                {pendentes.pending.length === 1 ? 'Falta 1 jogador' : `Faltam ${pendentes.pending.length} jogadores`}.
                Sua nota é anônima.
              </p>
              <ul className="mt-3 grid gap-2">
                {pendentes.pending.map((j) => (
                  <LinhaDeAvaliacao key={j.playerId} jogador={j} enviando={enviando} aoAvaliar={enviar} />
                ))}
              </ul>
            </>
          )}

          {minhas.length > 0 && (
            <div className="mt-5">
              <h4 className="font-semibold">Suas avaliações</h4>
              {pendentes.open ? (
                <>
                  <p className="text-sm text-green-200">Você pode mudar uma nota até o fim do prazo.</p>
                  <ul className="mt-2 grid gap-2">
                    {minhas.map((m) => (
                      <LinhaDeAvaliacao
                        // A chave inclui a nota: depois de salvar, a linha reinicia com os valores novos.
                        key={`${m.ratedId}-${m.score}-${m.comment ?? ''}`}
                        jogador={{ playerId: m.ratedId, nickname: apelido(m) }}
                        inicial={m}
                        enviando={enviando}
                        aoAvaliar={enviar}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                <ul className="mt-2 text-sm text-green-100">
                  {minhas.map((m) => (
                    <li key={m.ratedId}>
                      {apelido(m)}: nota {m.score}
                      {m.comment ? ` — ${m.comment}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
