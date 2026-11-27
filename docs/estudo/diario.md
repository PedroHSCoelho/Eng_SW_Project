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

## 2026-11-10 — Gols e assistências (F06)
- O que mudou: modelo `Goal` (autor, assistência opcional, time que ganha o gol, gol contra, minuto opcional; migração `cria-gol`); `goals.core.js` com as regras; `POST /api/matches/:id/gols` e `DELETE /api/matches/:id/gols/:goalId`; a partida passa a vir com os gols.
- Por quê: critérios da F06; os gols são a fonte do placar (F07) e das estatísticas (F10).
- Conceito aprendido: dado derivado calculado no servidor (`team` nunca vem do cliente); duas relações para a mesma tabela (`GoalScorer` e `GoalAssist`); regra que depende do estado (só com a partida em andamento).
- Arquivos principais: `schema.prisma`, `goals.core.js`, `matches.service.js`, `matches.repository.js`, `matches.routes.js`.
- Teste que prova: 31 testes novos (20 do núcleo dos gols, 3 do serviço, 8 da API); 217 no back ao todo; conferido também contra um PostgreSQL local.
- Dúvidas que ficaram: um gol pode ser lançado ao mesmo tempo em que outra pessoa encerra a partida (janela pequena entre ler e gravar); aceitável nesta escala.
- Quem revisou/entendeu: Luiz (autor); revisor do PR: (preencher)

## 2026-11-10 — Encerrar partida e placar (F07)
- O que mudou: `Match` ganhou `result` (enum `MatchResult`) e `finishedAt` (migração `encerra-partida`); funções puras `calcularPlacar`, `resultadoDoPlacar` e `verificarPodeEncerrar`; `PATCH /api/matches/:id/encerrar`; toda resposta de partida traz `score`; relógio injetado no serviço de partidas; ADR 0008.
- Por quê: critérios da F07; fecha a súmula (Entrega 2, parte do back-end) e prepara histórico, estatísticas e ranking.
- Conceito aprendido: máquina de estados completa (agendada → em andamento → finalizada); dado derivado calculado x gravado; injeção do relógio para testar regra de tempo.
- Arquivos principais: `schema.prisma`, `matches.core.js`, `matches.service.js`, `matches.repository.js`, `matches.routes.js`.
- Teste que prova: 17 testes novos (9 do núcleo, 2 do serviço, 6 da API); 234 no back ao todo; conferido também contra um PostgreSQL local.
- Quem revisou/entendeu: Luiz (autor); revisor do PR: (preencher)

