// Núcleo puro das estatísticas e do ranking: cenários montados à mão, sem banco nem HTTP.
import { describe, expect, it } from 'vitest'
import {
  estatisticasDoJogador,
  filtrarPorPeriodo,
  intervaloDoPeriodo,
  lerIntervaloExplicito,
  lerPeriodoDasEstatisticas,
  lerPosicao,
  montarRanking,
  ultimasPartidas,
} from '../src/features/stats/core/stats.core.js'

// Atalhos para montar partidas finalizadas.
const gol = (scorerId, team, extra = {}) => ({ scorerId, assistId: null, team, ownGoal: false, ...extra })
const partida = (id, { time, result, goals = [], status = 'FINISHED', date = '2026-11-10T20:00:00Z' }) => ({
  id,
  status,
  result,
  date,
  players: Object.entries(time).map(([playerId, team]) => ({ playerId: Number(playerId), team })),
  goals,
})

describe('estatisticasDoJogador', () => {
  it('jogador sem partidas: tudo zerado, inclusive gols por partida', () => {
    expect(estatisticasDoJogador(1, [])).toEqual({
      playerId: 1, matches: 0, wins: 0, draws: 0, losses: 0,
      goals: 0, assists: 0, goalsPerMatch: 0, goalDifference: 0,
      yellowCards: 0, redCards: 0, difficultSaves: 0,
    })
  })

  it('conta cartões e defesas difíceis do jogador (partida sem `events` conta zero)', () => {
    const partidas = [
      {
        id: 1, status: 'FINISHED', result: 'DRAW', date: '2026-11-01',
        players: [{ playerId: 1, team: 'A' }, { playerId: 2, team: 'B' }],
        goals: [],
        events: [
          { playerId: 1, type: 'YELLOW_CARD' },
          { playerId: 1, type: 'DIFFICULT_SAVE' },
          { playerId: 1, type: 'DIFFICULT_SAVE' },
          { playerId: 2, type: 'RED_CARD' },
        ],
      },
      { id: 2, status: 'FINISHED', result: 'DRAW', date: '2026-11-02', players: [{ playerId: 1, team: 'A' }], goals: [] },
    ]
    expect(estatisticasDoJogador(1, partidas)).toMatchObject({ matches: 2, yellowCards: 1, redCards: 0, difficultSaves: 2 })
    expect(estatisticasDoJogador(2, partidas)).toMatchObject({ matches: 1, redCards: 1 })
  })

  it('conta vitória, empate e derrota pelo time em que o jogador estava', () => {
    const partidas = [
      partida(1, { time: { 1: 'A', 2: 'B' }, result: 'A_WINS', goals: [gol(1, 'A')] }), // 1 ganhou
      partida(2, { time: { 1: 'B', 2: 'A' }, result: 'A_WINS', goals: [gol(2, 'A')] }), // 1 perdeu (estava no B)
      partida(3, { time: { 1: 'A', 2: 'B' }, result: 'DRAW' }), // empate
    ]
    expect(estatisticasDoJogador(1, partidas)).toMatchObject({ matches: 3, wins: 1, draws: 1, losses: 1 })
  })

  it('soma gols e assistências e calcula gols por partida com 2 casas', () => {
    const partidas = [
      partida(1, { time: { 1: 'A', 2: 'A', 3: 'B' }, result: 'A_WINS', goals: [gol(1, 'A', { assistId: 2 }), gol(1, 'A')] }),
      partida(2, { time: { 1: 'A', 2: 'A', 3: 'B' }, result: 'A_WINS', goals: [gol(2, 'A', { assistId: 1 })] }),
      partida(3, { time: { 1: 'B', 2: 'A', 3: 'A' }, result: 'DRAW' }),
    ]
    const stats = estatisticasDoJogador(1, partidas)
    expect(stats).toMatchObject({ goals: 2, assists: 1, matches: 3 })
    expect(stats.goalsPerMatch).toBe(0.67) // 2 / 3 arredondado
  })

  it('gol contra NÃO conta como gol do autor', () => {
    const partidas = [
      partida(1, { time: { 1: 'A', 2: 'B' }, result: 'B_WINS', goals: [gol(1, 'B', { ownGoal: true })] }),
    ]
    const stats = estatisticasDoJogador(1, partidas)
    expect(stats.goals).toBe(0)
    expect(stats.losses).toBe(1) // o gol contra deu o placar ao adversário
  })

  it('só partidas finalizadas contam', () => {
    const partidas = [
      partida(1, { time: { 1: 'A', 2: 'B' }, result: 'A_WINS', goals: [gol(1, 'A')] }),
      partida(2, { time: { 1: 'A', 2: 'B' }, result: null, status: 'IN_PROGRESS', goals: [gol(1, 'A')] }),
      partida(3, { time: { 1: 'A', 2: 'B' }, result: null, status: 'SCHEDULED' }),
    ]
    expect(estatisticasDoJogador(1, partidas)).toMatchObject({ matches: 1, goals: 1 })
  })

  it('partida em que o jogador não foi escalado não conta', () => {
    const partidas = [partida(1, { time: { 2: 'A', 3: 'B' }, result: 'A_WINS', goals: [gol(2, 'A')] })]
    expect(estatisticasDoJogador(1, partidas).matches).toBe(0)
  })

  it('saldo de gols = gols do time do jogador menos os do adversário, somado nas partidas', () => {
    const partidas = [
      // Time A (jogador 1) fez 3 e sofreu 1 -> +2
      partida(1, { time: { 1: 'A', 2: 'B' }, result: 'A_WINS', goals: [gol(1, 'A'), gol(1, 'A'), gol(1, 'A'), gol(2, 'B')] }),
      // Jogador 1 no time B, que fez 0 e sofreu 2 -> -2
      partida(2, { time: { 1: 'B', 2: 'A' }, result: 'A_WINS', goals: [gol(2, 'A'), gol(2, 'A')] }),
    ]
    expect(estatisticasDoJogador(1, partidas).goalDifference).toBe(0)
  })
})

