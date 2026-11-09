import { describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '../src/errors/AppError.js'
import { errorHandler } from '../src/middlewares/errorHandler.js'

// Monta um app mínimo cuja única rota lança o erro recebido.
function appQueLanca(erro) {
  const app = express()
  app.use(express.json())
  app.post('/teste', async () => {
    throw erro
  })
  app.use(errorHandler)
  return app
}

describe('errorHandler', () => {
  it.each([
    [new ValidationError('Nome é obrigatório'), 400],
    [new NotFoundError('Jogador não encontrado'), 404],
    [new BusinessRuleError('Não é possível avaliar a si mesmo'), 422],
  ])('converte %s em status %i', async (erro, status) => {
    const res = await request(appQueLanca(erro)).post('/teste')

    expect(res.status).toBe(status)
    expect(res.body).toEqual({ erro: erro.message })
  })

  it('responde 500 sem expor detalhes para erros inesperados', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await request(appQueLanca(new Error('segredo interno'))).post('/teste')

    expect(res.status).toBe(500)
    expect(res.body).toEqual({ erro: 'Erro interno do servidor' })
  })

  it('responde 400 para JSON mal formado', async () => {
    const res = await request(appQueLanca(new Error('não chega aqui')))
      .post('/teste')
      .set('Content-Type', 'application/json')
      .send('{ "nome": ')

    expect(res.status).toBe(400)
    expect(res.body.erro).toBe('JSON inválido no corpo da requisição')
  })
})
