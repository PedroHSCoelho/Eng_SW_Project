// App COMPLETO (login, guardas, rotas, serviço, errorHandler) com repositórios em memória.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

// Jogadores 1 a 6 ativos e o 7 inativo.
const jogadores = [
  ...[1, 2, 3, 4, 5, 6].map((id) => ({ id, name: `Jogador ${id}`, nickname: `J${id}`, nicknameKey: `j${id}`, position: 'MIDFIELDER', active: true })),
  { id: 7, name: 'Parado', nickname: 'Parado', nicknameKey: 'parado', position: 'DEFENDER', active: false },
]
const novaPartida = { date: '2026-11-20T19:00:00-03:00', location: 'Quadra da UNIFESP' }
const escalacaoCompleta = { teamA: [1, 2, 3], teamB: [4, 5, 6] }

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return cookieDe(res)
}

// "Chefe" é organizador (promovido direto no repositório, como o bootstrap faz); "Maria" é jogadora.
async function cenario() {
  const ctx = montarApp({ jogadores })
  const chefe = await cadastrar(ctx.app, 'Chefe')
  ctx.usersRepo.usuarios.find((u) => u.email === 'chefe@x.com').role = 'ORGANIZER'
  const maria = await cadastrar(ctx.app, 'Maria')
  const api = (cookie) => ({
    get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
    post: (url, corpo) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
    put: (url, corpo) => request(ctx.app).put(url).set('Cookie', cookie).send(corpo),
    patch: (url) => request(ctx.app).patch(url).set('Cookie', cookie),
    delete: (url) => request(ctx.app).delete(url).set('Cookie', cookie),
  })
  return { ...ctx, chefe: api(chefe), maria: api(maria) }
}

describe('permissões em /api/matches', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).get('/api/matches')).status).toBe(401)
  })

  it('jogador vê as partidas, mas não cria (403)', async () => {
    const { maria } = await cenario()
    expect((await maria.get('/api/matches')).status).toBe(200)
    expect((await maria.post('/api/matches', novaPartida)).status).toBe(403)
  })
})

describe('POST /api/matches', () => {
  it('organizador cria: 201, agendada e sem escalação', async () => {
    const { chefe } = await cenario()

    const res = await chefe.post('/api/matches', { ...novaPartida, status: 'FINISHED' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ id: 1, status: 'SCHEDULED', location: 'Quadra da UNIFESP', players: [] })
  })

  it('400 com data inválida', async () => {
    const { chefe } = await cenario()
    const res = await chefe.post('/api/matches', { ...novaPartida, date: 'sexta' })
    expect(res.status).toBe(400)
    expect(res.body.erro).toMatch(/data/i)
  })
})

describe('PUT /api/matches/:id/escalacao', () => {
  it('grava os dois times', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/matches', novaPartida)

    const res = await chefe.put('/api/matches/1/escalacao', escalacaoCompleta)

    expect(res.status).toBe(200)
    expect(res.body.data.players).toHaveLength(6)
    expect(res.body.data.players.filter((p) => p.team === 'A').map((p) => p.playerId)).toEqual([1, 2, 3])
  })

  it('422 quando o jogador está nos dois times', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/matches', novaPartida)

    const res = await chefe.put('/api/matches/1/escalacao', { teamA: [1, 2], teamB: [2, 3] })

    expect(res.status).toBe(422)
    expect(res.body.erro).toBe('Um jogador não pode estar nos dois times')
  })

  it('422 quando escala jogador inativo', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/matches', novaPartida)

    const res = await chefe.put('/api/matches/1/escalacao', { teamA: [1, 7], teamB: [] })

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/inativo/)
  })

  it('400 quando o time não é uma lista (nunca 500)', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/matches', novaPartida)

    expect((await chefe.put('/api/matches/1/escalacao', {})).status).toBe(400)
  })

  it('404 em partida que não existe', async () => {
    const { chefe } = await cenario()
    expect((await chefe.put('/api/matches/99/escalacao', escalacaoCompleta)).status).toBe(404)
  })
})

