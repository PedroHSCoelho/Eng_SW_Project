// Funções puras das fotos (testadas sem navegador).

// Iniciais para quando o jogador não tem foto: "Zé" -> "ZÉ", "Beto" -> "BE",
// "José da Silva" -> "JS" (primeira e última palavra).
export function iniciais(nome) {
  const palavras = String(nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return '?'
  const texto =
    palavras.length === 1 ? palavras[0].slice(0, 2) : palavras[0][0] + palavras[palavras.length - 1][0]
  return texto.toLocaleUpperCase('pt-BR')
}

// Recorte quadrado no centro da imagem (a foto pode ser retrato ou paisagem; o avatar é redondo).
export function recorteQuadrado(largura, altura) {
  const lado = Math.min(largura, altura)
  return { x: Math.round((largura - lado) / 2), y: Math.round((altura - lado) / 2), lado }
}

// [{ playerId, version }] -> Map playerId -> version, para o avatar achar a foto rápido.
export const mapaDeVersoes = (lista) => new Map((lista ?? []).map((f) => [f.playerId, f.version]))