## 2026-11-23 — Estatísticas e ranking (F10 + F11, back-end)
- O que mudou: `features/stats/` (núcleo puro, serviço, rotas); `GET /api/players/:id/stats` e `GET /api/rankings`; `matchesRepository.listarFinalizadas`; ADR 0009. As 5 migrações pendentes (auth, pedido de organizador, partida, gol, encerramento) foram aplicadas no Supabase com `migrate deploy` (as tabelas `User` e `Player` estavam vazias).
- Por quê: critérios da F10 e F11; é onde mora a regra de negócio avaliada (pontos, desempates, mínimo de partidas, gol contra).
- Conceito aprendido: dado derivado calculado x gravado; núcleo funcional/casca; TDD (Red -> Green); autenticação aplicada por rota para não transformar 404 em 401.
- Arquivos principais: `stats.core.js`, `stats.service.js`, `stats.routes.js`, `criarApp.js`, `matches.repository.js`.
- Teste que prova: 27 testes do núcleo e 11 da API (partidas jogadas pela própria API); 272 no back ao todo. A consulta real do Prisma foi executada no Supabase (devolveu 0 partidas: ainda não há dados).
- Não verificado: cálculo com dados reais no Supabase; desempenho com muitas partidas.
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — Avaliações e média de notas (F13 + F14, back-end)
- O que mudou: modelo `Rating` (migração `cria-avaliacao`, com `CHECK` de nota 1–5 e avaliador diferente de avaliado, já aplicada no Supabase); `features/ratings/` (núcleo, serviço, repositório, rotas); `PUT /api/matches/:id/avaliacoes`, `GET .../avaliacoes/pendentes`, `GET .../destaque`, `GET /api/players/:id/ratings`; ADR 0010.
- Por quê: critérios da F13 e F14; fecha as regras de negócio do README (só participantes avaliam, nota de 1 a 5, média no perfil).
- Conceito aprendido: autoria vem da sessão, nunca do corpo; regra de prazo com relógio injetado; `upsert` + chave única (edita, não duplica); anonimato por mínimo de amostra; `CHECK` no banco como última barreira.
- Arquivos principais: `schema.prisma`, `ratings.core.js`, `ratings.service.js`, `ratings.repository.js`, `ratings.routes.js`, `criarApp.js`.
- Teste que prova: 28 do núcleo e 20 da API (inclui as 48h com data simulada e "raterId no corpo é ignorado"); 320 no back ao todo. Conferido também no Supabase: `upsert` edita a mesma linha e os dois `CHECK` barram nota 7 e auto-avaliação (dados de teste apagados depois).
- Dúvidas que ficaram: mínimo de 3 notas por partida/destaque é suposição nossa; comentário hoje não é mostrado ao avaliado.
- Não verificado: telas (F13/F14 no front ainda não existem).
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — Telas de ranking e perfil (F12)
- O que mudou: `RankingPage` (abas Geral, Artilharia e Assistências + filtro de período), `PlayerProfilePage` (estatísticas, média de notas, últimas partidas V/E/D), rotas `/ranking` e `/jogadores/:id`, item "Ranking" no menu. No back-end, `ultimasPartidas` (núcleo) e o campo `recentes` em `GET /api/players/:id/stats`.
- Por quê: critérios da F12; é o que o professor vê das regras de F10, F11 e F14.
- Conceito aprendido: o front não calcula nada (só mostra o que o back devolve); `Promise.all` para consultas independentes; flag `ativo` contra resposta antiga; teste de componente simulando o `fetch`.
- Arquivos principais: `RankingPage.jsx`, `PlayerProfilePage.jsx`, `rankingApi.js`, `App.jsx`, `stats.core.js`.
- Teste que prova: 6 testes do ranking e 6 do perfil (Testing Library); 4 testes novos no back; 55 no front e 324 no back.
- Não verificado: a tela no navegador de verdade (o back real não subiu porque o `.env` local não tem `JWT_SECRET`); o perfil ainda não é aberto a partir da lista de Jogadores, só do ranking.
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — Tela da súmula (F08)
- O que mudou: `MatchesPage` (`/partidas`: lista e criação), `MatchPage` (`/partidas/:id`: a súmula), `LineupEditor` (escalar e iniciar), `GoalForm` (lançar gol), `matchesApi.js`; rotas e item "Partidas" no menu.
- Por quê: critérios da F08; sem essa tela não dá para registrar uma partida pela interface, e ranking e perfil ficam vazios.
- Conceito aprendido: a tela guarda só a `partida` e troca pela resposta da API a cada ação (o placar vem calculado do back-end); a UI evita erros óbvios (assistência só do mesmo time, "Salve antes de iniciar") mas a regra de verdade continua no back-end (422); confirmação em dois cliques para ação irreversível; tela por papel (organizador edita, jogador só lê).
- Arquivos principais: `MatchPage.jsx`, `LineupEditor.jsx`, `GoalForm.jsx`, `MatchesPage.jsx`, `matchesApi.js`, `App.jsx`.
- Teste que prova: 12 testes da súmula (escalar, salvar, iniciar, gol com placar, assistência filtrada, gol contra, remover, encerrar com confirmação, leitura para jogador) e 5 da lista/criação; 72 no front ao todo.
- Não verificado: a tela no navegador com dados reais (o back sobe com `JWT_SECRET` e responde 401/404 corretamente, mas não percorri o fluxo no navegador para não gravar no banco compartilhado); a data usa o fuso do navegador.
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — Avaliações e destaque na tela (F13 + F14, front)
- O que mudou: `RatingsPanel` (destaque da partida; lista de quem falta avaliar, com nota de 1 a 5 e comentário opcional) e `ratingsApi.js`, encaixados na súmula quando a partida está finalizada.
- Por quê: critérios da F13 e F14 (tela pós-partida com quem falta avaliar; destaque da partida); fecha a história do app: jogar, encerrar, avaliar.
- Conceito aprendido: a tela mostra o que o back-end decide (prazo de 48h, só participantes, destaque com 3+ notas) e recarrega as pendências a cada nota; quem avalia vem do cookie, nunca do formulário; painel por papel (quem jogou avalia, os outros só veem o destaque).
- Arquivos principais: `RatingsPanel.jsx`, `ratingsApi.js`, `MatchPage.jsx`.
- Teste que prova: 9 testes do painel e 3 da integração na súmula; 84 no front ao todo.
- Dúvidas que ficaram: a API não lista as notas que a pessoa já deu, então a tela não permite editar uma nota depois de enviada (o back-end aceita editar). A média do perfil aparece em `/jogadores/:id`.
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — Histórico de partidas (F09)
- O que mudou: `GET /api/matches/historico` (filtros por jogador e período, ordem, paginação, placar) com núcleo puro `history.core.js`; tela `/historico` (`HistoryPage`) com filtros, paginação e link para o detalhe (`/partidas/:id`, que já mostra times, placar, gols e assistências).
- Por quê: critérios da F09; é a "memória" das peladas e a última feature principal do guia.
- Conceito aprendido: paginação e filtros decididos no servidor (o front só pede); a rota fixa `/historico` vem antes de `/:id` (ordem das rotas importa); intervalo `[de, ate)` com "até" inclusivo na tela convertido para o dia seguinte; mudar o filtro volta para a página 1.
- Arquivos principais: `history.core.js`, `matches.service.js`, `matches.routes.js`, `HistoryPage.jsx`, `historyApi.js`.
- Teste que prova: 21 do núcleo e 9 da API (filtros por jogador, período e combinados, paginação, 400); 10 no front (inclui `diaSeguinte` na virada de mês, ano e ano bissexto); 354 no back e 92 no front.
- Dúvidas que ficaram: o filtro de período é em UTC (partida às 22h no Brasil no último dia do mês cai no dia seguinte); o histórico carrega todas as finalizadas na memória antes de paginar (ok nesta escala; ver ADR 0009).
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — README em UTF-8 e atualizado
- O que mudou: `README.md` estava gravado em UTF-16 (ilegível em várias ferramentas e no diff) e desatualizado (citava Docker e um `docker-compose.yml` que não existe). Foi regravado em UTF-8, com as funcionalidades (escopo do grupo) mantidas sem alteração; tecnologias, "Como usar", comandos e estrutura do repositório foram atualizados.
- Por quê: a Definition of Done pede que README e `docs/setup.md` permitam a um desconhecido rodar o projeto.
- Não verificado: o passo a passo do zero numa máquina limpa (o `docs/setup.md` foi relido e continua correto).
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — Sorteio de times (F15), edição de notas e atalhos da página inicial
- O que mudou: `features/draw/` (núcleo `draw.core.js`, serviço, rota `POST /api/sorteio`, só organizador) e tela `/sorteio` (escolher presentes, ver os times, "sortear de novo" e "criar partida com estes times", que cria a partida e já escala); `GET /api/matches/:id/avaliacoes/minhas` e seção "Suas avaliações" no painel (editar nota até o fim do prazo); cartões da página inicial viraram atalhos (e o organizador ganhou o do sorteio); ADR 0011.
- Por quê: critérios da F15 e fechamento de uma lacuna da F13 (a API aceitava editar a nota, mas a tela não mostrava as notas já dadas).
- Conceito aprendido: busca exaustiva (força bruta) com limite justificado e combinações por máscara de bits; amostragem de reservatório para sortear entre empates com o sorteador injetado nos testes; núcleo puro reaproveitando a média do módulo de avaliações; criar partida + escalar como duas chamadas e como tratar a falha da segunda.
- Arquivos principais: `draw.core.js`, `draw.service.js`, `DrawPage.jsx`, `RatingsPanel.jsx`, `ratings.service.js`, `HomePage.jsx`.
- Teste que prova: 23 do núcleo do sorteio (tamanhos, equilíbrio, média padrão 3,0, goleiros, sorteio determinístico, 22 jogadores), 7 da API do sorteio, 4 da API das minhas notas; 10 do front do sorteio, 3 da edição de notas, 3 dos atalhos; 388 no back e 107 no front.
- Dúvidas que ficaram: com 3 ou mais goleiros "1 por time" é impossível (dividimos 2 x 1); a força do time é média, não soma.
- Não verificado: as telas no navegador; o sorteio com notas reais (as consultas novas rodam no Postgres e devolvem vazio porque o banco não tem dados).
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — Deploy na Vercel funcionando
- O que mudou: a produção estava no ar, mas o banco não conectava (`Environment variable not found: DATABASE_URL` no log da função). Foram criadas na Vercel as variáveis `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET` (ambiente Production) e feito um novo deploy. `docs/setup.md` ganhou o endereço publicado, como conferir se está tudo certo e uma tabela de problemas comuns; o README ganhou a seção "Aplicação publicada".
- Por quê: o ADR 0006 deixou o deploy real como "não verificado"; sem as variáveis, login, cadastro e tudo que toca o banco falhava em produção.
- Conceito aprendido: variável de ambiente vale por ambiente (Production x Preview) e só entra em deploy novo; o log da função mostra o erro real; segredo nunca vai para o Git; verificar produção com um teste ponta a ponta que apaga os próprios dados.
- Teste que prova: teste na URL pública (19 checagens: cadastro com token, sessão por cookie, permissões, sorteio, partida completa, estatísticas, ranking, histórico, avaliações e destaque) e conferência de que os dados de teste foram apagados. Primeiro organizador criado com `npm run organizador:promover`.
- Não verificado: o visual das telas em produção e o deploy de prévia dos PRs (as variáveis podem ter sido criadas só para Production).
- Quem revisou/entendeu: (preencher)

