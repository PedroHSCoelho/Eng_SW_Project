---
name: preparar-apresentacao
description: Monta roteiro, demo e banco de perguntas do professor sobre o projeto, e faz simulado oral com os alunos. Use quando se aproximar uma apresentação ou para revisar o que o grupo sabe.
---

# Preparação para apresentar e ser cobrado

Saída vai em `docs/apresentacao/` (criar arquivos conforme necessário).

## 1. Levantamento
Leia `README.md`, `docs/CONTEXT.md`, `docs/adr/`, `docs/estudo/diario.md`, o schema e os testes. Faça inventário do que **realmente existe** (não prometa o que é mock) e diga quais partes ainda são dados fixos.

## 2. Artefatos
- **`roteiro.md`** — história em 5–10 min: problema → solução → demo → arquitetura → decisões → testes → aprendizados/limites. Quem fala o quê.
- **`arquitetura.md`** — diagrama ASCII/Mermaid: front → proxy → rotas → regras puras → Prisma → Postgres; modelo ER; fluxo de "registrar partida atualiza ranking".
- **`demo.md`** — passos exatos (comandos, URLs, dados de exemplo) e plano B se algo falhar.
- **`perguntas.md`** — banco de perguntas prováveis com resposta curta e ponteiro para código/ADR/slide. Categorias: requisitos, domínio, arquitetura, banco, testes, segurança, Git/processo, uso de IA ("o que a IA fez e o que vocês decidiram?"), limitações e próximos passos.
- **`mapa-de-responsabilidade.md`** — quem domina qual parte (cada aluno deve saber explicar **qualquer** parte, mas ter um tópico de profundidade).

## 2b. Checklist das diretrizes do professor
Confira com evidência (arquivo, teste, commit) cada item: não é só CRUD; regras de negócio implementadas **e testadas**; arquitetura de backend adequada; frontend conversando com o backend; UI interativa; testes automatizados (unidade, API, UI) passando; Git/GitHub com histórico incremental e PRs; documentação que permite a terceiros executar. Marque o que falta e transforme em fatias verticais.

## 3. Simulado oral
Atue como o professor exigente: pergunte, espere a resposta, dê nota (acertou / parcial / errou), explique o gap. Pergunte "mostre no código" e "e se…?". Registre lacunas em `docs/estudo/diario.md` e planeje reforço.

## 4. Honestidade
Declare limitações (mocks, ausência de autenticação, CORS aberto…) em vez de escondê-las; isso é parte de boa engenharia. Registre o uso de IA de forma transparente: IA propõe, grupo revisa e decide.
