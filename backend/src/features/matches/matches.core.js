// Núcleo puro das partidas: só regras, sem banco nem Express.
// Recebe os dados já lidos (partida, jogadores) e decide; quem grava é o serviço.
import { BusinessRuleError, ValidationError } from '../../errors/AppError.js'
import { TIMES, ehPelada, lerFormato, timesDaPartida } from './pelada.core.js'

export const MINIMO_POR_TIME = 3
// Vagas da lista de presença: vazio = sem limite; senão de 2 a 100.
export const VAGAS_MINIMAS = 2
export const VAGAS_MAXIMAS = 100

// Data, local e vagas da partida. Devolve SÓ os campos que o cliente pode definir
// (lista explícita): status e id enviados no corpo são descartados.
// `maxPlayers` é opcional: ausente ou null = lista de presença sem limite.
// `format` e `teamCount`: jogo único (padrão, 2 times) ou pelada (3 a 6 times).
export function validarDadosDaPartida(dados) {
  const data = typeof dados.date === 'string' ? new Date(dados.date) : null
  if (!data || Number.isNaN(data.getTime())) {
    throw new ValidationError('Data inválida; use o formato AAAA-MM-DDTHH:MM')
  }
  const location = typeof dados.location === 'string' ? dados.location.trim() : ''
  if (location.length < 2 || location.length > 100) {
    throw new ValidationError('Local deve ter de 2 a 100 caracteres')
  }
  const maxPlayers = dados.maxPlayers ?? null
  if (
    maxPlayers !== null &&
    !(Number.isInteger(maxPlayers) && maxPlayers >= VAGAS_MINIMAS && maxPlayers <= VAGAS_MAXIMAS)
  ) {
    throw new ValidationError(`Vagas devem ser um número inteiro de ${VAGAS_MINIMAS} a ${VAGAS_MAXIMAS} (ou vazio, sem limite)`)
  }
  const formato = lerFormato(dados)
  return { date: data, location, maxPlayers, ...formato, teamNames: lerNomesDosTimes(dados.teamNames, timesDaPartida(formato)) }
}

export const NOME_DO_TIME_MAXIMO = 20

// Nomes livres dos times (opcional): { A: 'Amarelo', B: 'Azul' }. Nome vazio = usa "Time A".
// Só valem os times da partida; dois times não podem ter o mesmo nome. Sem nenhum nome = null.
export function lerNomesDosTimes(valor, times) {
  if (valor === undefined || valor === null) return null
  if (typeof valor !== 'object' || Array.isArray(valor)) {
    throw new ValidationError('Nomes dos times inválidos; use { "A": "Amarelo", "B": "Azul" }')
  }
  const nomes = {}
  for (const [time, nome] of Object.entries(valor)) {
    if (!TIMES.includes(time)) throw new ValidationError(`Time inválido nos nomes: ${time}`)
    if (nome !== null && nome !== undefined && typeof nome !== 'string') {
      throw new ValidationError(`O nome do Time ${time} deve ser um texto`)
    }
    const texto = (nome ?? '').trim()
    if (texto === '' || !times.includes(time)) continue // vazio ou time que a partida não tem: ignora
    if (texto.length > NOME_DO_TIME_MAXIMO) {
      throw new ValidationError(`O nome do Time ${time} deve ter até ${NOME_DO_TIME_MAXIMO} caracteres`)
    }
    nomes[time] = texto
  }
  const usados = Object.values(nomes).map((n) => n.toLowerCase())
  if (new Set(usados).size !== usados.length) throw new BusinessRuleError('Dois times não podem ter o mesmo nome')
  return Object.keys(nomes).length > 0 ? nomes : null
}

// Lista de ids de um time, vinda do corpo da requisição: precisa ser uma lista
// de inteiros positivos (lista vazia é permitida enquanto a escalação é montada).
export function lerIdsDoTime(valor, time) {
  if (!Array.isArray(valor) || !valor.every((id) => Number.isInteger(id) && id > 0)) {
    throw new ValidationError(`O time ${time} deve ser uma lista de ids de jogadores`)
  }
  return valor
}

// Lê a escalação do corpo: { teamA: [...], teamB: [...], teamC: [...], ... }.
// teamA e teamB são obrigatórios; os outros só existem na pelada (até a quantidade de times dela).
// Devolve { A: [...], B: [...], ... } só com os times da partida.
export function lerEscalacao(dados, partida) {
  const times = timesDaPartida(partida)
  const escalacao = {}
  for (const time of TIMES) {
    const valor = dados[`team${time}`]
    if (!times.includes(time)) {
      if (valor !== undefined && !(Array.isArray(valor) && valor.length === 0)) {
        throw new BusinessRuleError(`Esta partida tem os times ${times.join(', ')} (não há Time ${time})`)
      }
      continue
    }
    escalacao[time] = time === 'A' || time === 'B' ? lerIdsDoTime(valor, time) : lerIdsDoTime(valor ?? [], time)
  }
  return escalacao
}

