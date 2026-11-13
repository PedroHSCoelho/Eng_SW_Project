import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const motivo = 'Organizo a pelada de quinta e quero cadastrar as partidas'
const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]
const jogadorExistente = { id: 1, name: 'Maria S', nickname: 'Mari', nicknameKey: 'mari', position: 'MIDFIELDER', active: true }

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return { cookie: cookieDe(res), usuario: res.body.data }
}

// Cenário: "Chefe" (organizador, promovido direto no banco como o bootstrap faz) e "Maria"
// (jogadora já vinculada ao jogador 1 por um organizador).
async function cenario(opcoes) {
  const ctx = montarApp({ jogadores: [jogadorExistente], ...opcoes })
  const chefe = await cadastrar(ctx.app, 'Chefe')
  ctx.usersRepo.usuarios.find((u) => u.id === chefe.usuario.id).role = 'ORGANIZER'
  const maria = await cadastrar(ctx.app, 'Maria')
  await request(ctx.app)
    .patch(`/api/users/${maria.usuario.id}/player`)
    .set('Cookie', chefe.cookie)
    .send({ playerId: 1 })
  return { ...ctx, chefe, maria }
}

const pedir = (app, cookie, message = motivo) =>
  request(app).post('/api/organizer-requests').set('Cookie', cookie).send({ message })

describe('POST /api/organizer-requests', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).post('/api/organizer-requests').send({ message: motivo })).status).toBe(401)
  })

  it('jogador vinculado cria o pedido: 201, PENDING, com o motivo', async () => {
    const { app, maria } = await cenario()

    const res = await pedir(app, maria.cookie)

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ status: 'PENDING', message: motivo, userId: maria.usuario.id })
  })

  it('quem pede vem do cookie: o corpo não consegue pedir em nome de outro usuário', async () => {
    const { app, maria, chefe, requestsRepo } = await cenario()
    await request(app)
      .post('/api/organizer-requests')
      .set('Cookie', maria.cookie)
      .send({ message: motivo, userId: chefe.usuario.id })
    expect(requestsRepo.pedidos[0].userId).toBe(maria.usuario.id)
  })

  it('conta sem jogador vinculado -> 422', async () => {
    const { app } = await cenario()
    const joao = await cadastrar(app, 'Joao')
    const res = await pedir(app, joao.cookie)
    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/vincular/)
  })

  it('organizador não pede -> 422; motivo curto -> 400', async () => {
    const { app, chefe, maria } = await cenario()
    expect((await pedir(app, chefe.cookie)).status).toBe(422)
    expect((await pedir(app, maria.cookie, 'curto')).status).toBe(400)
  })

  it('segundo pedido enquanto o primeiro está em análise -> 422', async () => {
    const { app, maria } = await cenario()
    await pedir(app, maria.cookie)
    const res = await pedir(app, maria.cookie)
    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/em análise/)
  })
})

describe('GET /api/organizer-requests/mine', () => {
  it('devolve null sem pedido e o pedido depois de criado', async () => {
    const { app, maria } = await cenario()
    expect((await request(app).get('/api/organizer-requests/mine').set('Cookie', maria.cookie)).body).toEqual({ data: null })

    await pedir(app, maria.cookie)

    const res = await request(app).get('/api/organizer-requests/mine').set('Cookie', maria.cookie)
    expect(res.body.data.status).toBe('PENDING')
  })
})

describe('fila e decisão (só organizador)', () => {
  it('jogador comum não vê a fila nem decide (403)', async () => {
    const { app, maria } = await cenario()
    await pedir(app, maria.cookie)
    expect((await request(app).get('/api/organizer-requests').set('Cookie', maria.cookie)).status).toBe(403)
    expect((await request(app).patch('/api/organizer-requests/1/approve').set('Cookie', maria.cookie)).status).toBe(403)
    expect((await request(app).patch('/api/organizer-requests/1/reject').set('Cookie', maria.cookie)).status).toBe(403)
  })

  it('organizador vê a fila de pendentes, sem dados sensíveis de quem pediu', async () => {
    const { app, maria, chefe } = await cenario()
    await pedir(app, maria.cookie)

    const res = await request(app).get('/api/organizer-requests').set('Cookie', chefe.cookie)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(JSON.stringify(res.body)).not.toContain('passwordHash')
  })

  it('aprovar: pedido APPROVED com quem decidiu, e a pessoa vira organizador na hora', async () => {
    const { app, maria, chefe } = await cenario()
    await pedir(app, maria.cookie)
    const criar = { name: 'Novo Jogador', nickname: 'Novo', position: 'FORWARD' }
    expect((await request(app).post('/api/players').set('Cookie', maria.cookie).send(criar)).status).toBe(403)

    const res = await request(app).patch('/api/organizer-requests/1/approve').set('Cookie', chefe.cookie)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ status: 'APPROVED', decidedById: chefe.usuario.id })
    expect(res.body.data.decidedAt).toBeTruthy()
    expect((await request(app).post('/api/players').set('Cookie', maria.cookie).send(criar)).status).toBe(201)
  })

  it('recusar: pedido REJECTED e a pessoa continua jogador; fila esvazia', async () => {
    const { app, maria, chefe } = await cenario()
    await pedir(app, maria.cookie)

    const res = await request(app).patch('/api/organizer-requests/1/reject').set('Cookie', chefe.cookie)

    expect(res.body.data.status).toBe('REJECTED')
    expect((await request(app).get('/api/auth/me').set('Cookie', maria.cookie)).body.data.role).toBe('PLAYER')
    expect((await request(app).get('/api/organizer-requests').set('Cookie', chefe.cookie)).body.data).toEqual([])
  })

  it('pedido já decidido não decide de novo (422); inexistente -> 404; id inválido -> 400', async () => {
    const { app, maria, chefe } = await cenario()
    await pedir(app, maria.cookie)
    await request(app).patch('/api/organizer-requests/1/approve').set('Cookie', chefe.cookie)

    expect((await request(app).patch('/api/organizer-requests/1/reject').set('Cookie', chefe.cookie)).status).toBe(422)
    expect((await request(app).patch('/api/organizer-requests/99/approve').set('Cookie', chefe.cookie)).status).toBe(404)
    expect((await request(app).patch('/api/organizer-requests/abc/approve').set('Cookie', chefe.cookie)).status).toBe(400)
  })

  it('organizador não decide o próprio pedido (422)', async () => {
    const { app, chefe, requestsRepo } = await cenario()
    // Pedido feito antes de a pessoa virar organizador e ainda pendente.
    requestsRepo.pedidos.push({ id: 1, userId: chefe.usuario.id, message: motivo, status: 'PENDING', createdAt: new Date(), decidedAt: null, decidedById: null })

    const res = await request(app).patch('/api/organizer-requests/1/approve').set('Cookie', chefe.cookie)

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/próprio pedido/)
  })

  it('depois de recusada, a pessoa só pede de novo após 7 dias', async () => {
    let agora = new Date()
    const { app, maria, chefe } = await cenario({ agora: () => agora })
    await pedir(app, maria.cookie)
    await request(app).patch('/api/organizer-requests/1/reject').set('Cookie', chefe.cookie)

    const cedo = await pedir(app, maria.cookie)
    expect(cedo.status).toBe(422)
    expect(cedo.body.erro).toMatch(/novamente em/)

    // O "banco" gravou decidedAt com a hora real; avançamos o relógio do serviço 8 dias à frente.
    agora = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000)
    expect((await pedir(app, maria.cookie)).status).toBe(201)
  })
})
