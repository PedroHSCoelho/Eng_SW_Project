# ADR 0014: Nota do admin, votação do craque, nomes dos times, "talvez" e convidados

- Status: aceita
- Data: 2026-11-24
- Substitui: o ADR 0010 (avaliações depois da partida) e, no ADR 0011, a força pela média de notas

## Contexto
Pedido do grupo:
- O sorteio deve equilibrar os times por uma nota que **só os admins** dão e veem (de 0 a 5, com meio ponto), e não mais pelas notas que os jogadores davam uns aos outros depois da partida.
- No lugar dessa avaliação, uma **votação do craque**.
- Também pediram:
  - **nomes livres para os times** ("Amarelo", "Com camisa");
  - poder ficar **na espera mesmo com vaga** ("talvez", para quem não sabe se vai);
  - uma **lista de convidados**.

## Decisão
1. **`Player.skill`** (`Float?`), de 0 a 5, só em passos de 0,5:
   - a validação fica em `players.service.js` (`validarNota`);
   - `Player_skill_check` no SQL é a última barreira;
   - quem não tem nota entra no sorteio com **2,5**, o meio da escala.
2. **A nota não vaza por acidente.** O `PrismaClient` é criado com `omit: { player: { skill: true } }`, então nenhuma consulta traz a nota, a não ser que peça de propósito (`comNota`). Isso vale também para escalação, lista de presença e membros.
   - As rotas de jogadores só pedem a nota quando quem chama é admin.
   - O serviço remove o campo de novo, como segunda proteção.
   - O sorteio é só de admin e lê a nota.
3. **Sai a avaliação pós-partida.** Saem o módulo `ratings` (rotas, telas e testes) e o "destaque" da home.
   - A tabela `Rating` **fica no banco** por enquanto, sem uso.
   - Ela é apagada numa migração futura, quando ninguém mais precisar desses dados. Esse é o "contract" do expand & contract.
4. **Votação do craque (`MvpVote`).** A chave é `(matchId, voterId)`: um voto por jogador e partida, e votar de novo troca o voto.
   - Só quem jogou vota, só em quem jogou, e nunca em si mesmo (`MvpVote_not_self_check`).
   - Abre ao encerrar e fecha 48 horas depois.
   - Empate dá **mais de um craque**; não há critério escondido de desempate.
   - A home mostra o craque da última partida como "cobra da rodada".
5. **Nomes dos times.** `Match.teamNames` (`Json?`), por exemplo `{ "A": "Amarelo" }`.
   - Cada nome é opcional e tem até 20 caracteres; dois times não podem ter o mesmo nome.
   - Nome vazio vira "Time A" na tela.
   - O enum `Team` continua A..F: o nome é só como o time é mostrado, e as regras e estatísticas não mudam.
6. **"Talvez".** `Attendance.maybe`: a pessoa vai para a espera mesmo havendo vaga e **não sobe sozinha**; ela mesma confirma.
   - Trocar entre confirmado e talvez vale como chegar agora: vai para o fim da fila, para não furar quem esperava.
7. **Convidados (`MatchGuest`).** Gente de fora do grupo, só com o nome e quem levou.
   - Ocupam **só as vagas que sobram depois do pessoal do grupo**: um jogador do grupo que chega depois passa na frente do convidado.
   - Quem levou ou um admin tira o convidado.
   - Convidado não entra na escalação; se for jogar sempre, o admin cadastra como jogador.

## Alternativas consideradas
- **Guardar a nota em outra tabela, só de admins:** isola melhor, mas exige uma junção a mais no sorteio. Com o `omit` global, o campo no próprio jogador fica igualmente protegido.
- **Nota automática pela súmula** (gols, assistências, cartões): chegou a ser feita e foi retirada a pedido do grupo.
- **Convidados disputando vaga em pé de igualdade:** é injusto com quem é do grupo, e não é o costume das listas do WhatsApp.

## Consequências
- Migração `20261124190000_nota-craque-convidados`: **só acrescenta** colunas que aceitam vazio ou têm padrão, e tabelas novas. Pode rodar **antes** do deploy, e o código antigo continua funcionando com o banco novo.
- Notas antigas (`Rating`) não são mais mostradas.
