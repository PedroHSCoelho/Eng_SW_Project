// Núcleo puro dos gols da súmula: só regras, sem banco nem Express.
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'

export const MINUTO_MAXIMO = 120

const idValido = (valor) => Number.isInteger(valor) && valor > 0

// Lê o corpo da requisição. Devolve SÓ os campos que o cliente pode mandar:
// `team` nunca vem do cliente, é calculado em montarGol.
export function lerDadosDoGol(dados) {
  if (!idValido(dados.scorerId)) {
    throw new ValidationError('Informe o autor do gol (scorerId)')
  }
  const assistId = dados.assistId ?? null
  if (assistId !== null && !idValido(assistId)) {
    throw new ValidationError('Assistência inválida (assistId)')
  }
  const minute = dados.minute ?? null
  if (minute !== null && !(Number.isInteger(minute) && minute >= 0 && minute <= MINUTO_MAXIMO)) {
    throw new ValidationError(`Minuto deve ser um número inteiro de 0 a ${MINUTO_MAXIMO}`)
  }
  if (dados.ownGoal !== undefined && typeof dados.ownGoal !== 'boolean') {
    throw new ValidationError('ownGoal deve ser true ou false')
  }
  return { scorerId: dados.scorerId, assistId, minute, ownGoal: dados.ownGoal === true }
}

const adversario = (time) => (time === 'A' ? 'B' : 'A')

function timeDoJogador(partida, playerId) {
  return partida.players.find((p) => p.playerId === playerId)?.team
}

// Gols só entram (e saem) com a partida em andamento: antes ninguém jogou,
// depois de encerrada a súmula está fechada.
export function verificarSumulaAberta(partida) {
  if (partida.status !== 'IN_PROGRESS') {
    throw new BusinessRuleError('Gols só podem ser lançados ou removidos com a partida em andamento')
  }
}

// Regras do gol:
//  1. a partida está em andamento;
//  2. o autor está escalado na partida;
//  3. a assistência (opcional) é de OUTRO jogador do MESMO time do autor;
//  4. gol contra não tem assistência e conta para o time adversário.
// Devolve o gol pronto para gravar, com o `team` que ganha o gol.
export function montarGol({ partida, gol }) {
  verificarSumulaAberta(partida)
  const timeDoAutor = timeDoJogador(partida, gol.scorerId)
  if (!timeDoAutor) {
    throw new BusinessRuleError('O autor do gol precisa estar escalado na partida')
  }
  if (gol.assistId !== null) {
    if (gol.ownGoal) {
      throw new BusinessRuleError('Gol contra não tem assistência')
    }
    if (gol.assistId === gol.scorerId) {
      throw new BusinessRuleError('O autor não pode dar assistência para o próprio gol')
    }
    if (timeDoJogador(partida, gol.assistId) !== timeDoAutor) {
      throw new BusinessRuleError('A assistência precisa ser de um jogador do mesmo time do autor')
    }
  }
  return {
    ...gol,
    team: gol.ownGoal ? adversario(timeDoAutor) : timeDoAutor,
  }
}
