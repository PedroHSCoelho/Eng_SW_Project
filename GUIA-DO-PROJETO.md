# Guia do projeto Eng_SW_Project

Guia para continuar o projeto com o seu próprio Claude. Cole este arquivo no início da conversa (ou salve como contexto do projeto) para o Claude saber tudo o que já foi decidido.

Situação conferida em **03/11/2026**, lendo o repositório https://github.com/PedroHSCoelho/Eng_SW_Project (branches `main`, `dev`, `docs/estrutura-claude`). Sempre confira o estado atual antes de assumir algo deste guia.

---

## 1. Regra mais importante: cada aluno faz os próprios commits

O professor avalia o histórico do GitHub: quem fez cada commit, PR e revisão. Por isso:

- **O Claude não faz `git commit`, `git push`, nem abre PR ou issue.** Ele só lê o repositório e entrega o código ou o passo a passo. Você aplica, revisa e commita com a sua conta.
- Antes do primeiro commit, confira se o Git está com o **seu** nome e e-mail, senão o commit sai no nome de outra pessoa:

```powershell
git config user.name    # deve mostrar o seu nome
git config user.email   # deve ser o e-mail da sua conta do GitHub
# se estiver errado, dentro da pasta do projeto:
git config user.name "Seu Nome"
git config user.email "seu-email@exemplo.com"
```

Sugestão de texto para colar no seu Claude:

> Este é um projeto acadêmico avaliado pelo histórico de commits. Nunca faça commit, push, nem abra PR ou issue. Leia o repositório e me entregue o código (arquivos completos ou diff) e os comandos, para eu aplicar e commitar com a minha conta. Responda em português.

---

## 2. Objetivo do projeto

Disciplina de Engenharia de Software (UNIFESP), em equipe. App para futebol amador ("pelada"):

- **Jogadores:** cadastro, perfil e estatísticas (gols, assistências, partidas).
- **Súmula da partida:** data, participantes, resultado, gols e assistências, histórico.
- **Ranking:** classificação geral calculada automaticamente a partir das partidas.
- **Avaliação:** participantes dão nota de 1 a 5 uns aos outros depois do jogo; a média aparece no perfil.

O que o professor pede: um sistema **minimamente complexo**, que não seja página estática nem CRUD simples. Precisa ter regras de negócio implementadas **e testadas**, backend organizado, frontend que conversa com o backend, interface interativa, testes automatizados, uso de Git/GitHub (PRs e revisão), documentação para outra pessoa rodar o projeto, e entregas incrementais ao longo do semestre.

O valor na avaliação está nas **regras** (estatísticas derivadas da súmula, desempate do ranking, quem pode avaliar quem, média das notas). O CRUD é só a casca.

---

## 3. Stack

| Camada | Tecnologia | Porta |
|---|---|---|
| Front-end | React 19 + Vite 8 + Tailwind CSS 4, testes com Vitest + Testing Library | 5173 |
| Back-end | Node 22 + Express 5 (ESM, `"type": "module"`) + Prisma 6 | 3001 |
| Banco | PostgreSQL hospedado no Supabase (um projeto compartilhado pelo grupo; ver `docs/setup.md` e ADR 0003) | 6543 (app) / 5432 (migrações) |
| Testes do back | Vitest + Supertest (entrou com o F01, na branch `dev`) | — |
| CI | GitHub Actions (`.github/workflows/ci.yml`, na branch `dev`) | — |

O Vite repassa tudo que começa com `/api` para `http://localhost:3001`. No React basta `fetch('/api/...')`.

Os comandos do projeto são para **PowerShell no Windows** (no PowerShell antigo não existe `&&`; use `;`).

---

## 4. Estrutura do repositório

Depois do F01 (branch `dev`):

```
Eng_SW_Project/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # por enquanto só o modelo User
│   │   └── migrations/            # 20261022224217_init
│   ├── src/
│   │   ├── app.js                 # monta o Express, rotas, 404 e erros
│   │   ├── index.js               # sobe o servidor
│   │   ├── db.js                  # instância única do PrismaClient
│   │   ├── errors/AppError.js     # ValidationError, NotFoundError, BusinessRuleError
│   │   ├── middlewares/errorHandler.js
│   │   ├── routes/health.js       # /api/health e /api/health/db
│   │   └── features/<modulo>/     # cada feature nova entra aqui (ainda vazio)
│   ├── tests/                     # testes do back (ao lado de src, NÃO dentro)
│   │   ├── errorHandler.test.js
│   │   └── health.test.js
│   └── .env.example
├── frontend/
│   └── src/ App.jsx, App.test.jsx, main.jsx, index.css
├── docs/
│   ├── setup.md                   # como rodar (na main)
│   ├── arquitetura.md             # camadas e erros (na dev)
│   └── referencia/                # leituras da disciplina (PDFs versionados no Git)
├── .github/
│   ├── pull_request_template.md   # na main
│   └── workflows/ci.yml           # na dev
├── CONTRIBUTING.md, CLAUDE.md, README.md
└── .editorconfig, .gitattributes  # UTF-8 e LF
```

