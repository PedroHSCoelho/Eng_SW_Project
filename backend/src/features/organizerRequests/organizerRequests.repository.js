// Acesso ao banco dos pedidos de organizador (Prisma), sem regra de negócio.
import prisma from '../../db.js'
import { BusinessRuleError } from '../../errors/AppError.js'

// Dados de quem pediu, só o necessário para a tela (nunca o hash da senha).
const comUsuario = {
  user: {
    select: { id: true, name: true, email: true, player: { select: { id: true, nickname: true } } },
  },
}

// Troca PENDING por um estado final. O "where status = PENDING" é a barreira contra dois
// organizadores decidirem o mesmo pedido ao mesmo tempo: o segundo encontra 0 linhas.
async function fecharPedido(tx, { id, status, decidedById }) {
  const { count } = await tx.organizerRequest.updateMany({
    where: { id, status: 'PENDING' },
    data: { status, decidedById, decidedAt: new Date() },
  })
  if (count === 0) throw new BusinessRuleError('Este pedido já foi decidido')
  return tx.organizerRequest.findUnique({ where: { id }, include: comUsuario })
}

export const organizerRequestsRepository = {
  buscarPorId: (id) => prisma.organizerRequest.findUnique({ where: { id } }),

  buscarUltimoDoUsuario: (userId) =>
    prisma.organizerRequest.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),

  listar: ({ status }) =>
    prisma.organizerRequest.findMany({
      where: { status },
      include: comUsuario,
      orderBy: { createdAt: 'asc' },
    }),

  criar: ({ userId, message }) =>
    prisma.organizerRequest.create({ data: { userId, message }, include: comUsuario }),

  // Fecha o pedido e promove o usuário: as duas escritas acontecem juntas ou nenhuma.
  aprovar: ({ id, userId, decidedById }) =>
    prisma.$transaction(async (tx) => {
      const pedido = await fecharPedido(tx, { id, status: 'APPROVED', decidedById })
      await tx.user.update({ where: { id: userId }, data: { role: 'ORGANIZER' } })
      return pedido
    }),

  recusar: ({ id, decidedById }) =>
    prisma.$transaction((tx) => fecharPedido(tx, { id, status: 'REJECTED', decidedById })),
}
