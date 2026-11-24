# ADR 0012 — Cancelar partida é um estado (`CANCELED`), não uma exclusão

- Status: aceita
- Data: 2026-11-23

## Contexto
O organizador precisa poder cancelar uma partida (chuva, falta de gente) e corrigir a data ou o local de uma partida marcada. Era preciso decidir como representar o cancelamento e o que acontece com os dados ligados à partida.

## Decisão
1. **Novo valor no enum `MatchStatus`: `CANCELED`** (migração `cancela-partida`, só aditiva: `ALTER TYPE ... ADD VALUE`). A partida não é apagada: continua no banco, só que cancelada.
2. **Quem pode ser cancelada:** partida agendada ou em andamento. Finalizada não: a súmula está fechada e as estatísticas já contam com ela. Cancelada é um estado final (não volta).
3. **Efeito automático:** histórico, estatísticas e ranking já consideravam só partidas `FINISHED`, então a cancelada some deles sem nenhuma mudança nessas contas. As demais ações (escalar, iniciar, lançar gol, encerrar, editar, avaliar) já exigiam um estado específico e recusam `CANCELED` com 422.
4. **Editar data e local** (`PUT /api/matches/:id`) só enquanto a partida está agendada (`verificarPodeEditar`). A atualização é condicional (`updateMany where status = SCHEDULED`): se alguém iniciar a partida ao mesmo tempo, a edição é recusada em vez de sobrescrever.
5. **Cancelar** (`PATCH /api/matches/:id/cancelar`) usa o estado lido na hora como condição (`de`), com o mesmo cuidado contra corrida.
6. **A lista de partidas ganha o placar** (`score`, calculado dos gols); a tela não o mostra em partida agendada nem cancelada.

## Alternativas consideradas
- **Excluir a partida (`DELETE`):** mais simples, mas perde o registro de que ela existiu, apaga os gols lançados e não deixa explicar por que ela sumiu da lista.
- **Coluna `canceledAt` em vez de um estado novo:** exigiria lembrar de checar a coluna em todas as regras; com o estado, as regras que já olham o status recusam a cancelada sozinhas.

## Consequências
- O valor `CANCELED` só pode ser removido do enum com uma migração mais cuidadosa (o Postgres não remove valor de enum direto); por isso é uma decisão a ser mantida.
- O código antigo (sem esta mudança) quebraria ao ler uma partida cancelada; por isso a migração foi aplicada antes do deploy e nenhuma partida é cancelada até o código novo estar no ar.
- Não há "desfazer cancelamento": se for preciso, cria-se uma partida nova.
