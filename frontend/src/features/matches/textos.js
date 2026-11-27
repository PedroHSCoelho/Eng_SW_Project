// Textos que a tela mostra para os valores dos enums do back-end (MatchStatus, MatchResult).
export const STATUS = {
  SCHEDULED: { nome: 'Agendada', classe: 'bg-yellow-100 text-yellow-800' },
  IN_PROGRESS: { nome: 'Em andamento', classe: 'bg-blue-100 text-blue-800' },
  FINISHED: { nome: 'Finalizada', classe: 'bg-green-100 text-green-800' },
  CANCELED: { nome: 'Cancelada', classe: 'bg-red-100 text-red-800' },
}

export const RESULTADO = {
  A_WINS: 'Vitória do Time A',
  B_WINS: 'Vitória do Time B',
  DRAW: 'Empate',
}

export const formatarData = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// Times possíveis (mesmo enum Team do back-end). Jogo único usa A e B; a pelada, de 3 a 6.
export const TIMES = ['A', 'B', 'C', 'D', 'E', 'F']
export const timesDaPartida = (partida) => TIMES.slice(0, partida.teamCount ?? 2)
export const ehPelada = (partida) => partida?.format === 'PELADA'

export const FORMATOS = { SINGLE_GAME: 'Jogo único', PELADA: 'Pelada (vários times)' }

// Nome que a tela mostra para um time: o nome livre que o admin deu ("Amarelo") ou "Time A".
export const nomeDoTime = (partida, time) => partida?.teamNames?.[time] || `Time ${time}`

// "do Time A" ou, com nome livre, "de Amarelo" (o nome pode ser "Com camisa", que não leva artigo).
export const doTime = (partida, time) => (partida?.teamNames?.[time] ? `de ${partida.teamNames[time]}` : `do Time ${time}`)

// "Vitória do Time A" / "Vitória de Amarelo" / "Empate".
export function textoDoResultadoDaPartida(partida) {
  if (partida.result === 'A_WINS') return `Vitória ${doTime(partida, 'A')}`
  if (partida.result === 'B_WINS') return `Vitória ${doTime(partida, 'B')}`
  return RESULTADO[partida.result] ?? ''
}

// Partida com data no passado é permitida (serve para lançar um jogo antigo), mas uma
// "Agendada" com data que já passou provavelmente está esperando alguém lançar o resultado.
export const dataJaPassou = (dataIso, agora = new Date()) => Boolean(dataIso) && new Date(dataIso) < agora
export const precisaDeResultado = (partida, agora = new Date()) =>
  partida.status === 'SCHEDULED' && dataJaPassou(partida.date, agora)
