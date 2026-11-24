// Votação do craque pela API completa (login, grupo, guardas) com repositórios em memória.
// Jogadores 1 a 6 escalados (1-3 no A, 4-6 no B); o 7 não jogou. Ana = jogador 1, Bia = 2, Caio = 7.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]
const jogadores = Array.from({ length: 7 }, (_, i) => ({
  id: i + 1, name: `Jogador ${i + 1}`, nickname: `J${i + 1}`, nicknameKey: `j${i + 1}`, position: 'MIDFIELDER', active: true,
}))
const BASE = '/api/grupos/1/matches'
const URL = `${BASE}/1/craque`

async function cenario({ encerrar = true } = {}) {
  let agora = new Date('2026-11-28T12:00:00Z')
  const ctx = montarApp({ jogadores, agora: () => agora })
  const quem = {}
  for (const nome of ['Chefe', 'Ana', 'Bia', 'Caio', 'Semjogador']) {
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
    const cookie = cookieDe(res)
    quem[nome.toLowerCase()] = {
      get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
      post: (url, corpo = {}) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
      put: (url, corpo) => request(ctx.app).put(url).set('Cookie', cookie).send(corpo),
      patch: (url) => request(ctx.app).patch(url).set('Cookie', cookie),
    }
  }
  ctx.participacaoDe('chefe@x.com').role = 'ORGANIZER'
  ctx.participacaoDe('ana@x.com').playerId = 1
  ctx.participacaoDe('bia@x.com').playerId = 2
  ctx.participacaoDe('caio@x.com').playerId = 7
  const { chefe } = quem
  await chefe.post(BASE, { date: '2026-11-27T20:00:00-03:00', location: 'Quadra' })
  await chefe.put(`${BASE}/1/escalacao`, { teamA: [1, 2, 3], teamB: [4, 5, 6] })
  await chefe.patch(`${BASE}/1/iniciar`)
  if (encerrar) await chefe.patch(`${BASE}/1/encerrar`)
  return { ...ctx, ...quem, passarHoras: (h) => (agora = new Date(agora.getTime() + h * 3600_000)) }
}

describe('votação do craque', () => {
  it('antes de encerrar: fechada, e votar dá 422', async () => {
    const { ana } = await cenario({ encerrar: false })
    expect((await ana.get(URL)).body.data).toMatchObject({ open: false, canVote: false, craques: [] })
    const res = await ana.post(URL, { playerId: 4 })
    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/encerrada/)
  })

  it('quem jogou vota (200); o resultado mostra os votos e o craque', async () => {
    const { ana, bia, chefe } = await cenario()

    expect((await ana.get(URL)).body.data).toMatchObject({ open: true, canVote: true, myVote: null, totalVotes: 0, totalVoters: 6 })
    const res = await ana.post(URL, { playerId: 4 })
    await bia.post(URL, { playerId: 4 })

    expect(res.status).toBe(200)
    expect(res.body.data.myVote).toBe(4)
    const visto = (await chefe.get(URL)).body.data
    expect(visto.totalVotes).toBe(2)
    expect(visto.craques.map((c) => [c.playerId, c.nickname, c.votes])).toEqual([[4, 'J4', 2]])
    expect(visto.candidates[0]).toMatchObject({ playerId: 4, votes: 2, team: 'B' })
    // Admin sem jogador vê, mas não vota.
    expect(visto.canVote).toBe(false)
  })

  it('votar de novo troca o voto (não soma)', async () => {
    const { ana } = await cenario()
    await ana.post(URL, { playerId: 4 })
    const res = await ana.post(URL, { playerId: 5 })
    expect(res.body.data).toMatchObject({ myVote: 5, totalVotes: 1 })
    expect(res.body.data.craques.map((c) => c.playerId)).toEqual([5])
  })

  it('empate nos votos: mais de um craque', async () => {
    const { ana, bia } = await cenario()
    await ana.post(URL, { playerId: 4 })
    const res = await bia.post(URL, { playerId: 5 })
    expect(res.body.data.craques.map((c) => c.playerId).sort()).toEqual([4, 5])
  })

  it('não vota em si mesmo, nem em quem não jogou; quem não jogou não vota (422)', async () => {
    const { ana, caio, semjogador } = await cenario()
    expect((await ana.post(URL, { playerId: 1 })).body.erro).toMatch(/si mesmo/)
    expect((await ana.post(URL, { playerId: 7 })).body.erro).toMatch(/quem jogou/)
    expect((await caio.post(URL, { playerId: 4 })).body.erro).toMatch(/Só quem jogou/)
    expect((await semjogador.post(URL, { playerId: 4 })).status).toBe(422)
  })

  it('fecha 48 horas depois de encerrar', async () => {
    const { ana, passarHoras } = await cenario()
    passarHoras(49)
    expect((await ana.get(URL)).body.data.open).toBe(false)
    expect((await ana.post(URL, { playerId: 4 })).body.erro).toMatch(/48 horas/)
  })

  it('voto sem jogador -> 400; partida inexistente -> 404', async () => {
    const { ana } = await cenario()
    expect((await ana.post(URL, {})).status).toBe(400)
    expect((await ana.post(URL, { playerId: 'x' })).status).toBe(400)
    expect((await ana.get(`${BASE}/99/craque`)).status).toBe(404)
  })
})
