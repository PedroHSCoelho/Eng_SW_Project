# ADR 0013 — Grupos (como no WhatsApp) e papel de organizador por grupo

- Status: aceita
- Data: 2026-11-24
- Substitui: a parte de papéis do ADR 0005

## Contexto
Até aqui havia um único organizador para o sistema inteiro. Para virar organizador, a conta precisava estar vinculada a um jogador (o que só um organizador fazia) e ter um pedido aprovado por outro organizador. Na prática, só quem já estava no grupo original conseguia organizar alguma coisa. O pedido do grupo: **qualquer pessoa pode organizar uma pelada ou campeonato e convidar outras, como num grupo de WhatsApp.**

## Decisão
1. **Modelo `Group`** (nome e código de convite) e **`Membership`** (participação de uma conta em um grupo), com chave `(groupId, userId)`.
2. **O papel sai da conta e vai para a participação** (`GroupRole`: `ORGANIZER` ou `MEMBER`). A mesma pessoa pode organizar um grupo e ser só membro de outro.
3. **O jogador da pessoa também é por grupo** (`Membership.playerId`, único): o "Zé" da quinta não é o mesmo registro do "Zé" da firma, e cada grupo tem as suas estatísticas.
4. **`Player` e `Match` ganham `groupId` obrigatório.** `MatchPlayer`, `Goal` e `Rating` não: já pertencem a uma partida, e a partida diz o grupo (guardar de novo seria dado duplicado que pode divergir).
5. **Apelido único dentro do grupo** (`@@unique([groupId, nicknameKey])`), e não mais no sistema todo.
6. **Rotas dentro do grupo:** `/api/grupos/:grupoId/players`, `/matches`, `/rankings`, `/sorteio`... O middleware `carregarParticipacao` descobre o papel de quem pede **neste** grupo; quem não participa recebe **404** (não 403), para não revelar que o grupo existe. Ids de outro grupo (jogador na escalação, no sorteio, partida pela URL) são tratados como inexistentes.
7. **Convite por código:** 8 caracteres de um alfabeto de 32 símbolos sem 0/O e 1/I, gerado com `crypto.randomBytes`. Quem entra vira `MEMBER` e ganha um jogador novo no grupo (apelido e posição escolhidos por ela; o nome vem da conta). Gerar outro código invalida o antigo.
8. **Regra central: o grupo nunca fica sem organizador** (rebaixar, remover e sair). É a mesma regra que existia para o sistema todo, agora por grupo, no núcleo puro (`groups.core.js`).
9. **Migração em duas partes (expand & contract):** `cria-grupos` cria as tabelas, põe tudo o que já existia num grupo padrão ("Pelada da turma") e copia papel e jogador de cada conta para a participação; `remove-papel-global` apaga `User.role`, `User.playerId` e `OrganizerRequest`.
10. **Saem:** pedidos de organizador (`/api/organizer-requests`), gestão global de usuários (`/api/users`, vira a tela de membros do grupo) e o comando `organizador:promover` (ninguém mais precisa de bootstrap: quem cria o grupo já é organizador).

## Alternativas consideradas
- **Manter o organizador global e só acrescentar grupos:** dois sistemas de permissão ao mesmo tempo, mais difícil de explicar e de testar.
- **Grupo no token JWT ou num cabeçalho:** esconde em que grupo cada chamada age; na URL fica explícito, aparece nos logs e nos testes, e o front pode ter dois grupos abertos.
- **Jogador global, com participação em vários grupos:** estatísticas e ranking teriam de filtrar partidas por grupo em toda conta, e o apelido teria de ser único no sistema todo. Jogador por grupo é mais simples e combina com "cada grupo é independente".
- **Quem entra escolhe "esse sou eu" entre os jogadores sem conta:** abriria espaço para alguém se passar por outro; quem faz esse vínculo é o organizador (tela de membros).
- **Excluir grupo:** ficou de fora; com partidas e notas apagaria histórico. Só renomear.

## Consequências
- A URL de todas as features muda; o front precisa saber em que grupo está (próxima etapa).
- O papel é lido do banco a cada requisição (como antes): promover ou rebaixar vale na hora.
- Corrida conhecida: dois organizadores rebaixando um ao outro ao mesmo tempo podem passar os dois pela contagem e deixar o grupo sem organizador. É improvável num grupo de pelada; se acontecer, resolve-se no banco.
- A garantia de que o jogador da participação é do mesmo grupo fica no serviço (o banco não tem chave estrangeira composta para isso).
- A migração `remove-papel-global` apaga dados: backup do Supabase antes do deploy.
