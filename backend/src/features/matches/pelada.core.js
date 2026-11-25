// Núcleo puro do formato Pelada: vários times na mesma partida e vários jogos na noite,
// sempre dois times por jogo ("quem ganha fica"). Só regras, sem banco nem Express.
// O jogo único (SINGLE_GAME) continua com os times A e B e nenhum jogo cadastrado.
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'

// Mesmos valores do enum Team do schema.prisma, na ordem.
export const TIMES = ['A', 'B', 'C', 'D', 'E', 'F']
export const FORMATOS = ['SINGLE_GAME', 'PELADA']
export const MINIMO_DE_TIMES_NA_PELADA = 3
export const MAXIMO_DE_TIMES_NA_PELADA = 6

export const ehPelada = (partida) => partida.format === 'PELADA'

// Times que a partida usa: A e B no jogo único; A, B, C... (teamCount) na pelada.
export const timesDaPartida = (partida) => TIMES.slice(0, partida.teamCount ?? 2)

// Formato e quantidade de times vindos do corpo. Sem formato = jogo único (como era antes).
export function lerFormato(dados) {
  const format = dados.format ?? 'SINGLE_GAME'
  if (!FORMATOS.includes(format)) {
    throw new ValidationError('Formato inválido; use SINGLE_GAME (jogo único) ou PELADA')
  }
  if (format === 'SINGLE_GAME') {
    if (dados.teamCount !== undefined && dados.teamCount !== null && dados.teamCount !== 2) {
      throw new ValidationError('Jogo único tem sempre 2 times')
    }
    return { format, teamCount: 2 }
  }
  const teamCount = dados.teamCount ?? MINIMO_DE_TIMES_NA_PELADA
  if (
    !Number.isInteger(teamCount) ||
    teamCount < MINIMO_DE_TIMES_NA_PELADA ||
    teamCount > MAXIMO_DE_TIMES_NA_PELADA
  ) {
    throw new ValidationError(
      `A pelada tem de ${MINIMO_DE_TIMES_NA_PELADA} a ${MAXIMO_DE_TIMES_NA_PELADA} times (teamCount)`,
    )
  }
  return { format, teamCount }
}

// O jogo que está rolando agora (no máximo um por vez), ou undefined.
export const jogoAberto = (partida) => (partida.games ?? []).find((j) => !j.finishedAt)

// Time de quem está EM CAMPO (quem saiu numa substituição não recebe lances até voltar).
export const timeDoJogador = (partida, playerId) =>
  partida.players.find((p) => p.playerId === playerId && !p.benched)?.team

// Lê o corpo de "começar jogo": { homeTeam: 'A', awayTeam: 'C' }.
export function lerDadosDoJogo(dados) {
  const { homeTeam, awayTeam } = dados
  if (!TIMES.includes(homeTeam) || !TIMES.includes(awayTeam)) {
    throw new ValidationError('Escolha os dois times do jogo (homeTeam e awayTeam, de A a F)')
  }
  return { homeTeam, awayTeam }
}

// Regras para começar um jogo da pelada:
//  1. a partida é pelada e está em andamento;
//  2. não há outro jogo aberto (encerre o atual antes);
//  3. são dois times DIFERENTES, ambos da partida.
// Devolve o jogo pronto para gravar, com o número na ordem da noite.
export function montarJogo({ partida, jogo }) {
  if (!ehPelada(partida)) throw new BusinessRuleError('Só a pelada tem vários jogos; o jogo único não')
  if (partida.status !== 'IN_PROGRESS') {
    throw new BusinessRuleError('Os jogos só começam com a partida em andamento')
  }
  if (jogoAberto(partida)) throw new BusinessRuleError('Encerre o jogo atual antes de começar outro')
  if (jogo.homeTeam === jogo.awayTeam) throw new BusinessRuleError('Um time não joga contra ele mesmo')
  const times = timesDaPartida(partida)
  if (!times.includes(jogo.homeTeam) || !times.includes(jogo.awayTeam)) {
    throw new BusinessRuleError(`Esta pelada tem os times ${times.join(', ')}`)
  }
  return { ...jogo, number: (partida.games ?? []).length + 1 }
}

// Placar de um jogo: gols com o gameId dele, pelo time que ganhou o ponto.
export function placarDoJogo(jogo, gols) {
  const doJogo = gols.filter((g) => g.gameId === jogo.id)
  return {
    home: doJogo.filter((g) => g.team === jogo.homeTeam).length,
    away: doJogo.filter((g) => g.team === jogo.awayTeam).length,
  }
}

export function resultadoDoJogo({ home, away }) {
  if (home > away) return 'HOME_WINS'
  if (away > home) return 'AWAY_WINS'
  return 'DRAW'
}

// Encerrar um jogo: precisa ser um jogo desta partida que ainda está aberto.
export function verificarPodeEncerrarJogo(partida, gameId) {
  const jogo = (partida.games ?? []).find((j) => j.id === gameId)
  if (!jogo) return null // o serviço responde 404
  if (jogo.finishedAt) throw new BusinessRuleError('Este jogo já foi encerrado')
  return jogo
}

// Gol ou lance na pelada: só com um jogo aberto e de quem está num dos dois times dele.
// Devolve o jogo (o gol/lance é gravado com o gameId dele).
export function verificarLanceNoJogo(partida, playerId) {
  const jogo = jogoAberto(partida)
  if (!jogo) throw new BusinessRuleError('Comece um jogo (escolha os dois times) antes de lançar gols e lances')
  const time = timeDoJogador(partida, playerId)
  if (time !== jogo.homeTeam && time !== jogo.awayTeam) {
    throw new BusinessRuleError(`Este jogo é Time ${jogo.homeTeam} x Time ${jogo.awayTeam}; o jogador está fora dele`)
  }
  return jogo
}

// Vitória, empate e derrota de um time num jogo encerrado (ou null se o time não jogou).
export function desempenhoNoJogo(jogo, time, gols) {
  if (!jogo.result || (jogo.homeTeam !== time && jogo.awayTeam !== time)) return null
  const { home, away } = placarDoJogo(jogo, gols)
  const emCasa = jogo.homeTeam === time
  const pro = emCasa ? home : away
  const contra = emCasa ? away : home
  const resultado = jogo.result === 'DRAW' ? 'E' : (jogo.result === 'HOME_WINS') === emCasa ? 'V' : 'D'
  return { resultado, pro, contra }
}

// Classificação da noite, por time: jogos, V/E/D, gols e pontos (3/1/0). Mais pontos, saldo, gols.
export function classificacaoDaPelada(partida) {
  const gols = partida.goals ?? []
  const linhas = timesDaPartida(partida).map((time) => {
    const linha = { team: time, games: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }
    for (const jogo of partida.games ?? []) {
      const d = desempenhoNoJogo(jogo, time, gols)
      if (!d) continue
      linha.games += 1
      linha.goalsFor += d.pro
      linha.goalsAgainst += d.contra
      if (d.resultado === 'V') linha.wins += 1
      else if (d.resultado === 'E') linha.draws += 1
      else linha.losses += 1
    }
    linha.points = linha.wins * 3 + linha.draws
    return linha
  })
  return linhas.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor ||
      a.team.localeCompare(b.team),
  )
}
