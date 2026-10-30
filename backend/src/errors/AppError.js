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
