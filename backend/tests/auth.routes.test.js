import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const maria = { name: 'Maria Souza', email: 'maria@exemplo.com', password: 'senha-forte-1' }
const chefe = { name: 'Chefe Silva', email: 'chefe@exemplo.com', password: 'senha-forte-2' }

// Pega o cabeçalho "token=...; Path=/; HttpOnly..." e devolve só "token=..." para reenviar.
const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

// Cadastra e devolve { cookie, usuario } já logado.
async function cadastrar(app, dados) {
  const res = await request(app).post('/api/auth/register').send(dados)
  return { cookie: cookieDe(res), usuario: res.body.data }
}

describe('POST /api/auth/register', () => {
  it('cria a conta, devolve o usuário SEM hash e abre sessão com cookie httpOnly', async () => {
    const { app } = montarApp()

    const res = await request(app).post('/api/auth/register').send(maria)

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ name: 'Maria Souza', email: 'maria@exemplo.com' })
    expect(res.body.data).not.toHaveProperty('passwordHash')
    const cookie = res.headers['set-cookie'][0]
    expect(cookie).toMatch(/^token=/)
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
  })

  it('o hash gravado no banco não é a senha', async () => {
    const { app, usersRepo } = montarApp()
    await request(app).post('/api/auth/register').send(maria)
    expect(usersRepo.usuarios[0].passwordHash).not.toContain(maria.password)
    expect(usersRepo.usuarios[0].passwordHash).toMatch(/^\$2[aby]\$/)
  })

  it('a conta não tem papel global: role enviado pelo cliente é ignorado', async () => {
    const { app, usersRepo } = montarApp()

    const res = await request(app).post('/api/auth/register').send({ ...maria, role: 'ORGANIZER' })

    expect(res.body.data).not.toHaveProperty('role')
    expect(usersRepo.usuarios[0]).not.toHaveProperty('role')
  })

  it('e-mail repetido (mesmo com maiúsculas) -> 422', async () => {
    const { app } = montarApp()
    await request(app).post('/api/auth/register').send(maria)

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...maria, email: 'MARIA@exemplo.com' })

    expect(res.status).toBe(422)
    expect(res.body).toEqual({ erro: 'E-mail já cadastrado' })
  })

  it('senha curta -> 400', async () => {
    const { app } = montarApp()
    const res = await request(app).post('/api/auth/register').send({ ...maria, password: '123' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('senha certa -> 200 e cookie de sessão', async () => {
    const { app } = montarApp()
    await cadastrar(app, maria)

    const res = await request(app).post('/api/auth/login').send({ email: 'Maria@Exemplo.com', password: maria.password })

    expect(res.status).toBe(200)
    expect(cookieDe(res)).toMatch(/^token=/)
  })

  it('senha errada -> 401 sem cookie', async () => {
    const { app } = montarApp()
    await cadastrar(app, maria)

    const res = await request(app).post('/api/auth/login').send({ email: maria.email, password: 'errada-errada' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ erro: 'E-mail ou senha inválidos' })
    expect(res.headers['set-cookie']).toBeUndefined()
  })

  it('e-mail inexistente dá a MESMA resposta da senha errada (não revela quem tem conta)', async () => {
    const { app } = montarApp()

    const res = await request(app).post('/api/auth/login').send({ email: 'ninguem@x.com', password: 'qualquer-coisa' })

    expect(res.status).toBe(401)
    expect(res.body).toEqual({ erro: 'E-mail ou senha inválidos' })
  })

  it('sem e-mail/senha -> 400', async () => {
    const { app } = montarApp()
    expect((await request(app).post('/api/auth/login').send({})).status).toBe(400)
  })
})

describe('GET /api/auth/me e POST /api/auth/logout', () => {
  it('sem cookie -> 401', async () => {
    const { app } = montarApp()
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ erro: 'Autenticação necessária' })
  })

  it('com cookie válido devolve o usuário', async () => {
    const { app } = montarApp()
    const { cookie } = await cadastrar(app, maria)

    const res = await request(app).get('/api/auth/me').set('Cookie', cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe(maria.email)
  })

  it('token vencido -> 401', async () => {
    const { app } = montarApp({ expiraEmSegundos: -10 })
    const { cookie } = await cadastrar(app, maria)
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401)
  })

  it('token adulterado -> 401', async () => {
    const { app } = montarApp()
    const { cookie } = await cadastrar(app, maria)
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie + 'x')
    expect(res.status).toBe(401)
  })

  it('token de usuário que não existe mais -> 401', async () => {
    const { app, usersRepo } = montarApp()
    const { cookie } = await cadastrar(app, maria)
    usersRepo.usuarios.length = 0
    expect((await request(app).get('/api/auth/me').set('Cookie', cookie)).status).toBe(401)
  })

  it('logout limpa o cookie', async () => {
    const { app } = montarApp()
    const res = await request(app).post('/api/auth/logout')
    expect(res.status).toBe(204)
    expect(res.headers['set-cookie'][0]).toMatch(/^token=;/)
  })
})

// O papel agora é POR grupo: ver tests/groups.routes.test.js (criar, convite, membros) e
// tests/grupos.isolamento.test.js (um grupo não enxerga o outro).
describe('autorização nos jogadores do grupo', () => {
  const novo = { name: 'João Silva', nickname: 'Zé', position: 'FORWARD' }

  it('sem login -> 401 até para listar', async () => {
    const { app } = montarApp()
    expect((await request(app).get('/api/grupos/1/players')).status).toBe(401)
  })

  it('MEMBER lista (200) mas não cria, edita, inativa nem exclui (403)', async () => {
    const jogador = { id: 1, name: 'A', nickname: 'A', nicknameKey: 'a', position: 'FORWARD', active: true }
    const { app } = montarApp({ jogadores: [jogador] })
    const { cookie } = await cadastrar(app, maria)
    const url = '/api/grupos/1/players'

    expect((await request(app).get(url).set('Cookie', cookie)).status).toBe(200)
    expect((await request(app).post(url).set('Cookie', cookie).send(novo)).status).toBe(403)
    expect((await request(app).put(`${url}/1`).set('Cookie', cookie).send(novo)).status).toBe(403)
    expect((await request(app).patch(`${url}/1/inativar`).set('Cookie', cookie)).status).toBe(403)
    expect((await request(app).delete(`${url}/1`).set('Cookie', cookie)).status).toBe(403)
  })

  it('ORGANIZER do grupo cria jogador (201), e o jogador nasce no grupo', async () => {
    const { app, participacaoDe, playersRepo } = montarApp()
    const { cookie } = await cadastrar(app, chefe)
    participacaoDe(chefe.email).role = 'ORGANIZER'

    const res = await request(app).post('/api/grupos/1/players').set('Cookie', cookie).send(novo)

    expect(res.status).toBe(201)
    expect(playersRepo.jogadores[0].groupId).toBe(1)
  })
})
