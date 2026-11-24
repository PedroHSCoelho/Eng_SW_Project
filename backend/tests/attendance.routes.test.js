// Lista de presença pela API completa (login, grupo, guardas) com repositórios em memória.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

const jogadores = [
  ...[1, 2, 3, 4].map((id) => ({ id, name: `Jogador ${id}`, nickname: `J${id}`, nicknameKey: `j${id}`, position: 'MIDFIELDER', active: true })),
  { id: 5, name: 'Parado', nickname: 'Parado', nicknameKey: 'parado', position: 'DEFENDER', active: false },
  { id: 6, groupId: 2, name: 'De fora', nickname: 'Fora', nicknameKey: 'fora', position: 'FORWARD', active: true },
]
const URL = '/api/grupos/1/matches/1/presencas'

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return cookieDe(res)
}

// Chefe organiza (sem jogador); Ana é o jogador 1, Bia o 2 e Caio o 3 (membros).
async function cenario({ maxPlayers = 2 } = {}) {
  const ctx = montarApp({ jogadores })
  const cookies = {}
  for (const nome of ['Chefe', 'Ana', 'Bia', 'Caio', 'Semjogador']) cookies[nome] = await cadastrar(ctx.app, nome)
  ctx.participacaoDe('chefe@x.com').role = 'ORGANIZER'
  ctx.participacaoDe('ana@x.com').playerId = 1
  ctx.participacaoDe('bia@x.com').playerId = 2
  ctx.participacaoDe('caio@x.com').playerId = 3
  const api = (cookie) => ({
    get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
    post: (url, corpo = {}) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
    put: (url, corpo) => request(ctx.app).put(url).set('Cookie', cookie).send(corpo),
    patch: (url) => request(ctx.app).patch(url).set('Cookie', cookie),
    delete: (url) => request(ctx.app).delete(url).set('Cookie', cookie),
  })
  const quem = Object.fromEntries(Object.entries(cookies).map(([nome, c]) => [nome.toLowerCase(), api(c)]))
  await quem.chefe.post('/api/grupos/1/matches', { date: '2026-11-27T20:00:00-03:00', location: 'Quadra', maxPlayers })
  return { ...ctx, ...quem }
}

describe('lista de presença', () => {
  it('a partida guarda as vagas; 400 com vagas fora de 2 a 100', async () => {
    const { chefe } = await cenario({ maxPlayers: 12 })
    expect((await chefe.get('/api/grupos/1/matches/1')).body.data.maxPlayers).toBe(12)
    const ruim = await chefe.post('/api/grupos/1/matches', { date: '2026-11-27T20:00', location: 'Quadra', maxPlayers: 1 })
    expect(ruim.status).toBe(400)
    expect(ruim.body.erro).toMatch(/Vagas/)
  })

  it('membro confirma o próprio nome (201) e vê onde está', async () => {
    const { ana } = await cenario()

    const res = await ana.post(URL)

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ maxPlayers: 2, openSpots: 1, me: 'CONFIRMED', waitlist: [] })
    expect(res.body.data.confirmed.map((l) => [l.playerId, l.nickname])).toEqual([[1, 'J1']])
  })

  it('passou das vagas vai para a espera; quando alguém sai, o primeiro da espera sobe', async () => {
    const { ana, bia, caio } = await cenario()
    await ana.post(URL)
    await bia.post(URL)

    const naEspera = await caio.post(URL)
    expect(naEspera.body.data.me).toBe('WAITLIST')
    expect(naEspera.body.data.waitlist.map((l) => l.playerId)).toEqual([3])

    const saiu = await ana.delete(`${URL}/1`)
    expect(saiu.status).toBe(200)
    expect(saiu.body.data.confirmed.map((l) => l.playerId)).toEqual([2, 3])
    expect((await caio.get(URL)).body.data.me).toBe('CONFIRMED')
  })

  it('confirmar duas vezes não duplica nem perde o lugar', async () => {
    const { ana, bia } = await cenario()
    await ana.post(URL)
    await bia.post(URL)
    const res = await ana.post(URL)
    expect(res.body.data.confirmed.map((l) => l.playerId)).toEqual([1, 2])
  })

  it('membro não mexe no nome dos outros (403); organizador põe e tira qualquer um', async () => {
    const { ana, chefe } = await cenario()
    expect((await ana.post(URL, { playerId: 2 })).status).toBe(403)

    const pos = await chefe.post(URL, { playerId: 4 })
    expect(pos.status).toBe(201)
    expect(pos.body.data.confirmed.map((l) => l.playerId)).toEqual([4])
    expect(pos.body.data.me).toBeNull()

    expect((await ana.delete(`${URL}/4`)).status).toBe(403)
    expect((await chefe.delete(`${URL}/4`)).body.data.confirmed).toEqual([])
  })

  it('conta sem jogador ligado recebe 422 explicando; jogador inativo 422; de outro grupo 404', async () => {
    const { semjogador, chefe } = await cenario()
    const res = await semjogador.post(URL)
    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/ligada a um jogador/)
    expect((await chefe.post(URL, { playerId: 5 })).status).toBe(422)
    expect((await chefe.post(URL, { playerId: 6 })).status).toBe(404)
  })

  it('fora de "agendada" a lista fecha (422), mas continua visível', async () => {
    const { ana, chefe } = await cenario()
    await ana.post(URL)
    await chefe.patch('/api/grupos/1/matches/1/cancelar')

    expect((await ana.delete(`${URL}/1`)).status).toBe(422)
    expect((await ana.get(URL)).body.data.confirmed).toHaveLength(1)
  })

  it('partida inexistente 404; id inválido 400; sem login 401', async () => {
    const { ana, app } = await cenario()
    expect((await ana.get('/api/grupos/1/matches/99/presencas')).status).toBe(404)
    expect((await ana.get('/api/grupos/1/matches/abc/presencas')).status).toBe(400)
    expect((await request(app).get(URL)).status).toBe(401)
  })
})
