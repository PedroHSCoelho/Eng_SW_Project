// Acesso HTTP à API de jogadores. Aqui não há regra de negócio: ela vive no
// back-end. Esta camada só traduz a resposta ({ data } ou { erro }) em valor
// ou em Error, para a tela não precisar conhecer o formato da API.

async function pedir(url, opcoes) {
  let resposta
  try {
    resposta = await fetch(url, opcoes)
  } catch {
    throw new Error('Não foi possível falar com o servidor')
  }
  if (resposta.status === 204) return null // DELETE não devolve corpo
  const corpo = await responderJson(resposta)
  if (!resposta.ok) throw new Error(corpo.erro ?? 'Erro inesperado')
  return corpo.data
}

// Se o servidor devolver algo que não é JSON, não deixamos estourar um erro obscuro.
async function responderJson(resposta) {
  try {
    return await resposta.json()
  } catch {
    return {}
  }
}

function comJson(metodo, dados) {
  return {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  }
}

export function listarJogadores({ busca = '', apenasAtivos = false } = {}) {
  const params = new URLSearchParams()
  if (busca.trim()) params.set('busca', busca.trim())
  if (apenasAtivos) params.set('ativos', 'true')
  const query = params.toString()
  return pedir(`/api/players${query ? `?${query}` : ''}`)
}

export function criarJogador(dados) {
  return pedir('/api/players', comJson('POST', dados))
}

export function atualizarJogador(id, dados) {
  return pedir(`/api/players/${id}`, comJson('PUT', dados))
}

export function inativarJogador(id) {
  return pedir(`/api/players/${id}/inativar`, { method: 'PATCH' })
}

export function excluirJogador(id) {
  return pedir(`/api/players/${id}`, { method: 'DELETE' })
}
