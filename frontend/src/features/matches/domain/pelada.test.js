import { describe, expect, it } from 'vitest'
import { sugerirProximoJogo, textoDoResultado } from './pelada.js'

const jogo = (number, homeTeam, awayTeam, result) => ({ id: number, number, homeTeam, awayTeam, result, finishedAt: result ? 'x' : null })

describe('sugerirProximoJogo (quem ganha fica)', () => {
  const pelada = (games, teamCount = 3) => ({ format: 'PELADA', teamCount, games })

  it('primeiro jogo: A x B', () => {
    expect(sugerirProximoJogo(pelada([]))).toEqual({ homeTeam: 'A', awayTeam: 'B' })
  })

  it('o vencedor fica e entra quem está esperando', () => {
    expect(sugerirProximoJogo(pelada([jogo(1, 'A', 'B', 'AWAY_WINS')]))).toEqual({ homeTeam: 'B', awayTeam: 'C' })
    // 4 times: depois de A x B e B x C, quem espera há mais tempo é o D (nunca jogou).
    const quatro = pelada([jogo(1, 'A', 'B', 'AWAY_WINS'), jogo(2, 'B', 'C', 'HOME_WINS')], 4)
    expect(sugerirProximoJogo(quatro)).toEqual({ homeTeam: 'B', awayTeam: 'D' })
  })

  it('empate: saem os dois e entram os que esperam há mais tempo', () => {
    const quatro = pelada([jogo(1, 'A', 'B', 'DRAW')], 4)
    expect(sugerirProximoJogo(quatro)).toEqual({ homeTeam: 'C', awayTeam: 'D' })
    // com 3 times, o de fora entra contra um dos dois
    expect(sugerirProximoJogo(pelada([jogo(1, 'A', 'B', 'DRAW')]))).toEqual({ homeTeam: 'C', awayTeam: 'A' })
  })

  it('jogo aberto não conta para a sugestão; texto do resultado', () => {
    expect(sugerirProximoJogo(pelada([jogo(1, 'A', 'B', null)]))).toEqual({ homeTeam: 'A', awayTeam: 'B' })
    expect(textoDoResultado(jogo(1, 'A', 'C', 'AWAY_WINS'))).toBe('vitória do Time C')
    expect(textoDoResultado(jogo(1, 'A', 'C', 'DRAW'))).toBe('empate')
    expect(textoDoResultado(jogo(1, 'A', 'C', null))).toBe('em andamento')
  })
})
