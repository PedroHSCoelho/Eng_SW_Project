# ADR 0010 — Avaliações: quem avalia vem do login, 48h e anonimato

- Status: aceita
- Data: 2026-11-23

## Contexto
A F13 e a F14 pedem notas de 1 a 5 entre jogadores depois da partida, com prazo, uma nota por trio e média no perfil sem revelar quem deu cada nota.

## Decisão
1. **Modelo `Rating`** com chave única `(matchId, raterId, ratedId)`: avaliar de novo edita a nota (`upsert`), nunca duplica.
2. **O avaliador vem da conta logada** (`req.usuario.playerId`), nunca do corpo da requisição. Conta sem jogador ligado (ex.: organizador) não avalia.
3. **Regras no núcleo puro** (`ratings.core.js`): partida finalizada; avaliador e avaliado jogaram; ninguém avalia a si mesmo; prazo de 48h a partir de `finishedAt` (inclusive); nota inteira de 1 a 5. O relógio entra por parâmetro.
4. **Defesa em profundidade no banco:** a migração tem `CHECK` de nota entre 1 e 5 e `CHECK` de avaliador diferente de avaliado (o Prisma não expressa `CHECK`, então ficam só no SQL).
5. **Anonimato:** as consultas de notas recebidas não devolvem `raterId`. A média só aparece com pelo menos 3 notas, no geral e por partida; antes disso, "sem avaliações suficientes". Com uma nota isolada daria para deduzir quem avaliou.
6. **Destaque da partida:** maior média entre quem tem 3+ notas na partida; empate por gols (gol contra não conta); persistindo, menor id.
7. **Rotas** montadas antes de `/api/matches` (que só deixa o organizador escrever), com `autenticar` em cada rota.

## Alternativas consideradas
- **Avaliador no corpo da requisição:** qualquer pessoa avaliaria como outra. Rejeitada por segurança.
- **Aceitar várias notas por trio:** distorceria a média e permitiria "encher" a nota de alguém.
- **Média sem mínimo:** simples, mas revela quem votou e pesa uma única opinião.

## Consequências
- O organizador só avalia se tiver uma conta ligada a um jogador (gestão de usuários).
- O mínimo de 3 notas por partida e para o destaque é uma suposição nossa (o guia só cita o mínimo da média do perfil); partidas pequenas podem ficar sem destaque.
- Comentários podem ser mostrados no futuro ao avaliado; hoje nenhuma rota os devolve a ele (só a quem os escreveu).
