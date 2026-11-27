# Como rodar o projeto do zero

Pré-requisitos: Node.js 22 e Git. **Não é preciso instalar banco nem Docker**: os bancos (dev, teste e produção) rodam no Supabase.

## 1. Bancos (Supabase): desenvolvimento, teste e produção

São **três bancos**, para que nada do que fazemos na máquina mexa nos dados reais (ADR 0016):

| Ambiente | Onde fica | Arquivo | Quem usa |
|---|---|---|---|
| Desenvolvimento | projeto Supabase **de dev** (ex.: `eng-sw-dev`) | `backend/.env` | `npm run dev`, `db:migrate`, `db:reset`, `db:seed`, `db:studio` |
| Teste | schema **`test`** dentro do projeto de dev | `backend/.env.test` | `npm run test:db` (testes com banco real) |
| Produção | projeto Supabase atual (o da Vercel) | `backend/.env.production` | só `npm run db:deploy:prod` e `db:status:prod` |

Os três arquivos são ignorados pelo Git; os modelos são `.env.example`, `.env.test.example` e
`.env.production.example`. Cada um tem a linha `BANCO=...`, e o script `scripts/ambiente.js`
se recusa a rodar se algo apontar para o banco errado. Peça as senhas a um colega (nunca commite).

Criar o projeto de dev (uma vez, por um aluno): em supabase.com, **New project** (ex.: `eng-sw-dev`),
guarde a senha, clique em **Connect** e copie:

| String | Porta | Vai em |
|---|---|---|
| Transaction pooler | 6543 | `DATABASE_URL` do `.env` (acrescente `?pgbouncer=true`) |
| Session pooler | 5432 | `DIRECT_URL` do `.env` e as duas URLs do `.env.test` (acrescente `?schema=test`) |

O schema `test` é criado sozinho na primeira vez que as migrações rodam nele (`npm run test:db:preparar`).

## 2. Back-end

```powershell
cd backend
Copy-Item .env.example .env                       # dev (só na primeira vez)
Copy-Item .env.test.example .env.test             # teste
Copy-Item .env.production.example .env.production # produção (só quem aplica migrações)
# preencha as senhas e gere o JWT_SECRET (comando no .env.example)
npm install
npm run db:deploy                # aplica as migrações no banco de DEV
npm run db:seed                  # dados de exemplo: admin@dev.local / senha-dev-123
npm run dev                      # http://localhost:3001/api/health
```

> Quem já tinha o `.env` antigo (com a senha da **produção**): renomeie para `.env.production`,
> ponha `BANCO=producao` na primeira linha e crie o `.env` novo a partir do `.env.example`.
> Se esquecer, o `npm run dev` avisa e não sobe.

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
cd backend;  npm test           # 500+ testes, SEM banco (repositórios em memória)
cd backend;  npm run test:db    # testes com PostgreSQL de verdade, no schema "test" (.env.test)
cd frontend; npm test
```

- `npm test` nunca abre conexão com banco: regras puras e API com repositórios em memória.
- `npm run test:db` aplica as migrações no schema `test` e roda `tests-db/` (repositórios reais:
  índices únicos, transações, `onDelete: Restrict`...). Cada teste apaga tudo antes de começar,
  por isso ele **se recusa** a rodar fora de um schema de teste ou no banco da produção.
- No GitHub Actions, o job "Testes do back-end com banco" faz o mesmo num PostgreSQL descartável.

### Fluxo de uma migração nova

1. `npm run db:migrate -- --name minha-mudanca` (cria e aplica no **dev**);
2. `npm run test:db` (aplica no **teste** e roda os testes de banco);
3. commit, PR e merge;
4. `npm run db:deploy:prod` (aplica na **produção**; faça backup antes se a migração apaga algo).

## 5. Publicar na Vercel (produção)

Um projeto só na Vercel, ligado à raiz do repositório (ver `docs/adr/0006-deploy-na-vercel.md`).

1. Em vercel.com, **Add New → Project**, importe o repositório do GitHub e deixe **Root Directory** = raiz (não escolha `backend` nem `frontend`). O `vercel.json` já define install, build e saída.
2. Em **Settings → Environment Variables**, crie (Production e Preview):
   - `DATABASE_URL`: a do `.env.production`, com `&connection_limit=1` no final.
   - `DIRECT_URL`: a do `.env.production`.
   - No ambiente **Preview** (deploys dos PRs), use as URLs do banco de **dev**: assim nem a prévia mexe na produção.
   - `JWT_SECRET`: um segredo NOVO só de produção (comando no `.env.example`).
   - `NODE_ENV` não precisa: a Vercel já usa `production`.
3. **Deploy**. Teste `https://<seu-projeto>.vercel.app/api/health` e `/api/health/db`.
4. Migrações não rodam no deploy: depois do merge, rode `npm run db:deploy:prod` na sua máquina (usa o `.env.production`).
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
