# ADR 0007 — Partida com estados e escalação substituída por inteiro

- Status: aceita
- Data: 2026-11-10

## Contexto
A F05 cria a partida e escala os dois times. Precisamos decidir como guardar quem jogou em qual time, como controlar o ciclo de vida da partida (agendada, em andamento, finalizada) e como a API recebe a escalação.

## Decisão
1. **Sem times fixos.** Cada partida tem os lados `A` e `B` (enum `Team`). A tabela `MatchPlayer` liga jogador, partida e time.
2. **Chave composta `(matchId, playerId)`** no `MatchPlayer`: o banco impede o mesmo jogador duas vezes na partida, inclusive nos dois times. O serviço confere antes, para responder com uma mensagem clara (422).
3. **`onDelete: Restrict`** do `MatchPlayer` para o `Player`: quem já jogou não pode ser excluído, nem por engano (como previsto no ADR 0002). Apagar a partida apaga a escalação (`Cascade`).
4. **Estados em um enum (`MatchStatus`)** que só avançam: `SCHEDULED` → `IN_PROGRESS` → `FINISHED`. A troca é feita com `updateMany where status = <estado esperado>`, então duas requisições ao mesmo tempo não iniciam a partida duas vezes.
5. **`PUT /escalacao` substitui os dois times de uma vez**, numa transação (apaga e grava). As regras olham a escalação inteira (repetido, nos dois times, inativo), então validar o conjunto todo é mais simples que validar cada inclusão.
6. **Regras em funções puras** (`matches.core.js`), testadas sem banco.

## Alternativas consideradas
- **Rotas para incluir e remover um jogador por vez:** mais requisições e regras espalhadas (cada inclusão precisa olhar os dois times).
- **Duas listas de ids dentro da `Match` (JSON ou array):** o banco não garantiria jogador existente nem jogador em um time só, e as estatísticas (F10) ficariam mais difíceis de consultar.
- **Status como texto livre:** aceitaria valores inválidos.

## Consequências
- F06 (gols) consulta `MatchPlayer` para saber se o autor está escalado e em qual time.
- F07 (encerrar) reutiliza `mudarStatus` com `IN_PROGRESS` → `FINISHED`.
- A tela da súmula (F08) manda a escalação inteira a cada mudança.