describe('montarRanking: pontos e ordem', () => {
  const jogadores = [
    { id: 1, name: 'Ana', nickname: 'Ana' },
    { id: 2, name: 'Bia', nickname: 'Bia' },
    { id: 3, name: 'Caio', nickname: 'Caio' },
    { id: 4, name: 'Davi', nickname: 'Davi' },
  ]
  // Cada jogador precisa de 3 partidas para entrar; usamos 3 partidas com os mesmos 4 jogadores.
  const times = (a, b) => ({ [a[0]]: 'A', [a[1]]: 'A', [b[0]]: 'B', [b[1]]: 'B' })

  it('vitória vale 3, empate 1 e derrota 0', () => {
    const partidas = [
      partida(1, { time: times([1, 2], [3, 4]), result: 'A_WINS', goals: [gol(1, 'A')] }),
      partida(2, { time: times([1, 2], [3, 4]), result: 'DRAW' }),
      partida(3, { time: times([1, 2], [3, 4]), result: 'A_WINS', goals: [gol(2, 'A')] }),
    ]
    const { geral } = montarRanking({ partidas, jogadores })
    const pontos = Object.fromEntries(geral.map((l) => [l.playerId, l.points]))
    expect(pontos).toEqual({ 1: 7, 2: 7, 3: 1, 4: 1 }) // 3+1+3 e 0+1+0
  })

  it('só entra quem tem pelo menos 3 partidas', () => {
    const partidas = [
      partida(1, { time: times([1, 2], [3, 4]), result: 'A_WINS' }),
      partida(2, { time: times([1, 2], [3, 4]), result: 'A_WINS' }),
      partida(3, { time: { 1: 'A', 2: 'A', 3: 'B' }, result: 'A_WINS' }), // o 4 não jogou a 3ª
    ]
    const { geral } = montarRanking({ partidas, jogadores })
    expect(geral.map((l) => l.playerId).sort()).toEqual([1, 2, 3]) // o 4 tem só 2 partidas
  })

  it('o mínimo de partidas é configurável', () => {
    const partidas = [partida(1, { time: times([1, 2], [3, 4]), result: 'A_WINS' })]
    expect(montarRanking({ partidas, jogadores }).geral).toEqual([])
    expect(montarRanking({ partidas, jogadores, minimoPartidas: 1 }).geral).toHaveLength(4)
  })

  it('devolve posição (1, 2, 3...) em cada linha', () => {
    const partidas = [1, 2, 3].map((id) => partida(id, { time: times([1, 2], [3, 4]), result: 'A_WINS' }))
    const { geral } = montarRanking({ partidas, jogadores })
    expect(geral.map((l) => l.position)).toEqual([1, 2, 3, 4])
  })
})

