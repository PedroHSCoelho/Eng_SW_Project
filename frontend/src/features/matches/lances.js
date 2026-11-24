// Funções puras da súmula ao vivo e da lista de presença (sem React): fáceis de testar.

// Números de cada jogador escalado na partida, a partir dos gols e dos lances (cartões e defesas).
// Mesma regra do back-end: gol contra não conta como gol do autor; 2 amarelos ou 1 vermelho = expulso.
export function numerosDosJogadores(partida) {
  const numeros = {}
  for (const p of partida.players) {
    numeros[p.playerId] = { gols: 0, contra: 0, assistencias: 0, amarelos: 0, vermelhos: 0, defesas: 0, expulso: false }
  }
  const de = (id) => numeros[id]
  for (const g of partida.goals ?? []) {
    if (de(g.scorerId)) de(g.scorerId)[g.ownGoal ? 'contra' : 'gols'] += 1
    if (g.assistId && de(g.assistId)) de(g.assistId).assistencias += 1
  }
  const campo = { YELLOW_CARD: 'amarelos', RED_CARD: 'vermelhos', DIFFICULT_SAVE: 'defesas' }
  for (const e of partida.events ?? []) {
    if (de(e.playerId)) de(e.playerId)[campo[e.type]] += 1
  }
  for (const n of Object.values(numeros)) n.expulso = n.vermelhos > 0 || n.amarelos >= 2
  return numeros
}

export const NOME_DO_LANCE = {
  YELLOW_CARD: '🟨 Cartão amarelo',
  RED_CARD: '🟥 Cartão vermelho',
  DIFFICULT_SAVE: '🧤 Defesa difícil',
}

// Texto da lista para colar no grupo do WhatsApp (o "copiar e colar" da lista do fut).
export function textoDaLista({ partida, lista, formatarData }) {
  const linhas = [`⚽ ${formatarData(partida.date)} · ${partida.location}`]
  linhas.push(
    lista.maxPlayers ? `Confirmados (${lista.confirmed.length}/${lista.maxPlayers}):` : `Confirmados (${lista.confirmed.length}):`,
  )
  lista.confirmed.forEach((l, i) => linhas.push(`${i + 1}. ${l.nickname}`))
  if (lista.maxPlayers) {
    for (let i = lista.confirmed.length; i < lista.maxPlayers; i += 1) linhas.push(`${i + 1}.`)
  }
  if (lista.waitlist.length > 0) {
    linhas.push('', 'Lista de espera:')
    lista.waitlist.forEach((l, i) => linhas.push(`${i + 1}. ${l.nickname}`))
  }
  return linhas.join('\n')
}
