# Guia de contribuição

Este projeto é desenvolvido em equipe e todo o histórico é avaliado. Por isso, seguimos um fluxo simples e consistente.

## Fluxo de trabalho

1. A `main` é sempre estável: nunca se faz commit direto nela.
2. Cada tarefa nasce em uma branch curta, criada a partir da `main` atualizada.
3. Ao terminar, abre-se um Pull Request (PR) para a `main`.
4. Outra pessoa do time revisa e aprova antes do merge.
5. O merge é feito com **squash** ou **merge commit**, combinado pelo time, e a branch é apagada.

```powershell
git switch main
git pull
git switch -c feat/cadastro-de-jogadores
```

## Nome das branches

Formato `tipo/descricao-curta-em-minusculas`:

| Prefixo | Uso |
|---------|-----|
| `feat/` | nova funcionalidade |
| `fix/` | correção de bug |
| `docs/` | documentação |
| `refactor/` | refatoração sem mudar comportamento |
| `test/` | testes |
| `chore/` | configuração, dependências, tarefas de manutenção |

## Mensagens de commit

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), em português, no imperativo:

```
tipo(escopo): resumo curto de até ~70 caracteres

Corpo opcional explicando o porquê da mudança.
```

Os tipos são os mesmos das branches (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`). Escopos usuais: `backend`, `frontend`, `players`, `matches`, `rankings`, `ratings`, `db`.

Exemplos:

```
feat(players): cadastra jogador com perfil individual
fix(rankings): corrige desempate por saldo de gols
docs: atualiza passo a passo de instalação
```

Boas práticas:

- Um commit = uma mudança lógica. Evite commits como "ajustes" ou "wip".
- Não misture formatação, refatoração e funcionalidade no mesmo commit.
- Nunca reescreva (`rebase`/`push --force`) histórico já compartilhado.

## Pull Requests

- Título no mesmo padrão dos commits.
- Preencha o template (o que mudou, por quê, como testar).
- PRs pequenos e focados são revisados mais rápido. Prefira vários PRs pequenos a um enorme.
- Garanta que o projeto sobe e que os testes passam antes de pedir revisão.
- Ao revisar, seja específico e respeitoso; comentários sobre o código, não sobre a pessoa.

## Padrões de código

- Indentação, finais de linha e codificação são definidos pelo `.editorconfig` e `.gitattributes` (UTF-8, LF). Use um editor com suporte a EditorConfig.
- Back-end organizado por módulo de domínio em `backend/src/features/<modulo>/`.
- Nomes de código (variáveis, rotas, arquivos) em inglês; textos para o usuário e documentação em português.
- Nunca versione segredos: apenas o `.env.example` vai para o Git.

## Banco de dados

- Mudanças no `schema.prisma` sempre acompanham uma migração (`npx prisma migrate dev --name descricao`), commitada junto.
- Nunca edite uma migração já mergeada; crie uma nova.

## Material de referência

PDFs e leituras de apoio ficam em [docs/referencia](docs/referencia/README.md). PDFs não são versionados.