Na `main` ainda existem as rotas antigas com dados fixos em `backend/src/features/{players,matches,rankings,ratings}/`. Na `dev` elas foram removidas pelo F01.

---

## 5. Como rodar

Pré-requisitos: Node.js 22, Git e a senha do banco Supabase do grupo (não instala nada de banco na máquina). Abra dois terminais na pasta do projeto.

```powershell
# Terminal 1: back-end
cd backend
Copy-Item .env.example .env     # só na primeira vez; edite e troque [SENHA]
npm install
npx prisma migrate deploy        # aplica as migrações existentes no banco do Supabase
npm run dev                      # http://localhost:3001/api/health

# Terminal 2: front-end
cd frontend
npm install
npm run dev                      # http://localhost:5173 (selo "API: online")
```

`/api/health/db` responde 503 se o banco não responder (confira a senha e as duas URLs no `backend/.env`). Erro `@prisma/client did not initialize` se resolve com `npx prisma generate` dentro de `backend`. Passo a passo completo em `docs/setup.md`.

## 6. Como testar

```powershell
cd backend
npm test             # vitest run (9 testes no F01)
npm run test:watch   # roda de novo a cada arquivo salvo

cd frontend
npm test             # vitest run --environment jsdom (2 testes)
npm run build
```

Os testes do back **não precisam do PostgreSQL**: o `health.test.js` troca o banco por um objeto falso com `vi.mock('../src/db.js')`. Testes ficam em `backend/tests/` e importam `../src/...`. Se a pasta for parar em `backend/src/tests/`, os imports quebram (já aconteceu).

## 7. CI (GitHub Actions)

Arquivo `.github/workflows/ci.yml` (na `dev`). Roda em todo push para `main`/`dev` e em todo PR, com Node 22, em dois jobs:

- **backend:** `npm ci`, `npx prisma generate`, `npm test`.
- **frontend:** `npm ci`, `npm test`, `npm run build`.

Antes de pedir revisão de um PR, o CI precisa estar verde.

---

## 8. Arquitetura do back-end (padrão a seguir)

Cada feature fica em `backend/src/features/<nome>/`, em três camadas:

| Arquivo | Responsabilidade | Pode usar |
|---|---|---|
| `<nome>.routes.js` | Recebe o HTTP, chama o serviço, devolve a resposta | serviço |
| `<nome>.service.js` | Regras de negócio e validações; lança os erros de `AppError.js` | repositório |
| `<nome>.repository.js` | Acesso ao banco com Prisma, sem regra | `src/db.js` |

O serviço recebe o repositório como parâmetro, então nos testes ele é trocado por um objeto falso e cada regra é testada sem banco. Cálculos (estatísticas, ranking, média, sorteio) devem ser **funções puras**, sem Prisma nem Express.

Erros: o serviço lança, o middleware `errorHandler` monta a resposta. A rota não precisa de `try/catch` (o Express 5 encaminha erros de funções `async`).

| Erro | Status | Quando |
|---|---|---|
| `ValidationError` | 400 | campo faltando ou formato errado |
| `NotFoundError` | 404 | recurso não existe |
| `BusinessRuleError` | 422 | dados válidos, mas uma regra impede a ação |
| outro qualquer | 500 | inesperado (detalhe só no log) |

Formato das respostas: sucesso `{ data: ... }`, erro `{ erro: "mensagem em português" }`. JSON mal formado responde 400. Rotas sob `/api/<modulo>`. Detalhes e exemplo em `docs/arquitetura.md` (branch `dev`).

Exemplo de serviço e teste:

```js
// backend/src/features/players/players.service.js
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
// backend/tests/players.service.test.js
import { expect, it } from 'vitest'
import { criarPlayersService } from '../src/features/players/players.service.js'

it('não aceita apelido repetido', async () => {
  const repoFalso = { buscarPorApelido: async () => ({ id: 1 }), criar: async (d) => d }
  const service = criarPlayersService(repoFalso)

  await expect(service.criar({ nome: 'João', apelido: 'jj' }))
    .rejects.toThrow('Apelido já está em uso')
})
```

---

## 9. Convenções (do `CONTRIBUTING.md` e `CLAUDE.md`)

