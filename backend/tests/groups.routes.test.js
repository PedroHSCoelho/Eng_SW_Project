// App COMPLETO (login, guardas, rotas, serviço) com repositórios em memória.
// Ana cria o grupo (organizadora); Beto entra pelo convite; Caio nunca entra (é de fora).
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return { cookie: cookieDe(res), id: res.body.data.id }
}

async function cenario() {
  // Bytes "aleatórios" fixos: o primeiro convite é ABCDEFGH, o segundo JKLMNPQR, e assim por diante.
  let semente = 0
  const gerarBytes = (n) => Array.from({ length: n }, () => semente++)
  const ctx = montarApp({ gerarBytes, comGrupoDeTeste: false })
  const api = (cookie) => ({
    get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
    post: (url, corpo) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
    patch: (url, corpo) => request(ctx.app).patch(url).set('Cookie', cookie).send(corpo),
    delete: (url) => request(ctx.app).delete(url).set('Cookie', cookie),
  })
  const pessoas = {}
  for (const nome of ['Ana', 'Beto', 'Caio']) {
    const { cookie, id } = await cadastrar(ctx.app, nome)
    pessoas[nome.toLowerCase()] = { ...api(cookie), id }
  }
  return { ...ctx, ...pessoas }
}

// Ana cria "Pelada de quinta" jogando como "Aninha"; Beto entra como "Betão".
async function grupoComDois() {
  const ctx = await cenario()
  const criado = await ctx.ana.post('/api/grupos', { name: 'Pelada de quinta', nickname: 'Aninha', position: 'FORWARD' })
  const grupo = criado.body.data
  await ctx.beto.post(`/api/convites/${grupo.inviteCode}/entrar`, { nickname: 'Betão', position: 'GOALKEEPER' })
  return { ...ctx, grupo, url: `/api/grupos/${grupo.id}` }
}

describe('POST /api/grupos (qualquer pessoa cria e vira organizadora)', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).post('/api/grupos').send({ name: 'Pelada' })).status).toBe(401)
  })

  it('cria o grupo: 201, quem cria é ORGANIZER e vê o código de convite', async () => {
    const { ana } = await cenario()

    const res = await ana.post('/api/grupos', { name: '  Pelada de quinta ' })

    expect(res.status).toBe(201)
    expect(res.body.data).toEqual({ id: 1, name: 'Pelada de quinta', myRole: 'ORGANIZER', myPlayerId: null, inviteCode: 'ABCDEFGH' })
  })

  it('com apelido e posição, quem cria também vira jogador do grupo (com o nome da conta)', async () => {
    const { ana, playersRepo } = await cenario()

    const res = await ana.post('/api/grupos', { name: 'Pelada', nickname: 'Aninha', position: 'FORWARD' })

    expect(res.body.data.myPlayerId).toBe(1)
    expect(playersRepo.jogadores[0]).toMatchObject({ id: 1, groupId: 1, name: 'Ana', nickname: 'Aninha' })
  })

  it('nome inválido -> 400; posição inválida -> 400', async () => {
    const { ana } = await cenario()
    expect((await ana.post('/api/grupos', { name: 'ab' })).status).toBe(400)
    expect((await ana.post('/api/grupos', { name: 'Pelada', nickname: 'Zé', position: 'ZAGUEIRO' })).status).toBe(400)
  })
})

describe('GET /api/grupos (meus grupos)', () => {
  it('lista só os grupos de que a pessoa participa, com o papel dela', async () => {
    const { ana, beto, caio } = await grupoComDois()
    await caio.post('/api/grupos', { name: 'Grupo do Caio' })

    const deAna = await ana.get('/api/grupos')
    const deBeto = await beto.get('/api/grupos')

    expect(deAna.body.data).toEqual([expect.objectContaining({ name: 'Pelada de quinta', myRole: 'ORGANIZER' })])
    expect(deBeto.body.data).toEqual([expect.objectContaining({ name: 'Pelada de quinta', myRole: 'MEMBER' })])
    expect(deBeto.body.data[0]).not.toHaveProperty('inviteCode')
  })
})

