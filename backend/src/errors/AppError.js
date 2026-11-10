// Erros de domínio da aplicação.
// Os serviços lançam estes erros e o middleware errorHandler
// transforma cada um na resposta HTTP correta.

export class AppError extends Error {
  constructor(mensagem, status = 500) {
    super(mensagem)
    this.name = this.constructor.name
    this.status = status
  }
}

// Dados de entrada inválidos (campo faltando, formato errado...)
export class ValidationError extends AppError {
  constructor(mensagem) {
    super(mensagem, 400)
  }
}

// Quem pediu não está autenticado (sem login, token inválido ou vencido)
export class UnauthorizedError extends AppError {
  constructor(mensagem = 'Autenticação necessária') {
    super(mensagem, 401)
  }
}

// Está autenticado, mas o papel dele não permite a ação
export class ForbiddenError extends AppError {
  constructor(mensagem = 'Você não tem permissão para esta ação') {
    super(mensagem, 403)
  }
}

// Recurso não existe (jogador, partida...)
export class NotFoundError extends AppError {
  constructor(mensagem = 'Recurso não encontrado') {
    super(mensagem, 404)
  }
}

// Os dados são válidos, mas uma regra de negócio impede a ação
// (ex.: jogador avaliando a si mesmo)
export class BusinessRuleError extends AppError {
  constructor(mensagem) {
    super(mensagem, 422)
  }
}
