// Roda antes de cada arquivo de tests-db/. Última trava: mesmo que alguém rode o vitest do banco
// sem o script de ambientes, os testes se recusam a rodar fora de um schema de teste.
import { afterAll, beforeEach } from 'vitest'
import prisma from '../src/db.js'

const schema = new URL(process.env.DATABASE_URL ?? 'postgresql://x/x').searchParams.get('schema') ?? ''
if (process.env.AMBIENTE !== 'test' || !schema.includes('test')) {
  throw new Error('Os testes de banco só rodam no ambiente de teste: use "npm run test:db" (lê o .env.test)')
}

// Tabelas do schema de teste (menos a de controle das migrações do Prisma). TRUNCATE ... CASCADE limpa tudo
// e RESTART IDENTITY volta os ids para 1, então cada teste começa do zero.
async function limparBanco() {
  const tabelas = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = ${schema} AND tablename <> '_prisma_migrations'`
  if (tabelas.length === 0) return
  // Nome do schema escrito por extenso: não depende do search_path da conexão (o pooler do Supabase pode trocá-lo).
  const lista = tabelas.map((t) => `"${schema}"."${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`)
}

beforeEach(limparBanco)
afterAll(() => prisma.$disconnect())
