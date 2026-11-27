# Eng_SW_Project

Um aplicativo para quem ama futebol. Registre o desempenho nas peladas, acompanhe estatísticas pessoais, consulte o ranking dos jogadores e avalie seus amigos após cada partida.

## Sobre o produto

O aplicativo reúne informações sobre partidas de futebol amador, permitindo registrar os acontecimentos dos jogos, acompanhar o desempenho dos jogadores e avaliar a performance dos participantes.

A partir dos dados registrados, o sistema calcula estatísticas individuais e disponibiliza rankings, tornando as partidas entre amigos mais organizadas e competitivas.

## Funcionalidades

### Estatísticas pessoais e ranking de jogadores

- Cadastro de jogadores com perfil individual.
- Consulta das estatísticas de cada jogador, incluindo gols, assistências e partidas disputadas.
- Ranking geral de jogadores com base nas estatísticas registradas.
- Atualização automática das estatísticas a partir das partidas cadastradas.

### Súmula da partida

- Cadastro de partidas, incluindo data, participantes e resultado.
- Registro dos gols e identificação dos jogadores que marcaram.
- Registro de assistências para os gols, quando aplicável.
- Atualização automática das estatísticas dos jogadores após o registro da partida.
- Histórico das partidas disputadas.

### Avaliação entre jogadores

- Avaliação dos jogadores pelos participantes após cada partida.
- Atribuição de notas de 1 a 5 para os jogadores avaliados.
- Cálculo da média das avaliações recebidas por cada jogador.
- Consulta à nota média dos jogadores em seus perfis.

## Aplicação publicada

O sistema está no ar em **https://eng-sw-project-frontend.vercel.app** (front estático e API na Vercel, banco no Supabase). Para rodar na sua máquina, veja [Primeiros passos](#primeiros-passos).

## Tecnologias

| Camada | Stack |
|--------|-------|
| Front-end | React, Vite, Tailwind CSS, React Router, Vitest + Testing Library |
| Back-end | Node.js, Express, Prisma, JWT em cookie httpOnly, Vitest + Supertest |
| Banco de dados | PostgreSQL hospedado no Supabase |
| Deploy | Vercel (front estático + API serverless) |

## Como usar o aplicativo

1. **Entrar:** crie uma conta (todo cadastro nasce como *jogador*). O primeiro organizador é promovido pelo terminal (ver [docs/setup.md](docs/setup.md)).
2. **Organizador:** cadastra jogadores, liga cada conta a um jogador, cria a partida (e pode corrigir data e local ou cancelá-la enquanto não for encerrada), escala os dois times (à mão ou pelo **sorteio de times equilibrado**, que usa a média de notas), lança os gols (e assistências) e encerra a súmula. Depois de encerrada, a súmula não muda mais.
3. **Todos:** veem partidas (com o placar), histórico, ranking (geral, artilharia e assistências, por período e por posição) e o perfil de cada jogador com estatísticas (por período) e média de notas.
4. **Quem jogou:** depois do encerramento, vota no craque da partida (dentro da própria partida). A nota de 0 a 5 de cada jogador é dada pelos admins do grupo e só serve para equilibrar o sorteio dos times.

As regras de negócio (placar, resultado, pontos e desempates do ranking, prazo e anonimato das avaliações) ficam no back-end, em funções puras com testes automatizados.

## Primeiros passos

O passo a passo completo para rodar o projeto está em [docs/setup.md](docs/setup.md).

```powershell
cd backend;  npm install; npx prisma migrate deploy; npm run dev   # http://localhost:3001/api/health
cd frontend; npm install; npm run dev                               # http://localhost:5173
cd backend;  npm test                                               # testes do back-end (sem banco)
cd frontend; npm test                                               # testes do front-end
```

## Estrutura do repositório

```
Eng_SW_Project/
├── backend/                 # API (Node.js + Express + Prisma)
│   ├── prisma/              # schema.prisma e migrações
│   ├── src/features/        # um módulo por assunto (players, matches, stats...), cada um com routes/ service/ core/ repository/
│   └── tests/               # testes automatizados do back-end
├── frontend/                # Interface web (React + Vite + Tailwind)
│   └── src/features/        # telas por assunto, cada uma com pages/ components/ api/ domain/..., testes ao lado
├── docs/
│   ├── setup.md             # como rodar o projeto
│   ├── arquitetura.md       # arquitetura e lista das rotas da API
│   ├── CONTEXT.md           # vocabulário e regras do domínio
│   ├── adr/                 # decisões de arquitetura
│   ├── estudo/diario.md     # diário: o que foi feito e por quê
│   └── referencia/          # material de apoio e leituras (ver o README da pasta)
├── api/                     # entrada serverless da Vercel
├── .github/                 # template de Pull Request
└── CONTRIBUTING.md          # como trabalhamos em equipe (branches, commits, PRs)
```

## Trabalho em equipe

Antes de contribuir, leia o [CONTRIBUTING.md](CONTRIBUTING.md): ele define o fluxo de branches, o padrão de commits e o processo de Pull Request.
