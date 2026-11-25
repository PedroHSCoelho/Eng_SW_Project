// Cor de cada time na escalação (só visual). Começa pela cor do nome do time ("Azul", "Time Laranja")
// ou, sem cor no nome, pela paleta na ordem dos times. O botão da coluna troca para a próxima cor,
// e a escolha fica guardada neste navegador, por partida.
export const PALETA = [
  { nome: 'Azul', hex: '#3b82f6' },
  { nome: 'Laranja', hex: '#f97316' },
  { nome: 'Verde', hex: '#22c55e' },
  { nome: 'Vermelho', hex: '#ef4444' },
  { nome: 'Amarelo', hex: '#eab308' },
  { nome: 'Roxo', hex: '#a855f7' },
  { nome: 'Rosa', hex: '#ec4899' },
  { nome: 'Branco', hex: '#e5e7eb' },
  { nome: 'Preto', hex: '#111827' },
  { nome: 'Cinza', hex: '#6b7280' },
]

const semAcento = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Índice da cor na paleta para o time de posição `i` chamado `nome`.
export function corInicial(nome, i) {
  const texto = semAcento(nome)
  const pelaPalavra = PALETA.findIndex((c) => new RegExp(`\\b${semAcento(c.nome)}\\b`).test(texto))
  return pelaPalavra >= 0 ? pelaPalavra : i % PALETA.length
}

export const proximaCor = (indice) => (indice + 1) % PALETA.length

const chave = (partidaId) => `cores-dos-times-${partidaId}`

export function lerCores(partidaId) {
  if (!partidaId) return {}
  try {
    const salvo = JSON.parse(localStorage.getItem(chave(partidaId)) ?? '{}')
    return salvo && typeof salvo === 'object' ? salvo : {}
  } catch {
    return {}
  }
}

export function salvarCores(partidaId, cores) {
  if (!partidaId) return
  try {
    localStorage.setItem(chave(partidaId), JSON.stringify(cores))
  } catch {
    // Sem armazenamento (aba anônima, por exemplo): a cor vale só até sair da página.
  }
}
