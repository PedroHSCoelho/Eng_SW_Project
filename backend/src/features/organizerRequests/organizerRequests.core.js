// Núcleo puro dos pedidos de organizador: só regras, sem banco nem relógio próprio
// (a data atual entra por parâmetro, então o teste controla o tempo).
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'

export const DIAS_DE_ESPERA_APOS_RECUSA = 7
const UM_DIA_EM_MS = 24 * 60 * 60 * 1000

export function validarMotivo(mensagem) {
  const texto = typeof mensagem === 'string' ? mensagem.trim() : ''
  if (texto.length < 10 || texto.length > 200) {
    throw new ValidationError('Explique o motivo em 10 a 200 caracteres')
  }
  return texto
}

// Quem pode pedir, e quando:
//  1. ainda não é organizador;
//  2. já está vinculado a um jogador (faz parte da pelada; barra contas anônimas);
//  3. não tem outro pedido em análise;
//  4. se o último foi recusado, esperou 7 dias (evita insistir sem parar).
export function verificarElegibilidade({ usuario, ultimoPedido, agora }) {
  if (usuario.role === 'ORGANIZER') {
    throw new BusinessRuleError('Você já é organizador')
  }
  if (!usuario.playerId) {
    throw new BusinessRuleError(
      'Peça a um organizador para vincular sua conta a um jogador antes de solicitar',
    )
  }
  if (ultimoPedido?.status === 'PENDING') {
    throw new BusinessRuleError('Você já tem um pedido em análise')
  }
  if (ultimoPedido?.status === 'REJECTED') {
    const liberadoEm = new Date(new Date(ultimoPedido.decidedAt).getTime() + DIAS_DE_ESPERA_APOS_RECUSA * UM_DIA_EM_MS)
    if (agora < liberadoEm) {
      throw new BusinessRuleError(
        `Seu último pedido foi recusado; você poderá pedir novamente em ${liberadoEm.toLocaleDateString('pt-BR')}`,
      )
    }
  }
}

// Só pedido em análise pode ser decidido, e ninguém decide o próprio pedido.
export function verificarDecisao({ pedido, decisorId }) {
  if (pedido.status !== 'PENDING') {
    throw new BusinessRuleError('Este pedido já foi decidido')
  }
  if (pedido.userId === decisorId) {
    throw new BusinessRuleError('Você não pode decidir o próprio pedido')
  }
}
