// Testes do dia a dia (`npm test`): regras puras e API com repositórios EM MEMÓRIA.
// Não abrem conexão com banco nenhum, por isso rodam no CI e em qualquer máquina.
// Os testes que usam um banco de verdade ficam em tests-db/ (ver vitest.db.config.js).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/**/*.test.js'] },
})
