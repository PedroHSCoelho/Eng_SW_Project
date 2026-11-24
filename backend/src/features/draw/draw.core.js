// Núcleo puro do sorteio de times: só regras, sem banco nem Express.
// Divide os presentes em 2 times com a menor diferença de força, por força bruta
// (testa todas as divisões possíveis: com no máximo 22 jogadores são poucas centenas de milhares).
import { ValidationError } from '../../errors/AppError.js'

export const FORCA_PADRAO = 3 // quem ainda não tem média entra com 3,0
export const MIN_JOGADORES = 6 // 3 por time, o mínimo para uma partida começar
export const MAX_JOGADORES = 22 // limite da busca por força bruta (C(22,11) divisões)
// Pelada: de 3 a 6 times, com pelo menos 3 por time; sem força bruta (seria lento demais).
export const MAX_TIMES = 6
export const MAX_JOGADORES_VARIOS_TIMES = 60
const NOMES_DOS_TIMES = ['A', 'B', 'C', 'D', 'E', 'F']

const arredondar2 = (n) => Math.round(n * 100) / 100

// Força de um jogador = média das notas recebidas; sem média (menos de 3 notas) = 3,0.
export function forcaDoJogador({ average }) {
  return average === null || average === undefined ? FORCA_PADRAO : average
}

// Quantos times sortear (opcional, padrão 2): de 2 a 6.
export function lerQuantidadeDeTimes(corpo) {
  const quantidade = corpo?.teamCount ?? 2
  if (!Number.isInteger(quantidade) || quantidade < 2 || quantidade > MAX_TIMES) {
    throw new ValidationError(`teamCount deve ser de 2 a ${MAX_TIMES}`)
  }
  return quantidade
}

// Valida a entrada externa: lista de ids únicos, de 6 a 22 jogadores (2 times)
// ou de 3 por time a 60 (vários times).
export function lerIdsDoSorteio(corpo) {
  const ids = corpo?.playerIds
  const times = lerQuantidadeDeTimes(corpo)
  if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id) && id > 0)) {
    throw new ValidationError('playerIds deve ser uma lista de ids de jogadores')
  }
  const minimo = times === 2 ? MIN_JOGADORES : 3 * times
  const maximo = times === 2 ? MAX_JOGADORES : MAX_JOGADORES_VARIOS_TIMES
  if (ids.length < minimo) {
    throw new ValidationError(`Escolha pelo menos ${minimo} jogadores para sortear`)
  }
  if (ids.length > maximo) {
    throw new ValidationError(`Escolha no máximo ${maximo} jogadores para sortear`)
  }
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError('Jogador repetido na lista')
  }
  return ids
}

// Regra dos goleiros: com 2 ou mais, ficam divididos (1 em cada time quando são 2; com 3 ou mais
// "no máximo 1 por time" é impossível, então a diferença entre os times é de no máximo 1).
const goleirosDivididos = (total, noTimeA) => total < 2 || Math.abs(2 * noTimeA - total) <= 1

const contarBits = (n) => {
  let c = 0
  for (; n; n &= n - 1) c++
  return c
}