- **Nunca commitar direto na `main`.** Toda tarefa em uma branch curta, depois PR, revisão de outro colega e merge.
- **Branches:** `tipo/descricao-curta` com `feat/`, `fix/`, `docs/`, `refactor/`, `test/`, `chore/`. Para features do backlog: `feat/F02-cadastro-jogadores`.
- **Commits:** Conventional Commits, em português, no imperativo, até ~70 caracteres. Escopos: `backend`, `frontend`, `players`, `matches`, `rankings`, `ratings`, `db`.
  - `feat(players): cadastra jogador com perfil individual`
  - `fix(rankings): corrige desempate por saldo de gols`
  - Um commit por mudança lógica. Nada de "ajustes" ou "wip". Nada de `rebase`/`push --force` em histórico compartilhado.
- **PRs:** título no padrão dos commits, preencher o template (o que mudou, por quê, como testar, checklist), PR pequeno, `Closes #N` para fechar a issue. Os comentários de revisão contam como evidência de code review.
- **Código:** nomes em inglês (`players`, `totalGoals`); textos para o usuário, comentários e docs em português. UTF-8 e LF (`.editorconfig`/`.gitattributes`).
- **Banco:** mudou o `schema.prisma`? Rode `npx prisma migrate dev --name descricao` e commite a migração junto. Nunca edite uma migração já mergeada; crie outra.
- **Segredos:** `.env` nunca vai para o Git, só o `.env.example`. Os PDFs de `docs/referencia/` vão para o Git de propósito (material da disciplina para o grupo todo).
- **Dependências novas:** só com justificativa.

---

## 10. O que já está feito

