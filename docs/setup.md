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
# edite o .env: troque [SENHA] nas duas URLs e gere o JWT_SECRET (comando no .env.example)
npm install
npx prisma migrate deploy       # aplica as migrações no banco (não apaga dados)
npm run dev                     # http://localhost:3001/api/health
```

O servidor não sobe sem `JWT_SECRET` (mínimo 32 caracteres). A migração `auth-user-role` adiciona senha, papel e vínculo com jogador à tabela `User`.

### Primeiro organizador

Todo cadastro nasce **jogador**. Para o primeiro organizador (e para recuperar o acesso se o sistema ficar sem nenhum):

1. Crie a conta no front (**Entrar > Não tenho conta**).
2. Promova-a direto no banco, pelo terminal:
   ```powershell
   cd backend
   npm run organizador:promover -- seu@email.com
   ```
3. Depois disso, tudo é pela interface: em **Usuários** o organizador vincula contas a jogadores, muda papéis e **aprova ou recusa pedidos de organizador**. Um jogador vinculado pede em **Ser organizador** (um pedido por vez; depois de recusado, espera 7 dias).

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

## 5. Publicar na Vercel (produção)

Um projeto só na Vercel, ligado à raiz do repositório (ver `docs/adr/0006-deploy-na-vercel.md`).

1. Em vercel.com, **Add New → Project**, importe o repositório do GitHub e deixe **Root Directory** = raiz (não escolha `backend` nem `frontend`). O `vercel.json` já define install, build e saída.
2. Em **Settings → Environment Variables**, crie (Production e Preview):
   - `DATABASE_URL`: a do `.env`, com `&connection_limit=1` no final.
   - `DIRECT_URL`: a do `.env`.
   - `JWT_SECRET`: um segredo NOVO só de produção (comando no `.env.example`).
   - `NODE_ENV` não precisa: a Vercel já usa `production`.
3. **Deploy**. Teste `https://<seu-projeto>.vercel.app/api/health` e `/api/health/db`.
4. Migrações não rodam no deploy: depois de criar uma migração, rode `npx prisma migrate deploy` na sua máquina (usa a `DIRECT_URL` do `.env`).
5. Primeiro organizador em produção: `npm run organizador:promover` na sua máquina (aponta para o mesmo banco).

## Cuidados com o banco compartilhado

- Só uma pessoa por vez cria migração nova (`npx prisma migrate dev --name <descricao>`); avise o grupo.
- Nunca rode `prisma migrate reset` nem `db push --force-reset`: apagam os dados de todos.
- Para ver os dados: `npm run db:studio` ou o painel do Supabase.