describe('convite', () => {
  it('GET mostra o nome do grupo e quantas pessoas tem; aceita minúsculas e espaços', async () => {
    const { ana, caio } = await cenario()
    await ana.post('/api/grupos', { name: 'Pelada' })

    const res = await caio.get('/api/convites/abcdefgh')

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: 1, name: 'Pelada', totalMembers: 1, alreadyMember: false, unclaimedPlayers: [] })
  })

  it('"sou eu": o convite lista os jogadores sem conta e a pessoa entra como um deles, sem duplicar', async () => {
    const { ana, beto, caio, grupo, url, playersRepo } = await grupoComDois()
    // Ana cadastra à mão o Caio (sem conta) e um jogador inativo, que não aparece.
    await ana.post(`${url}/players`, { name: 'Caio Lima', nickname: 'Caião', position: 'DEFENDER' })
    const caiao = playersRepo.jogadores.find((j) => j.nickname === 'Caião')
    await ana.post(`${url}/players`, { name: 'Velho Silva', nickname: 'Velho', position: 'DEFENDER' })
    playersRepo.jogadores.find((j) => j.nickname === 'Velho').active = false
    const antes = playersRepo.jogadores.length

    const convite = await caio.get(`/api/convites/${grupo.inviteCode}`)
    expect(convite.body.data.unclaimedPlayers).toEqual([{ id: caiao.id, name: 'Caio Lima', nickname: 'Caião', position: 'DEFENDER' }])
    // Quem já participa não recebe a lista.
    expect((await beto.get(`/api/convites/${grupo.inviteCode}`)).body.data.unclaimedPlayers).toEqual([])

    const res = await caio.post(`/api/convites/${grupo.inviteCode}/entrar`, { playerId: caiao.id })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ myRole: 'MEMBER', myPlayerId: caiao.id })
    expect(playersRepo.jogadores.length).toBe(antes)
    expect((await ana.get(`${url}/membros`)).body.data.find((m) => m.userId === caio.id).playerId).toBe(caiao.id)
  })

  it('"sou eu" recusa jogador de outra conta (422), inativo ou inexistente (404) e id inválido (400)', async () => {
    const { ana, caio, grupo, url, playersRepo } = await grupoComDois()
    const betao = playersRepo.jogadores.find((j) => j.nickname === 'Betão')
    await ana.post(`${url}/players`, { name: 'Velho Silva', nickname: 'Velho', position: 'DEFENDER' })
    const velho = playersRepo.jogadores.find((j) => j.nickname === 'Velho')
    velho.active = false
    const entrar = (corpo) => caio.post(`/api/convites/${grupo.inviteCode}/entrar`, corpo)

    expect((await entrar({ playerId: betao.id })).body.erro).toBe('Esse jogador já está ligado a outra conta')
    expect((await entrar({ playerId: velho.id })).status).toBe(404)
    expect((await entrar({ playerId: 999 })).status).toBe(404)
    expect((await entrar({ playerId: 'x' })).status).toBe(400)
  })

  it('código inexistente ou mal formado -> 404', async () => {
    const { caio } = await cenario()
    expect((await caio.get('/api/convites/ZZZZZZZZ')).status).toBe(404)
    expect((await caio.get('/api/convites/x')).status).toBe(404)
  })

  it('entrar: 201, vira MEMBER e ganha jogador no grupo', async () => {
    const { ana, caio, playersRepo } = await cenario()
    await ana.post('/api/grupos', { name: 'Pelada' })

    const res = await caio.post('/api/convites/ABCDEFGH/entrar', { nickname: 'Caião', position: 'DEFENDER' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ id: 1, myRole: 'MEMBER', myPlayerId: 1 })
    expect(playersRepo.jogadores[0]).toMatchObject({ groupId: 1, name: 'Caio', nickname: 'Caião' })
  })

  it('entrar duas vezes -> 422 (não duplica)', async () => {
    const { beto, grupo } = await grupoComDois()
    const res = await beto.post(`/api/convites/${grupo.inviteCode}/entrar`, { nickname: 'Outro', position: 'DEFENDER' })
    expect(res.status).toBe(422)
    expect(res.body.erro).toBe('Você já participa deste grupo')
  })

  it('apelido já usado NESTE grupo -> 422; em outro grupo pode', async () => {
    const { caio, ana, grupo } = await grupoComDois()

    const repetido = await caio.post(`/api/convites/${grupo.inviteCode}/entrar`, { nickname: 'BETÃO', position: 'DEFENDER' })
    const outroGrupo = await ana.post('/api/grupos', { name: 'Outro grupo', nickname: 'Betão', position: 'DEFENDER' })

    expect(repetido.status).toBe(422)
    expect(repetido.body.erro).toMatch(/Apelido já está em uso/)
    expect(outroGrupo.status).toBe(201)
  })

  it('gerar novo código invalida o antigo (só organizador)', async () => {
    const { ana, beto, caio, grupo, url } = await grupoComDois()

    expect((await beto.post(`${url}/convite`)).status).toBe(403)
    const novo = await ana.post(`${url}/convite`)

    expect(novo.body.data.inviteCode).not.toBe(grupo.inviteCode)
    expect((await caio.get(`/api/convites/${grupo.inviteCode}`)).status).toBe(404)
    expect((await caio.get(`/api/convites/${novo.body.data.inviteCode}`)).status).toBe(200)
  })
})

