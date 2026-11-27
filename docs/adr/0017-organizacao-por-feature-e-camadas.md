# ADR 0017 — Organização por feature, com uma subpasta por camada (back e front)

- Status: aceita
- Data: 2026-11-27

## Contexto
O front-end já tinha sido reorganizado (branch `refactor/estrutura-features-frontend`): cada
feature separa `pages/`, `components/`, `api/`, `domain/`, `context/`... No back-end, cada
feature tinha todos os arquivos soltos na mesma pasta (`matches/` com 8 arquivos de 4 tipos),
e os dois lados do projeto seguiam convenções diferentes.

## Decisão
Os dois lados usam o mesmo modelo: **organização por feature** (*package by feature*, também
chamada de *vertical slices*) por fora e **camadas** por dentro.

```
backend/src/features/<feature>/
├── routes/       <feature>.routes.js       camada de apresentação (HTTP / Express)
├── service/      <feature>.service.js      camada de aplicação (casos de uso)
├── core/         <feature>.core.js         camada de domínio (regras puras)
├── repository/   <feature>.repository.js   camada de dados (Prisma)
└── utils/        ajudantes técnicos (só no auth: tokens e hash de senha)
```

- A dependência vai num sentido só: `routes → service → core` e `service → repository`.
  O `core` não importa nada de fora (nem Prisma, nem Express).
- O serviço recebe o repositório por parâmetro (injeção de dependência), e por isso os testes
  usam repositórios em memória.
- Só existe a subpasta que a feature usa; o arquivo mantém o sufixo da camada (`matches.core.js`).
- No front a correspondência é: `pages/`/`components/` ↔ `routes/` (borda com o usuário),
  `api/` ↔ `repository/` (acesso a dados), `domain/` ↔ `core/` (regras puras).

## Alternativas consideradas
- **Organização por camada no topo** (`src/routes/`, `src/services/`, `src/repositories/`):
  comum em tutoriais, mas espalha uma feature por várias pastas e esconde o domínio.
- **Arquivos soltos na feature (como antes):** funciona com poucos arquivos, mas a feature
  `matches` já tinha 8 e cresceria mais.
- **Arquitetura hexagonal completa (ports/adapters):** separaria interfaces e adaptadores,
  mas seria cerimônia demais para o tamanho do projeto. O `core` puro e o repositório injetado
  já dão o benefício principal (testar regra sem banco).

## Consequências
- Mudança só de lugar: nenhum comportamento mudou (526 testes sem banco e 11 com banco passam).
- Imports relativos ficaram um nível mais fundos (`../../../errors/AppError.js`).
- Os testes do back-end continuam em `backend/tests/` (o Vitest já procura lá).
