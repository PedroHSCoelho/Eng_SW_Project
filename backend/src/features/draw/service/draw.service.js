// Caso de uso do sorteio: confere os jogadores escolhidos, lê a nota que o admin deu a cada um
// e pede o sorteio ao núcleo (draw.core.js). Não grava nada: quem cria a partida é o módulo de partidas.
// Os jogadores vêm pelo repositório do módulo de jogadores (nunca direto na tabela).
// Só admin sorteia (a rota exige), então a força de cada um pode voltar na resposta.
import { BusinessRuleError } from '../../../errors/AppError.js'
import { lerIdsDoSorteio, lerQuantidadeDeTimes, sortearEmVariosTimes, sortearTimes } from '../core/draw.core.js'

export function criarDrawService({ playersRepo, aleatorio = Math.random }) {
  return {
    async sortear(groupId, corpo) {
      const ids = lerIdsDoSorteio(corpo)

      // Mesmas regras da escalação: o jogador existe (no grupo) e está ativo.
      const cadastros = (await playersRepo.buscarPorIds(ids, { comNota: true })).filter((p) => p.groupId === groupId)
      for (const id of ids) {
        const jogador = cadastros.find((p) => p.id === id)
        if (!jogador) throw new BusinessRuleError(`Jogador ${id} não existe`)
        if (!jogador.active) {
          throw new BusinessRuleError(`Jogador inativo não pode ser sorteado: ${jogador.nickname}`)
        }
      }

      // Força = nota do admin (o núcleo usa 2,5 para quem ainda não tem nota).
      const jogadores = cadastros.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        position: p.position,
        skill: p.skill ?? null,
      }))

      // 2 times: força bruta (divisão ótima). Mais times (pelada): divisão gulosa.
      const quantidade = lerQuantidadeDeTimes(corpo)
      if (quantidade > 2) return sortearEmVariosTimes({ jogadores, quantidade, aleatorio })
      const resultado = sortearTimes({ jogadores, aleatorio })
      // `teams` também no de 2, para a tela tratar os dois casos do mesmo jeito.
      return {
        ...resultado,
        teams: [
          { name: 'A', ...resultado.teamA },
          { name: 'B', ...resultado.teamB },
        ],
      }
    },
  }
}