describe('isolamento: quem não participa não vê o grupo', () => {
  it('de fora -> 404 (não revela que o grupo existe), igual a grupo inexistente', async () => {
    const { caio, url } = await grupoComDois()
    expect((await caio.get(url)).status).toBe(404)
    expect((await caio.get(`${url}/membros`)).status).toBe(404)
    expect((await caio.get('/api/grupos/999')).status).toBe(404)
  })

  it('id de grupo inválido -> 400', async () => {
    const { ana } = await grupoComDois()
    expect((await ana.get('/api/grupos/abc')).status).toBe(400)
  })
})

describe('dentro do grupo', () => {
  it('GET mostra o grupo com o MEU papel e o MEU jogador', async () => {
    const { beto, url } = await grupoComDois()
    expect((await beto.get(url)).body.data).toEqual({ id: 1, name: 'Pelada de quinta', myRole: 'MEMBER', myPlayerId: 2 })
  })

  it('renomear: organizador sim (200), membro não (403)', async () => {
    const { ana, beto, url } = await grupoComDois()
    expect((await beto.patch(url, { name: 'Novo nome' })).status).toBe(403)
    const res = await ana.patch(url, { name: 'Pelada de sexta' })
    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe('Pelada de sexta')
  })

  it('membros: lista com papel, nome e jogador (sem e-mail)', async () => {
    const { beto, url } = await grupoComDois()

    const res = await beto.get(`${url}/membros`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[1]).toMatchObject({ userId: 2, role: 'MEMBER', user: { id: 2, name: 'Beto' }, player: { nickname: 'Betão' } })
    expect(JSON.stringify(res.body.data)).not.toContain('@')
  })
})

describe('papéis no grupo (vários organizadores, nunca nenhum)', () => {
  it('organizador promove membro; o efeito vale na hora', async () => {
    const { ana, beto, url } = await grupoComDois()

    expect((await beto.post(`${url}/convite`)).status).toBe(403)
    const res = await ana.patch(`${url}/membros/${beto.id}`, { role: 'ORGANIZER' })

    expect(res.status).toBe(200)
    expect(res.body.data.role).toBe('ORGANIZER')
    expect((await beto.post(`${url}/convite`)).status).toBe(200)
  })

  it('quem vira admin cria partida, cadastra jogador e dá admin para outro; ao perder, não pode mais', async () => {
    const { ana, beto, caio, grupo, url } = await grupoComDois()
    const partida = { date: '2026-12-03T20:00:00-03:00', location: 'Quadra' }
    await caio.post(`/api/convites/${grupo.inviteCode}/entrar`, { nickname: 'Caião', position: 'DEFENDER' })

    expect((await beto.post(`${url}/matches`, partida)).status).toBe(403)
    expect((await beto.post(`${url}/players`, { name: 'Davi Souza', nickname: 'Davi', position: 'FORWARD' })).status).toBe(403)

    await ana.patch(`${url}/membros/${beto.id}`, { role: 'ORGANIZER' })

    expect((await beto.post(`${url}/matches`, partida)).status).toBe(201)
    expect((await beto.post(`${url}/players`, { name: 'Davi Souza', nickname: 'Davi', position: 'FORWARD' })).status).toBe(201)
    expect((await beto.patch(`${url}/membros/${caio.id}`, { role: 'ORGANIZER' })).status).toBe(200)
    expect((await caio.post(`${url}/matches`, partida)).status).toBe(201)

    // Um admin também tira o admin de outro.
    expect((await caio.patch(`${url}/membros/${beto.id}`, { role: 'MEMBER' })).status).toBe(200)
    expect((await beto.post(`${url}/matches`, partida)).status).toBe(403)
  })

  it('membro não muda papel de ninguém (403)', async () => {
    const { ana, beto, url } = await grupoComDois()
    expect((await beto.patch(`${url}/membros/${ana.id}`, { role: 'MEMBER' })).status).toBe(403)
  })

  it('admin não tira o próprio admin (422), nem sendo o único; outro admin pode tirar', async () => {
    const { ana, beto, url } = await grupoComDois()

    const sozinha = await ana.patch(`${url}/membros/${ana.id}`, { role: 'MEMBER' })
    expect(sozinha.status).toBe(422)
    expect(sozinha.body.erro).toBe('Você não pode tirar o seu próprio admin')

    await ana.patch(`${url}/membros/${beto.id}`, { role: 'ORGANIZER' })
    const comDois = await ana.patch(`${url}/membros/${ana.id}`, { role: 'MEMBER' })
    expect(comDois.status).toBe(422)
    expect(comDois.body.erro).toBe('Você não pode tirar o seu próprio admin')

    // Mandar o mesmo papel para si mesmo não muda nada e passa.
    expect((await ana.patch(`${url}/membros/${ana.id}`, { role: 'ORGANIZER' })).status).toBe(200)
    expect((await beto.patch(`${url}/membros/${ana.id}`, { role: 'MEMBER' })).status).toBe(200)
  })

  it('papel inválido -> 400; corpo vazio -> 400; quem não é membro -> 404', async () => {
    const { ana, caio, url } = await grupoComDois()
    expect((await ana.patch(`${url}/membros/2`, { role: 'PLAYER' })).status).toBe(400)
    expect((await ana.patch(`${url}/membros/2`, {})).status).toBe(400)
    expect((await ana.patch(`${url}/membros/${caio.id}`, { role: 'MEMBER' })).status).toBe(404)
  })
})

