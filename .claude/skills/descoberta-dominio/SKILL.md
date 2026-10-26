---
name: descoberta-dominio
description: Entrevista os alunos (grill-me), faz EventStorming e fecha glossário e critérios de aceitação antes de implementar uma feature nova ou quando um requisito está ambíguo. Use ANTES de codar qualquer funcionalidade.
---

# Descoberta de domínio (entender antes de construir)

Objetivo: transformar "ideia" em entendimento compartilhado e verificável. A IA não decide o que o negócio significa; os alunos decidem, a IA pergunta.

## Passo a passo
1. **Leia** `README.md` e `docs/CONTEXT.md` (e o código da feature, se existir). Não pergunte o que já está respondido lá.
2. **Entreviste (grill-me)**: faça perguntas em lotes de 3–5, uma rodada por vez, focadas nas lacunas. Comece por *"o que acontece?"* (eventos), não por *"quais tabelas?"*. Exemplos para este projeto:
   - Quem registra a súmula? Dá para editar depois? E se um gol for lançado errado?
   - Um jogador pode se autoavaliar? Avaliar duas vezes na mesma partida? Só quem jogou avalia?
   - Como o ranking ordena e desempata? Conta pontos de vitória ou só gols/assistências?
   - O que acontece com estatísticas se a partida for apagada/alterada?
   - Existe login/perfil de acesso agora, ou fica para depois?
3. **EventStorming leve**: liste eventos no tempo em passado (`PartidaRegistrada`, `GolMarcado`, `AvaliacaoEnviada`), e as regras/exceções ligadas a cada um. Em seguida, substantivos (entidades) e verbos (regras).
4. **Atualize `docs/CONTEXT.md`**: termos canônicos, termos a evitar, regras confirmadas, perguntas ainda abertas.
5. **Escreva critérios de aceitação Given/When/Then**, incluindo cenários de falha, e **o que está fora de escopo**. Requisito mensurável: comportamento + limiar + condição.
   ```
   Dado uma partida com 3 gols do jogador X e 1 assistência
   Quando a súmula é registrada
   Então as estatísticas de X somam +3 gols e +1 assistência
   ```
6. **Corte em fatias verticais** (cada uma demonstrável de ponta a ponta) e proponha a ordem. Siga para a skill `nova-feature`.

## Regras
- Se a linguagem está confusa: **pare de programar** e modele.
- Não invente regra para "completar": marque como pergunta aberta e pergunte.
- Decisões de escopo que cortam funcionalidade → ADR (`registrar-decisao`).
- Termine mostrando o que ficou decidido e o que ficou em aberto, para os alunos confirmarem.
