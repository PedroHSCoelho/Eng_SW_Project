---
name: git-fluxo
description: Fluxo Git do projeto com branches curtas, commits atômicos que explicam o porquê e PRs pequenos. Use ao criar branch, commitar, abrir ou revisar PR. Só commite/dê push se os alunos pedirem.
---

# Git como coordenação, não backup

## Regras
- **Não commitar nem dar push sem pedido explícito** dos alunos. Antes de commitar, mostre `git status` e `git diff --stat` e explique o que entra.
- **Branch curta por mudança conceitual**, partindo da `main` atualizada. Nome: `feat/ranking-por-gols`, `fix/validacao-nota`, `docs/adr-0002`, `chore/...`. Apagar após o merge.
- **Commits atômicos**: uma ideia por commit, tudo verde (testes passando). A mensagem diz **o quê e principalmente o porquê**:
  ```
  feat(ratings): valida nota entre 1 e 5

  Notas fora da faixa distorciam a média exibida no perfil.
  ```
  Prefixos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Evite `update`, `fix`, `final-2`.
- **PR pequeno** (idealmente revisável em minutos). Se está grande, divida. Descrição: problema, solução, como testar, o que ficou de fora, conceitos aplicados.
- **Integrar frequentemente**; branch longa gera conflito e PR irrevisável. Código incompleto escondido atrás de flag/rota não exposta, não numa branch de semanas.
- **Revisão humana obrigatória**: o colega que não escreveu o código revisa e precisa conseguir explicá-lo. Checklist: correção, design, complexidade, testes, legibilidade, segurança.
- **Build/teste vermelho é prioridade máxima**: restaure o verde antes de novos commits.
- **Conflito de merge é pergunta de domínio**: decida o comportamento correto com os alunos, não "aceite o meu".
- **Nunca** `push --force` na `main`, `reset --hard` ou reescrever histórico compartilhado sem confirmação.
- Não versionar `.env`, `node_modules`, `dist`.

## Fluxo
```powershell
git switch main; git pull
git switch -c feat/nome-curto
# trabalho + testes
git add <arquivos específicos>     # evite 'git add .' às cegas
git commit
git push -u origin feat/nome-curto # só se pedido
```
Ao final, explique aos alunos o histórico gerado (`git log --oneline`) — o histórico é a memória do porquê.
