import { PrismaClient } from '@prisma/client'

// Uma única conexão compartilhada por todo o back-end.
// `omit`: a nota do admin (Player.skill) NUNCA sai em consulta nenhuma, a não ser que a consulta
// peça de propósito (`omit: { skill: false }`). Assim ela não vaza por acidente em escalação,
// lista de presença ou membros, que também trazem dados do jogador.
const prisma = new PrismaClient({ omit: { player: { skill: true } } })

export default prisma
