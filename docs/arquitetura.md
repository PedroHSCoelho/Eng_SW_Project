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

## Grupos (como grupos de WhatsApp)

Qualquer pessoa logada cria um grupo (uma pelada ou campeonato) e vira **organizadora** dele; os outros entram pelo **código de convite**. Jogadores, partidas, gols, avaliações, estatísticas, ranking, histórico e sorteio pertencem a um grupo, e todas as rotas deles ficam em `/api/grupos/:grupoId/...`. Ver `docs/adr/0013-grupos-e-papel-por-grupo.md`.

Código em `backend/src/features/groups/`: `groups.core.js` (regras puras), `groups.service.js`, `groups.repository.js` e `groups.routes.js`. O middleware `carregarParticipacao` (em `middlewares/auth.js`) lê o `:grupoId` da URL e põe a participação de quem pede em `req.participacao` (`{ groupId, userId, role, playerId }`); quem não participa recebe **404**, igual a um grupo que não existe. `exigirOrganizadorDoGrupo` dá 403 a quem é só membro.

| Método e rota | O que faz | Erros |
|---|---|---|
| `POST /api/grupos` | Cria o grupo (`name`; `nickname` e `position` opcionais, se quem cria também joga) → 201; quem cria é `ORGANIZER` | 400, 422 |
| `GET /api/grupos` | Meus grupos, com `myRole` e `myPlayerId` em cada um | — |
| `GET /api/convites/:codigo` | Nome do grupo, `totalMembers` e `alreadyMember` (para a tela do convite) | 404 convite inválido |
| `POST /api/convites/:codigo/entrar` | Entra como `MEMBER` e cria o jogador da pessoa no grupo (`nickname`, `position`; o nome vem da conta) → 201 | 400, 404, 422 já participa ou apelido em uso |
| `GET /api/grupos/:grupoId` | O grupo com o meu papel; `inviteCode` só para organizador | 400, 404 |
| `PATCH /api/grupos/:grupoId` | Renomeia (organizador) | 400, 403, 404 |
| `POST /api/grupos/:grupoId/convite` | Gera outro código; o antigo deixa de valer (organizador) | 403, 404 |
| `GET /api/grupos/:grupoId/membros` | Membros com papel, nome e jogador (sem e-mail) | 404 |
| `PATCH /api/grupos/:grupoId/membros/:userId` | Muda `role` e/ou o jogador vinculado (`playerId`, `null` desvincula) (organizador) | 400, 403, 404, 422 último organizador ou jogador de outra pessoa |
| `DELETE /api/grupos/:grupoId/membros/:userId` | Remove alguém (organizador) ou sai do grupo (o próprio) → 204; o jogador continua no grupo | 404, 422 último organizador ou membro tentando remover outra pessoa |

Regras (em `groups.core.js`): o grupo **nunca fica sem organizador** (vale para rebaixar, remover e sair); só organizador remove outra pessoa, mas qualquer um sai sozinho; o código tem 8 caracteres de um alfabeto sem 0/O e 1/I e é gerado com `crypto.randomBytes`. Nos outros módulos, todo id que chega (partida, jogador da escalação, autor do gol, ids do sorteio) precisa ser do **mesmo grupo**; o de outro grupo é tratado como inexistente.

## API de jogadores (F02)

Código em `backend/src/features/players/`: `players.routes.js` (HTTP), `players.service.js` (regras) e `players.repository.js` (Prisma). O `app.js` liga as três camadas.

| Método e rota | O que faz | Erros |
|---|---|---|
| `GET /api/grupos/:grupoId/players?busca=&ativos=true` | Lista; `busca` procura em nome e apelido; `ativos=true` esconde inativos | — |
| `GET /api/grupos/:grupoId/players/:id` | Um jogador | 400 id inválido, 404 |
| `POST /api/grupos/:grupoId/players` | Cria (`name`, `nickname`, `position`) → 201 | 400 dados inválidos, 422 apelido já em uso |
| `PUT /api/grupos/:grupoId/players/:id` | Substitui nome, apelido e posição | 400, 404, 422 |
| `PATCH /api/grupos/:grupoId/players/:id/inativar` | Marca `active: false` | 400, 404 |
| `DELETE /api/grupos/:grupoId/players/:id` | Exclui → 204 | 404, 422 se o jogador já tem partida (inativar) |

Regras: nome de 2 a 50 e apelido de 2 a 30 caracteres (sem contar espaços nas pontas); posição em `GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD`; apelido único **dentro do grupo** sem diferenciar maiúsculas (coluna `nicknameKey`, `@@unique([groupId, nicknameKey])`, calculada pelo servidor, ver `docs/adr/0002-modelagem-do-player.md`).

## API de partidas (F05)

Código em `backend/src/features/matches/`: `matches.core.js` (regras puras), `matches.service.js` (casos de uso), `matches.repository.js` (Prisma) e `matches.routes.js` (HTTP). Qualquer participante do grupo lê; só o organizador do grupo escreve (403 para os outros).

