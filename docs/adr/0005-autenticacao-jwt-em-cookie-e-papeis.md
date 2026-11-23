# ADR 0005 — Autenticação com JWT em cookie httpOnly e papéis geridos pelo organizador

- Status: aceita
- Data: 2026-11-09

## Contexto
A F04 exige login, senha com hash, papéis (organizador e jogador) e regras de autorização no back-end. O sistema precisa saber quem avalia quem (F13) e quem pode criar partidas (F05).

## Decisão
- **Senha:** hash com `bcryptjs` (custo 10; JS puro, instala sem compilar no Windows). Senha de 8 a 72 caracteres (o bcrypt ignora o que passa de 72 bytes).
- **Sessão:** JWT (`jsonwebtoken`, HS256, 7 dias) guardado em **cookie httpOnly, SameSite=Strict** (e `Secure` em produção). O JavaScript do front nunca vê o token; o front pergunta `GET /api/auth/me` para saber quem está logado.
- **O token carrega só o id.** O papel é lido do banco a cada requisição, então promover ou rebaixar alguém vale na hora, e apagar um usuário invalida o token dele.
- **Papéis dinâmicos:** enum `Role` (`ORGANIZER`, `PLAYER`). Todo cadastro nasce `PLAYER`; o papel nunca vem do cliente. Há três caminhos para virar organizador, todos no banco e com regras:
  1. **Pedido de organizador** (`OrganizerRequest`): um jogador pede com um motivo; um organizador aprova ou recusa. Regras: só quem está vinculado a um jogador pede, um pedido em análise por vez, espera de 7 dias após recusa, ninguém decide o próprio pedido. Aprovar muda o papel e fecha o pedido numa transação, registrando quem decidiu e quando.
  2. **Promoção direta pelo organizador** em `/api/users/:id/role` (tela **Usuários**). Regra: o sistema nunca fica sem organizador.
  3. **Bootstrap:** `npm run organizador:promover -- email` atualiza o banco. Resolve o primeiro organizador e a recuperação de acesso, e exige acesso ao banco (credencial do `.env`), não é uma rota da API.
- **Vínculo usuário ↔ jogador:** feito só pelo organizador (`PATCH /api/users/:id/player`), um jogador por usuário. Se o próprio usuário escolhesse, poderia "virar" outro jogador.
- **Autorização no back:** middlewares `autenticar` (401) e `exigirPapel` (403); jogadores: qualquer logado lê, só organizador escreve.
- **Erros de login:** mesma resposta para e-mail inexistente e senha errada, e o bcrypt roda nos dois casos (sem vazar quais e-mails existem).
- **Cookie sem `cookie-parser`:** função de 10 linhas testada, para não adicionar dependência.

## Alternativas consideradas
- **JWT em `localStorage`:** mais simples, mas qualquer XSS rouba o token.
- **Papel dentro do JWT:** economiza uma consulta, mas o papel ficaria desatualizado até o token vencer.
- **Tabela de permissões (RBAC completo):** flexível demais para dois papéis (YAGNI); o enum evolui para tabela se surgirem mais papéis.
- **Primeiro usuário vira organizador:** simples, mas qualquer um que chegue primeiro vira dono do sistema.
- **Lista de e-mails de organizadores no `.env`:** foi a primeira versão; descartada porque é por máquina, não tem trilha de auditoria e exige mexer em arquivo para mudar.

## Consequências
- Duas dependências novas: `bcryptjs` e `jsonwebtoken`. Nova variável `JWT_SECRET` (obrigatória). Nova tabela `OrganizerRequest`.
- Uma consulta ao banco por requisição autenticada.
- O front e o back precisam ficar no mesmo site (hoje o proxy do Vite garante isso); com domínios diferentes, SameSite e CORS com credenciais precisam ser revistos.
- **Limites conhecidos:** sem limite de tentativas de login (rate limiting) e sem recuperação de senha; sem logout "global" (o token só vence ou é apagado no navegador). Há uma janela de corrida teórica se dois organizadores se rebaixarem ao mesmo tempo (a checagem "último organizador" não é transacional), e dois pedidos simultâneos do mesmo usuário poderiam passar pela checagem de "um pedido em análise" (decidir um pedido, ao contrário, é protegido por `updateMany where status = PENDING`).
