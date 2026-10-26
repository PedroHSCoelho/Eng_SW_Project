---
name: tdd
description: Escreve regras de negócio com Red-Green-Refactor usando núcleo funcional puro e casca fina. Use ao implementar cálculo de ranking, média de notas, atualização de estatísticas, validações ou qualquer lógica de decisão.
---

# TDD com núcleo funcional / casca imperativa

## Ideia central (para explicar na apresentação)
Teste é **feedback sobre o design**. Se para testar uma regra é preciso mockar banco, HTTP e relógio, a regra está acoplada demais. Solução: **o núcleo decide, a casca executa**.

```
Rota (casca)  →  repositório lê dados  →  FUNÇÃO PURA decide  →  repositório grava
```
Exemplo de núcleo puro para este projeto:
```js
// features/ratings/ratings.rules.js — sem Prisma, sem Express
export function calcularMedia(notas) {
  if (notas.length === 0) return null
  return notas.reduce((soma, n) => soma + n, 0) / notas.length
}
export function validarNota(nota) {
  return Number.isInteger(nota) && nota >= 1 && nota <= 5
}
```

## Ciclo
1. **Red** — escreva UM teste de comportamento que falha (e confirme que falha pelo motivo certo, rodando).
2. **Green** — o mínimo de código para passar. Sem generalizar antes da hora.
3. **Refactor** — com testes verdes: nomes, duplicação de regra, simplificação. Rode os testes de novo.
4. Repita com o próximo comportamento (casos de borda: lista vazia, nota 0 e 6, empate no ranking, jogador sem partidas).

## Regras
- Teste **o que** o código faz (entrada → saída observável), não **como**. Refatorar sem mudar comportamento não pode quebrar teste.
- Nome do teste descreve o comportamento em português: `it('retorna null quando o jogador não tem avaliações')`.
- Prefira stubs/fakes de dados a mocks de interação. Mock só para verificar uma interação que realmente importa.
- Testes de integração (rota + banco real de teste) para a casca; poucos e focados. Testes de unidade para o núcleo; muitos e rápidos.
- Back-end ainda não tem runner: ao adicionar, prefira `node --test` (nativo, sem dependência) ou Vitest (já usado no front) e **explique a escolha** aos alunos; adicione `"test"` ao `package.json`.
- Front: Vitest + Testing Library (`npm test` em `frontend/`); testar o que o usuário vê.
- Nunca "ajuste o teste para passar" sem entender por que falhou; a falha pode ser o bug real.
- Ao final, mostre aos alunos qual teste prova cada regra de negócio.