// Regras da escalação:
//  1. um jogador não aparece duas vezes no mesmo time;
//  2. um jogador não está em dois times;
//  3. todo jogador existe e está ativo.
// Os times vêm como teamA, teamB (e teamC... na pelada).
// `jogadores` são os cadastros encontrados no banco para os ids pedidos.
// Devolve a escalação no formato gravado: [{ playerId, team }].
export function validarEscalacao({ jogadores, ...porChave }) {
  const times = TIMES.filter((t) => porChave[`team${t}`] !== undefined).map((t) => [t, porChave[`team${t}`]])
  for (const [time, ids] of times) {
    if (new Set(ids).size !== ids.length) {
      throw new BusinessRuleError(`Jogador repetido no time ${time}`)
    }
  }
  const todos = times.flatMap(([, ids]) => ids)
  if (new Set(todos).size !== todos.length) {
    throw new BusinessRuleError(times.length > 2 ? 'Um jogador não pode estar em dois times' : 'Um jogador não pode estar nos dois times')
  }
  for (const id of todos) {
    const jogador = jogadores.find((j) => j.id === id)
    if (!jogador) {
      throw new BusinessRuleError(`Jogador ${id} não existe`)
    }
    if (!jogador.active) {
      throw new BusinessRuleError(`Jogador inativo não pode ser escalado: ${jogador.nickname}`)
    }
  }
  return times.flatMap(([team, ids]) => ids.map((playerId) => ({ playerId, team })))
}

// A escalação só muda antes de a partida começar.
export function verificarEscalacaoEditavel(partida) {
  if (partida.status !== 'SCHEDULED') {
    throw new BusinessRuleError('A escalação só pode mudar enquanto a partida está agendada')
  }
}

// Agendada -> em andamento: cada time da partida precisa de pelo menos 3 jogadores
// (no jogo único, A e B; na pelada, todos os times dela).
export function verificarPodeIniciar(partida) {
  if (partida.status !== 'SCHEDULED') {
    throw new BusinessRuleError('Só uma partida agendada pode começar')
  }
  for (const time of timesDaPartida(partida)) {
    const quantos = partida.players.filter((p) => p.team === time).length
    if (quantos < MINIMO_POR_TIME) {
      throw new BusinessRuleError(
        `Cada time precisa de pelo menos ${MINIMO_POR_TIME} jogadores para a partida começar (time ${time} tem ${quantos})`,
      )
    }
  }
}

// Placar sempre calculado a partir dos gols (nunca digitado).
// Cada gol já sabe qual time ganhou o ponto (`team`), inclusive o gol contra.
// Na pelada, `times` traz todos os times dela (gols somados na noite inteira).
export function calcularPlacar(gols, times = ['A', 'B']) {
  return Object.fromEntries(times.map((t) => [t, gols.filter((g) => g.team === t).length]))
}

// Ao mudar a quantidade de times (pelada agendada), ninguém pode ficar num time que deixou de existir.
export function verificarTimesDaEscalacao(partida, novosDados) {
  const times = timesDaPartida(novosDados)
  const fora = partida.players.find((p) => !times.includes(p.team))
  if (fora) {
    throw new BusinessRuleError(
      `Há jogador escalado no Time ${fora.team}; tire-o da escalação antes de ${ehPelada(novosDados) ? 'diminuir os times' : 'mudar para jogo único'}`,
    )
  }
}

export function resultadoDoPlacar({ A, B }) {
  if (A > B) return 'A_WINS'
  if (B > A) return 'B_WINS'
  return 'DRAW'
}

// Em andamento -> finalizada. Não encerra duas vezes nem partida marcada para o futuro.
// `agora` entra por parâmetro para o teste controlar o relógio.
export function verificarPodeEncerrar({ partida, agora }) {
  if (partida.status === 'FINISHED') {
    throw new BusinessRuleError('A partida já foi encerrada')
  }
  if (partida.status !== 'IN_PROGRESS') {
    throw new BusinessRuleError('Só uma partida em andamento pode ser encerrada')
  }
  if (new Date(partida.date) > agora) {
    throw new BusinessRuleError('Não é possível encerrar uma partida marcada para o futuro')
  }
}

// Data e local só mudam enquanto a partida está agendada (depois de começar, o jogo já aconteceu).
export function verificarPodeEditar(partida) {
  if (partida.status !== 'SCHEDULED') {
    throw new BusinessRuleError('Só uma partida agendada pode ser editada')
  }
}

// Agendada ou em andamento pode ser cancelada. Finalizada não: a súmula está fechada e as
// estatísticas já contam com ela. Cancelada é um estado final (não volta).
export function verificarPodeCancelar(partida) {
  if (partida.status === 'CANCELED') {
    throw new BusinessRuleError('A partida já foi cancelada')
  }
  if (partida.status === 'FINISHED') {
    throw new BusinessRuleError('Uma partida finalizada não pode ser cancelada')
  }
}
