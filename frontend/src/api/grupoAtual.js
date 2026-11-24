// Em que grupo a pessoa está agora. Todas as rotas de jogadores, partidas, ranking etc.
// ficam dentro de um grupo (/api/grupos/:id/...), então as APIs do front montam a URL com ele.
// Quem define o grupo atual é o GrupoContext (ao carregar os grupos ou ao trocar de grupo),
// ANTES de renderizar as telas; as telas só aparecem quando já existe um grupo escolhido.
let grupoAtualId = null

export function definirGrupoAtual(id) {
  grupoAtualId = id ?? null
}

// Começo da URL de tudo que é do grupo: `${apiDoGrupo()}/players` -> '/api/grupos/3/players'
export function apiDoGrupo() {
  if (grupoAtualId === null) throw new Error('Escolha um grupo primeiro')
  return `/api/grupos/${grupoAtualId}`
}
