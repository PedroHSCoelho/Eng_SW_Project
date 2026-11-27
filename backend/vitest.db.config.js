// Testes de integração com um PostgreSQL de verdade (`npm run test:db`), no banco de TESTE
// (.env.test, schema "test"). Conferem o que a memória não simula: SQL das migrações,
// índices únicos, transações e regras do banco (onDelete Restrict, skipDuplicates...).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests-db/**/*.test.js'],
    setupFiles: ['tests-db/preparar.js'],
    // Um arquivo por vez: todos usam o mesmo banco e limpam as tabelas antes de cada teste.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
})
