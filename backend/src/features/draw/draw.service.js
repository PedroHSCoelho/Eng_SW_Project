// Caso de uso do sorteio: confere os jogadores escolhidos, busca a média de notas de cada um
// e pede o sorteio ao núcleo (draw.core.js). Não grava nada: quem cria a partida é o módulo de partidas.
// Jogadores e notas vêm pelos repositórios dos respectivos módulos (nunca direto na tabela).
import { BusinessRuleError } from '../../errors/AppError.js'
import { calcularMedia } from '../ratings/ratings.core.js'
import { lerIdsDoSorteio, sortearTimes } from './draw.core.js'

export function criarDrawService({ playersRepo, ratingsRepo, aleatorio = Math.random }) {
  return {
    async sortear(corpo) {
      const ids = lerIdsDoSorteio(corpo)

      // Mesmas regras da escalação: o jogador existe e está ativo.
      const cadastros = await playersRepo.buscarPorIds(ids)
      for (const id of ids) {
        const jogador = cadastros.find((p) => p.id === id)
        if (!jogador) throw new BusinessRuleError(`Jogador ${id} não existe`)
        if (!jogador.active) {
          throw new BusinessRuleError(`Jogador inativo não pode ser sorteado: ${jogador.nickname}`)
        }
      }

      // Força = média de notas (só existe com 3 ou mais notas; o núcleo usa 3,0 para quem não tem).
      const notas = await ratingsRepo.listarRecebidasDe(ids)
      const jogadores = cadastros.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        position: p.position,
        average: calcularMedia(notas.filter((n) => n.ratedId === p.id).map((n) => n.score)).average,
      }))

      return sortearTimes({ jogadores, aleatorio })
    },
  }
}