## 2026-11-23 — Editar e cancelar partida, placar na lista, ranking por posição e perfil por período
- O que mudou: `PUT /api/matches/:id` (editar data e local só de partida agendada) e `PATCH /api/matches/:id/cancelar`; novo estado `CANCELED` no `MatchStatus` (migração `cancela-partida`, só aditiva, já aplicada no Supabase); `GET /api/matches` passa a trazer o placar de cada partida; ranking com `?posicao=` e estatísticas do jogador com `?periodo=mes|ano|tudo`. No front: formulário "Data e local" e botão "Cancelar partida" (com confirmação) na súmula, placar e selo "Cancelada" na lista, seletor de posição no ranking e de período no perfil. ADR 0012.
- Por quê: ajustes pedidos para o sistema ficar mais completo no uso real (corrigir uma partida marcada errada, cancelar por chuva, ver o placar sem abrir cada partida, comparar goleiros com goleiros e ver a fase atual de um jogador).
- Conceito aprendido: estado em vez de exclusão (a partida cancelada some das contas porque elas já só olhavam `FINISHED`); atualização condicional (`where status`) contra corrida; migração aditiva aplicada antes do código; filtro opcional validado no núcleo; resposta antiga não sobrescreve a nova (`useRef` com número do pedido).
- Arquivos principais: `matches.core.js` (`verificarPodeEditar`, `verificarPodeCancelar`), `matches.service.js`, `stats.core.js` (`lerPosicao`, `lerPeriodoDasEstatisticas`), `MatchPage.jsx`, `MatchEditForm.jsx`, `RankingPage.jsx`, `PlayerProfilePage.jsx`.
- Teste que prova: 41 testes novos no back (núcleo, API de editar/cancelar/lista e dos filtros) e 17 no front; 429 no back e 124 no front. As mudanças no repositório foram conferidas no Postgres real com uma partida temporária (apagada).
- Dúvidas que ficaram: cancelar não pode ser desfeito (criar outra partida); o período do perfil é em UTC como o ranking.
- Não verificado: as telas no navegador; o código novo ainda não está em produção (depende de commit, PR e deploy).
- Quem revisou/entendeu: (preencher)