| Item | Onde | Autor no Git |
|---|---|---|
| Ambiente inicial: React + Vite + Tailwind, Express, Prisma, Docker; rotas com dados fixos; 2 testes de front | `main` (22/10) | f.ferreira |
| `.editorconfig`, `.gitattributes`, `CONTRIBUTING.md`, template de PR, `docs/referencia/`, `docs/setup.md` (PR #2) | `main` (26/10) | Pedro Coelho |
| **F01:** Vitest + Supertest, `AppError` + `errorHandler`, remoção das rotas com dados fixos, `health.js` com testes (9 testes), CI e `docs/arquitetura.md` | `dev` (30/10), 3 commits | f.ferreira |
| `CLAUDE.md` completo (modo tutor, princípios, convenções), skills em `.claude/skills/`, `docs/CONTEXT.md` (glossário), ADR 0001, `docs/backlog-futuro.md`, `docs/estudo/` | `docs/estrutura-claude` (26/10), sem merge | Pedro Coelho |

Os arquivos do F01 também estão no `F01-arquivos.zip` que o Luiz tem.

## 11. Pendências e pontos de atenção

1. **A `dev` está desatualizada em relação à `main`.** Ela foi criada antes do PR #2, então não tem `CONTRIBUTING.md`, template de PR, `.editorconfig`, `docs/setup.md` etc. Antes de abrir o PR do F01, alguém precisa trazer a `main` para a `dev` (`git switch dev; git pull; git merge origin/main`) e resolver os conflitos, principalmente no `README.md`, `backend/package.json` e `package-lock.json`.
2. **Os commits do F01 têm `(#N)` no título**, que era só um lugar para o número da issue. Como já foram enviados, não reescreva o histórico; só preste atenção nos próximos.
3. **Combinar se os PRs vão para `dev` ou para `main`.** O `CONTRIBUTING.md` diz PR para a `main`; o backlog sugere PR para a `dev`. Escolham um e atualizem o `CONTRIBUTING.md`.
4. **Branch `docs/estrutura-claude` sem merge.** Abrir o PR, revisar e mergear (o `CLAUDE.md` dela substitui o curto que está na `main`).
5. **Escopo do backlog x `CLAUDE.md`.** O `CLAUDE.md` da branch `docs/estrutura-claude` diz que o escopo é só o README e que sorteio de times fica para o fim. O backlog tem o F15 (sorteio) e o F04 (login), que não estão no README. Decidam juntos: o login é quase obrigatório para a avaliação saber quem avalia; o sorteio pode ficar como opcional no fim.
6. **`README.md` na `main` está em UTF-16**, apesar do commit dizer UTF-8 (no GitHub aparece estranho e o diff vira binário). Precisa ser salvo de novo como UTF-8.
7. **Texto do `App.jsx`** fala em "campeonatos, sorteio de times e prancheta", que estão fora do escopo. Ajustar quando mexer no front.
8. **Issues e milestones** ainda precisam ser criados no GitHub (um por feature, ver a seção 12). Cada um cria as próprias.
9. **Schema:** só existe `User`. Os modelos do domínio (`Player`, `Match`, `MatchPlayer`, `Goal`, `Rating`) entram com as features.
10. **Perguntas de domínio em aberto** (de `docs/CONTEXT.md`): times fixos ou só placar? Quem pode registrar e editar a súmula? O backlog já propõe respostas, mas o grupo deve confirmar.

---

## 12. Backlog: 15 features em 4 entregas

Cada feature vira uma issue com título `F05 — Criar partida e escalar times`, corpo "Como..., quero..." e a lista de critérios. Um milestone por entrega. Labels: `backend`, `frontend`, `regra-de-negocio`, `infra`. Distribuam features de back e de front para todos aparecerem no histórico.

| ID | Feature | Entrega | Camada | Depende de |
|---|---|---|---|---|
| F01 | Base do backend em camadas, testes e CI | 1 | Back + infra | — |
| F02 | Cadastro de jogadores (API) | 1 | Back | F01 |
| F03 | Tela de jogadores | 1 | Front | F02 |
| F04 | Login e papéis (organizador e jogador) | 1 | Back + front | F02 |
| F05 | Criar partida e escalar times | 2 | Back | F02, F04 |
| F06 | Registrar gols e assistências | 2 | Back | F05 |
| F07 | Encerrar partida e calcular placar | 2 | Back | F06 |
| F08 | Tela da súmula | 2 | Front | F05, F06, F07 |
| F09 | Histórico de partidas | 2 | Back + front | F07 |
| F10 | Estatísticas do jogador | 3 | Back | F07 |
| F11 | Ranking | 3 | Back | F07 |
| F12 | Telas de ranking e perfil | 3 | Front | F10, F11 |
| F13 | Avaliar jogadores após a partida | 4 | Back + front | F04, F07 |
| F14 | Média de notas no perfil | 4 | Back + front | F13 |
| F15 | Sorteio de times equilibrado | 4 | Back + front | F14 |

### Critérios de aceite

**F01 — Base, testes e CI** (feito na `dev`, falta o PR)
- Features em `routes` (HTTP), `service` (regras) e `repository` (Prisma).
- Vitest + Supertest no backend com `npm test`.
- Middleware único de erros: 400 / 404 / 422, sempre `{ erro: "mensagem" }`.
- GitHub Actions com os testes do back e do front a cada push e PR.
- Rotas com dados fixos removidas.

**F02 — Cadastro de jogadores (API)** (próximo passo)
- Modelo `Player` com nome, apelido, posição (goleiro, defesa, meio, ataque) e ativo.
- Nome obrigatório, de 2 a 50 caracteres; apelido único, sem diferenciar maiúsculas.
- Jogador que já tem partida não pode ser excluído, só inativado.
- Rotas `GET`, `POST`, `PUT` e `PATCH /:id/inativar`.
- Testes de cada regra.

**F03 — Tela de jogadores**
- Lista com busca por nome ou apelido e filtro de ativos.
- Formulário de cadastro e edição mostrando os erros da API.
- Botão de inativar com confirmação.
- Navegação entre páginas (React Router) e testes de componente do formulário.

**F04 — Login e papéis**
- Cadastro e login com senha em hash (bcrypt) e token JWT.
- Cada usuário ligado a um jogador; papéis organizador e jogador.
- Só o organizador cria jogadores e partidas e encerra súmulas (403 para os outros).
- Tela de login e saída; rotas protegidas no front.
- Testes: senha errada, token ausente ou vencido, ação sem permissão.

**Entrega 2.** A partida tem três estados: agendada, em andamento e finalizada. Depois de finalizada, a súmula fica bloqueada.

**F05 — Criar partida e escalar times**
- Modelos `Match` (data, local, status) e `MatchPlayer` (jogador e time A ou B).
- Cada time precisa de pelo menos 3 jogadores para a partida começar.
- Um jogador não pode estar nos dois times nem duas vezes no mesmo.
- Jogador inativo não pode ser escalado.
- Escalação só muda enquanto a partida está agendada.
- Testes de cada regra.

**F06 — Registrar gols e assistências**
- Modelo `Goal` com autor, assistência opcional, time e minuto opcional.
- O autor precisa estar escalado na partida.
- A assistência é de outro jogador do mesmo time do autor.
- Gol contra conta para o adversário e não soma gol para o autor.
- Não aceita gol em partida finalizada; pode remover gol lançado errado antes de encerrar.
- Testes de cada regra.

**F07 — Encerrar partida e calcular placar**
- Placar calculado a partir dos gols, nunca digitado.
- Resultado (vitória de A, vitória de B ou empate) gravado ao encerrar.
- Não encerra partida com data no futuro nem duas vezes.
- Depois de encerrada, nenhuma alteração na súmula.
- Testes das transições de estado válidas e inválidas.

**F08 — Tela da súmula**
- Criar partida e escolher jogadores de cada time.
- Lançar gol (autor e assistência filtrados pelo time) com placar atualizando na hora.
- Encerrar com confirmação; tela só de leitura depois.
- Erros da API na tela; testes de componente.

**F09 — Histórico de partidas**
- Partidas finalizadas, mais recentes primeiro, com paginação.
- Filtros por período e por jogador.
- Detalhe com times, placar, gols e assistências.
- Testes dos filtros na API.

**F10 — Estatísticas do jogador**
- Partidas, vitórias, empates, derrotas, gols, assistências e gols por partida (2 casas).
- Só contam partidas finalizadas; gol contra não conta para o jogador.
- Tudo sai das súmulas, em uma função pura de cálculo.
- `GET /api/players/:id/stats` com filtro opcional de período.
- Testes unitários da função com cenários montados à mão.

**F11 — Ranking**
- Pontos: vitória 3, empate 1, derrota 0.
- Desempate: saldo de gols do time nas partidas do jogador, gols, assistências e nome.
- Só entra quem tem pelo menos 3 partidas no período.
- Filtro por período (mês, ano ou tudo).
- Rankings secundários de artilharia e assistências.
- Testes de cada desempate e do mínimo de partidas.

**F12 — Telas de ranking e perfil**
- Tabela com filtro de período e abas de artilharia e assistências.
- Perfil com estatísticas e últimas 5 partidas (V, E ou D).
- Clicar no jogador do ranking abre o perfil.
- Testes de componente.

**F13 — Avaliar jogadores após a partida**
- Modelo `Rating` com partida, avaliador, avaliado, nota e comentário opcional.
- Nota inteira de 1 a 5.
- Avaliador e avaliado jogaram a partida; ninguém avalia a si mesmo.
- Uma nota por avaliador, avaliado e partida (edita, não duplica).
- Só partida finalizada e até 48h depois do encerramento.
- Tela pós-partida com quem falta avaliar.
- Testes de cada regra, inclusive as 48h com data simulada.

**F14 — Média de notas no perfil**
- Média geral com 1 casa decimal e média por partida.
- Só aparece com pelo menos 3 avaliações; antes, "sem avaliações suficientes".
- O jogador vê a média, mas não quem deu cada nota.
- Destaque da partida: maior média do jogo (empate desfeito por gols).
- Testes do cálculo e do mínimo.

**F15 — Sorteio de times equilibrado** (opcional, ver pendência 5)
- Divide os presentes em 2 times de tamanho igual (ímpar: um time com 1 a mais).
- Força = média de notas; sem média entra com 3,0.
- Busca a divisão com menor diferença de força.
- No máximo 1 goleiro por time quando houver 2 ou mais.
- Botão "usar este sorteio" cria a partida já escalada (liga com o F05).
- Testes com listas pequenas de resultado conhecido.

---

## 13. Fluxo de trabalho de uma feature

```powershell
git switch main; git pull                     # ou dev, conforme o combinado
git switch -c feat/F02-cadastro-jogadores
# 1. schema.prisma + npx prisma migrate dev --name cria-player   -> commit
# 2. service + testes das regras (TDD: teste falhando, código, refatora) -> commit
# 3. repository + routes + teste de rota com Supertest           -> commit
# 4. docs, se mudou comando ou estrutura                          -> commit
cd backend; npm test
git push -u origin feat/F02-cadastro-jogadores
# abra o PR no GitHub, preencha o template, "Closes #N", peça revisão a um colega
```

Como pedir ajuda ao seu Claude para uma feature:

> Leia o repositório (branch dev) e o docs/arquitetura.md. Quero implementar o F02 seguindo os critérios abaixo. Me dê o plano em commits pequenos e, para cada commit, os arquivos completos, os comandos e a mensagem de commit no padrão Conventional Commits. Não faça commit nem push. Depois de cada passo, me explique o que foi feito para eu conseguir apresentar.

## 14. Para a apresentação

O `CLAUDE.md` da branch `docs/estrutura-claude` pede que o grupo domine tudo o que entra. Para cada mudança, saibam explicar: o que foi feito, por que, como funciona (arquivo e linha), o conceito de engenharia (camadas, TDD, núcleo funcional, fatia vertical), como foi testado e uma pergunta provável do professor. Registrem decisões de arquitetura como ADR em `docs/adr/` e o progresso em `docs/estudo/diario.md`.
