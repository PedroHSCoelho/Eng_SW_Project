# ADR 0009 — Estatísticas e ranking calculados das súmulas

- Status: aceita
- Data: 2026-11-23

## Contexto
F10 (estatísticas do jogador) e F11 (ranking) precisam de números que dependem de todas as partidas finalizadas. Era preciso decidir onde calcular, o que guardar e como desempatar.

## Decisão
1. **Nada é gravado.** Estatísticas e ranking são calculados a cada consulta a partir das partidas `FINISHED` (mesma ideia dos ADRs 0002 e 0008: dado derivado não se duplica, então nunca fica desatualizado).
2. **Núcleo puro** em `features/stats/stats.core.js` (`estatisticasDoJogador`, `montarRanking`, `intervaloDoPeriodo`, `filtrarPorPeriodo`, `lerIntervaloExplicito`). A casca (`stats.service.js`) só lê as partidas pelo `matchesRepository.listarFinalizadas()` e os jogadores pelo `playersRepository`.
3. **Regras:** só partida finalizada conta; gol contra não é gol do autor; vitória 3, empate 1, derrota 0; o ranking geral exige 3 partidas; desempate por pontos > saldo de gols do time nas partidas do jogador > gols > assistências > nome. Artilharia e assistências não exigem o mínimo (quem marcou aparece).
4. **Período em UTC:** `mes`, `ano` e `tudo`, intervalo `[de, ate)`. O filtro por período é feito no núcleo, em memória.

## Alternativas consideradas
- **Colunas de estatística no `Player` ou tabela de ranking atualizada ao encerrar:** leitura rápida, mas duplica dado e pode divergir se um gol for corrigido.
- **Filtrar o período no banco (`where date`):** mais eficiente com muitos dados; não necessário nesta escala e deixa a regra do período fora do núcleo testado.

## Consequências
- Cada consulta lê todas as partidas finalizadas: cresce com o histórico. Se ficar lento, filtrar por data no repositório ou guardar um resumo (decisão nova).
- Em UTC, uma partida às 22h (Brasil) do último dia do mês já cai no mês seguinte. Aceito por ora.
- Jogadores inativos continuam no ranking: o histórico deles não some.
