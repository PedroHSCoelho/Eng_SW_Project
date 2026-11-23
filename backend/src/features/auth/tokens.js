// Casca fina sobre a biblioteca jsonwebtoken: emite e verifica o token de login (JWT).
// O token carrega SÓ o id do usuário (campo "sub"). O papel NÃO vai dentro: quando o
// organizador muda o papel de alguém, vale na próxima requisição, sem esperar o token vencer.
import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '../../errors/AppError.js'

export const SETE_DIAS_EM_SEGUNDOS = 7 * 24 * 60 * 60
const ALGORITMO = 'HS256'
const SEM_SEGREDO = 'JWT_SECRET não configurado'

// O segredo é lido na hora de usar (não ao importar), para os testes e o CI não precisarem dele.
export function criarTokens({
  obterSegredo = () => process.env.JWT_SECRET,
  expiraEmSegundos = SETE_DIAS_EM_SEGUNDOS,
} = {}) {
  function segredo() {
    const valor = obterSegredo()
    if (!valor) throw new Error(SEM_SEGREDO)
    return valor
  }

  return {
    expiraEmSegundos,

    emitir(usuarioId) {
      return jwt.sign({}, segredo(), {
        algorithm: ALGORITMO,
        subject: String(usuarioId),
        expiresIn: expiraEmSegundos,
      })
    },

    // Devolve o id do usuário ou lança 401. Fixar o algoritmo impede o ataque "alg: none".
    verificar(token) {
      const chave = segredo()
      try {
        const { sub } = jwt.verify(token, chave, { algorithms: [ALGORITMO] })
        const id = Number(sub)
        if (!Number.isInteger(id) || id <= 0) throw new Error('sub inválido')
        return id
      } catch {
        throw new UnauthorizedError('Sessão inválida ou expirada')
      }
    },
  }
}