## 2026-11-24 — Grupos: qualquer pessoa organiza a sua pelada (back-end)
- O que mudou: modelos `Group` e `Membership` (migrações `cria-grupos`, que leva os dados atuais para o grupo padrão "Pelada da turma", e `remove-papel-global`); módulo `features/groups/` (criar grupo, meus grupos, convite por código, entrar, membros, mudar papel, remover e sair); todas as features passaram para `/api/grupos/:grupoId/...` com o middleware `carregarParticipacao`; saíram o papel global, os pedidos de organizador, a gestão de usuários e o comando `organizador:promover`. ADR 0013.
- Por quê: o organizador era um só para o sistema inteiro, e virar organizador dependia de vínculo e aprovação. O pedido foi funcionar como grupo de WhatsApp: qualquer um cria e convida.
- Conceito aprendido: autorização por recurso (papel no grupo, não na conta); 404 em vez de 403 para não revelar o que existe; isolamento entre grupos (multi-tenancy simples); migração expand & contract com dados (preencher antes de tornar a coluna obrigatória); a mesma regra de negócio ("nunca sem organizador") reaproveitada num escopo novo.
- Arquivos principais: `schema.prisma`, as duas migrações, `groups.core.js`, `groups.service.js`, `middlewares/auth.js`, `criarApp.js` e os serviços de players, matches, stats, ratings e draw.
- Teste que prova: 25 do núcleo dos grupos, 25 da API dos grupos e 6 de isolamento entre grupos (um grupo não vê nem usa nada do outro); os testes de rota antigos agora rodam dentro de um grupo de teste. As duas migrações rodaram num Postgres local com dados de exemplo (contas, jogadores, partida, gol e pedido de organizador) e o schema bateu com o banco.
- Dúvidas que ficaram: dois organizadores rebaixando um ao outro ao mesmo tempo (ver ADR 0013); excluir grupo ficou de fora.
- Não verificado: as telas (o front ainda chama as rotas antigas e é a próxima etapa); a migração no Supabase real.
- Quem revisou/entendeu: (preencher)

