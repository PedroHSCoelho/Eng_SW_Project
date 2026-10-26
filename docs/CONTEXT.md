# CONTEXT — linguagem ubíqua do projeto

Um termo por conceito, usado igual nas conversas, requisitos, banco, API e código. **Evite** os sinônimos listados. Quando surgir termo novo ou dúvida, atualize este arquivo antes de codar.

> Rascunho inicial derivado do README. **O grupo deve revisar e corrigir** (skill `descoberta-dominio`).

| Termo (PT) | Código | Definição | Evitar |
|---|---|---|---|
| Jogador | `Player` / `players` | Pessoa cadastrada que participa de partidas e tem perfil e estatísticas | usuário, atleta |
| Partida | `Match` / `matches` | Jogo registrado, com data, participantes e resultado (a "pelada") | jogo, game |
| Súmula | (a própria `Match` + eventos) | Registro oficial do que aconteceu na partida | ata |
| Gol | `Goal` | Evento de gol numa partida, com autor e, opcionalmente, assistente | — |
| Assistência | `assist` | Passe que originou um gol; opcional | passe |
| Participante | — | Jogador que disputou uma partida específica | convidado |
| Avaliação / Nota | `Rating` / `ratings` | Nota inteira de 1 a 5 dada por um participante a outro após a partida | review, voto |
| Nota média | `averageRating` | Média das notas recebidas por um jogador | score |
| Ranking | `rankings` | Classificação geral derivada das estatísticas | tabela |
| Estatísticas | — | Gols, assistências, partidas disputadas (derivadas das partidas) | stats |

## Regras do domínio (a confirmar com o grupo)
- Estatísticas e ranking **derivam** das partidas registradas e se atualizam automaticamente.
- Nota: inteiro de 1 a 5.
- Perguntas em aberto (preencher na descoberta): Um jogador pode se autoavaliar? Pode avaliar mais de uma vez na mesma partida? Como o ranking desempata (gols? assistências? nota média? pontos por vitória)? Há times fixos ou só placar? Quem pode registrar/editar a súmula? Existe login?
