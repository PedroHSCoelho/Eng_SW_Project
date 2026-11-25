# ADR 0015: Foto do jogador guardada no banco (tabela PlayerPhoto)

- Status: aceita
- Data: 2026-11-25

## Contexto
Pedido do grupo: cada jogador pode ter uma foto, e onde o nome do jogador aparece (lista de jogadores,
súmula, presença, ranking, craque, home...) entra uma mini foto ao lado. Sem foto, aparecem as iniciais.

O app roda na Vercel (funções serverless, sem disco que dure entre requisições) com Postgres no
Supabase. Então a foto precisa ir para um serviço de arquivos ou para o banco.

## Alternativas
1. **Supabase Storage** (bucket de arquivos). É o lugar "certo" para arquivos grandes, mas:
   - pede uma biblioteca nova (`@supabase/supabase-js`) e uma chave secreta nova na Vercel;
   - bucket público deixaria a foto de um grupo visível para qualquer um com o link; bucket privado
     exige gerar URLs assinadas, mais uma peça para o grupo explicar;
   - os testes precisariam de um falso para o Storage.
2. **Coluna `photo` em `Player`**. Simples, mas o Prisma traz todas as colunas por padrão: a imagem
   viria junto em toda lista, escalação e ranking.
3. **Tabela própria `PlayerPhoto` no Postgres, com a imagem pequena em `bytea`** (escolhida).

## Decisão
- `PlayerPhoto(playerId PK/FK, mimeType, data, updatedAt)`, no máximo uma por jogador, apagada junto
  com o jogador (`onDelete: Cascade`). Migração só aditiva (`cria-foto-do-jogador`): pode rodar antes do código.
- O **front reduz a foto** antes de enviar: recorte quadrado no centro e 256 x 256 em JPEG
  (`reduzirFoto.js`, com `<canvas>`). Uma foto de celular de alguns MB vira poucos KB.
- O **back confere tudo de novo** (`photos.core.js`), porque a API pode ser chamada sem a tela:
  no máximo 200 KB e tipo descoberto pelos primeiros bytes (JPEG, PNG ou WebP; SVG não, porque pode ter script).
- A imagem viaja em **binário** (`PUT /players/:id/foto` com `Content-Type: image/jpeg`), lida com
  `express.raw` com limite de tamanho; acima do limite o errorHandler responde 413.
- **Quem troca:** o admin do grupo (qualquer jogador) ou o próprio jogador (conta ligada a ele).
  Qualquer participante vê. Fora do grupo, 404, como no resto da API.
- **Cache:** `GET /players/fotos` devolve só `[{ playerId, version }]` (sem imagens). O front guarda
  isso num contexto (`FotosContext`) e cada `<Avatar>` monta `/players/:id/foto?v=<version>`.
  Como a URL muda quando a foto muda, a resposta pode ficar em cache por muito tempo (`private, immutable`).

## Consequências
- Nenhuma dependência nem variável de ambiente nova; os testes usam um repositório em memória, como o resto.
- O banco cresce uns poucos KB por jogador com foto: para um app de pelada é desprezível. Se um dia
  houver milhares de fotos ou fotos grandes, a troca para o Storage fica isolada em `photos.repository.js`.
- As iniciais vêm do CSS (`content: attr(data-iniciais)`) e o avatar é `aria-hidden`: o texto e o
  nome acessível de cada linha continuam sendo só o apelido.
