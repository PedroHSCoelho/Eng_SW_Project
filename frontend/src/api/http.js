// Acesso HTTP compartilhado pelas APIs do front. Aqui não há regra de negócio: ela vive no
// back-end. Esta camada só traduz a resposta ({ data } ou { erro }) em valor ou em Error,
// para a tela não precisar conhecer o formato da API.
// O cookie de sessão (httpOnly) é enviado pelo próprio navegador: o JavaScript nunca vê o token.

export async function pedir(url, opcoes) {
  let resposta
  try {
    resposta = await fetch(url, opcoes)
  } catch {
    throw new Error('Não foi possível falar com o servidor')
  }
  if (resposta.status === 204) return null // sem corpo (ex.: DELETE, logout)
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

export function comJson(metodo, dados) {
  return {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  }
}
