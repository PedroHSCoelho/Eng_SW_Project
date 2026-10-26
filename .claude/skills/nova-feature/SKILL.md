---
name: nova-feature
description: Fluxo completo para implementar uma fatia vertical (banco, API e tela) com TDD, explicação para os alunos e registro. Use quando for construir ou estender qualquer funcionalidade dos módulos players, matches, rankings ou ratings.
---

# Nova feature = uma fatia vertical, em passos pequenos

Siga em ordem. Pare e peça aval nos pontos marcados 🛑. Cada passo termina com o aluno entendendo.

1. **Escopo** — a feature está no README/CONTEXT? Se há ambiguidade → skill `descoberta-dominio` primeiro. Escreva a fatia em uma frase de comportamento ("registrar uma partida com gols e ver as estatísticas do jogador mudarem"), não de tarefa técnica.
2. **Critérios de aceitação** Given/When/Then, com falhas e fora-de-escopo.
3. **Plano curto** 🛑 — arquivos a criar/alterar, mudança de schema (se houver), endpoints, tela, conceitos usados, alternativas. Aguarde aval se mexer em schema, dependências ou mais de um módulo.
4. **Banco** (se necessário) — skill `migracao-banco`. Migração pequena, nome descritivo.
5. **Regra de negócio como função pura** — skill `tdd`: teste primeiro (Red), implementação mínima (Green), refatoração. Local: `features/<modulo>/<modulo>.service.js` (ou módulo `*.rules.js` puro).
6. **Casca**: repositório (Prisma) + rota Express. Validar entrada (400), tratar não encontrado (404), conflito (409), contrato `{ data }` / `{ erro }`. Skill `seguranca` para entradas e autorização.
7. **Front**: componente + chamada `fetch('/api/...')` + estados de carregando/erro/vazio + teste (Testing Library).
8. **Rodar de verdade** — suba o banco, o back e o front (skill `run`), exercite o caminho feliz e uma falha no navegador/`curl`. Teste automatizado verde não substitui ver funcionando.
9. **Autorrevisão** — skill `revisar-mudanca`. Rode `/simplify` se o diff ficou complexo.
10. **Fechamento** — bloco "📚 Para apresentar" (CLAUDE.md §0), perguntas ao grupo, entrada em `docs/estudo/diario.md`, ADR se houve decisão, atualizar `docs/CONTEXT.md` se surgiu termo.
11. **Git** — skill `git-fluxo` (só se os alunos pedirem para commitar).

## Anti-padrões a evitar
- Despejar todas as camadas de uma vez sem explicar.
- Mockar o Prisma para testar regra (sinal de que a regra não está isolada).
- Adicionar campo/tabela "para o futuro" (YAGNI).
- Lógica de negócio dentro da rota Express.
