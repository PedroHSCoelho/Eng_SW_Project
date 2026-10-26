---
name: migracao-banco
description: Altera o schema Prisma e cria migrações com segurança (expand and contract), explicando a modelagem. Use sempre que editar prisma/schema.prisma ou criar modelos como Player, Match, Goal, Rating.
---

# Mudanças de banco (Prisma + PostgreSQL)

## Antes de editar
1. **Modele a partir do domínio** (`docs/CONTEXT.md`), não de telas. Desenhe o diagrama ER em ASCII e mostre aos alunos: entidades, chaves, cardinalidades (1:N, N:N via tabela de junção).
2. Explique cada decisão: tipo do campo, `@unique`, `@@index`, `onDelete`, opcionalidade. Normalização: nada de dado derivado duplicado sem motivo (ex.: estatísticas podem ser **calculadas** a partir de partidas/gols em vez de armazenadas — discutir trade-off de desempenho vs consistência e registrar ADR).
3. Restrições de integridade no banco, não só no código (ex.: nota 1–5 também como `CHECK` via SQL na migração, ou validação em dois lugares conscientemente).

## Fluxo
```powershell
docker compose up -d
cd backend
npx prisma migrate dev --name <descricao-curta-em-kebab-case>
npx prisma generate      # se o client não atualizou
```
- Leia o `migration.sql` gerado **com os alunos** antes de seguir; é o que de fato roda no banco.
- Uma migração = uma mudança conceitual. Nomes como `adiciona-gols-na-partida`.

## Regras
- **Expand & Contract** para mudanças que quebram compatibilidade: (1) adiciona nova coluna/tabela, (2) migra dados, (3) código passa a usar a nova, (4) só depois remove a antiga em outra migração. Nunca renomear/remover em um passo só em dados reais.
- **Nunca** editar migração já aplicada/commitada; crie outra.
- **Nunca** `prisma migrate reset` ou apagar o volume `pgdata` sem confirmação explícita (apaga todos os dados).
- Seeds de desenvolvimento ficam em `prisma/seed.js` (a criar quando necessário), idempotentes e com dados fictícios.
- O modelo `User` atual é ponto de partida; antes de remover/renomear, confirme com o grupo (provável substituição por `Player`) e registre ADR.
- Depois da migração, atualize testes e `docs/CONTEXT.md` se nomes mudaram.
