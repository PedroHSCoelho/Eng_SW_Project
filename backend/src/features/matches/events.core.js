// Núcleo puro dos lances da súmula que não são gol: cartões e defesas difíceis.
// Só regras, sem banco nem Express. Gol e assistência ficam em goals.core.js.
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'
import { MINUTO_MAXIMO } from './goals.core.js'
import { ehPelada, verificarLanceNoJogo } from './pelada.core.js'

// Mesmos valores do enum EventType do schema.prisma.
export const TIPOS_DE_EVENTO = ['YELLOW_CARD', 'RED_CARD', 'DIFFICULT_SAVE']
export const AMARELOS_PARA_EXPULSAO = 2

const idValido = (valor) => Number.isInteger(valor) && valor > 0

// Lê o corpo da requisição: { type, playerId, minute? }. Devolve só esses campos.
export function lerDadosDoEvento(dados) {
  if (!TIPOS_DE_EVENTO.includes(dados.type)) {
    throw new ValidationError(`Tipo de lance inválido; use ${TIPOS_DE_EVENTO.join(', ')}`)
  }
  if (!idValido(dados.playerId)) {
    throw new ValidationError('Informe o jogador do lance (playerId)')
  }
  const minute = dados.minute ?? null
  if (minute !== null && !(Number.isInteger(minute) && minute >= 0 && minute <= MINUTO_MAXIMO)) {
    throw new ValidationError(`Minuto deve ser um número inteiro de 0 a ${MINUTO_MAXIMO}`)
  }
  return { type: dados.type, playerId: dados.playerId, minute }
}

// Cartões de um jogador na partida (para a regra e para a tela).
export function cartoesDoJogador(eventos, playerId) {
  const doJogador = eventos.filter((e) => e.playerId === playerId)
  const amarelos = doJogador.filter((e) => e.type === 'YELLOW_CARD').length
  const vermelhos = doJogador.filter((e) => e.type === 'RED_CARD').length
  return { amarelos, vermelhos, expulso: vermelhos > 0 || amarelos >= AMARELOS_PARA_EXPULSAO }
}

// Regras do lance:
//  1. a partida está em andamento (antes ninguém jogou; depois a súmula está fechada);
//  2. o jogador está escalado na partida;
//  3. expulso (vermelho ou 2 amarelos) não recebe mais cartão nem faz defesa.
// A defesa difícil vale para qualquer escalado: na pelada o goleiro reveza, então a posição
// do cadastro não trava (a tela é que oferece o botão para quem é goleiro).
export function montarEvento({ partida, evento }) {
  if (partida.status !== 'IN_PROGRESS') {
    throw new BusinessRuleError('Lances só podem ser lançados ou removidos com a partida em andamento')
  }
  if (!partida.players.some((p) => p.playerId === evento.playerId && !p.benched)) {
    throw new BusinessRuleError('O jogador precisa estar escalado e em campo na partida')
  }
  if (cartoesDoJogador(partida.events ?? [], evento.playerId).expulso) {
    throw new BusinessRuleError('Jogador expulso não recebe mais lances nesta partida')
  }
  // Na pelada, o lance é do jogo que está rolando (e o jogador precisa estar nele).
  if (ehPelada(partida)) return { ...evento, gameId: verificarLanceNoJogo(partida, evento.playerId).id }
  return evento
}
