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

Testes de rota também podem usar o **serviço real com um repositório em memória** (sem `vi.mock`), como em `tests/players.routes.test.js`: prova status e corpo da resposta sem precisar do banco.

## API de jogadores (F02)

Código em `backend/src/features/players/`: `players.routes.js` (HTTP), `players.service.js` (regras) e `players.repository.js` (Prisma). O `app.js` liga as três camadas.

| Método e rota | O que faz | Erros |
|---|---|---|
| `GET /api/players?busca=&ativos=true` | Lista; `busca` procura em nome e apelido; `ativos=true` esconde inativos | — |
| `GET /api/players/:id` | Um jogador | 400 id inválido, 404 |
| `POST /api/players` | Cria (`name`, `nickname`, `position`) → 201 | 400 dados inválidos, 422 apelido já em uso |
| `PUT /api/players/:id` | Substitui nome, apelido e posição | 400, 404, 422 |
| `PATCH /api/players/:id/inativar` | Marca `active: false` | 400, 404 |
| `DELETE /api/players/:id` | Exclui → 204 | 404, 422 se o jogador já tem partida (inativar) |

Regras: nome de 2 a 50 e apelido de 2 a 30 caracteres (sem contar espaços nas pontas); posição em `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD`; apelido único sem diferenciar maiúsculas (coluna `nicknameKey`, calculada pelo servidor, ver `docs/adr/0002-modelagem-do-player.md`).

## API de partidas (F05)

Código em `backend/src/features/matches/`: `matches.core.js` (regras puras), `matches.service.js` (casos de uso), `matches.repository.js` (Prisma) e `matches.routes.js` (HTTP). Qualquer usuário logado lê; só o organizador escreve (403 para os outros).

| Método e rota | O que faz | Erros |
|---|---|---|
| `GET /api/matches` | Lista as partidas, mais recentes primeiro | — |
| `GET /api/matches/:id` | Uma partida com a escalação | 400 id inválido, 404 |
| `POST /api/matches` | Cria (`date` em ISO, `location`) → 201, sempre `SCHEDULED` | 400 dados inválidos |
| `PUT /api/matches/:id/escalacao` | Substitui os dois times: `{ "teamA": [1,2,3], "teamB": [4,5,6] }` | 400, 404, 422 |
| `PATCH /api/matches/:id/iniciar` | `SCHEDULED` → `IN_PROGRESS` | 404, 422 |

Regras (em `matches.core.js`): local de 2 a 100 caracteres; um jogador não aparece duas vezes nem nos dois times; jogador inexistente ou inativo não é escalado; a escalação só muda com a partida agendada; para começar, cada time precisa de pelo menos 3 jogadores. Ver `docs/adr/0007-partida-e-escalacao.md`.
