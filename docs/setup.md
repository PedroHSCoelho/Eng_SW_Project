# Como rodar o projeto

Guia para colocar o ambiente de desenvolvimento no ar. Os comandos são para o PowerShell (Windows).

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (para o banco de dados)
- [Node.js](https://nodejs.org) versão 22 (LTS)
- [Git](https://git-scm.com)

Confira as versões:

```powershell
node -v
npm -v
docker -v
```

## Estrutura

```
Eng_SW_Project/
├── frontend/            # React + Vite + Tailwind CSS (porta 5173)
├── backend/             # Node.js + Express + Prisma (porta 3001)
│   ├── prisma/          # modelos do banco de dados
│   └── src/
│       ├── features/    # módulos do domínio: jogadores, partidas, ranking e avaliações
│       │   ├── players/
│       │   ├── matches/
│       │   ├── rankings/
│       │   └── ratings/
│       ├── routes/      # rota de saúde do sistema
│       ├── app.js       # configuração do Express
│       ├── db.js        # conexão com o banco
│       └── index.js     # inicia o servidor
├── docs/
├── docker-compose.yml   # PostgreSQL
└── README.md
```


O escopo do projeto está centrado em quatro módulos principais:

- Jogadores: cadastro, perfil e estatísticas individuais
- Partidas: súmula, resultados e participantes
- Ranking: classificação por pontos, saldo de gols e desempenho
- Avaliação: notas recebidas após as partidas

Essa divisão ajuda a manter a aplicação em camadas e a evoluir de forma incremental, com entregas menores e testes por regra de negócio.

## Passo a passo

Abra **três terminais** na pasta do projeto.

### 1. Banco de dados (terminal 1)

```powershell
docker compose up -d
```

Na primeira vez ele baixa a imagem do PostgreSQL. Para desligar depois: `docker compose down`.

### 2. Back-end (terminal 2)

```powershell
cd backend
Copy-Item .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Teste no navegador: <http://localhost:3001/api/health> deve mostrar `{"status":"ok", ...}`.
Para testar o banco: <http://localhost:3001/api/health/db>.

### 3. Front-end (terminal 3)

```powershell
cd frontend
npm install
npm run dev
```

Abra <http://localhost:5173>. O selo **API: online** no topo da página indica que o front está conversando com o back-end.

## Comandos úteis

| Onde | Comando | O que faz |
|------|---------|-----------|
| `backend` | `npm run dev` | Inicia a API e reinicia ao salvar |
| `backend` | `npx prisma migrate dev --name nome` | Cria e aplica uma migração após editar o `schema.prisma` |
| `backend` | `npm run db:studio` | Abre uma tela para ver e editar os dados do banco |
| `frontend` | `npm run dev` | Inicia o front com atualização instantânea |
| `frontend` | `npm run build` | Gera a versão otimizada para entrega |

## Como o front fala com o back

O Vite repassa qualquer chamada que comece com `/api` para o Express. No React basta escrever:

```js
fetch('/api/campeonatos')
```

## Problemas comuns

- **`docker compose` não funciona:** abra o Docker Desktop e espere ele iniciar.
- **Porta 5432 em uso:** você tem outro PostgreSQL rodando. Pare-o ou troque a porta no `docker-compose.yml` e no `DATABASE_URL` do `.env`.
- **Erro de `@prisma/client did not initialize`:** rode `npx prisma generate` dentro de `backend`.
- **`/api/health/db` retorna erro 503:** o banco não está de pé. Confira com `docker ps`.
- **O `.env` não pode ir para o Git.** Só o `.env.example` é versionado.
