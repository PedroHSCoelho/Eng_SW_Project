# CONTEXT — linguagem ubíqua do projeto

Um termo por conceito, usado igual nas conversas, requisitos, banco, API e código. **Evite** os sinônimos listados. Quando surgir termo novo ou dúvida, atualize este arquivo antes de codar.

> Rascunho inicial derivado do README. **O grupo deve revisar e corrigir** (skill `descoberta-dominio`).

| Termo (PT) | Código | Definição | Evitar |
|---|---|---|---|
| Jogador | `Player` / `players` | Pessoa cadastrada que participa de partidas e tem perfil e estatísticas | usuário, atleta |
| Apelido | `nickname` / `nicknameKey` | Nome de exibição do jogador; único sem diferenciar maiúsculas (`nicknameKey` é a versão em minúsculas) | alcunha |
| Posição | `Position` | Goleiro, defesa, meio ou ataque (`GOALKEEPER`, `DEFENDER`, `MIDFIELDER`, `FORWARD`) | função |
| Jogador inativo | `active = false` | Jogador que não pode ser escalado; usado no lugar de excluir quem já tem partida | excluído |
| Partida | `Match` / `matches` | Jogo registrado, com data, participantes e resultado (a "pelada") | jogo, game |
| Súmula | (a própria `Match` + eventos) | Registro oficial do que aconteceu na partida | ata |
| Gol | `Goal` | Evento de gol numa partida, com autor e, opcionalmente, assistente; `team` é o time que ganha o gol | — |
| Gol contra | `ownGoal = true` | Gol que o jogador faz na própria meta: conta para o adversário, não soma gol para o autor e não tem assistência | — |
| Assistência | `assist` | Passe que originou um gol; opcional | passe |
| Participante | `MatchPlayer` | Jogador escalado em uma partida específica | convidado |
| Time | `Team` (`A`, `B`) | Um dos dois lados de uma partida; não há times fixos, cada partida monta os seus | equipe, lado |
| Escalação | `MatchPlayer[]` / `PUT /escalacao` | Quais jogadores estão em cada time de uma partida | lineup, convocação |
| Placar | `score` (`{ A, B }`) | Gols de cada time, sempre calculado a partir dos gols; nunca digitado nem guardado | resultado parcial |
| Resultado | `MatchResult` (`A_WINS`, `B_WINS`, `DRAW`) | Vitória de A, vitória de B ou empate, gravado ao encerrar a partida | vencedor |
| Estado da partida | `MatchStatus` | Agendada (`SCHEDULED`) → em andamento (`IN_PROGRESS`) → finalizada (`FINISHED`), só nessa ordem; de agendada ou em andamento ainda pode ir para cancelada (`CANCELED`), estado final | situação |
| Partida cancelada | `CANCELED` | Partida que não vai mais acontecer; continua registrada, mas não conta no histórico, nas estatísticas nem no ranking | excluída, apagada |
| Organizador | `Role.ORGANIZER` | Usuário que cadastra jogadores, gere usuários e decide pedidos, cria partidas, escala os times, lança os gols e encerra a súmula | admin, dono |
| Pedido de organizador | `OrganizerRequest` | Solicitação de um jogador para virar organizador, aprovada ou recusada por um organizador | convite, promoção |
| Avaliação / Nota | `Rating` / `ratings` | Nota inteira de 1 a 5 dada por um participante a outro após a partida | review, voto |
| Nota média | `averageRating` | Média das notas recebidas por um jogador | score |
| Sorteio de times | `draw` / `sorteio` | Sugestão de dois times equilibrados entre os presentes, pela média de notas | divisão, montagem |
| Força | `strength` | Média de notas do jogador (3,0 se ainda não tem média); a do time é a média dos jogadores | rating, nível |
| Destaque da partida | `destaque` | Jogador com a maior média de notas na partida (mínimo de 3 notas; empate desfeito por gols) | craque, MVP |
| Ranking | `rankings` | Classificação geral derivada das estatísticas | tabela |
| Estatísticas | — | Gols, assistências, partidas disputadas (derivadas das partidas) | stats |

## Regras do domínio (a confirmar com o grupo)
- Estatísticas e ranking **derivam** das partidas registradas e se atualizam automaticamente.
- Nota: inteiro de 1 a 5.
- Perguntas em aberto (preencher na descoberta): Um jogador pode se autoavaliar? Pode avaliar mais de uma vez na mesma partida? Como o ranking desempata (gols? assistências? nota média? pontos por vitória)? Há times fixos ou só placar? Quem pode registrar/editar a súmula? Existe login?
