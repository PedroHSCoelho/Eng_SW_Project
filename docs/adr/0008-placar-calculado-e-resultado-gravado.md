# ADR 0008 — Placar calculado pelos gols, resultado gravado ao encerrar

- Status: aceita
- Data: 2026-11-10

## Contexto
A F07 pede que o placar venha dos gols ("nunca digitado") e que o resultado (vitória de A, vitória de B ou empate) seja gravado ao encerrar. Era preciso decidir o que guardar no banco e como impedir mudanças depois do encerramento.

## Decisão
1. **O placar não é coluna.** `calcularPlacar(gols)` (função pura) conta os gols pelo `team` de cada um; o serviço devolve `score: { A, B }` em toda resposta de uma partida. Segue a mesma ideia do ADR 0002: dado derivado é calculado, não guardado.
2. **O resultado é gravado** (`result`, enum `MatchResult`) junto com `finishedAt`, na mesma atualização que muda o status para `FINISHED`. Como a súmula fica bloqueada depois disso, o resultado gravado não fica desatualizado.
3. **Regras do encerramento** em `verificarPodeEncerrar` (função pura): só partida em andamento, nunca duas vezes, nunca com a data no futuro. A data atual entra por parâmetro (`agora`), então o teste controla o relógio.
4. **Súmula bloqueada:** escalação só muda em `SCHEDULED` e gols só em `IN_PROGRESS`, então em `FINISHED` nada muda.

## Alternativas consideradas
- **Guardar o placar (`scoreA`, `scoreB`):** leitura mais simples, mas teria que ser atualizado a cada gol lançado ou removido, com risco de ficar diferente dos gols.
- **Não guardar o resultado:** também seria possível calculá-lo sempre, mas o critério da F07 pede que seja gravado, e o ranking (F11) e o histórico (F09) filtram por ele com uma consulta simples.

## Consequências
- O ranking (F11) e as estatísticas (F10) podem usar `result` e os gols das partidas `FINISHED`.
- Existe uma janela pequena em que um gol pode ser lançado enquanto outra pessoa encerra a partida; nesta escala (um organizador por pelada) foi aceito.
