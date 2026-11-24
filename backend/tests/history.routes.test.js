// App COMPLETO (login, guardas, rotas, serviço) com repositórios em memória.
// As partidas são jogadas pela própria API, como o organizador faria na tela.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

const jogadores = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => ({
  id, name: `Jogador ${id}`, nickname: `J${id}`, nicknameKey: `j${id}`, position: 'MIDFIELDER', active: true,
}))

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return cookieDe(res)
}

async function cenario() {
  const ctx = montarApp({ jogadores, agora: () => new Date('2026-12-31T12:00:00Z') })
  const chefeCookie = await cadastrar(ctx.app, 'Chefe')
  ctx.usersRepo.usuarios.find((u) => u.email === 'chefe@x.com').role = 'ORGANIZER'
  const mariaCookie = await cadastrar(ctx.app, 'Maria')
  const api = (cookie) => ({
    get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
    post: (url, corpo) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
    put: (url, corpo) => request(ctx.app).put(url).set('Cookie', cookie).send(corpo),
    patch: (url) => request(ctx.app).patch(url).set('Cookie', cookie),
  })
  const chefe = api(chefeCookie)

  // Joga uma partida: `times` = { teamA, teamB }; `gols` = [{ scorerId, assistId? }]
  async function jogar({ date, teamA = [1, 2, 3], teamB = [4, 5, 6], gols = [], encerrar = true }) {
    const { body } = await chefe.post('/api/matches', { date, location: 'Quadra' })
    const id = body.data.id
    await chefe.put(`/api/matches/${id}/escalacao`, { teamA, teamB })
    await chefe.patch(`/api/matches/${id}/iniciar`)
    for (const gol of gols) await chefe.post(`/api/matches/${id}/gols`, gol)
    if (encerrar) await chefe.patch(`/api/matches/${id}/encerrar`)
    return id
  }
  return { ...ctx, chefe, maria: api(mariaCookie), jogar }
}

const idsDa = (res) => res.body.data.items.map((p) => p.id)

describe('GET /api/matches/historico', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).get('/api/matches/historico')).status).toBe(401)
  })

  it('jogador comum vê (200), e "historico" não é confundido com um id', async () => {
    const { maria } = await cenario()
    const res = await maria.get('/api/matches/historico')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 })
  })

  it('só finalizadas, mais recentes primeiro, com placar e resultado', async () => {
    const { maria, jogar } = await cenario()
    const antiga = await jogar({ date: '2026-11-01T19:00:00-03:00', gols: [{ scorerId: 1 }, { scorerId: 2 }, { scorerId: 4 }] })
    const recente = await jogar({ date: '2026-11-10T19:00:00-03:00', gols: [{ scorerId: 4 }] })
    await jogar({ date: '2026-11-15T19:00:00-03:00', encerrar: false }) // em andamento: fora do histórico

    const res = await maria.get('/api/matches/historico')

    expect(idsDa(res)).toEqual([recente, antiga])
    expect(res.body.data.items[0]).toMatchObject({ result: 'B_WINS', score: { A: 0, B: 1 }, location: 'Quadra' })
    expect(res.body.data.items[1]).toMatchObject({ result: 'A_WINS', score: { A: 2, B: 1 } })
  })

  it('filtra por jogador', async () => {
    const { maria, jogar } = await cenario()
    const comOito = await jogar({ date: '2026-11-01T19:00:00-03:00', teamA: [1, 2, 8], teamB: [4, 5, 6] })
    await jogar({ date: '2026-11-08T19:00:00-03:00' })

    expect(idsDa(await maria.get('/api/matches/historico?playerId=8'))).toEqual([comOito])
    expect(idsDa(await maria.get('/api/matches/historico?playerId=9'))).toEqual([])
  })

  it('filtra por período (de inclusive, ate exclusivo)', async () => {
    const { maria, jogar } = await cenario()
    await jogar({ date: '2026-10-31T12:00:00Z' })
    const dentro = await jogar({ date: '2026-11-15T12:00:00Z' })
    await jogar({ date: '2026-12-01T00:00:00Z' }) // exatamente em `ate`: fora

    const res = await maria.get('/api/matches/historico?de=2026-11-01&ate=2026-12-01')

    expect(idsDa(res)).toEqual([dentro])
    expect(res.body.data.total).toBe(1)
  })

  it('combina jogador e período', async () => {
    const { maria, jogar } = await cenario()
    await jogar({ date: '2026-10-01T12:00:00Z', teamA: [1, 2, 8], teamB: [4, 5, 6] }) // 8, mas fora do período
    const certa = await jogar({ date: '2026-11-10T12:00:00Z', teamA: [1, 2, 8], teamB: [4, 5, 6] })
    await jogar({ date: '2026-11-12T12:00:00Z' }) // no período, mas sem o 8

    expect(idsDa(await maria.get('/api/matches/historico?playerId=8&de=2026-11-01'))).toEqual([certa])
  })

  it('pagina: página 1 e 2, total e número de páginas', async () => {
    const { maria, jogar } = await cenario()
    const todas = []
    for (let dia = 1; dia <= 5; dia++) todas.push(await jogar({ date: `2026-11-0${dia}T12:00:00Z` }))

    const p1 = await maria.get('/api/matches/historico?pageSize=2&page=1')
    const p3 = await maria.get('/api/matches/historico?pageSize=2&page=3')

    expect(idsDa(p1)).toEqual([todas[4], todas[3]]) // as duas mais recentes
    expect(p1.body.data).toMatchObject({ total: 5, totalPages: 3, page: 1, pageSize: 2 })
    expect(idsDa(p3)).toEqual([todas[0]])
    expect(idsDa(await maria.get('/api/matches/historico?pageSize=2&page=4'))).toEqual([])
  })

  it('parâmetros inválidos -> 400 com mensagem em português', async () => {
    const { maria } = await cenario()
    for (const query of ['page=0', 'page=abc', 'pageSize=100', 'playerId=0', 'de=ontem', 'de=2026-12-01&ate=2026-11-01']) {
      const res = await maria.get(`/api/matches/historico?${query}`)
      expect(res.status, query).toBe(400)
      expect(res.body.erro).toEqual(expect.any(String))
    }
  })

  it('o detalhe da partida continua em /api/matches/:id, com gols e assistências', async () => {
    const { maria, jogar } = await cenario()
    const id = await jogar({ date: '2026-11-01T19:00:00-03:00', gols: [{ scorerId: 1, assistId: 2 }] })

    const res = await maria.get(`/api/matches/${id}`)

    expect(res.status).toBe(200)
    expect(res.body.data.goals[0]).toMatchObject({ scorerId: 1, assistId: 2 })
    expect(res.body.data.score).toEqual({ A: 1, B: 0 })
  })
})
