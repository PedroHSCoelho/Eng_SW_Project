---
name: revisar-mudanca
description: Autorrevisão obrigatória antes de declarar uma tarefa pronta, conferindo Definition of Done, qualidade, segurança e entendimento dos alunos. Use ao fim de qualquer mudança de código.
---

# Antes de dizer "pronto"

Percorra o diff (`git diff`) e responda honestamente. Corrija o que falhar ou reporte.

## Funcional
- [ ] Os critérios de aceitação estão cobertos por teste? Os testes **passam** (rodei)? 
- [ ] Rodei o app e exercitei o caminho feliz e ao menos uma falha?
- [ ] Casos de borda: vazio, nulo, duplicado, fora da faixa, concorrência óbvia.
- [ ] Códigos HTTP e mensagens `{ erro }` coerentes.

## Design
- [ ] Regra de negócio está em função pura, fora da rota e sem Prisma?
- [ ] Algo duplicado que é a *mesma regra*? Algo unificado que *não muda junto*?
- [ ] Nomes revelam intenção? Existe abstração/arquivo/dependência sem necessidade (YAGNI)?
- [ ] Respeita fronteiras entre módulos?

## Segurança (skill `seguranca`)
- [ ] Entrada validada, autorização no backend, sem segredo, sem vazamento de erro.

## Banco
- [ ] Migração pequena, legível, sem passo destrutivo, sem editar migração antiga.

## Entendimento (a regra mestra)
- [ ] Entreguei o bloco "📚 Para apresentar"?
- [ ] Algum trecho é "esperto demais" para os alunos explicarem? Simplifique ou ensine.
- [ ] Fiz 2–3 perguntas de verificação?
- [ ] Atualizei `docs/estudo/diario.md`, `docs/CONTEXT.md`, ADR (se decisão)?

## Relatório
Termine com: o que foi verificado e **como**, o que **não** foi verificado, riscos restantes. Se algo falhou ou foi pulado, diga claramente. Opcional: `/code-review` e `/simplify` sobre o diff.
