# ADR 0002 — Modelagem do `Player`: estatísticas calculadas e apelido com chave normalizada

- Status: aceita
- Data: 2026-11-03

## Contexto
O F02 introduz o primeiro modelo do domínio, `Player`. Duas decisões têm alternativas reais: onde ficam as estatísticas (gols, assistências, partidas) e como garantir apelido único **sem diferenciar maiúsculas** (o `@unique` do Prisma no PostgreSQL diferencia).

## Decisão
1. **Estatísticas não são colunas do `Player`.** São calculadas a partir das súmulas (F10), por função pura.
2. **Apelido:** duas colunas. `nickname` guarda como o jogador quer ser exibido; `nicknameKey` guarda o mesmo apelido em minúsculas, com `@unique`. O serviço preenche `nicknameKey`; o banco garante a unicidade.
3. `position` é um enum (`GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD`) e `active` (default `true`) permite inativar em vez de excluir.
4. Tamanhos máximos no banco (`VarChar(50)` no nome, `VarChar(30)` no apelido); o mínimo de 2 caracteres fica no serviço.

## Alternativas consideradas
- **Estatísticas armazenadas no `Player`:** leitura mais rápida, mas o número pode ficar inconsistente com as súmulas (ex.: gol removido e contador não atualizado).
- **Índice único em `lower(nickname)` escrito à mão no SQL:** sem coluna extra, mas o Prisma não representa o índice no schema (risco de drift no `migrate dev`; não verificado).
- **Extensão `citext`:** exige habilitar extensão no Postgres de todos os ambientes.

## Consequências
- Sem dado derivado de estatística: nada para ficar desatualizado; o custo é recalcular a cada consulta (aceitável nesta escala).
- `nicknameKey` é dado derivado de `nickname`: o serviço **deve** sempre preenchê-lo e atualizá-lo junto (regra a testar no F02).
- A regra "quem tem partida só pode ser inativado" ficará no serviço agora e, no F05, também no banco via `onDelete: Restrict` em `MatchPlayer`.
