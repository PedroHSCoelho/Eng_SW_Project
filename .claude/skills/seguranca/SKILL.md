---
name: seguranca
description: Checklist de segurança por design para endpoints Express, entradas, autorização, segredos e dependências. Use ao criar/alterar rotas, ler input do usuário, lidar com identidade ou adicionar dependências.
---

# Segurança por design (OWASP + slides da disciplina)

"Funciona" não é "seguro". Aplique a cada rota nova:

1. **Validação de entrada** — nunca confiar em `req.body`, `req.params`, `req.query`. Verifique tipo, faixa e formato (ex.: `id` inteiro positivo; nota inteira 1–5; data válida). Responda 400 com `{ erro }`. Rejeite campos inesperados. Limite o tamanho do corpo (`express.json({ limit })`).
2. **Injeção** — use apenas o Prisma Client (parametrizado). Se precisar de `$queryRaw`, somente com template tagged (`` Prisma.sql` `` ), nunca concatenando string.
3. **Autorização no backend** — para cada operação: *quem é o ator?* e *ele pode agir sobre ESTE recurso?* Existir o recurso não basta (Broken Access Control). Esconder botão no front não é autorização. Ex.: só um participante da partida pode avaliar; não pode avaliar a si mesmo (se a regra confirmada disser isso). Autenticação ainda não existe — se a feature depender de identidade, **pare e discuta** (ADR) em vez de aceitar `playerId` do corpo como verdade.
4. **Segredos** — nada de senha/chave no código ou no Git. Só `.env.example` versionado, com valores fictícios. Se algo vazou, trate como comprometido (rotacionar). Não logue dados sensíveis.
5. **Falha segura / erros** — não vaze stack trace nem detalhes internos ao cliente; mensagem genérica no 500 e detalhe no log. Negar por padrão.
6. **CORS** — hoje `cors()` está aberto (ok em dev). Antes de qualquer deploy, restringir a origem; registrar como dívida/ADR.
7. **Superfície mínima** — exponha só os campos necessários (use `select` do Prisma); não devolva campos internos.
8. **Dependências** — antes de `npm install`, justifique; rode `npm audit` periodicamente; lockfile versionado. Pacotes novos exigem aprovação (supply chain).
9. **Rate limit / abuso** — se houver endpoint que cria dados em massa (avaliações), considere limites; no mínimo, anote o risco.

## Saída esperada
Ao terminar, liste para os alunos: ameaças consideradas, o que foi mitigado, o que ficou como risco aceito (e por quê). Para mudanças sensíveis, rode `/security-review`.
