// Guardas de rota. "Autenticar" = descobrir QUEM é (cookie -> usuário, senão 401).
// "Exigir papel" = checar se PODE (senão 403). A checagem é sempre aqui, no back-end:
// esconder o botão no front é só conforto, não segurança.
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js'
import { lerCookie } from '../features/auth/auth.core.js'

export const NOME_DO_COOKIE = 'token'

export function criarAutenticar(authService) {
  return async function autenticar(req, res, next) {
    const token = lerCookie(req.headers.cookie, NOME_DO_COOKIE)
    if (!token) throw new UnauthorizedError()
    req.usuario = await authService.usuarioDoToken(token)
    next()
  }
}

export function exigirPapel(...papeis) {
  return function (req, res, next) {
    if (!papeis.includes(req.usuario?.role)) throw new ForbiddenError()
    next()
  }
}

// Leitura (GET) liberada para qualquer logado; escrita exige o papel.
// Usado nos jogadores: todos veem a lista, só o organizador cadastra/edita/inativa/exclui.
export function exigirPapelParaEscrever(...papeis) {
  const exigir = exigirPapel(...papeis)
  return function (req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    return exigir(req, res, next)
  }
}
