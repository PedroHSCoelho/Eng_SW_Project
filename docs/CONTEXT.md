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
| Grupo | `Group` | A pelada ou campeonato, como um grupo de WhatsApp: tem seus jogadores, partidas, ranking e histórico; qualquer pessoa cria um | time, liga, comunidade |
| Participação | `Membership` | Uma conta dentro de um grupo, com o papel nesse grupo e (opcional) o jogador dela nesse grupo | inscrição |
| Organizador | `GroupRole.ORGANIZER` | Participante que gerencia o grupo: cadastra jogadores, cria partidas, escala, lança gols, encerra a súmula, convida e muda papéis. Um grupo pode ter vários, nunca nenhum | admin, dono |
| Membro | `GroupRole.MEMBER` | Participante comum: vê tudo do grupo, confirma presença, leva convidados e vota no craque das partidas que jogou | jogador comum |
| Convite | `inviteCode` | Código de 8 caracteres (e o link com ele) que deixa uma conta entrar no grupo; gerar outro invalida o antigo | link, token |
| Nota do admin | `Player.skill` / `PATCH /players/:id/nota` | Nota de 0 a 5, de meio em meio ponto, que um admin dá a um jogador; só os admins veem. Serve para equilibrar o sorteio | avaliação, rating |
| Sorteio de times | `draw` / `sorteio` | Sugestão de times equilibrados (2 a 6) entre os presentes, pela nota do admin | divisão, montagem |
| Força | `strength` | Nota do admin do jogador (2,5 se ainda não tem); a do time é a média dos jogadores | rating, nível |
| Craque da partida | `MvpVote` / `/matches/:id/craque` | Escolhido por votação de quem jogou, até 48 horas depois de encerrar; ninguém vota em si mesmo; empate dá mais de um craque | MVP, destaque |
| Talvez | `Attendance.maybe` | Quem ainda não sabe se vai: entra no fim da lista de espera mesmo com vaga sobrando | dúvida |
| Convidado | `MatchGuest` | Pessoa sem cadastro que um participante leva à partida; ocupa as vagas que sobram depois dos jogadores | agregado, avulso |
| Nomes dos times | `Match.teamNames` | Nome livre de cada time da partida (até 20 caracteres); sem nome, aparece "Time A" | cor, camisa |
| Ranking | `rankings` | Classificação geral derivada das estatísticas | tabela |
| Estatísticas | — | Gols, assistências, partidas disputadas (derivadas das partidas) | stats |

## Regras do domínio (a confirmar com o grupo)
- Estatísticas e ranking **derivam** das partidas registradas e se atualizam automaticamente.
- Nota do admin: de 0 a 5, de meio em meio ponto, visível só aos admins.
- Perguntas em aberto (preencher na descoberta): Um jogador pode se autoavaliar? Pode avaliar mais de uma vez na mesma partida? Como o ranking desempata (gols? assistências? nota média? pontos por vitória)? Há times fixos ou só placar? Quem pode registrar/editar a súmula? Existe login?
