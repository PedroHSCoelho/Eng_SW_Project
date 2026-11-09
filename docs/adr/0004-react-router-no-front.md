# ADR 0004 — React Router para navegar entre páginas do front

- Status: aceita
- Data: 2026-11-09

## Contexto
O front tinha uma única tela. A F03 exige navegação entre páginas (início e jogadores) e as próximas features (súmula, ranking, perfil) vão precisar de mais telas.

## Decisão
Usar `react-router-dom` (v7). O `BrowserRouter` fica em `main.jsx`; o `App` é o layout fixo (cabeçalho e menu) e o `<Routes>` troca o conteúdo. Rotas atuais: `/` e `/jogadores`; qualquer outra URL mostra "Página não encontrada". Nos testes usamos o `MemoryRouter`.

## Alternativas consideradas
- **`useState` com "página atual":** zero dependência, mas não há URL por página, botão voltar nem link compartilhável.
- **Roteamento manual com `window.location`/`history`:** reinventa o que a biblioteca já faz bem.

## Consequências
- Uma dependência nova (padrão de mercado, mantida pela Remix/Shopify).
- Cada URL nova é uma rota no `App.jsx`.
- O servidor de desenvolvimento do Vite já devolve o `index.html` para URLs como `/jogadores`; ao publicar o front (futuro) o servidor precisará da mesma regra.
