# ADR 0011 — Sorteio de times equilibrado por força bruta

- Status: aceita
- Data: 2026-11-23

## Contexto
A F15 pede dividir os presentes em 2 times equilibrados pela média de notas, com no máximo 1 goleiro por time, e criar a partida já escalada. Era preciso decidir como achar a melhor divisão e onde ficam as regras.

## Decisão
1. **Força bruta com limite de 22 jogadores.** O núcleo (`draw.core.js`) testa todas as divisões possíveis e fica com a de menor diferença de força. Com 22 jogadores são cerca de 350 mil divisões (a divisão do time A e do time B é simétrica quando a quantidade é par), o que roda em milissegundos. O mínimo é 6 jogadores (3 por time, o necessário para a partida começar).
2. **Força do jogador = média de notas.** Só existe com 3 ou mais notas (a mesma regra do perfil); quem não tem média entra com 3,0.
3. **Força do time = média dos jogadores** (e não a soma), para que, numa quantidade ímpar, o time com 1 jogador a mais não pareça mais forte só por ter mais gente.
4. **Goleiros:** com 2 goleiros, cada time fica com um. Com 3 ou mais "no máximo 1 por time" é impossível, então eles são divididos o mais igual possível (diferença de no máximo 1).
5. **Sorteio de verdade entre as divisões igualmente boas:** a escolhida é uma delas ao acaso (amostragem de reservatório: cada uma tem a mesma chance). O sorteador (`aleatorio`) entra por parâmetro, então os testes controlam o resultado.
6. **O sorteio não grava nada.** `POST /api/sorteio` (só organizador) devolve a sugestão. Quem cria a partida é a tela, usando `POST /api/matches` e `PUT /api/matches/:id/escalacao`, que já têm todas as regras de escalação.

## Alternativas consideradas
- **Heurística gulosa (alternar os melhores entre os times):** mais rápida e escala para qualquer quantidade, mas não garante a menor diferença; a F15 pede "a divisão com menor diferença".
- **Endpoint que já cria a partida:** um passo só para a tela, mas duplicaria as regras de escalação num segundo módulo.

## Consequências
- Acima de 22 jogadores o sorteio é recusado (400). Para uma pelada é mais que suficiente.
- Criar a partida a partir do sorteio são duas chamadas: se a segunda falhar, a partida existe agendada e sem escalação; a tela avisa e leva à súmula, onde dá para escalar.
- Só o organizador sorteia, porque ele é quem cria a partida.
