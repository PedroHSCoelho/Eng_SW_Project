# Como rodar o projeto do zero

Pré-requisitos: Node.js 22 e Git. **Não é preciso instalar banco nem Docker**: o PostgreSQL roda no Supabase.

## 1. Banco (Supabase)

O grupo usa **um projeto Supabase compartilhado**. Peça a senha do banco a um colega (nunca commite).

Se for criar o projeto do zero: em supabase.com, crie um projeto (região mais próxima), guarde a senha do banco, clique em **Connect** e copie:

| String | Porta | Vai em |
|---|---|---|
| Transaction pooler | 6543 | `DATABASE_URL` (acrescente `?pgbouncer=true`) |
| Session pooler | 5432 | `DIRECT_URL` |

## 2. Back-end

```powershell
cd backend
Copy-Item .env.example .env     # só na primeira vez
# edite o .env e troque [SENHA] nas duas URLs
npm install
npx prisma migrate deploy       # aplica as migrações no banco (não apaga dados)
npm run dev                     # http://localhost:3001/api/health
```

`/api/health/db` deve responder OK. Se der 503, confira a senha e as duas URLs.
Erro `@prisma/client did not initialize`: rode `npx prisma generate` dentro de `backend`.

## 3. Front-end

```powershell
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

## 4. Testes

```powershell
cd backend;  npm test           # não precisa de banco
cd frontend; npm test
```

## Cuidados com o banco compartilhado

- Só uma pessoa por vez cria migração nova (`npx prisma migrate dev --name <descricao>`); avise o grupo.
- Nunca rode `prisma migrate reset` nem `db push --force-reset`: apagam os dados de todos.
- Para ver os dados: `npm run db:studio` ou o painel do Supabase.
