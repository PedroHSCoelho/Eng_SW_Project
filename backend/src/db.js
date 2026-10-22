import { PrismaClient } from '@prisma/client'

// Uma única conexão compartilhada por todo o back-end.
const prisma = new PrismaClient()

export default prisma