| Método e rota | O que faz | Erros |
|---|---|---|
| `GET /api/grupos/:grupoId/matches` | Lista as partidas, mais recentes primeiro, cada uma com `status`, `result` e o placar `score` (sem a lista de gols) | — |
| `GET /api/grupos/:grupoId/matches/historico` | Partidas finalizadas, mais recentes primeiro: `{ items, page, pageSize, total, totalPages }`; filtros `?playerId=&de=&ate=&page=&pageSize=` (`ate` exclusivo; pageSize 1–50, padrão 10) | 400 filtro inválido |
| `GET /api/grupos/:grupoId/matches/:id` | Uma partida com a escalação | 400 id inválido, 404 |
| `POST /api/grupos/:grupoId/matches` | Cria (`date` em ISO, `location`, opcionais `maxPlayers`, `format`, `teamCount` e `teamNames`, ex. `{ "A": "Amarelo" }`) → 201, sempre `SCHEDULED` | 400 dados inválidos, 422 nomes repetidos |
| `PUT /api/grupos/:grupoId/matches/:id` | Edita data e local (`{ date, location }`); só partida agendada; `status`, `result` e `id` do corpo são ignorados | 400, 404, 422 se não estiver agendada |
| `PATCH /api/grupos/:grupoId/matches/:id/cancelar` | Agendada ou em andamento → `CANCELED` (estado final; sai de histórico, estatísticas e ranking) | 404, 422 se finalizada ou já cancelada |
| `PUT /api/grupos/:grupoId/matches/:id/escalacao` | Substitui os dois times: `{ "teamA": [1,2,3], "teamB": [4,5,6] }` | 400, 404, 422 |
| `PATCH /api/grupos/:grupoId/matches/:id/iniciar` | `SCHEDULED` → `IN_PROGRESS` | 404, 422 |
| `PATCH /api/grupos/:grupoId/matches/:id/encerrar` | `IN_PROGRESS` → `FINISHED`; grava `result` e `finishedAt` | 404, 422 |
| `POST /api/grupos/:grupoId/matches/:id/gols` | Lança um gol: `{ scorerId, assistId?, minute?, ownGoal? }` → 201 com a partida | 400, 404, 422 |
| `DELETE /api/grupos/:grupoId/matches/:id/gols/:goalId` | Remove um gol lançado errado → 200 com a partida | 400, 404, 422 |
| `GET /api/grupos/:grupoId/players/:id/stats` | Estatísticas do jogador (partidas, V/E/D, gols, assistências, gols por partida, saldo) e `recentes` (últimas 5 partidas como V/E/D com placar); filtro opcional `?periodo=mes`, `ano` ou `tudo` **ou** `?de=AAAA-MM-DD&ate=AAAA-MM-DD` (`ate` exclusive; os dois juntos dão 400) | 400, 404 |
| `PATCH /api/grupos/:grupoId/players/:id/nota` | Só admin. Nota de 0 a 5, de 0,5 em 0,5: `{ "skill": 3.5 }` (ou `null` para apagar). Só admins veem a nota (`skill`) nas respostas de jogadores | 400, 403, 404 |
| `GET /api/grupos/:grupoId/matches/:id/craque` | Votação do craque: `{ open, deadline, canVote, myVote, totalVotes, totalVoters, candidates, craques }` (empate = mais de um craque) | 404 |
| `POST /api/grupos/:grupoId/matches/:id/craque` | Meu voto: `{ playerId }`; só quem jogou, em outro jogador da partida, até 48h depois de encerrar; votar de novo troca | 400, 404, 422 |
| `POST /api/grupos/:grupoId/matches/:id/presencas` | Entro na lista (`{}`), fico como talvez (`{ "maybe": true }`) ou o admin põe outro (`{ playerId }`) | 400, 403, 404, 422 |
| `POST /api/grupos/:grupoId/matches/:id/convidados` | Levo um convidado de fora do grupo: `{ name }`; ocupa só as vagas que sobram | 400, 404, 422 |
| `DELETE /api/grupos/:grupoId/matches/:id/convidados/:guestId` | Tira o convidado (quem levou ou admin) | 403, 404, 422 |
| `POST /api/grupos/:grupoId/sorteio` | Só organizador do grupo. `{ playerIds: [6 a 22 ids] }` → `{ teamA, teamB, difference }` (times equilibrados pela nota do admin, 2,5 para quem não tem; não grava nada) | 400 entrada inválida, 403, 422 jogador inexistente ou inativo |
| `GET /api/grupos/:grupoId/rankings` | `{ geral, artilharia, assistencias }`; filtros `?periodo=mes`, `ano` ou `tudo` (padrão `tudo`) e `?posicao=GOALKEEPER`, `DEFENDER`, `MIDFIELDER` ou `FORWARD` (opcional; vale para o geral, a artilharia e as assistências) | 400 período ou posição inválidos |

Regras (em `matches.core.js`): local de 2 a 100 caracteres; um jogador não aparece duas vezes nem nos dois times; jogador inexistente ou inativo não é escalado; a escalação só muda com a partida agendada; para começar, cada time precisa de pelo menos 3 jogadores. Ver `docs/adr/0007-partida-e-escalacao.md`.

Regras dos gols (F06, em `goals.core.js`): só com a partida em andamento (lançar e remover); o autor precisa estar escalado; a assistência é opcional e precisa ser de **outro** jogador do **mesmo** time; gol contra não tem assistência e conta para o adversário. O time do gol (`team`) é sempre calculado pelo servidor; se o cliente mandar, é ignorado. Minuto opcional, de 0 a 120. A partida volta com `goals` (autor e assistente com apelido), ordenados pelo minuto.

Encerramento (F07): só partida em andamento, nunca duas vezes nem com data no futuro. O placar (`score: { A, B }`) vem em toda resposta de uma partida e é calculado pelos gols; o resultado é gravado ao encerrar. Depois disso, escalação e gols ficam bloqueados (422). Ver `docs/adr/0008-placar-calculado-e-resultado-gravado.md`.
