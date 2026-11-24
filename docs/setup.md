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

O servidor não sobe sem `JWT_SECRET` (mínimo 32 caracteres).

### Grupos e organizadores

Não existe mais organizador do sistema todo: o papel é **por grupo**. Qualquer pessoa cria a conta, cria um grupo (vira organizadora dele) e convida os outros pelo código de convite. Um grupo pode ter vários organizadores e nunca fica sem nenhum (ver `docs/adr/0013-grupos-e-papel-por-grupo.md`).

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
5. **Migração que apaga colunas ou tabelas** (como `remove-papel-global`): faça antes um backup do banco no Supabase (**Database → Backups**, ou `pg_dump` com a `DIRECT_URL`). Ela não tem volta sem backup.

### Aplicação publicada

- **Endereço:** https://eng-sw-project-frontend.vercel.app (projeto `eng-sw-project-frontend`, time `eng-sw` na Vercel).
- Cada merge na `main` gera um deploy de produção; cada PR gera um deploy de prévia.
- **Como saber se está tudo certo:**
  - `/api/health` responde `{"status":"ok"}` (o servidor está de pé);
  - `/api/health/db` responde `{"status":"ok","banco":"conectado"}` (o banco responde);
  - `/api/rankings` sem login responde **401** (a API está protegida e o código novo está no ar).

### Problemas comuns na Vercel

| Sintoma | Causa | O que fazer |
|---|---|---|
| `/api/health/db` dá 503 e o login dá 500; no log da função aparece `Environment variable not found: DATABASE_URL` | A variável não existe para o ambiente **Production**, ou foi criada mas não houve novo deploy | Crie/confira a variável em **Settings → Environment Variables** e faça **Redeploy** (variável nova só vale em deploy novo) |
| O cadastro ou o login dá 500 só depois de o banco conectar | Falta `JWT_SECRET` (mínimo de 32 caracteres) | Crie a variável e faça **Redeploy** |
| Qualquer erro estranho na API | A mensagem real fica no log da função | **Deployments → o deploy → Logs** (ou **Runtime Logs**) |

## Cuidados com o banco compartilhado

- Só uma pessoa por vez cria migração nova (`npx prisma migrate dev --name <descricao>`); avise o grupo.
- Nunca rode `prisma migrate reset` nem `db push --force-reset`: apagam os dados de todos.
- Para ver os dados: `npm run db:studio` ou o painel do Supabase.
