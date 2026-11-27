// Casos de uso das fotos. Recebe os repositórios por parâmetro (os testes usam repositórios em memória).
// Jogador de outro grupo é tratado como inexistente (404), como no resto da API.
import { NotFoundError } from '../../../errors/AppError.js'
import { exigirPodeMexerNaFoto, validarFoto } from '../core/photos.core.js'

export function criarPhotosService({ photosRepo, playersRepo }) {
  async function jogadorDoGrupo(groupId, playerId) {
    const jogador = await playersRepo.buscarPorId(playerId)
    if (!jogador || jogador.groupId !== groupId) throw new NotFoundError('Jogador não encontrado')
    return jogador
  }

  // "version" muda a cada troca de foto: o front põe na URL (?v=...) e o navegador
  // pode guardar a imagem em cache sem nunca mostrar uma foto velha.
  const resumo = (foto) => ({ playerId: foto.playerId, version: foto.updatedAt.getTime() })

  return {
    // Quem do grupo tem foto: [{ playerId, version }]. Leve: não traz a imagem.
    async listar(participacao) {
      return (await photosRepo.listarDoGrupo(participacao.groupId)).map(resumo)
    },

    // A imagem em si: { mimeType, data }.
    async ver(participacao, playerId) {
      await jogadorDoGrupo(participacao.groupId, playerId)
      const foto = await photosRepo.buscar(playerId)
      if (!foto) throw new NotFoundError('Jogador sem foto')
      return foto
    },

    async trocar(participacao, playerId, bytes) {
      await jogadorDoGrupo(participacao.groupId, playerId)
      exigirPodeMexerNaFoto(participacao, playerId)
      const foto = await photosRepo.salvar(playerId, validarFoto(bytes))
      return resumo(foto)
    },

    async remover(participacao, playerId) {
      await jogadorDoGrupo(participacao.groupId, playerId)
      exigirPodeMexerNaFoto(participacao, playerId)
      await photosRepo.remover(playerId)
    },
  }
}
