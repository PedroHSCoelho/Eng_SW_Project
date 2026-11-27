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

// Ordem de leitura da súmula para gols e lances: na pelada, primeiro o número do jogo da noite;
// depois o minuto (sem minuto vai para o fim) e, por último, a ordem em que foi lançado (id).
// Antes os gols da pelada eram ordenados só pelo minuto (misturando os jogos) e os cartões nem eram.
export function emOrdemDaSumula(lista, partida) {
  const numeroDoJogo = (gameId) => (partida.games ?? []).find((j) => j.id === gameId)?.number ?? 0
  const minuto = (x) => (x.minute === null || x.minute === undefined ? Number.MAX_SAFE_INTEGER : x.minute)
  return [...lista].sort(
    (a, b) => numeroDoJogo(a.gameId) - numeroDoJogo(b.gameId) || minuto(a) - minuto(b) || a.id - b.id,
  )
}

export const NOME_DO_LANCE = {
  YELLOW_CARD: '🟨 Cartão amarelo',
  RED_CARD: '🟥 Cartão vermelho',
  DIFFICULT_SAVE: '🧤 Defesa difícil',
}

// Texto da lista para colar no grupo do WhatsApp (o "copiar e colar" da lista do fut).
// Nome do convidado como aparece na lista: "Primo (convidado do Zé)".
export const nomeDoConvidado = (g) => (g.invitedBy ? `${g.name} (convidado do ${g.invitedBy.nickname})` : `${g.name} (convidado)`)

export function textoDaLista({ partida, lista, formatarData }) {
  const convidados = lista.guests ?? []
  const dentro = [
    ...lista.confirmed.map((l) => l.nickname),
    ...convidados.filter((g) => g.status === 'CONFIRMED').map(nomeDoConvidado),
  ]
  const espera = [
    ...lista.waitlist.map((l) => (l.maybe ? `${l.nickname} (talvez)` : l.nickname)),
    ...convidados.filter((g) => g.status === 'WAITLIST').map(nomeDoConvidado),
  ]
  const linhas = [`⚽ ${formatarData(partida.date)} · ${partida.location}`]
  linhas.push(lista.maxPlayers ? `Confirmados (${dentro.length}/${lista.maxPlayers}):` : `Confirmados (${dentro.length}):`)
  dentro.forEach((nome, i) => linhas.push(`${i + 1}. ${nome}`))
  if (lista.maxPlayers) {
    for (let i = dentro.length; i < lista.maxPlayers; i += 1) linhas.push(`${i + 1}.`)
  }
  if (espera.length > 0) {
    linhas.push('', 'Lista de espera:')
    espera.forEach((nome, i) => linhas.push(`${i + 1}. ${nome}`))
  }
  return linhas.join('\n')
}
