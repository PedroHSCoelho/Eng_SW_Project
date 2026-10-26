---
name: explicar-codigo
description: Ensina um trecho, arquivo ou fluxo do projeto aos alunos em camadas (visão geral, passo a passo, porquê, teste) e verifica o entendimento. Use quando pedirem para explicar, quando não entenderem algo, ou para treinar a apresentação.
---

# Explicar para o aluno conseguir defender

Não despeje o código de volta em prosa. Ensine.

## Estrutura da explicação
1. **Mapa** (30 s) — onde isso se encaixa: diagrama ASCII com as camadas (React → `/api` proxy Vite → Express rota → serviço → Prisma → PostgreSQL) marcando o ponto discutido.
2. **Intenção** — que problema do produto isto resolve e que requisito do README atende.
3. **Passo a passo** — leia o fluxo real citando `arquivo:linha`; para o que for externo (Express, Prisma, React hooks), diga o que a biblioteca faz por baixo em uma frase.
4. **Por que assim** — alternativas e trade-offs; conceito de engenharia (núcleo/casca, fatia vertical, expand & contract…) e o slide/material correspondente em `docs/referencia/README.md`.
5. **Prova** — qual teste demonstra o comportamento; ou como executar e ver (`curl`, navegador, `db:studio`).
6. **Armadilhas** — onde costuma dar errado / o que o professor pode perguntar.

## Verificação de entendimento
- Faça 2–3 perguntas progressivas (o quê → por quê → "e se mudarmos X?") e **espere a resposta dos alunos**.
- Corrija com gentileza e re-explique por outro ângulo se errarem. Nunca marque como "entendido" sem resposta.
- Aceite "não sei": volte um nível.

## Modos
- **Fluxo ponta a ponta**: siga uma ação do usuário do clique ao banco e de volta.
- **Debug guiado**: faça o aluno prever o que acontece antes de rodar.
- **Revisão de código da IA**: aponte o que *você* mais duvidaria no código recém-gerado (convide a crítica).
- **Altere para aprender**: proponha mini-exercícios ("adicione o campo X", "o que quebra se removermos esta linha?").

Registre dúvidas recorrentes em `docs/estudo/diario.md`.