## 2026-11-25 — Foto do jogador e mini foto ao lado do nome
- O que mudou: tabela `PlayerPhoto` (migração `cria-foto-do-jogador`, só aditiva); módulo `features/photos/` no back (`GET /players/fotos`, `GET|PUT|DELETE /players/:id/foto` dentro do grupo); no front, `FotosContext`, `ui/Avatar.jsx` (foto ou iniciais) em todas as telas onde aparece o nome do jogador, e "Adicionar/Trocar/Remover foto" no perfil. ADR 0015.
- Por quê: pedido do grupo, para reconhecer a galera mais rápido nas listas e na súmula.
- Conceito aprendido: onde guardar arquivo num app serverless (banco x storage); validar arquivo pelos bytes (assinatura), não pelo nome; limite de tamanho no leitor do corpo (413); cache com versão na URL; separar dado pesado numa tabela própria para não carregar sem querer.
- Arquivos principais: `photos.core.js`, `photos.service.js`, `photos.routes.js`, `photos.repository.js`, `criarApp.js`, `errorHandler.js`, `FotosContext.jsx`, `Avatar.jsx`, `FotoDoJogador.jsx`, `reduzirFoto.js`, `fotos.js`.
- Teste que prova: 18 testes novos no back (núcleo e API: tipos, tamanho, 413, quem pode, isolamento entre grupos) e 15 no front (iniciais, recorte, avatar com e sem foto, envio e remoção no perfil). A migração rodou num Postgres local junto com as 15 anteriores e o schema bateu; upload real pelo navegador (foto 1200 x 1600 de 47 KB virou 3,5 KB).
- Não verificado: no Supabase e na Vercel (depende do `migrate deploy` e do deploy).
- Quem revisou/entendeu: (preencher)

## 2026-11-26 — CI no fluxo dev → test → main
- O que mudou: o workflow do GitHub Actions agora roda em pushes para `dev`, `test` e `main`, e em PRs direcionadas a essas branches.
- Por quê: validar a mudança antes do merge e testar novamente quando ela chega a `test` e `main`.
- Conceito aprendido: integração contínua nos pontos de integração do fluxo; checks de CI não bloqueiam merge sem proteção de branch configurada no GitHub.
- Como foi verificado: revisão do workflow e `git diff --check`; eventos reais de GitHub não foram executados nesta sessão.
- Quem revisou/entendeu: (preencher)

## 2026-11-26 — Reorganizando a feature matches no front
- O que mudou: páginas, componentes, APIs e regras de domínio passaram para subpastas próprias dentro de `frontend/src/features/matches/`; testes continuam junto do código testado; imports internos e externos foram atualizados.
- Por quê: reduzir a mistura de responsabilidades na raiz da feature e facilitar localizar cada tipo de arquivo sem alterar o comportamento.
- Conceito aprendido: organização por responsabilidade dentro de uma feature; manter testes co-localizados com a implementação.
- Como foi verificado: `cd frontend; npm test` (20 arquivos e 181 testes passaram) e `cd frontend; npm run build` (build concluído).
- Quem revisou/entendeu: (preencher)

