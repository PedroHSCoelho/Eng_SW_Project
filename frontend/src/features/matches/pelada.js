// Funções puras da pelada na tela (sem React). As regras de verdade são do back-end.
import { timesDaPartida } from './textos.js'

export const jogoAberto = (partida) => (partida.games ?? []).find((j) => !j.finishedAt)

const vencedor = (jogo) =>
  jogo.result === 'HOME_WINS' ? jogo.homeTeam : jogo.result === 'AWAY_WINS' ? jogo.awayTeam : null

// Sugestão do próximo jogo, no "quem ganha fica": o vencedor do último jogo fica e o desafiante
// é o time que está esperando há mais tempo. No empate, saem os dois e entram os dois que
// esperam há mais tempo. No primeiro jogo, A x B. O organizador pode trocar antes de começar.
export function sugerirProximoJogo(partida) {
  const times = timesDaPartida(partida)
  const jogos = (partida.games ?? []).filter((j) => j.finishedAt)
  if (jogos.length === 0) return { homeTeam: times[0], awayTeam: times[1] }
  const ultimo = jogos[jogos.length - 1]
  // Último jogo de cada time (0 = ainda não jogou): quem tem o menor número espera há mais tempo.
  const ultimoJogoDe = (time) =>
    Math.max(0, ...jogos.filter((j) => j.homeTeam === time || j.awayTeam === time).map((j) => j.number))
  const naFila = (fora) =>
    times.filter((t) => !fora.includes(t)).sort((a, b) => ultimoJogoDe(a) - ultimoJogoDe(b) || a.localeCompare(b))
  const fica = vencedor(ultimo)
  if (fica) return { homeTeam: fica, awayTeam: naFila([ultimo.homeTeam, ultimo.awayTeam])[0] ?? naFila([fica])[0] }
  const fila = naFila([ultimo.homeTeam, ultimo.awayTeam])
  if (fila.length >= 2) return { homeTeam: fila[0], awayTeam: fila[1] }
  return { homeTeam: fila[0], awayTeam: ultimo.homeTeam } // pelada de 3: entra o de fora contra um deles
}

export function textoDoResultado(jogo) {
  if (!jogo.result) return 'em andamento'
  if (jogo.result === 'DRAW') return 'empate'
  return `vitória do Time ${vencedor(jogo)}`
}
