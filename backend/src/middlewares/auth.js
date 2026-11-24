// Guardas de rota. "Autenticar" = descobrir QUEM é (cookie -> usuário, senão 401).
// "Participação" = descobrir o papel dessa pessoa NO GRUPO da URL (não participa -> 404).
// "Exigir organizador do grupo" = checar se PODE (senão 403). A checagem é sempre aqui, no back-end:
// esconder o botão no front é só conforto, não segurança.
import { ForbiddenError, UnauthorizedError, ValidationError } from '../errors/AppError.js'
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

// Dentro de um grupo (/api/grupos/:grupoId/...): descobre o papel de quem pede NESTE grupo.
// Quem não participa recebe 404 (e não 403), para não revelar que o grupo existe.
// Precisa vir depois de `autenticar`.
export function criarCarregarParticipacao(groupsService) {
  return async function carregarParticipacao(req, res, next) {
    const groupId = Number(req.params.grupoId)
    if (!Number.isInteger(groupId) || groupId <= 0) throw new ValidationError('Id do grupo inválido')
    req.participacao = await groupsService.participacao(groupId, req.usuario.id)
    next()
  }
}

export function exigirOrganizadorDoGrupo(req, res, next) {
  if (req.participacao?.role !== 'ORGANIZER') throw new ForbiddenError()
  next()
}

// Leitura (GET) liberada para qualquer participante; escrita só para organizador do grupo.
export function exigirOrganizadorDoGrupoParaEscrever(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  return exigirOrganizadorDoGrupo(req, res, next)
}
