# Materiais de referência da disciplina

Os PDFs desta pasta são slides só com imagem (sem texto extraível). Este índice resume cada um, para consulta rápida e para a IA aplicar no projeto. Resumos feitos por leitura visual dos slides; revisem contra os PDFs antes de citar na apresentação.

## Mapa: tema → material → onde aplicamos

| Tema | Material | Aplicação no projeto |
|---|---|---|
| Entendimento antes do código | Architecture_of_Understanding, Engineering_Shared_Understanding | skill `descoberta-dominio`, `docs/CONTEXT.md` |
| Problemas, lotes pequenos, fluxo | Beyond_the_Code_Factory_(2) | skill `nova-feature`, Definition of Done |
| Software como produto/aprendizado | Software_as_a_Product | MVP, YAGNI, outcome ≠ output |
| Custo de mudança / design simples | Designing_for_Evolution | CLAUDE.md §3.6 |
| Testes como feedback de design | Architectural_Feedback | skill `tdd` |
| Arquitetura, núcleo/casca | The_Architecture_of_Change (+ cópia 2) | skill `tdd`, estrutura de features |
| Feedback, CI/CD, DORA | The_Architecture_of_Feedback | skills `git-fluxo`, `migracao-banco` |
| Git e colaboração | High_Performance_Git | skill `git-fluxo` |
| Segurança | Secure_Systems_Architecture | skill `seguranca` |
| Produção/observabilidade | Engineering_in_Production | logs estruturados, health checks |
| Escala, docs, governança | Software_Engineering_at_Scale | ADRs, donos de módulo |

## Resumos

### Architecture_of_Understanding / Engineering_Shared_Understanding
Gargalo = entendimento, não código. Com IA, "plausível ≠ correto". **Descoberta** (conversas, EventStorming, exceções) vs **Especificação** (modelo de domínio, critérios de aceitação). Requisito preciso: comportamento + métrica + limiar + condição de operação. **Linguagem ubíqua** (um termo canônico, sem sinônimos) em `CONTEXT.md`; ADRs em `docs/adr/`. Critérios Given/When/Then, incluindo falhas, e escopo explicitamente fora. Fatias verticais (tracer bullets). Usar a IA para *entrevistar* ("grill-me"), não para adivinhar requisitos. "Linguagem confusa → pare e modele o domínio."

### Beyond_the_Code_Factory_(2)
Equipe = sistema que transforma problemas em pequenas mudanças e aprende com o feedback. Cinco diretrizes: problemas > tarefas; pequenos lotes; terminar > começar (limite de WIP); fluxo > ocupação; feedback dita o ritmo. Backlog dinâmico; "dizer não agora" é decisão de engenharia. Definição de pronto = testado, revisado, integrado, documentado. Scrum sem boas práticas de engenharia gera software ruim.

### Software_as_a_Product
Software é produto em evolução, não projeto com fim. Estimativa é hipótese; cone de incerteza. Output (features) ≠ outcome (mudança real). Ciclo construir–medir–aprender; MVP; lotes pequenos; YAGNI. Agilidade exige excelência técnica ("make the change easy, then make the easy change").

### Designing_for_Evolution
Design = administrar o custo de mudança; "funciona" não basta. 4 regras do design simples: passa nos testes, sem duplicação de lógica, expressa intenção, menos elementos. DRY protege regra de negócio, não digitação. YAGNI (freio) vs opcionalidade (acelerador). Código barato ≠ software barato; IA sem restrições acelera complexidade. Princípios devem virar restrições executáveis (testes, limites).

### Architectural_Feedback
Teste é motor de feedback sobre a arquitetura; testabilidade é propriedade de design. Testar comportamento, não implementação. Núcleo I/O-free (rápido) vs fronteira I/O (lenta, essencial). Pirâmide = heurística econômica. Test doubles: stub controla entrada, mock verifica interação; over-mocking = fragilidade. Teste difícil de escrever = sintoma de acoplamento. TDD Red-Green-Refactor.

### The_Architecture_of_Change (e cópia (2))
Arquitetura cria opcionalidade: tornar barato errar sobre o futuro. Escolha de tecnologia não é começo. Camadas acopladas ("layered illusion"). Regra de dependência: domínio não conhece banco/HTTP. **Functional Core / Imperative Shell**: núcleo decide (valores → valores/efeitos descritos), casca executa. Monólito primeiro → modular → extrair serviço só com fronteira estável; fronteira de serviço ≠ fronteira de dados. A cópia (2) difere no exemplo do slide 10 (UpdateCustomer com DoNothing/UpdateOnly/UpdateAndSendEmail).

### The_Architecture_of_Feedback
Qualidade depende da distância mudança→feedback. Custo do feedback atrasado; blast radius de PRs grandes. CI de verdade = integrar à main várias vezes ao dia ("fake CI" = branches de semanas). Build vermelho é prioridade. Artefato imutável promovido entre ambientes. Deploy ≠ release (feature flags). Blue/green e canary. **Expand & Contract** para migrar banco. Métricas DORA: frequência de deploy, lead time, change failure rate, time to restore.

### High_Performance_Git
Git coordena trabalho simultâneo, não é backup. Commit atômico com mensagem que diz o *porquê*. Branch = ponteiro curto; branches longas geram conflito e PR irrevisável. Conflito é pergunta de domínio. PR = diff + discussão + CI + aprovação humana. Trunk-based ≠ commitar na main sem revisão. Feature flags separam integrar de liberar. Histórico é a memória do *porquê*. Checklist de revisão: correção, design, complexidade, testes, legibilidade.

### Secure_Systems_Architecture
Funcional ≠ seguro. 5 pilares: menor privilégio, defesa em profundidade, padrões seguros, falha segura, mínima superfície. **Broken Access Control**: checar que o recurso existe não é checar que é do usuário. AuthN ≠ AuthZ; esconder botão não é autorização. Nunca confiar em entrada; queries parametrizadas. Segredos fora do Git. Supply chain: lockfile ≠ segurança; scanner de dependências no CI. Traduzir "seguro/rápido" em critérios mensuráveis. Registrar trade-offs.

### Engineering_in_Production
Software não termina no deploy. Monitoramento (known unknowns) vs observabilidade (unknown unknowns); logs estruturados, métricas, traces. SLI/SLO/SLA, error budget. Alertas acionáveis. Postmortem sem culpa. Liberação gradual. DoD inclui observabilidade e plano de rollback.

### Software_Engineering_at_Scale
Escala = código, organização e tempo. Monorepo ≠ monólito; multirepo ≠ autonomia. Biblioteca compartilhada cria acoplamento organizacional: dono explícito e compatibilidade. Quatro tipos de documentação (uso, arquitetura, operacional, ADRs). Times por fluxo de valor, não por camada. Lei de Conway. Governança entre ditadura e anarquia.