describe('PATCH /api/matches/:id/iniciar', () => {
  it('422 se algum time tem menos de 3 jogadores', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/matches', novaPartida)
    await chefe.put('/api/matches/1/escalacao', { teamA: [1, 2, 3], teamB: [4, 5] })

    const res = await chefe.patch('/api/matches/1/iniciar')

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/pelo menos 3/)
  })

  it('inicia e, depois disso, a escalação fica travada', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/matches', novaPartida)
    await chefe.put('/api/matches/1/escalacao', escalacaoCompleta)

    const res = await chefe.patch('/api/matches/1/iniciar')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('IN_PROGRESS')

    const depois = await chefe.put('/api/matches/1/escalacao', { teamA: [1, 2, 3], teamB: [4, 5, 6, 2] })
    expect(depois.status).toBe(422)
    expect(depois.body.erro).toMatch(/agendada/)
  })
})

// Partida 1 criada, escalada (1, 2, 3 x 4, 5, 6) e iniciada.
async function partidaEmAndamento() {
  const ctx = await cenario()
  await ctx.chefe.post('/api/matches', novaPartida)
  await ctx.chefe.put('/api/matches/1/escalacao', escalacaoCompleta)
  await ctx.chefe.patch('/api/matches/1/iniciar')
  return ctx
}

describe('POST /api/matches/:id/gols', () => {
  it('lança o gol: 201 e a partida com o gol, no time do autor', async () => {
    const { chefe } = await partidaEmAndamento()

    const res = await chefe.post('/api/matches/1/gols', { scorerId: 4, assistId: 5, minute: 12, team: 'A' })

    expect(res.status).toBe(201)
    expect(res.body.data.goals).toEqual([
      expect.objectContaining({ scorerId: 4, assistId: 5, minute: 12, team: 'B', ownGoal: false }),
    ])
  })

  it('gol contra vai para o adversário', async () => {
    const { chefe } = await partidaEmAndamento()

    const res = await chefe.post('/api/matches/1/gols', { scorerId: 1, ownGoal: true })

    expect(res.body.data.goals[0].team).toBe('B')
  })

  it('422 quando a assistência é de jogador do outro time', async () => {
    const { chefe } = await partidaEmAndamento()

    const res = await chefe.post('/api/matches/1/gols', { scorerId: 1, assistId: 4 })

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/mesmo time/)
  })

  it('422 quando o autor não está escalado', async () => {
    const { chefe } = await partidaEmAndamento()
    const res = await chefe.post('/api/matches/1/gols', { scorerId: 7 })
    expect(res.status).toBe(422)
  })

  it('422 em partida que ainda não começou', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/matches', novaPartida)
    await chefe.put('/api/matches/1/escalacao', escalacaoCompleta)

    const res = await chefe.post('/api/matches/1/gols', { scorerId: 1 })

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/em andamento/)
  })

  it('400 sem autor e 403 para jogador', async () => {
    const { chefe, maria } = await partidaEmAndamento()
    expect((await chefe.post('/api/matches/1/gols', {})).status).toBe(400)
    expect((await maria.post('/api/matches/1/gols', { scorerId: 1 })).status).toBe(403)
  })
})

describe('DELETE /api/matches/:id/gols/:goalId', () => {
  it('remove o gol lançado errado', async () => {
    const { chefe } = await partidaEmAndamento()
    await chefe.post('/api/matches/1/gols', { scorerId: 1 })

    const res = await chefe.delete('/api/matches/1/gols/1')

    expect(res.status).toBe(200)
    expect(res.body.data.goals).toEqual([])
  })

  it('404 para gol que não é desta partida', async () => {
    const { chefe } = await partidaEmAndamento()
    expect((await chefe.delete('/api/matches/1/gols/99')).status).toBe(404)
  })
})
