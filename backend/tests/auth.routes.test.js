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

// Faz o papel do comando de bootstrap: promove direto no "banco" (repositório em memória).
function promover(usersRepo, usuario) {
  usersRepo.usuarios.find((u) => u.id === usuario.id).role = 'ORGANIZER'
}

describe('POST /api/auth/register', () => {
  it('cria PLAYER, devolve o usuário SEM hash e abre sessão com cookie httpOnly', async () => {
    const { app } = montarApp()

    const res = await request(app).post('/api/auth/register').send(maria)

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ name: 'Maria Souza', email: 'maria@exemplo.com', role: 'PLAYER' })
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

  it('todo cadastro nasce PLAYER, mesmo que o cliente peça ORGANIZER', async () => {
    const { app } = montarApp()

    const res = await request(app).post('/api/auth/register').send({ ...maria, role: 'ORGANIZER' })

    expect(res.body.data.role).toBe('PLAYER')
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

describe('autorização nos jogadores', () => {
  const novo = { name: 'João Silva', nickname: 'Zé', position: 'FORWARD' }

  it('sem login -> 401 até para listar', async () => {
    const { app } = montarApp()
    expect((await request(app).get('/api/players')).status).toBe(401)
  })

  it('PLAYER lista (200) mas não cria, edita, inativa nem exclui (403)', async () => {
    const jogador = { id: 1, name: 'A', nickname: 'A', nicknameKey: 'a', position: 'FORWARD', active: true }
    const { app } = montarApp({ jogadores: [jogador] })
    const { cookie } = await cadastrar(app, maria)

    expect((await request(app).get('/api/players').set('Cookie', cookie)).status).toBe(200)
    expect((await request(app).post('/api/players').set('Cookie', cookie).send(novo)).status).toBe(403)
    expect((await request(app).put('/api/players/1').set('Cookie', cookie).send(novo)).status).toBe(403)
    expect((await request(app).patch('/api/players/1/inativar').set('Cookie', cookie)).status).toBe(403)
    expect((await request(app).delete('/api/players/1').set('Cookie', cookie)).status).toBe(403)
  })

  it('ORGANIZER cria jogador (201)', async () => {
    const { app, usersRepo } = montarApp()
    const { cookie, usuario } = await cadastrar(app, chefe)
    promover(usersRepo, usuario)

    const res = await request(app).post('/api/players').set('Cookie', cookie).send(novo)

    expect(res.status).toBe(201)
  })
})

describe('gestão de usuários (/api/users)', () => {
  async function cenario() {
    const jogador = { id: 1, name: 'Maria S', nickname: 'Mari', nicknameKey: 'mari', position: 'MIDFIELDER', active: true }
    const ctx = montarApp({ jogadores: [jogador] })
    const org = await cadastrar(ctx.app, chefe)
    promover(ctx.usersRepo, org.usuario)
    const player = await cadastrar(ctx.app, maria)
    return { ...ctx, org, player }
  }

  it('PLAYER não acessa nenhuma rota de gestão (403)', async () => {
    const { app, player, org } = await cenario()
    const c = player.cookie
    expect((await request(app).get('/api/users').set('Cookie', c)).status).toBe(403)
    expect((await request(app).patch(`/api/users/${player.usuario.id}/role`).set('Cookie', c).send({ role: 'ORGANIZER' })).status).toBe(403)
    expect((await request(app).patch(`/api/users/${org.usuario.id}/player`).set('Cookie', c).send({ playerId: 1 })).status).toBe(403)
  })

  it('organizador lista usuários sem expor hash', async () => {
    const { app, org } = await cenario()
    const res = await request(app).get('/api/users').set('Cookie', org.cookie)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(JSON.stringify(res.body)).not.toContain('passwordHash')
  })

  it('organizador promove um PLAYER e o efeito vale na hora (sem novo login)', async () => {
    const { app, org, player } = await cenario()
    const novoJogador = { name: 'X Y', nickname: 'XY', position: 'FORWARD' }
    expect((await request(app).post('/api/players').set('Cookie', player.cookie).send(novoJogador)).status).toBe(403)

    const res = await request(app).patch(`/api/users/${player.usuario.id}/role`).set('Cookie', org.cookie).send({ role: 'ORGANIZER' })

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('ORGANIZER')
    expect((await request(app).post('/api/players').set('Cookie', player.cookie).send(novoJogador)).status).toBe(201)
  })

  it('rebaixar tira o poder na hora', async () => {
    const { app, org, player } = await cenario()
    await request(app).patch(`/api/users/${player.usuario.id}/role`).set('Cookie', org.cookie).send({ role: 'ORGANIZER' })
    await request(app).patch(`/api/users/${player.usuario.id}/role`).set('Cookie', org.cookie).send({ role: 'PLAYER' })
    expect((await request(app).get('/api/users').set('Cookie', player.cookie)).status).toBe(403)
  })

  it('não deixa rebaixar o ÚLTIMO organizador (422)', async () => {
    const { app, org } = await cenario()
    const res = await request(app).patch(`/api/users/${org.usuario.id}/role`).set('Cookie', org.cookie).send({ role: 'PLAYER' })
    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/ao menos um organizador/)
  })

  it('papel inválido -> 400; usuário inexistente -> 404', async () => {
    const { app, org, player } = await cenario()
    const c = org.cookie
    expect((await request(app).patch(`/api/users/${player.usuario.id}/role`).set('Cookie', c).send({ role: 'ADMIN' })).status).toBe(400)
    expect((await request(app).patch('/api/users/999/role').set('Cookie', c).send({ role: 'PLAYER' })).status).toBe(404)
  })

  it('vincula usuário a jogador e desvincula com null', async () => {
    const { app, org, player } = await cenario()
    const url = `/api/users/${player.usuario.id}/player`

    const vinculado = await request(app).patch(url).set('Cookie', org.cookie).send({ playerId: 1 })
    expect(vinculado.status).toBe(200)
    expect(vinculado.body.data.playerId).toBe(1)

    const solto = await request(app).patch(url).set('Cookie', org.cookie).send({ playerId: null })
    expect(solto.body.data.playerId).toBeNull()
  })

  it('jogador já vinculado a outro usuário -> 422; jogador inexistente -> 404; id inválido -> 400', async () => {
    const { app, org, player } = await cenario()
    await request(app).patch(`/api/users/${player.usuario.id}/player`).set('Cookie', org.cookie).send({ playerId: 1 })

    const duplicado = await request(app).patch(`/api/users/${org.usuario.id}/player`).set('Cookie', org.cookie).send({ playerId: 1 })
    const inexistente = await request(app).patch(`/api/users/${org.usuario.id}/player`).set('Cookie', org.cookie).send({ playerId: 99 })
    const invalido = await request(app).patch(`/api/users/${org.usuario.id}/player`).set('Cookie', org.cookie).send({ playerId: 'abc' })
    const ausente = await request(app).patch(`/api/users/${org.usuario.id}/player`).set('Cookie', org.cookie).send({})

    expect(duplicado.status).toBe(422)
    expect(inexistente.status).toBe(404)
    expect(invalido.status).toBe(400)
    expect(ausente.status).toBe(400)
  })
})
