# Como trabalhar com o Claude sem perder o controle

Objetivo: **você sempre sabe o que está acontecendo** e consegue explicar o resultado ao professor. O Claude é um parceiro júnior-rápido/sênior-teórico: produz muito, mas **a responsabilidade e o entendimento são seus**.

## Rotina de uma sessão

1. **Abra com o objetivo claro e pequeno** — "quero a fatia X, critério de aceitação Y". Objetivos vagos geram código que ninguém entende.
2. **Peça o plano primeiro.** Use o *modo de plano* do Claude Code (alterne os modos de permissão com `Shift+Tab`) ou simplesmente diga "só planeje, não edite". Leia o plano, questione, só depois autorize. É a ferramenta mais forte de controle.
3. **Deixe o Claude pedir permissão para editar** (não deixe tudo no automático no início). Cada edição/comando aparece para você aprovar; leia o diff na tela antes de aceitar. Com o tempo, libere só comandos seguros e repetitivos (leitura, `npm test`) em `/permissions`.
4. **Acompanhe o que ele diz que vai fazer** — o CLAUDE.md o obriga a narrar. Se ele ficar "mudo" ou fizer algo que não avisou, pare (`Esc`) e pergunte.
5. **Revise o diff como se fosse de um colega**: `git diff` (ou `git diff --stat` primeiro). Pergunte "por que essa linha?" até você conseguir explicá-la. Se não conseguir, peça `/explicar-codigo` ou simplificação.
6. **Rode você mesmo.** Suba o app e os testes no seu terminal (`npm test`, `npm run dev`). Ver funcionando com seus olhos vale mais que o relato do Claude.
7. **Feche com o diário**: confira a entrada em `docs/estudo/diario.md` e responda às perguntas de verificação com suas palavras.
8. **Commits pequenos e frequentes** (só quando você pedir). O `git log` vira o registro do que foi feito; se algo der errado, é fácil voltar.

## Hábitos que mais protegem você
- **Faça o Claude te testar**: "me pergunte 3 coisas sobre o que acabamos de fazer".
- **Mande ele criticar o próprio código**: "o que aqui você mais duvida?", "o que pode quebrar?".
- **Desconfie de confiança excessiva**: peça evidência (saída do teste, comando rodado). Ele pode errar API de biblioteca; confira na documentação quando importar.
- **Uma coisa por vez**: se a sessão ficou longa e confusa, comece outra (`/clear`) com um resumo do estado, em vez de empilhar assuntos. O CLAUDE.md e os docs recarregam o contexto.
- **Entenda antes de aceitar** dependência nova, mudança de schema ou regra de negócio — são decisões suas.
- **Escreva você algumas partes** (um teste, uma função pequena) e peça revisão: é o melhor jeito de fixar o conteúdo.
- **Mantenha os docs vivos** (`CONTEXT.md`, ADRs): é o que deixa um novo chat entender o projeto e é o que você consulta na véspera da apresentação.

## Atalhos úteis (Claude Code)
| O quê | Como |
|---|---|
| Interromper o que ele está fazendo | `Esc` |
| Alternar modo de permissão/plano | `Shift+Tab` |
| Ver/ajustar permissões | `/permissions` |
| Limpar conversa mantendo CLAUDE.md | `/clear` |
| Resumir contexto longo | `/compact` |
| Revisar mudanças | `/code-review`, `/simplify`, `/security-review` |
| Chamar as skills do projeto | `/descoberta-dominio`, `/nova-feature`, `/tdd`, `/explicar-codigo`… |

## Sinais de alerta (pare e pergunte)
- Diff enorme ou arquivos que você não pediu.
- Código que você "acha" que funciona mas ninguém rodou.
- Termos/padrões novos sem explicação.
- Teste alterado para passar em vez de corrigir o código.
- Você não consegue explicar o que foi feito em 1 minuto.
