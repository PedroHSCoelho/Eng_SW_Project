---
name: registrar-decisao
description: Cria um ADR em docs/adr/ para decisões de arquitetura, escopo, modelagem ou dependência. Use quando houver alternativas reais e uma escolha com consequências.
---

# ADR — o porquê precisa sobreviver

## Quando criar
Escolha de biblioteca/runner de teste, modelagem do banco (ex.: estatística calculada vs armazenada), estrutura de módulos, forma de autenticação, corte de escopo, qualquer decisão que o professor possa perguntar "por que fizeram assim?". Não crie ADR para detalhes triviais.

## Como
1. Próximo número livre em `docs/adr/` (`0002-...`). Nome em kebab-case.
2. Use o modelo de `docs/adr/0001-registrar-decisoes-em-adrs.md`: **Status, Data, Contexto, Decisão, Alternativas consideradas (com prós/contras reais), Consequências** (incluindo o que fica mais difícil).
3. Escreva em linguagem que os alunos consigam repetir em voz alta; confirme com eles antes de gravar como "aceita".
4. Status possíveis: proposta → aceita → substituída por ADR N. Nunca apague ADR antigo; marque como substituído.
5. Referencie o ADR no PR/commit e no `docs/estudo/diario.md`.

Mantenha curto (≤ 1 página).
