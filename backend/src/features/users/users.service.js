// Gestão de usuários (só organizador acessa, garantido nas rotas): listar, mudar papel
// e vincular o usuário a um jogador.
import { BusinessRuleError, NotFoundError, ValidationError } from '../../errors/AppError.js'
import { podeAlterarPapel, usuarioPublico, validarPapel } from '../auth/auth.core.js'

export function criarUsersService({ usersRepo, playersRepo }) {
  async function buscarOuFalhar(id) {
    const usuario = await usersRepo.buscarPorId(id)
    if (!usuario) throw new NotFoundError('Usuário não encontrado')
    return usuario
  }

  return {
    async listar() {
      return (await usersRepo.listar()).map(usuarioPublico)
    },

    async alterarPapel(id, papel) {
      validarPapel(papel)
      const alvo = await buscarOuFalhar(id)
      const permitido = podeAlterarPapel({
        papelAtual: alvo.role,
        novoPapel: papel,
        totalOrganizadores: await usersRepo.contarOrganizadores(),
      })
      if (!permitido) {
        throw new BusinessRuleError('O sistema precisa ter ao menos um organizador')
      }
      return usuarioPublico(await usersRepo.atualizar(id, { role: papel }))
    },

    // playerId = null desfaz o vínculo. Quem vincula é o organizador (e não o próprio usuário)
    // para ninguém "virar" outro jogador e avaliar/aparecer no lugar dele.
    async vincularJogador(id, playerId) {
      await buscarOuFalhar(id)
      if (playerId !== null) {
        if (!Number.isInteger(playerId) || playerId <= 0) {
          throw new ValidationError('playerId deve ser um inteiro positivo ou null')
        }
        if (!(await playersRepo.buscarPorId(playerId))) {
          throw new NotFoundError('Jogador não encontrado')
        }
        const dono = await usersRepo.buscarPorPlayerId(playerId)
        if (dono && dono.id !== id) {
          throw new BusinessRuleError('Jogador já está vinculado a outro usuário')
        }
      }
      return usuarioPublico(await usersRepo.atualizar(id, { playerId }))
    },
  }
}
