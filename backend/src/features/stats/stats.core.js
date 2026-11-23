// Núcleo puro das estatísticas e do ranking: só regras, sem banco nem Express.
// Recebe as partidas já lidas (com escalação e gols) e devolve números.
// Tudo sai das súmulas: nada disso é gravado (dado derivado não se duplica).
import { ValidationError } from '../../errors/AppError.js'

export const MINIMO_PARTIDAS_NO_RANKING = 3
const PONTOS = { vitoria: 3, empate: 1, derrota: 0 }

const arredondar2 = (n) => Math.round(n * 100) / 100

// Só partida finalizada vale: em andamento ou agendada ainda pode mudar.
const finalizadas = (partidas) => partidas.filter((p) => p.status === 'FINISHED')

function estatisticasZeradas(playerId) {
  return {
    playerId, matches: 0, wins: 0, draws: 0, losses: 0,
    goals: 0, assists: 0, goalsPerMatch: 0, goalDifference: 0,
  }
}

// Soma uma partida nas estatísticas de UM jogador (que já sabemos que jogou nela).
function acumular(stats, partida, time) {
  const adversario = time === 'A' ? 'B' : 'A'
  const doTime = partida.goals.filter((g) => g.team === time).length
  const doAdversario = partida.goals.filter((g) => g.team === adversario).length

  stats.matches += 1
  stats.goalDifference += doTime - doAdversario

  const ganhou = partida.result === (time === 'A' ? 'A_WINS' : 'B_WINS')
  if (partida.result === 'DRAW') stats.draws += 1
  else if (ganhou) stats.wins += 1
  else stats.losses += 1

  for (const g of partida.goals) {
    // Gol contra conta para o adversário e NÃO é gol do autor; não tem assistência.
    if (g.scorerId === stats.playerId && !g.ownGoal) stats.goals += 1
    if (g.assistId === stats.playerId) stats.assists += 1
  }
}

function fechar(stats) {
  stats.goalsPerMatch = stats.matches === 0 ? 0 : arredondar2(stats.goals / stats.matches)
  return stats
}

// Estatísticas de um jogador a partir das partidas dadas.
export function estatisticasDoJogador(playerId, partidas) {
  const stats = estatisticasZeradas(playerId)
  for (const partida of finalizadas(partidas)) {
    const escalado = partida.players.find((p) => p.playerId === playerId)
    if (escalado) acumular(stats, partida, escalado.team)
  }
  return fechar(stats)
}

// Ordem de desempate do ranking geral: pontos > saldo > gols > assistências > nome.
function compararGeral(a, b) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goals - a.goals ||
    b.assists - a.assists ||
    a.name.localeCompare(b.name, 'pt-BR')
  )
}

const comPosicao = (linhas) => linhas.map((linha, i) => ({ ...linha, position: i + 1 }))

// Monta o ranking geral e os dois secundários (artilharia e assistências).
// `jogadores` traz os cadastros (nome/apelido); quem não jogou nenhuma partida fica de fora.
export function montarRanking({ partidas, jogadores, minimoPartidas = MINIMO_PARTIDAS_NO_RANKING }) {
  const linhas = jogadores.map((jogador) => {
    const stats = estatisticasDoJogador(jogador.id, partidas)
    const points = stats.wins * PONTOS.vitoria + stats.draws * PONTOS.empate + stats.losses * PONTOS.derrota
    return { ...stats, name: jogador.name, nickname: jogador.nickname, points }
  })

  // Geral: exige o mínimo de partidas para ninguém liderar com uma única vitória.
  const geral = linhas.filter((l) => l.matches >= minimoPartidas).sort(compararGeral)

  // Secundários: sem mínimo (quem marcou, aparece). Menos partidas desempata a favor.
  const por = (campo) =>
    linhas
      .filter((l) => l[campo] > 0)
      .sort((a, b) => b[campo] - a[campo] || a.matches - b.matches || a.name.localeCompare(b.name, 'pt-BR'))

  return {
    geral: comPosicao(geral),
    artilharia: comPosicao(por('goals')),
    assistencias: comPosicao(por('assists')),
  }
}

