// Regras de cadastro e login. Recebe repositório, hasher e tokens por parâmetro
// (injeção de dependência), então dá para testar sem banco.
import { BusinessRuleError, UnauthorizedError } from '../../errors/AppError.js'
import { usuarioPublico, validarCadastro, validarLogin } from './auth.core.js'

export function criarAuthService({ usersRepo, hasher, tokens }) {
  // Hash de uma senha qualquer, usado quando o e-mail não existe: assim o login gasta o mesmo
  // tempo nos dois casos e ninguém descobre, medindo a resposta, quais e-mails estão cadastrados.
  let hashFalso
  async function obterHashFalso() {
    hashFalso ??= await hasher.gerar('senha-que-nunca-sera-usada')
    return hashFalso
  }

  return {
    async registrar(dados) {
      const { name, email, password } = validarCadastro(dados)
      if (await usersRepo.buscarPorEmail(email)) {
        throw new BusinessRuleError('E-mail já cadastrado')
      }
      const usuario = await usersRepo.criar({
        name,
        email,
        passwordHash: await hasher.gerar(password),
        role: 'PLAYER',
      })
      return { token: tokens.emitir(usuario.id), usuario: usuarioPublico(usuario) }
    },

    async entrar(dados) {
      const { email, password } = validarLogin(dados)
      const usuario = await usersRepo.buscarPorEmail(email)
      const senhaConfere = await hasher.comparar(
        password,
        usuario ? usuario.passwordHash : await obterHashFalso(),
      )
      // Mesma mensagem para "e-mail não existe" e "senha errada".
      if (!usuario || !senhaConfere) {
        throw new UnauthorizedError('E-mail ou senha inválidos')
      }
      return { token: tokens.emitir(usuario.id), usuario: usuarioPublico(usuario) }
    },

    // Usado pelo middleware: token -> usuário ATUAL do banco (papel sempre atualizado).
    async usuarioDoToken(token) {
      const usuario = await usersRepo.buscarPorId(tokens.verificar(token))
      if (!usuario) throw new UnauthorizedError('Sessão inválida ou expirada')
      return usuarioPublico(usuario)
    },
  }
}
