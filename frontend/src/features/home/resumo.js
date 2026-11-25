// Busca e organiza os dados da home. Só REUSA as funções de API que já existem
// (histórico, partida, craque e ranking): nenhuma rota nova, nenhuma regra de negócio nova.
// Cada parte que falhar vira "sem dados" (null/[]): a home mostra estado vazio, nunca erro.
import { buscarHistorico } from '../matches/historyApi.js'
import { buscarCraque, buscarPartida } from '../matches/matchesApi.js'
import { buscarRanking } from '../rankings/rankingApi.js'

const ouNulo = (promessa) => promessa.catch(() => null)
const nomeDe = (linha) => linha?.nickname || linha?.name || 'Sem nome'

// Artilheiros de cada time na súmula. Gol contra não entra (não é gol do autor).
// gols: [{ team, ownGoal, scorer: { id, nickname } }] -> { A: [{ id, nome, gols }], B: [...] }
export function artilheirosPorTime(gols = []) {
  const porTime = { A: new Map(), B: new Map() }
  for (const gol of gols) {
    if (gol.ownGoal || !gol.scorer || !porTime[gol.team]) continue
    const mapa = porTime[gol.team]
    const atual = mapa.get(gol.scorer.id) ?? { id: gol.scorer.id, nome: nomeDe(gol.scorer), gols: 0 }
    mapa.set(gol.scorer.id, { ...atual, gols: atual.gols + 1 })
  }
  const ordenar = (mapa) => [...mapa.values()].sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome, 'pt-BR'))
  return { A: ordenar(porTime.A), B: ordenar(porTime.B) }
}

// Top 3 para o pódio. Prefere o ranking geral (pontos); se ninguém tiver o mínimo de jogos,
// usa a artilharia (gols), que não exige mínimo.
export function montarPodio(ranking) {
  const geral = ranking?.geral ?? []
  if (geral.length > 0) {
    return { criterio: 'pontos', linhas: geral.slice(0, 3).map((l) => ({ id: l.playerId, nome: nomeDe(l), valor: l.points })) }
  }
  const artilharia = ranking?.artilharia ?? []
  if (artilharia.length > 0) {
    return { criterio: 'gols', linhas: artilharia.slice(0, 3).map((l) => ({ id: l.playerId, nome: nomeDe(l), valor: l.goals })) }
  }
  return { criterio: null, linhas: [] }
}

// "Cobra da rodada": o craque votado pela galera na última partida (empate = os dois).
// Sem votos ainda, mostramos o artilheiro geral como plano B.
export function escolherCobra(votacao, ranking) {
  const craques = votacao?.craques ?? []
  if (craques.length > 0) {
    return {
      tipo: 'craque',
      id: craques[0].playerId,
      nome: craques.map(nomeDe).join(' e '),
      votos: craques[0].votes,
      empate: craques.length > 1,
    }
  }
  const artilheiro = ranking?.artilharia?.[0]
  if (artilheiro) return { tipo: 'artilheiro', id: artilheiro.playerId, nome: nomeDe(artilheiro), gols: artilheiro.goals }
  return null
}

export async function carregarResumoDaHome() {
  const [historico, ranking] = await Promise.all([
    ouNulo(buscarHistorico({ page: 1, pageSize: 1 })),
    ouNulo(buscarRanking('tudo')),
  ])
  const ultima = historico?.items?.[0] ?? null

  let partida = null
  let votacao = null
  if (ultima) {
    ;[partida, votacao] = await Promise.all([ouNulo(buscarPartida(ultima.id)), ouNulo(buscarCraque(ultima.id))])
  }

  return {
    ultimoJogo: ultima && {
      id: ultima.id,
      data: ultima.date,
      local: ultima.location,
      placar: ultima.score ?? { A: 0, B: 0 },
      // Nomes livres dos times ("Amarelo"), ou "Time A" / "Time B".
      nomes: { A: ultima.teamNames?.A || 'Time A', B: ultima.teamNames?.B || 'Time B' },
      // Pelada: não há um placar A x B; a home mostra quantos jogos teve e quem terminou na frente.
      pelada:
        ultima.format === 'PELADA'
          ? { jogos: ultima.gamesCount ?? 0, lider: ultima.leader ? ultima.teamNames?.[ultima.leader] || `Time ${ultima.leader}` : null }
          : null,
      artilheiros: artilheirosPorTime(partida?.goals),
    },
    podio: montarPodio(ranking),
    cobra: escolherCobra(votacao, ranking),
  }
}
