// Núcleo puro das estatísticas e do ranking: só regras, sem banco nem Express.
// Recebe as partidas já lidas (com escalação e gols) e devolve números.
// Tudo sai das súmulas: nada disso é gravado (dado derivado não se duplica).
import { ValidationError } from '../../errors/AppError.js'
import { desempenhoNoJogo } from '../matches/pelada.core.js'

export const MINIMO_PARTIDAS_NO_RANKING = 3
const PONTOS = { vitoria: 3, empate: 1, derrota: 0 }

const arredondar2 = (n) => Math.round(n * 100) / 100

// Só partida finalizada vale: em andamento ou agendada ainda pode mudar.
const finalizadas = (partidas) => partidas.filter((p) => p.status === 'FINISHED')

function estatisticasZeradas(playerId) {
  return {
    playerId, matches: 0, wins: 0, draws: 0, losses: 0,
    goals: 0, assists: 0, goalsPerMatch: 0, goalDifference: 0,
    yellowCards: 0, redCards: 0, difficultSaves: 0,
  }
}

// Vitórias, empates, derrotas e saldo do time de um jogador na partida.
// Jogo único: o resultado da partida. Pelada: soma de cada JOGO em que o time dele entrou
// (numa noite de pelada dá para ganhar 4 e perder 1, por exemplo).
function desempenhoNaPartida(partida, time) {
  if (partida.format === 'PELADA') {
    const jogos = (partida.games ?? []).map((j) => desempenhoNoJogo(j, time, partida.goals)).filter(Boolean)
    return {
      jogos: jogos.length,
      wins: jogos.filter((j) => j.resultado === 'V').length,
      draws: jogos.filter((j) => j.resultado === 'E').length,
      losses: jogos.filter((j) => j.resultado === 'D').length,
      saldo: jogos.reduce((s, j) => s + j.pro - j.contra, 0),
      pro: jogos.reduce((s, j) => s + j.pro, 0),
      contra: jogos.reduce((s, j) => s + j.contra, 0),
    }
  }
  const adversario = time === 'A' ? 'B' : 'A'
  const pro = partida.goals.filter((g) => g.team === time).length
  const contra = partida.goals.filter((g) => g.team === adversario).length
  const ganhou = partida.result === (time === 'A' ? 'A_WINS' : 'B_WINS')
  const empate = partida.result === 'DRAW'
  return {
    jogos: 1,
    wins: !empate && ganhou ? 1 : 0,
    draws: empate ? 1 : 0,
    losses: !empate && !ganhou ? 1 : 0,
    saldo: pro - contra,
    pro,
    contra,
  }
}

// Soma uma partida nas estatísticas de UM jogador (que já sabemos que jogou nela).
// `matches` (o "J" da tela) conta JOGOS, não noites: no jogo único é 1; na pelada, cada jogo
// em que o time dele entrou. Assim J = V + E + D sempre (antes a pelada contava 1 no J e
// vários jogos no V/E/D, e a conta não fechava).
function acumular(stats, partida, time) {
  const d = desempenhoNaPartida(partida, time)
  stats.matches += d.jogos
  stats.goalDifference += d.saldo
  stats.wins += d.wins
  stats.draws += d.draws
  stats.losses += d.losses
  acumularLances(stats, partida)
}

function acumularLances(stats, partida) {
  for (const g of partida.goals) {
    // Gol contra conta para o adversário e NÃO é gol do autor; não tem assistência.
    if (g.scorerId === stats.playerId && !g.ownGoal) stats.goals += 1
    if (g.assistId === stats.playerId) stats.assists += 1
  }

  // Cartões e defesas difíceis (partidas antigas, de antes dos lances, não têm `events`).
  const campoDoTipo = { YELLOW_CARD: 'yellowCards', RED_CARD: 'redCards', DIFFICULT_SAVE: 'difficultSaves' }
  for (const e of partida.events ?? []) {
    if (e.playerId === stats.playerId) stats[campoDoTipo[e.type]] += 1
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

// Monta o ranking geral e os secundários (artilharia, assistências e defesas difíceis).
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
    defesas: comPosicao(por('difficultSaves')),
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
      const d = desempenhoNaPartida(partida, escalado.team)
      // Pelada: uma noite tem vários jogos, então não existe UM resultado nem UM placar.
      // Em vez de inventar um (somar os placares dava "E 3x3" para quem ganhou 1 e perdeu 1),
      // a pelada sai com a campanha da noite (wins/draws/losses) e resultado null.
      if (partida.format === 'PELADA') {
        return {
          matchId: partida.id,
          date: partida.date,
          format: 'PELADA',
          resultado: null,
          wins: d.wins,
          draws: d.draws,
          losses: d.losses,
        }
      }
      const resultado = d.wins > 0 ? 'V' : d.losses > 0 ? 'D' : 'E'
      return { matchId: partida.id, date: partida.date, resultado, golsPro: d.pro, golsContra: d.contra }
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