describe('vínculo conta <-> jogador no grupo', () => {
  it('organizador troca o jogador de um membro e desvincula com null', async () => {
    const { ana, beto, url, playersRepo } = await grupoComDois()
    playersRepo.jogadores.push({ id: 3, groupId: 1, name: 'Beto antigo', nickname: 'Bt', nicknameKey: 'bt', active: true })

    const vinculo = await ana.patch(`${url}/membros/${beto.id}`, { playerId: 3 })
    expect(vinculo.status).toBe(200)
    expect(vinculo.body.data.playerId).toBe(3)

    const desfeito = await ana.patch(`${url}/membros/${beto.id}`, { playerId: null })
    expect(desfeito.body.data.playerId).toBeNull()
  })

  it('jogador de OUTRO grupo -> 404; jogador de outra pessoa -> 422; id inválido -> 400', async () => {
    const { ana, beto, caio, url } = await grupoComDois()
    await caio.post('/api/grupos', { name: 'Grupo do Caio', nickname: 'Caião', position: 'DEFENDER' }) // jogador 3, grupo 2

    expect((await ana.patch(`${url}/membros/${beto.id}`, { playerId: 3 })).status).toBe(404)
    expect((await ana.patch(`${url}/membros/${beto.id}`, { playerId: 1 })).status).toBe(422) // é o jogador da Ana
    expect((await ana.patch(`${url}/membros/${beto.id}`, { playerId: 'x' })).status).toBe(400)
  })
})

describe('remover e sair', () => {
  it('membro sai sozinho (204) e perde o acesso; o jogador dele continua no grupo', async () => {
    const { beto, url, playersRepo } = await grupoComDois()

    expect((await beto.delete(`${url}/membros/${beto.id}`)).status).toBe(204)
    expect((await beto.get(url)).status).toBe(404)
    expect(playersRepo.jogadores.find((j) => j.nickname === 'Betão')).toBeTruthy()
  })

  it('organizador remove membro; membro não remove ninguém (422)', async () => {
    const { ana, beto, url } = await grupoComDois()
    expect((await beto.delete(`${url}/membros/${ana.id}`)).status).toBe(422)
    expect((await ana.delete(`${url}/membros/${beto.id}`)).status).toBe(204)
  })

  it('o último organizador não pode sair (422)', async () => {
    const { ana, url } = await grupoComDois()
    const res = await ana.delete(`${url}/membros/${ana.id}`)
    expect(res.status).toBe(422)
    expect(res.body.erro).toBe('O grupo precisa ter ao menos um admin')
  })
})
