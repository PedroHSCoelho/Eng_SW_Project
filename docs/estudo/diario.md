# Diário de aprendizado

Uma entrada curta por sessão ou mudança relevante. Serve de roteiro de estudo para a apresentação. A IA propõe o texto; **os alunos revisam e confirmam que entenderam**.

Modelo:

```
## AAAA-MM-DD — título curto
- O que mudou: 
- Por quê: 
- Conceito aprendido: 
- Arquivos principais: 
- Teste que prova: 
- Dúvidas que ficaram: 
- Quem revisou/entendeu: 
```

---

## 2026-10-26 — Estrutura de trabalho com IA
- O que mudou: criados `CLAUDE.md`, skills em `.claude/skills/`, `docs/CONTEXT.md`, `docs/adr/`, `docs/referencia/README.md`.
- Por quê: padronizar como programamos com IA e garantir que o grupo entenda tudo que for entregue.
- Conceito aprendido: entendimento compartilhado antes do código; fatias verticais; núcleo funcional/casca.
- Dúvidas que ficaram: —

## 2026-11-03 — Modelagem do Player (F02, parte 1)
- O que mudou: `schema.prisma` ganhou o enum `Position` e o modelo `Player`; criado o ADR 0002; `docs/CONTEXT.md` ganhou apelido, posição e jogador inativo.
- Por quê: primeiro modelo do domínio; precisamos de apelido único sem diferenciar maiúsculas e de não duplicar estatísticas.
- Conceito aprendido: integridade no banco (não só no código); dado derivado calculado em vez de armazenado; coluna derivada (`nicknameKey`) só quando justificada.
- Arquivos principais: `backend/prisma/schema.prisma`, `docs/adr/0002-modelagem-do-player.md`.
- Teste que prova: ainda nenhum. `prisma validate` passou; a migração `cria-player` **ainda não foi gerada** (precisa de Docker).
- Dúvidas que ficaram: —
- Quem revisou/entendeu: (preencher)

## 2026-11-09 — Banco no Supabase (sem Docker)
- O que mudou: `schema.prisma` ganhou `directUrl`; `.env.example` com `DATABASE_URL` (pooler) e `DIRECT_URL`; `docker-compose.yml` removido; criados `docs/setup.md` e o ADR 0003.
- Por quê: nem todo aluno consegue instalar Docker; o Supabase é PostgreSQL hospedado e o Prisma não muda.
- Conceito aprendido: connection pooler (pgbouncer) vs conexão direta; por que migração usa a URL direta; infraestrutura como configuração, não como código.
- Arquivos principais: `backend/prisma/schema.prisma`, `backend/.env.example`, `docs/setup.md`, `docs/adr/0003-banco-supabase.md`.
- Teste que prova: ainda nenhum de banco. Falta aplicar `migrate deploy` e conferir `/api/health/db`.
- Dúvidas que ficaram: —
- Quem revisou/entendeu: (preencher)

## 2026-11-09 — Tela de jogadores e fechamento da F02
- O que mudou: criada a tela de jogadores (`frontend/src/features/players/`): lista, busca, filtro de ativos, cadastro, edição, inativar e excluir (com confirmação). Merge da `main` na branch (conflitos em `CLAUDE.md` e `docs/setup.md` resolvidos mantendo a nossa versão).
- Por quê: a F02 só estava pronta no back-end; a fatia vertical precisa chegar até a tela.
- Conceito aprendido: separar acesso HTTP (`playersApi.js`) da tela (`PlayersPage.jsx`); a regra continua no back-end e o front só exibe a mensagem de erro que a API devolve; teste de comportamento com `fetch` simulado por "MÉTODO + URL"; evitar resposta antiga sobrescrever a nova (flag `ativo` no `useEffect`).
- Arquivos principais: `playersApi.js`, `PlayersPage.jsx`, `PlayersPage.test.jsx`, `App.jsx`, `App.test.jsx`.
- Teste que prova: 15 testes do front (13 da tela). Sabotei a rota de inativar de propósito e o teste correspondente falhou; ponta a ponta feito via proxy do Vite até o Supabase.
- Dívida técnica conhecida: `npm audit` aponta 3 avisos altos na cadeia do Prisma 6 (`deepmerge-ts`); a correção exige Prisma 7 (breaking). Reavaliar antes da entrega.
- Dúvidas que ficaram: layout não foi conferido no navegador por quem escreveu o código.
- Quem revisou/entendeu: (preencher)

## 2026-11-09 — Tela de jogadores completa (F03)
- O que mudou: confirmação em dois cliques também ao **inativar** (antes só ao excluir); formulário extraído para `PlayerForm.jsx` (componente de apresentação); navegação com React Router (`/` e `/jogadores`, menu, página 404); cards da home foram para `HomePage.jsx`; texto do cabeçalho sem "campeonatos/sorteio/prancheta" (fora do escopo); ADR 0004.
- Por quê: fechar os critérios de aceite da F03 do `GUIA-DO-PROJETO.md`.
- Conceito aprendido: componente de apresentação vs. página que orquestra; roteamento no cliente (BrowserRouter em produção, MemoryRouter em teste); TDD (Red visto antes de cada Green).
- Arquivos principais: `PlayerForm.jsx`, `PlayerForm.test.jsx`, `PlayersPage.jsx`, `App.jsx`, `HomePage.jsx`, `main.jsx`, `docs/adr/0004-react-router-no-front.md`.
- Teste que prova: 25 testes do front (6 do formulário isolado, 5 do App/rotas, 14 da página). `npm run build` ok.
- Dúvidas que ficaram: layout e navegação não foram conferidos no navegador por quem escreveu o código (ver roteiro de teste manual).
- Quem revisou/entendeu: (preencher)