// `jogadores`: [{ id, nickname, position, average }] (average = média de notas ou null).
// `aleatorio`: função que devolve um número em [0, 1) (padrão Math.random); entra por parâmetro
// para o teste controlar o sorteio. Entre as divisões igualmente boas, uma é escolhida ao acaso
// (amostragem de reservatório: cada divisão ótima tem a mesma chance).
export function sortearTimes({ jogadores, aleatorio = Math.random }) {
  // Ordem fixa (por id): o resultado não depende de como a lista chegou.
  const lista = [...jogadores]
    .sort((a, b) => a.id - b.id)
    .map((p) => ({ id: p.id, nickname: p.nickname, position: p.position, strength: forcaDoJogador(p) }))
  const n = lista.length
  const tamanhoA = Math.floor(n / 2) // com quantidade ímpar, o time A é o menor
  const par = n % 2 === 0

  const mascaraGoleiros = lista.reduce((m, p, i) => (p.position === 'GOALKEEPER' ? m | (1 << i) : m), 0)
  const totalGoleiros = contarBits(mascaraGoleiros)
  const somaTotal = lista.reduce((s, p) => s + p.strength, 0)
  const tamanhoB = n - tamanhoA

  let melhorDiferenca = Infinity
  let escolhida = null
  let empatadas = 0

  // Gera as combinações de `tamanhoA` jogadores para o time A (bits ligados) com o truque de Gosper.
  const limite = 1 << n
  for (let mascara = (1 << tamanhoA) - 1; mascara < limite; ) {
    // Quantidade par: A e B são simétricos, então só consideramos as divisões com o 1º jogador em A.
    if ((!par || mascara & 1) && goleirosDivididos(totalGoleiros, contarBits(mascara & mascaraGoleiros))) {
      let somaA = 0
      for (let i = 0; i < n; i++) if (mascara & (1 << i)) somaA += lista[i].strength
      const diferenca = Math.abs(somaA / tamanhoA - (somaTotal - somaA) / tamanhoB)

      if (diferenca < melhorDiferenca - 1e-9) {
        melhorDiferenca = diferenca
        escolhida = mascara
        empatadas = 1
      } else if (Math.abs(diferenca - melhorDiferenca) <= 1e-9) {
        empatadas += 1
        if (aleatorio() < 1 / empatadas) escolhida = mascara
      }
    }
    const menorBit = mascara & -mascara
    const proximo = mascara + menorBit
    mascara = (((proximo ^ mascara) >>> 2) / menorBit) | proximo
  }

  const doTime = (pertence) => {
    const jogadoresDoTime = lista.filter((_, i) => Boolean(escolhida & (1 << i)) === pertence)
    const forca = jogadoresDoTime.reduce((s, p) => s + p.strength, 0) / jogadoresDoTime.length
    return { players: jogadoresDoTime, strength: arredondar2(forca) }
  }
  return { teamA: doTime(true), teamB: doTime(false), difference: arredondar2(melhorDiferenca) }
}

// Vários times (pelada): divisão gulosa. Goleiros primeiro, um por time; depois, do mais forte
// para o mais fraco, cada jogador vai para o time com MENOS jogadores (empate: o mais fraco).
// Não garante a divisão ótima como a força bruta de 2 times, mas fica equilibrada e é instantânea.
// Empates de força são embaralhados com `aleatorio`, para "sortear de novo" dar outra divisão.
export function sortearEmVariosTimes({ jogadores, quantidade, aleatorio = Math.random }) {
  const lista = jogadores
    .map((p) => ({ id: p.id, nickname: p.nickname, position: p.position, strength: forcaDoJogador(p), sorte: aleatorio() }))
    .sort((a, b) => b.strength - a.strength || a.sorte - b.sorte)
  const times = Array.from({ length: quantidade }, (_, i) => ({ name: NOMES_DOS_TIMES[i], players: [], soma: 0 }))
  const goleiros = lista.filter((p) => p.position === 'GOALKEEPER')
  const linha = lista.filter((p) => p.position !== 'GOALKEEPER')
  const escolherTime = (candidatos) =>
    candidatos.reduce((melhor, t) =>
      t.players.length < melhor.players.length || (t.players.length === melhor.players.length && t.soma < melhor.soma) ? t : melhor,
    )
  for (const goleiro of goleiros) {
    // Enquanto houver time sem goleiro, o goleiro vai para um deles.
    const semGoleiro = times.filter((t) => !t.players.some((p) => p.position === 'GOALKEEPER'))
    const time = escolherTime(semGoleiro.length > 0 ? semGoleiro : times)
    time.players.push(goleiro)
    time.soma += goleiro.strength
  }
  for (const jogador of linha) {
    const time = escolherTime(times)
    time.players.push(jogador)
    time.soma += jogador.strength
  }
  const prontos = times.map((t) => ({
    name: t.name,
    players: t.players.map(({ sorte: _sorte, ...p }) => p), // tira o campo interno do sorteio
    strength: arredondar2(t.soma / t.players.length),
  }))
  const forcas = prontos.map((t) => t.strength)
  return { teams: prontos, difference: arredondar2(Math.max(...forcas) - Math.min(...forcas)) }
}