## 2026-11-26 — Organizando as demais features do front
- O que mudou: auth, groups, photos, players, home, draw e rankings passaram a separar páginas, componentes, APIs, contextos e lógica conforme cada feature necessita; a página inicial foi movida para `features/home/pages/`; posições dos jogadores foram extraídas do formulário para `players/domain/positions.js`. O back-end não foi alterado.
- Por quê: padronizar a navegação por responsabilidade sem criar pastas vazias ou forçar a mesma estrutura em features diferentes.
- Conceito aprendido: coesão por feature, separação de responsabilidades e dependência de domínio sem acoplar outras features a um componente visual.
- Como foi verificado: imports relativos conferidos; `cd frontend; npm test` (20 arquivos e 181 testes passaram); `cd frontend; npm run build` (build concluído).
- Não verificado: navegação manual no navegador; o comportamento foi validado pela suíte e pelo build.
## 2026-11-27 — Ajustes finais (bugs da revisão) e bancos de dev e teste
- O que mudou: (1) estatísticas: na pelada o J conta cada jogo da noite (J = V + E + D), e "Últimas partidas" mostra a pelada como campanha (ex.: "Pelada 3V 0E 2D") em vez de um falso empate com placar somado; o rodapé do ranking explica a regra de cada aba. (2) Jogadores: `PATCH /players/:id/reativar` e botão "Reativar"; busca ignora acentos ("joao" acha "João"); "Editar" rola até o formulário; o admin não tem Inativar/Excluir no próprio cartão. (3) Partidas: o erro do lance aparece dentro do painel (e o minuto fora de 0 a 120 é barrado antes de ir à API); gols e cartões em ordem (jogo da noite, minuto, ordem de lançamento); a classificação da noite mostra GP e o critério de desempate; partida com data passada é permitida, mas avisa e fica marcada "falta lançar o resultado"; o histórico avisa datas fora de ordem com acento e limpa os resultados antigos; quem é escalado (inclusive pelo Sorteio) entra na lista de presença; o sorteio aceita de 3 a 11 por time para qualquer número de times (antes 60 para 3 times); saiu o atalho "Avaliação" da home. (4) Bancos: dev (projeto Supabase próprio), teste (schema `test`) e produção, com `scripts/ambiente.js`, seed e testes de integração em `tests-db/`. ADR 0016.
- Por quê: lista de bugs e ajustes da revisão final, e poder mostrar que testes e desenvolvimento não rodam no banco de produção.
- Conceito aprendido: invariante (J = V + E + D) como teste; dado derivado com uma definição só; normalização Unicode (NFD) para busca; validar no cliente só para conforto (a regra continua no back-end); separação de ambientes (dev/test/prod) e "falhar fechado" (o script recusa em vez de adivinhar); pirâmide de testes (muitos em memória, poucos com banco real).
- Teste que prova: back-end 526 testes sem banco + 11 com PostgreSQL real (schema `test`); front-end 195. Seed e API conferidos num PostgreSQL local (busca "carlao", reativar, escalação indo para a presença).
- Não verificado: as telas no navegador; os bancos no Supabase real (o projeto de dev ainda precisa ser criado); o job novo do CI (roda no primeiro push).
- Quem revisou/entendeu: (preencher)

## 2026-11-27 — Back-end no mesmo modelo de pastas do front
- O que mudou: junção da refatoração do front (`refactor/estrutura-features-frontend`) com os ajustes finais; no back-end, cada feature passou a ter subpastas `routes/`, `service/`, `core/` e `repository/` (e `utils/` no auth). Imports atualizados por script. ADR 0017.
- Por quê: os dois lados do projeto seguirem a mesma organização (por feature, com camadas dentro) e cada tipo de arquivo ter um lugar previsível.
- Conceito aprendido: *package by feature* (coesão por assunto) com arquitetura em camadas dentro da feature; regra de dependência num sentido só; núcleo de regras puras separado do acesso a dados.
- Teste que prova: back-end 526 testes; todos os imports relativos conferidos por script; o CI roda também os 11 testes com banco.
- Quem revisou/entendeu: (preencher)