// Intervalo [de, ate) em UTC: `de` inclusive, `ate` exclusive. null = sem limite.
// ⚠ Usa UTC (o servidor da Vercel roda em UTC): uma partida às 23h no Brasil de 30/11 já é 01/12 em UTC.
export function intervaloDoPeriodo(periodo, agora) {
  if (periodo === 'tudo') return { de: null, ate: null }
  if (periodo === 'mes') {
    return {
      de: new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1)),
      ate: new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() + 1, 1)),
    }
  }
  if (periodo === 'ano') {
    return {
      de: new Date(Date.UTC(agora.getUTCFullYear(), 0, 1)),
      ate: new Date(Date.UTC(agora.getUTCFullYear() + 1, 0, 1)),
    }
  }
  throw new ValidationError('Período inválido; use mes, ano ou tudo')
}

export function filtrarPorPeriodo(partidas, { de, ate }) {
  return partidas.filter((p) => {
    const data = new Date(p.date)
    return (!de || data >= de) && (!ate || data < ate)
  })
}

// Lê o filtro opcional ?de=&ate= (datas ISO, `ate` exclusive). Valor ausente = sem limite.
export function lerIntervaloExplicito({ de, ate }) {
  const ler = (valor, campo) => {
    if (valor === undefined || valor === '') return null
    const data = typeof valor === 'string' ? new Date(valor) : null
    if (!data || Number.isNaN(data.getTime())) {
      throw new ValidationError(`Data inválida em "${campo}"; use AAAA-MM-DD`)
    }
    return data
  }
  const inicio = ler(de, 'de')
  const fim = ler(ate, 'ate')
  if (inicio && fim && inicio >= fim) {
    throw new ValidationError('"de" deve ser anterior a "ate"')
  }
  return { de: inicio, ate: fim }
}

// Últimas partidas finalizadas do jogador (mais recentes primeiro) com V, E ou D,
// para o perfil. `golsPro`/`golsContra` são do time do jogador e do adversário.
export function ultimasPartidas(playerId, partidas, quantas = 5) {
  return finalizadas(partidas)
    .map((partida) => ({ partida, escalado: partida.players.find((p) => p.playerId === playerId) }))
    .filter(({ escalado }) => escalado)
    .sort((a, b) => new Date(b.partida.date) - new Date(a.partida.date) || b.partida.id - a.partida.id)
    .slice(0, quantas)
    .map(({ partida, escalado }) => {
      const adversario = escalado.team === 'A' ? 'B' : 'A'
      const resultado =
        partida.result === 'DRAW' ? 'E' : partida.result === (escalado.team === 'A' ? 'A_WINS' : 'B_WINS') ? 'V' : 'D'
      return {
        matchId: partida.id,
        date: partida.date,
        resultado,
        golsPro: partida.goals.filter((g) => g.team === escalado.team).length,
        golsContra: partida.goals.filter((g) => g.team === adversario).length,
      }
    })
}

// Mesmos valores do enum Position do schema.prisma.
export const POSICOES = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD']

// Lê o filtro opcional ?posicao= do ranking. Ausente ou vazio = sem filtro (null).
export function lerPosicao(valor) {
  if (valor === undefined || valor === '') return null
  if (typeof valor !== 'string' || !POSICOES.includes(valor)) {
    throw new ValidationError(`Posição inválida; use ${POSICOES.join(', ')}`)
  }
  return valor
}

// Período das estatísticas do jogador: ?periodo=mes|ano|tudo (igual ao ranking, em UTC)
// OU ?de=&ate=. Os dois juntos são ambíguos, então são recusados.
export function lerPeriodoDasEstatisticas(query, agora) {
  const temPeriodo = query.periodo !== undefined && query.periodo !== ''
  if (!temPeriodo) return lerIntervaloExplicito(query)
  if ((query.de ?? '') !== '' || (query.ate ?? '') !== '') {
    throw new ValidationError('Use "periodo" ou "de"/"ate", não os dois')
  }
  return intervaloDoPeriodo(typeof query.periodo === 'string' ? query.periodo : '', agora)
}
