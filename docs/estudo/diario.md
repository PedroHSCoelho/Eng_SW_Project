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
