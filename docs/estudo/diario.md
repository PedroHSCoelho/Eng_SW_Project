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
