# ADR 0006 — Deploy na Vercel (um projeto só: front estático + API serverless)

- Status: aceita
- Data: 2026-11-09

## Contexto
Testar só em `localhost` atrapalha o grupo. Precisamos de uma URL pública. O login usa cookie `httpOnly` com `sameSite: 'strict'`, que só é enviado quando front e API estão na **mesma origem** (mesmo domínio).

## Decisão
Um único projeto na Vercel, ligado à raiz do repositório:
- **Front:** `vite build` gera `frontend/dist`, servido como site estático.
- **API:** `api/index.js` exporta o app Express (sem `listen`); a Vercel o executa como função serverless.
- `vercel.json` faz `/api/*` ir para a função e qualquer outra URL cair no `index.html` (necessário para o React Router, como previsto no ADR 0004).
- Como o domínio é um só, o cookie `strict` continua funcionando e o `cors()` foi removido (não há mais requisição entre origens).
- Prisma: `binaryTargets` inclui `rhel-openssl-3.0.x` (Linux da Vercel) e a `DATABASE_URL` usa o pooler do Supabase (porta 6543), adequado a serverless.

## Alternativas consideradas
- **Um serviço só no Render:** mais simples (Express servindo o front), mas o plano grátis "dorme" e a 1ª requisição demora.
- **Front na Vercel + API em outra plataforma:** duas plataformas e risco de quebrar o cookie.

## Consequências
- Cada push gera um deploy; PRs ganham URL de preview.
- Cada requisição pode cair em uma função "fria" (cold start de ~1s).
- Produção e desenvolvimento compartilham o mesmo Supabase (decisão provisória; ideal seria um segundo projeto).
- Migrações NÃO rodam no deploy: continuam manuais (`prisma migrate deploy`) por quem tem a `DIRECT_URL`.
