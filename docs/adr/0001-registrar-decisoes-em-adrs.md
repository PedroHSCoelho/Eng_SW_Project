# ADR 0001 — Registrar decisões de arquitetura em ADRs

- Status: aceita
- Data: 2026-10-26

## Contexto
Vamos apresentar o projeto e precisamos explicar não só *o que* o código faz, mas *por que* foi feito assim. Código mostra o "como"; o histórico de decisões guarda o "porquê".

## Decisão
Toda decisão relevante (escolha de biblioteca, estrutura de módulos, modelagem do banco, regra de negócio controversa) ganha um ADR curto em `docs/adr/NNNN-titulo.md`, com: contexto, decisão, alternativas consideradas, consequências.

## Alternativas consideradas
- Só comentar no código/commit: se perde e não mostra alternativas.
- Wiki externa: desatualiza e fica longe do código.

## Consequências
- Um pequeno custo por decisão; ganho em rastreabilidade e preparo para perguntas do professor.
- Ver skill `registrar-decisao`.