## 2026-11-09 — Dívida técnica do Prisma e fluxo de PRs
- O que mudou: `backend/package.json` ganhou `"overrides": { "deepmerge-ts": "^8.0.2" }`; `CONTRIBUTING.md` e `GUIA-DO-PROJETO.md` agora dizem que PRs vão para a `dev`.
- Por quê: o `npm audit` apontava 3 avisos altos em `deepmerge-ts` (dentro do CLI `prisma`, só em desenvolvimento). A correção oficial era migrar para o Prisma 7 (breaking); o `overrides` força a versão corrigida sem trocar o Prisma.
- Conceito aprendido: dependência transitiva (dependência da dependência); `overrides` do npm como correção pontual; verificar depois (`audit`, `prisma validate/generate/migrate status`, testes).
- Teste que prova: `npm audit` = 0 vulnerabilidades; 70 testes do back passam; `prisma migrate status` = banco em dia.
- Risco conhecido: o `overrides` é um remendo; se o Prisma 6 deixar de funcionar com `deepmerge-ts` 8, remover o override e planejar a migração para o Prisma 7.
- Quem revisou/entendeu: (preencher)

## 2026-11-09 — Login e papéis (F04)
- O que mudou: cadastro/login/logout/me (`/api/auth/*`), gestão de usuários (`/api/users`), **pedidos de organizador** (`/api/organizer-requests`: pedir, ver o meu, fila, aprovar, recusar), middlewares `autenticar`/`exigirPapel`, jogadores protegidos (leitura: logado; escrita: organizador), comando `npm run organizador:promover` (bootstrap no banco), migrações `auth-user-role` e `pedido-organizador`; front com `AuthContext`, tela de login/cadastro, rota protegida, tela Usuários (com a fila de pedidos) e tela "Ser organizador". `criarApp` separado de `app.js` para testar o app completo. ADR 0005. Removida a ideia de organizador por variável de ambiente.
- Por quê: critérios da F04 e base da F05 (criar partida só organizador) e F13 (só participante avalia); o organizador precisa surgir por regras no banco, não por configuração de máquina.
- Conceito aprendido: autenticação x autorização (401 x 403); hash vs. criptografia; JWT; cookie httpOnly/SameSite (XSS e CSRF); núcleo puro x casca; injeção de dependência (inclusive do relógio, para testar "7 dias"); transação (aprovar = fechar pedido + promover); lista explícita de campos para não vazar dados.
- Teste que prova: 147 testes do back e 43 do front; build do front ok.
- Não verificado: o fluxo contra o banco real (as migrações ainda não foram aplicadas no Supabase), o comando de bootstrap rodando de verdade e as telas no navegador.
- Quem revisou/entendeu: (preencher)

## 2026-11-09 — Deploy na Vercel
- O que mudou: `vercel.json`, `api/index.js` (ponto de entrada serverless), `package.json` na raiz (`"type": "module"`), `binaryTargets` no schema Prisma, remoção do `cors()` e da dependência `cors`, ADR 0006, seção "Publicar na Vercel" no `docs/setup.md`.
- Por quê: testar em uma URL pública sem depender do `localhost`, mantendo o cookie `strict` (mesma origem).
- Conceito aprendido: serverless x servidor sempre ligado; mesma origem x CORS; rewrites (SPA fallback); variáveis de ambiente por ambiente; migração de banco separada do deploy.
- Teste que prova: 147 testes do back, build do front e um teste manual carregando `api/index.js` (responde 401 sem login).
- Não verificado: o deploy real na Vercel (depende de criar o projeto e configurar as variáveis).
- Quem revisou/entendeu: (preencher)

## 2026-11-10 — Partida e escalação (F05)
- O que mudou: modelos `Match` e `MatchPlayer` com os enums `MatchStatus` e `Team` (migração `cria-partida`); módulo `matches` com núcleo puro, serviço, repositório e rotas em `/api/matches` (criar, listar, ver, escalar, iniciar); `possuiPartidas` dos jogadores agora consulta o `MatchPlayer`; ADR 0007.
- Por quê: critérios da F05; é a base da súmula (F06 gols, F07 encerramento) e das estatísticas.
- Conceito aprendido: máquina de estados (a partida só avança); chave composta como regra garantida pelo banco; transação para trocar a escalação sem ficar pela metade; atualização condicional (`updateMany where status`) contra corrida.
- Arquivos principais: `schema.prisma`, `matches.core.js`, `matches.service.js`, `matches.repository.js`, `matches.routes.js`, `criarApp.js`.
- Teste que prova: 39 testes novos (24 do núcleo, 4 do serviço, 11 da API com login); conferido também contra um PostgreSQL local (migração aplicada, escalação, iniciar, corrida e Restrict); 186 no back ao todo.
- Dúvidas que ficaram: a partida precisa de data no futuro para ser criada? (por ora aceita qualquer data; a F07 impede encerrar partida futura).
- Quem revisou/entendeu: Luiz (autor); revisor do PR: (preencher)
