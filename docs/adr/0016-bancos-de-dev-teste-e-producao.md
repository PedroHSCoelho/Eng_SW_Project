# ADR 0016 — Três bancos: desenvolvimento, teste e produção (sem Docker)

- Status: aceita
- Data: 2026-11-27
- Substitui em parte: ADR 0003 (o "um projeto Supabase compartilhado" vira só a produção)

## Contexto
Até aqui havia **um único banco**, o Supabase de produção (o mesmo da Vercel). Quem rodava
`npm run dev` na própria máquina gravava nos dados reais, e o ADR 0003 já avisava que um teste
de integração com banco escreveria no banco do grupo. Precisamos mostrar (e garantir) que
desenvolvimento e testes não mexem na produção. Docker continua fora: nem todos conseguem instalar.

## Decisão
1. **Produção:** o projeto Supabase atual. Usado pela Vercel (variáveis do painel) e, na nossa
   máquina, só para aplicar migrações: `npm run db:deploy:prod` lê o `.env.production`.
2. **Desenvolvimento:** um **segundo projeto Supabase** (o plano gratuito permite 2 projetos ativos),
   no `.env`. É o padrão: `npm run dev`, `db:migrate`, `db:reset`, `db:seed` e `db:studio` usam ele.
3. **Teste:** um **schema `test`** dentro do projeto de desenvolvimento, no `.env.test`
   (`?schema=test` nas URLs). Os testes de integração (`tests-db/`, `npm run test:db`) apagam e
   recriam os dados dele a cada caso. No CI, o GitHub Actions sobe um PostgreSQL descartável
   (`services: postgres`) e roda os mesmos testes.
4. **`scripts/ambiente.js`** escolhe o arquivo do ambiente e só roda o comando depois de conferir:
   - cada arquivo tem a marca `BANCO=dev | test | producao` (o `.env` antigo, com a senha da
     produção e sem a marca, é recusado);
   - dev e test nunca podem ter o mesmo usuário/servidor/schema da produção;
   - test precisa de um schema com "test" no nome;
   - em produção só passam `prisma migrate deploy` e `prisma migrate status`.
   Os testes de banco têm ainda uma última trava (`tests-db/preparar.js`).
5. Os testes do dia a dia (`npm test`, 500+) continuam **sem banco** (repositórios em memória).

## Alternativas consideradas
- **Supabase Branching (um "branch" de banco por PR):** é o recurso oficial para isso, mas é do
  plano pago.
- **Banco local (PostgreSQL instalado ou Docker):** exige instalar e ter permissão de administrador.
- **Banco em memória (pg-mem / PGlite):** dispensa servidor, mas precisa de adaptador para o Prisma
  e não reproduz tudo do PostgreSQL (o índice único parcial da pelada, por exemplo).
- **Um terceiro projeto Supabase só para testes:** o plano gratuito para em 2 projetos ativos;
  o schema separado dá o mesmo isolamento sem um projeto a mais.
- **Só trocar o `.env` na mão:** fácil de esquecer e rodar um `migrate reset` na produção.

## Consequências
- `npm run dev` não toca mais os dados reais; dá para testar, apagar e recriar à vontade (`db:reset` + seed).
- Cada aluno precisa de três arquivos (`.env`, `.env.test`, `.env.production`), com modelos `.example`.
- Migração nova: criar no dev (`db:migrate`), testar (`test:db`), commitar e, depois do merge,
  aplicar na produção (`db:deploy:prod`). As migrações são as mesmas nos três bancos.
- Os testes de integração dependem de internet (Supabase) na nossa máquina; no CI não.
- O schema `test` fica no mesmo projeto do dev: um teste lento ou travado afeta só o dev, nunca a produção.
- Os deploys de prévia da Vercel (PRs) também devem apontar para o banco de dev (variáveis do ambiente *Preview*).
