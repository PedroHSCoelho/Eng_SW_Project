# Arquitetura do back-end

Cada funcionalidade fica em `backend/src/features/<nome>/` e é dividida em três camadas.

| Arquivo | Responsabilidade | Pode usar |
|---------|------------------|-----------|
| `<nome>.routes.js` | Recebe a requisição HTTP, chama o serviço e devolve a resposta | serviço |
| `<nome>.service.js` | Regras de negócio e validações. Lança os erros de `src/errors/AppError.js` | repositório |
| `<nome>.repository.js` | Acesso ao banco com o Prisma. Nenhuma regra aqui | `src/db.js` |

**Por que separar assim:** as regras ficam no serviço, que recebe o repositório como parâmetro. Nos testes trocamos o repositório por um objeto falso e testamos cada regra sem precisar do PostgreSQL.

## Erros

O serviço lança um erro e o middleware `src/middlewares/errorHandler.js` monta a resposta. A rota não precisa de `try/catch`.

| Erro | Status | Quando usar |
|------|--------|-------------|
| `ValidationError` | 400 | Campo faltando ou em formato errado |
| `NotFoundError` | 404 | O recurso pedido não existe |
| `BusinessRuleError` | 422 | Os dados são válidos, mas uma regra impede a ação |
| qualquer outro | 500 | Erro inesperado (detalhe só no log) |

Toda resposta de erro tem o formato `{ "erro": "mensagem" }`.

## Exemplo de feature

```js
// players.service.js
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'

export function criarPlayersService(repo) {
  return {
    async criar({ nome, apelido }) {
      if (!nome || nome.trim().length < 2) {
        throw new ValidationError('Nome deve ter pelo menos 2 caracteres')
      }
      if (await repo.buscarPorApelido(apelido)) {
        throw new BusinessRuleError('Apelido já está em uso')
      }
      return repo.criar({ nome: nome.trim(), apelido })
    },
  }
}
```

```js
// players.service.test.js
import { describe, expect, it } from 'vitest'
import { criarPlayersService } from '../src/features/players/players.service.js'

it('não aceita apelido repetido', async () => {
  const repoFalso = { buscarPorApelido: async () => ({ id: 1 }), criar: async (d) => d }
  const service = criarPlayersService(repoFalso)

  await expect(service.criar({ nome: 'João', apelido: 'jj' }))
    .rejects.toThrow('Apelido já está em uso')
})
```

## Testes

```powershell
cd backend
npm test            # roda todos os testes uma vez
npm run test:watch  # roda de novo a cada arquivo salvo
```

Testes de rota usam o Supertest e substituem o banco com `vi.mock('../src/db.js')`. Veja `tests/health.test.js`.