describe('montarRanking: desempates (pontos > saldo > gols > assistências > nome)', () => {
  // Linhas com mesmo total de pontos, para só o desempate decidir.
  const jogadores = [
    { id: 1, name: 'Zeca', nickname: 'Zeca' },
    { id: 2, name: 'Ana', nickname: 'Ana' },
  ]
  // 3 partidas empatadas: ambos com 3 pontos; times diferentes só para variar gols/saldo.
  const tresEmpates = (goalsFn) =>
    [1, 2, 3].map((id) => partida(id, { time: { 1: 'A', 2: 'B' }, result: 'DRAW', goals: goalsFn(id) }))
  const ids = (ranking) => ranking.geral.map((l) => l.playerId)

  it('1º critério: pontos', () => {
    const partidas = [
      partida(1, { time: { 1: 'A', 2: 'B' }, result: 'B_WINS', goals: [gol(2, 'B')] }),
      partida(2, { time: { 1: 'A', 2: 'B' }, result: 'DRAW' }),
      partida(3, { time: { 1: 'A', 2: 'B' }, result: 'DRAW' }),
    ]
    expect(ids(montarRanking({ partidas, jogadores }))).toEqual([2, 1])
  })

  it('2º critério: saldo de gols do time nas partidas do jogador', () => {
    // Mesmos pontos (jogador 1 ganha 1 e perde 1; jogador 2 faz o inverso... ) -> usamos dois times por partida
    const partidas = [
      // jogador 1 no time A: ganha por 3x0 (+3); jogador 2 no time B perde 0x3
      partida(1, { time: { 1: 'A', 2: 'B' }, result: 'A_WINS', goals: [gol(1, 'A'), gol(1, 'A'), gol(1, 'A')] }),
      // inverte os times: jogador 1 no B perde 0x1 (-1); jogador 2 no A ganha 1x0 (+1)
      partida(2, { time: { 1: 'B', 2: 'A' }, result: 'A_WINS', goals: [gol(2, 'A')] }),
      partida(3, { time: { 1: 'A', 2: 'B' }, result: 'DRAW' }),
    ]
    // Ambos: 1 vitória, 1 derrota, 1 empate = 4 pontos. Saldo: jogador 1 = +3 -1 = +2; jogador 2 = -3 +1 = -2.
    expect(ids(montarRanking({ partidas, jogadores }))).toEqual([1, 2])
  })

  it('3º critério: gols (quando pontos e saldo empatam)', () => {
    const js = [
      { id: 1, name: 'Ana', nickname: 'Ana' },
      { id: 2, name: 'Bia', nickname: 'Bia' },
      { id: 3, name: 'Caio', nickname: 'Caio' },
      { id: 4, name: 'Davi', nickname: 'Davi' },
    ]
    // 3 empates 1x1: 3 (time A) e 2 (time B) fazem os gols. Todos: 3 pontos e saldo 0.
    // Gols: 2 e 3 têm 3 cada; 1 e 4 têm 0. Pelo nome, Ana (0 gols) ganharia de Bia: só os gols desempatam.
    const partidas = [1, 2, 3].map((id) =>
      partida(id, { time: { 1: 'A', 3: 'A', 2: 'B', 4: 'B' }, result: 'DRAW', goals: [gol(3, 'A'), gol(2, 'B')] }),
    )
    const ordem = ids(montarRanking({ partidas, jogadores: js }))
    expect(ordem.indexOf(2)).toBeLessThan(ordem.indexOf(1)) // Bia (3 gols) antes de Ana (0)
    expect(ordem.indexOf(3)).toBeLessThan(ordem.indexOf(4)) // Caio (3 gols) antes de Davi (0)
  })

  it('4º critério: assistências', () => {
    const outros = { 1: 'A', 2: 'B', 3: 'A', 4: 'B' }
    const js = [
      { id: 1, name: 'Zeca', nickname: 'Zeca' },
      { id: 2, name: 'Ana', nickname: 'Ana' },
      { id: 3, name: 'Mia', nickname: 'Mia' },
      { id: 4, name: 'Leo', nickname: 'Leo' },
    ]
    // Empates 1x1 em 3 partidas: gols de 3 (time A) e de 4 (time B); assistências de 1 (A) e 2 (B).
    // 1 dá 2 assistências, 2 dá 1: mesmos pontos, saldo 0 e gols 0 para 1 e 2.
    const partidas = [
      partida(1, { time: outros, result: 'DRAW', goals: [gol(3, 'A', { assistId: 1 }), gol(4, 'B', { assistId: 2 })] }),
      partida(2, { time: outros, result: 'DRAW', goals: [gol(3, 'A', { assistId: 1 }), gol(4, 'B')] }),
      partida(3, { time: outros, result: 'DRAW', goals: [gol(3, 'A'), gol(4, 'B')] }),
    ]
    const ordem = ids(montarRanking({ partidas, jogadores: js }))
    expect(ordem.indexOf(1)).toBeLessThan(ordem.indexOf(2))
  })

  it('último critério: nome em ordem alfabética', () => {
    const partidas = [1, 2, 3].map((id) => partida(id, { time: { 1: 'A', 2: 'B' }, result: 'DRAW' }))
    // Zeca (id 1) e Ana (id 2) empatam em tudo: Ana vem primeiro.
    expect(ids(montarRanking({ partidas, jogadores }))).toEqual([2, 1])
  })
})

