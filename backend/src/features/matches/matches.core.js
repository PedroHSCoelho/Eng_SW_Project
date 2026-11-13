// Núcleo puro das partidas: só regras, sem banco nem Express.
// Recebe os dados já lidos (partida, jogadores) e decide; quem grava é o serviço.
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'

export const MINIMO_POR_TIME = 3

// Data e local da partida. Devolve SÓ os campos que o cliente pode definir
// (lista explícita): status e id enviados no corpo são descartados.
export function validarDadosDaPartida(dados) {
  const data = typeof dados.date === 'string' ? new Date(dados.date) : null
  if (!data || Number.isNaN(data.getTime())) {
    throw new ValidationError('Data inválida; use o formato AAAA-MM-DDTHH:MM')
  }
  const location = typeof dados.location === 'string' ? dados.location.trim() : ''
  if (location.length < 2 || location.length > 100) {
    throw new ValidationError('Local deve ter de 2 a 100 caracteres')
  }
  return { date: data, location }
}

// Lista de ids de um time, vinda do corpo da requisição: precisa ser uma lista
// de inteiros positivos (lista vazia é permitida enquanto a escalação é montada).
export function lerIdsDoTime(valor, time) {
  if (!Array.isArray(valor) || !valor.every((id) => Number.isInteger(id) && id > 0)) {
    throw new ValidationError(`O time ${time} deve ser uma lista de ids de jogadores`)
  }
  return valor
}

// Regras da escalação:
//  1. um jogador não aparece duas vezes no mesmo time;
//  2. um jogador não está nos dois times;
//  3. todo jogador existe e está ativo.
// `jogadores` são os cadastros encontrados no banco para os ids pedidos.
// Devolve a escalação no formato gravado: [{ playerId, team }].
export function validarEscalacao({ teamA, teamB, jogadores }) {
  for (const [time, ids] of [['A', teamA], ['B', teamB]]) {
    if (new Set(ids).size !== ids.length) {
      throw new BusinessRuleError(`Jogador repetido no time ${time}`)
    }
  }
  if (teamA.some((id) => teamB.includes(id))) {
    throw new BusinessRuleError('Um jogador não pode estar nos dois times')
  }
  for (const id of [...teamA, ...teamB]) {
    const jogador = jogadores.find((j) => j.id === id)
    if (!jogador) {
      throw new BusinessRuleError(`Jogador ${id} não existe`)
    }
    if (!jogador.active) {
      throw new BusinessRuleError(`Jogador inativo não pode ser escalado: ${jogador.nickname}`)
    }
  }
  return [
    ...teamA.map((playerId) => ({ playerId, team: 'A' })),
    ...teamB.map((playerId) => ({ playerId, team: 'B' })),
  ]
}

// A escalação só muda antes de a partida começar.
export function verificarEscalacaoEditavel(partida) {
  if (partida.status !== 'SCHEDULED') {
    throw new BusinessRuleError('A escalação só pode mudar enquanto a partida está agendada')
  }
}

// Agendada -> em andamento: cada time precisa de pelo menos 3 jogadores.
export function verificarPodeIniciar(partida) {
  if (partida.status !== 'SCHEDULED') {
    throw new BusinessRuleError('Só uma partida agendada pode começar')
  }
  for (const time of ['A', 'B']) {
    const quantos = partida.players.filter((p) => p.team === time).length
    if (quantos < MINIMO_POR_TIME) {
      throw new BusinessRuleError(
        `Cada time precisa de pelo menos ${MINIMO_POR_TIME} jogadores para a partida começar (time ${time} tem ${quantos})`,
      )
    }
  }
}
