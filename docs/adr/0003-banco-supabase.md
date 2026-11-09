# ADR 0003 — Banco PostgreSQL hospedado no Supabase (sem Docker)

- Status: aceita
- Data: 2026-11-09

## Contexto
Havia um `docker-compose.yml` com PostgreSQL local. Nem todos os alunos conseguem instalar Docker (sem permissão de administrador). O Prisma já fala PostgreSQL, então trocar o servidor não exige mudar o código.

## Decisão
1. O banco é um PostgreSQL no **Supabase**, **um projeto compartilhado pelo grupo**.
2. Duas URLs no `.env`: `DATABASE_URL` (Transaction pooler, porta 6543, `?pgbouncer=true`) para a aplicação, e `DIRECT_URL` (Session pooler, porta 5432) para o `prisma migrate`. O `schema.prisma` declara `directUrl = env("DIRECT_URL")`.
3. O `docker-compose.yml` foi removido.
4. Os testes automatizados não dependem do banco (repositório em memória), então o CI não muda.

## Alternativas consideradas
- **Manter Docker:** quem não consegue instalar fica de fora.
- **PostgreSQL instalado direto:** também exige instalação e permissões.
- **Um projeto Supabase por aluno:** isola cada um, mas cada pessoa precisa rodar as migrações no seu projeto e os dados de demonstração divergem. O grupo escolheu um projeto único.

## Consequências
- Qualquer aluno roda o projeto só com Node e a senha do banco.
- **Banco compartilhado:** erro de um afeta todos (ex.: `migrate reset`). Regras de cuidado em `docs/setup.md`. Migração nova: uma pessoa por vez.
- Dependemos de internet e do plano gratuito do Supabase (projetos inativos podem ser pausados).
- A senha é segredo: fica só no `.env` (ignorado pelo Git). Se vazar, resetar no painel.
- Testes de integração futuros com banco real escreveriam no banco do grupo; avaliar um schema ou projeto separado para testes antes de criá-los.