describe('montarRanking: artilharia e assistências', () => {
  const jogadores = [
    { id: 1, name: 'Ana', nickname: 'Ana' },
    { id: 2, name: 'Bia', nickname: 'Bia' },
    { id: 3, name: 'Caio', nickname: 'Caio' },
  ]
  const partidas = [
    partida(1, { time: { 1: 'A', 2: 'A', 3: 'B' }, result: 'A_WINS', goals: [gol(1, 'A', { assistId: 2 }), gol(1, 'A', { assistId: 2 }), gol(2, 'A')] }),
    partida(2, { time: { 1: 'A', 2: 'A', 3: 'B' }, result: 'B_WINS', goals: [gol(3, 'B', { assistId: 1 }), gol(1, 'B', { ownGoal: true })] }),
  ]

  it('artilharia ordena por gols e ignora gol contra e quem não marcou', () => {
    const { artilharia } = montarRanking({ partidas, jogadores })
    expect(artilharia.map((l) => [l.playerId, l.goals])).toEqual([[1, 2], [2, 1], [3, 1]])
  })

  it('artilharia e assistências não exigem o mínimo de 3 partidas', () => {
    const { artilharia, assistencias } = montarRanking({ partidas, jogadores })
    expect(artilharia.length).toBeGreaterThan(0) // ninguém tem 3 partidas aqui
    expect(assistencias.map((l) => [l.playerId, l.assists])).toEqual([[2, 2], [1, 1]])
  })

  it('só aparece quem tem pelo menos 1 gol (ou assistência)', () => {
    const { artilharia, assistencias } = montarRanking({ partidas, jogadores })
    expect(artilharia.every((l) => l.goals > 0)).toBe(true)
    expect(assistencias.every((l) => l.assists > 0)).toBe(true)
  })
})

describe('filtrarPorPeriodo e intervaloDoPeriodo', () => {
  const partidas = [
    partida(1, { time: {}, result: 'DRAW', date: '2026-10-31T23:59:59Z' }),
    partida(2, { time: {}, result: 'DRAW', date: '2026-11-01T00:00:00Z' }),
    partida(3, { time: {}, result: 'DRAW', date: '2026-11-30T23:59:59Z' }),
    partida(4, { time: {}, result: 'DRAW', date: '2026-12-01T00:00:00Z' }),
  ]
  const agora = new Date('2026-11-15T12:00:00Z')
  const idsDe = (lista) => lista.map((p) => p.id)

  it('mês: do dia 1 (inclusive) ao dia 1 do mês seguinte (exclusive)', () => {
    expect(idsDe(filtrarPorPeriodo(partidas, intervaloDoPeriodo('mes', agora)))).toEqual([2, 3])
  })

  it('ano: o ano corrente inteiro', () => {
    const doAnoPassado = partida(5, { time: {}, result: 'DRAW', date: '2025-12-31T23:59:59Z' })
    expect(idsDe(filtrarPorPeriodo([doAnoPassado, ...partidas], intervaloDoPeriodo('ano', agora)))).toEqual([1, 2, 3, 4])
  })

  it('tudo: sem filtro', () => {
    expect(filtrarPorPeriodo(partidas, intervaloDoPeriodo('tudo', agora))).toHaveLength(4)
  })

  it('período desconhecido vira erro de validação (400)', () => {
    expect(() => intervaloDoPeriodo('semana', agora)).toThrow('Período inválido')
  })

  it('aceita intervalo explícito {de, ate}', () => {
    const intervalo = { de: new Date('2026-11-02T00:00:00Z'), ate: new Date('2026-12-01T00:00:00Z') }
    expect(idsDe(filtrarPorPeriodo(partidas, intervalo))).toEqual([3])
  })
})

