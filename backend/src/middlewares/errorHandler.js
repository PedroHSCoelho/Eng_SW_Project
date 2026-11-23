import { AppError } from '../errors/AppError.js'

// Rota que não existe -> 404
export function notFound(req, res) {
  res.status(404).json({ erro: 'Rota não encontrada' })
}

// Ponto único de tratamento de erros. Sempre responde { erro: "mensagem" }.
// O Express 5 já encaminha para cá os erros lançados em rotas async.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message })
  }

  // JSON mal formado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' })
  }

  console.error(err)
  return res.status(500).json({ erro: 'Erro interno do servidor' })
}
