import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// Substitui a conexão real com o banco por um objeto falso.
// Assim o teste roda sem PostgreSQL, inclusive no CI.
vi.mock('../src/db.js', () => ({
  default: { $queryRaw: vi.fn() },
}))

const { default: prisma } = await import('../src/db.js')
const { default: app } = await import('../src/app.js')

describe('GET /api/health', () => {
  it('responde 200 com status ok', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('GET /api/health/db', () => {
  it('responde 200 quando o banco responde', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])

    const res = await request(app).get('/api/health/db')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', banco: 'conectado' })
  })

  it('responde 503 quando o banco está fora do ar', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('conexão recusada'))

    const res = await request(app).get('/api/health/db')

    expect(res.status).toBe(503)
    expect(res.body.banco).toBe('indisponível')
  })
})

describe('rota inexistente', () => {
  it('responde 404 no formato padrão', async () => {
    const res = await request(app).get('/api/nao-existe')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ erro: 'Rota não encontrada' })
  })
})