describe('lerIntervaloExplicito (?de=&ate=)', () => {
  it('sem parâmetros: sem limite', () => {
    expect(lerIntervaloExplicito({})).toEqual({ de: null, ate: null })
  })

  it('lê as duas datas', () => {
    const { de, ate } = lerIntervaloExplicito({ de: '2026-11-01', ate: '2026-12-01' })
    expect(de.toISOString()).toBe('2026-11-01T00:00:00.000Z')
    expect(ate.toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })

  it('data inválida ou fora de ordem -> 400', () => {
    expect(() => lerIntervaloExplicito({ de: 'ontem' })).toThrow('Data inválida')
    expect(() => lerIntervaloExplicito({ de: '2026-12-01', ate: '2026-11-01' })).toThrow('anterior')
    expect(() => lerIntervaloExplicito({ de: ['a', 'b'] })).toThrow('Data inválida')
  })
})

describe('ultimasPartidas (V, E ou D das últimas partidas do jogador)', () => {
  const dia = (n) => `2026-11-${String(n).padStart(2, '0')}T20:00:00Z`

  it('mais recentes primeiro, com V, E ou D conforme o time do jogador', () => {
    const partidas = [
      partida(1, { time: { 1: 'A', 2: 'B' }, result: 'A_WINS', date: dia(1) }), // V
      partida(2, { time: { 1: 'A', 2: 'B' }, result: 'DRAW', date: dia(2) }), // E
      partida(3, { time: { 1: 'B', 2: 'A' }, result: 'A_WINS', date: dia(3) }), // D (estava no B)
    ]
    expect(ultimasPartidas(1, partidas).map((p) => [p.matchId, p.resultado])).toEqual([[3, 'D'], [2, 'E'], [1, 'V']])
  })

  it('limita ao máximo pedido (padrão 5) e ignora não finalizadas e partidas sem o jogador', () => {
    const jogadas = [1, 2, 3, 4, 5, 6, 7].map((n) => partida(n, { time: { 1: 'A', 2: 'B' }, result: 'A_WINS', date: dia(n) }))
    const extras = [
      partida(8, { time: { 1: 'A', 2: 'B' }, result: null, status: 'IN_PROGRESS', date: dia(8) }),
      partida(9, { time: { 2: 'A', 3: 'B' }, result: 'A_WINS', date: dia(9) }),
    ]
    const resultado = ultimasPartidas(1, [...jogadas, ...extras])
    expect(resultado).toHaveLength(5)
    expect(resultado.map((p) => p.matchId)).toEqual([7, 6, 5, 4, 3])
    expect(ultimasPartidas(1, jogadas, 2)).toHaveLength(2)
  })

  it('traz o placar da partida (nosso time x adversário) e a data', () => {
    const partidas = [
      partida(1, { time: { 1: 'B', 2: 'A' }, result: 'A_WINS', date: dia(1), goals: [gol(2, 'A'), gol(2, 'A'), gol(1, 'B')] }),
    ]
    expect(ultimasPartidas(1, partidas)[0]).toMatchObject({ date: dia(1), golsPro: 1, golsContra: 2 })
  })
})

// Pelada com 3 times: o time A joga 3 jogos na noite (vence 2, perde 1); o C joga 1 só.
// Jogos: 1) A 1x0 B   2) A 1x0 C   3) A 0x1 B
const noiteDePelada = (id = 10, date = '2026-11-20T20:00:00Z') => ({
  id, status: 'FINISHED', format: 'PELADA', teamCount: 3, result: null, date,
  players: [{ playerId: 1, team: 'A' }, { playerId: 2, team: 'B' }, { playerId: 3, team: 'C' }],
  games: [
    { id: 1, number: 1, homeTeam: 'A', awayTeam: 'B', result: 'HOME_WINS' },
    { id: 2, number: 2, homeTeam: 'A', awayTeam: 'C', result: 'HOME_WINS' },
    { id: 3, number: 3, homeTeam: 'A', awayTeam: 'B', result: 'AWAY_WINS' },
  ],
  goals: [
    { ...gol(1, 'A'), gameId: 1 },
    { ...gol(1, 'A'), gameId: 2 },
    { ...gol(2, 'B'), gameId: 3 },
  ],
})

describe('pelada: J conta jogos (J = V + E + D)', () => {
  it('na pelada cada jogo da noite conta no J, igual ao V/E/D', () => {
    const a = estatisticasDoJogador(1, [noiteDePelada()])
    expect(a).toMatchObject({ matches: 3, wins: 2, draws: 0, losses: 1, goals: 2, goalsPerMatch: 0.67 })
    expect(a.matches).toBe(a.wins + a.draws + a.losses)
    // O time C só entrou em 1 jogo: J = 1, mesmo estando na noite inteira.
    expect(estatisticasDoJogador(3, [noiteDePelada()])).toMatchObject({ matches: 1, losses: 1 })
  })

  it('jogo único + pelada somam certo no ranking (J = V + E + D para todos)', () => {
    const jogoUnico = partida(1, { time: { 1: 'A', 2: 'B', 3: 'B' }, result: 'B_WINS', goals: [gol(2, 'B')] })
    const jogadores = [1, 2, 3].map((id) => ({ id, name: `J${id}`, nickname: `J${id}` }))
    const { geral } = montarRanking({ partidas: [jogoUnico, noiteDePelada()], jogadores, minimoPartidas: 1 })
    for (const linha of geral) expect(linha.matches).toBe(linha.wins + linha.draws + linha.losses)
    expect(geral.find((l) => l.playerId === 1)).toMatchObject({ matches: 4, wins: 2, losses: 2, points: 6 })
  })
})

describe('ultimasPartidas na pelada', () => {
  it('não vira empate nem soma placares: devolve a campanha da noite', () => {
    expect(ultimasPartidas(1, [noiteDePelada()])).toEqual([
      { matchId: 10, date: '2026-11-20T20:00:00Z', format: 'PELADA', resultado: null, wins: 2, draws: 0, losses: 1 },
    ])
  })
})

describe('lerPosicao (?posicao= do ranking)', () => {
  it('ausente ou vazia: sem filtro (null)', () => {
    expect(lerPosicao(undefined)).toBeNull()
    expect(lerPosicao('')).toBeNull()
  })

  it.each(['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'])('aceita %s', (posicao) => {
    expect(lerPosicao(posicao)).toBe(posicao)
  })

  it.each(['goleiro', 'goalkeeper', 'ATACANTE', ['FORWARD', 'DEFENDER'], 3])('rejeita %j', (valor) => {
    expect(() => lerPosicao(valor)).toThrow('Posição inválida')
  })
})

describe('lerPeriodoDasEstatisticas (?periodo= ou ?de=&ate=)', () => {
  const agora = new Date('2026-11-15T12:00:00Z')

  it('sem nada: sem limite', () => {
    expect(lerPeriodoDasEstatisticas({}, agora)).toEqual({ de: null, ate: null })
  })

  it('periodo=mes usa o mês do relógio (UTC), igual ao ranking', () => {
    const { de, ate } = lerPeriodoDasEstatisticas({ periodo: 'mes' }, agora)
    expect(de.toISOString()).toBe('2026-11-01T00:00:00.000Z')
    expect(ate.toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })

  it('periodo=ano e periodo=tudo', () => {
    expect(lerPeriodoDasEstatisticas({ periodo: 'ano' }, agora).de.toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(lerPeriodoDasEstatisticas({ periodo: 'tudo' }, agora)).toEqual({ de: null, ate: null })
  })

  it('continua aceitando ?de=&ate=', () => {
    const { de } = lerPeriodoDasEstatisticas({ de: '2026-11-02', ate: '2026-12-01' }, agora)
    expect(de.toISOString()).toBe('2026-11-02T00:00:00.000Z')
  })

  it('período inválido ou periodo junto com de/ate -> 400', () => {
    expect(() => lerPeriodoDasEstatisticas({ periodo: 'semana' }, agora)).toThrow('Período inválido')
    expect(() => lerPeriodoDasEstatisticas({ periodo: ['mes'] }, agora)).toThrow('Período inválido')
    expect(() => lerPeriodoDasEstatisticas({ periodo: 'mes', de: '2026-11-01' }, agora)).toThrow('não os dois')
  })
})
