// Pelada pela API completa: criar com 3 times, escalar, jogos da noite, gols e estatísticas.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]
const jogadores = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1, name: `Jogador ${i + 1}`, nickname: `J${i + 1}`, nicknameKey: `j${i + 1}`, position: 'MIDFIELDER', active: true,
}))
const BASE = '/api/grupos/1/matches'

async function cenario() {
  const ctx = montarApp({ jogadores, agora: () => new Date('2026-11-28T12:00:00Z') })
  const res = await request(ctx.app)
    .post('/api/auth/register')
    .send({ name: 'Chefe', email: 'chefe@x.com', password: 'senha-forte-1' })
  ctx.participacaoDe('chefe@x.com').role = 'ORGANIZER'
  const cookie = cookieDe(res)
  const chefe = {
    get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
    post: (url, corpo = {}) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
    put: (url, corpo) => request(ctx.app).put(url).set('Cookie', cookie).send(corpo),
    patch: (url) => request(ctx.app).patch(url).set('Cookie', cookie),
    delete: (url) => request(ctx.app).delete(url).set('Cookie', cookie),
  }
  return { ...ctx, chefe }
}

// Pelada de 3 times, escalada e iniciada.
async function peladaRolando() {
  const ctx = await cenario()
  const { chefe } = ctx
  await chefe.post(BASE, { date: '2026-11-27T20:00:00-03:00', location: 'Quadra', format: 'PELADA', teamCount: 3 })
  await chefe.put(`${BASE}/1/escalacao`, { teamA: [1, 2, 3], teamB: [4, 5, 6], teamC: [7, 8, 9] })
  await chefe.patch(`${BASE}/1/iniciar`)
  return ctx
}

describe('pelada (vários times e jogos)', () => {
  it('cria com formato e times; escala 3 times; placar tem um número por time', async () => {
    const { chefe } = await peladaRolando()
    const res = await chefe.get(`${BASE}/1`)
    expect(res.body.data).toMatchObject({ format: 'PELADA', teamCount: 3, status: 'IN_PROGRESS', score: { A: 0, B: 0, C: 0 }, games: [] })
    expect(res.body.data.players.filter((p) => p.team === 'C')).toHaveLength(3)
  })

  it('400 com formato ou times inválidos; jogo único continua com 2 times', async () => {
    const { chefe } = await cenario()
    expect((await chefe.post(BASE, { date: '2026-11-27T20:00', location: 'Quadra', format: 'PELADA', teamCount: 9 })).status).toBe(400)
    const unico = await chefe.post(BASE, { date: '2026-11-27T20:00', location: 'Quadra' })
    expect(unico.body.data).toMatchObject({ format: 'SINGLE_GAME', teamCount: 2 })
    expect((await chefe.put(`${BASE}/1/escalacao`, { teamA: [1], teamB: [2], teamC: [3] })).status).toBe(422)
  })

  it('gol sem jogo aberto -> 422; começa A x C, lança gols e encerra o jogo com o resultado', async () => {
    const { chefe } = await peladaRolando()
    expect((await chefe.post(`${BASE}/1/gols`, { scorerId: 1 })).status).toBe(422)

    const jogo = await chefe.post(`${BASE}/1/jogos`, { homeTeam: 'A', awayTeam: 'C' })
    expect(jogo.status).toBe(201)
    expect(jogo.body.data.games).toMatchObject([{ number: 1, homeTeam: 'A', awayTeam: 'C', result: null }])

    // Jogador do time B está fora deste jogo.
    expect((await chefe.post(`${BASE}/1/gols`, { scorerId: 4 })).status).toBe(422)
    await chefe.post(`${BASE}/1/gols`, { scorerId: 1, assistId: 2 })
    const contra = await chefe.post(`${BASE}/1/gols`, { scorerId: 7, ownGoal: true })
    expect(contra.body.data.games[0].score).toEqual({ home: 2, away: 0 })
    // Outro jogo só depois de encerrar este.
    expect((await chefe.post(`${BASE}/1/jogos`, { homeTeam: 'A', awayTeam: 'B' })).status).toBe(422)

    const fim = await chefe.patch(`${BASE}/1/jogos/1/encerrar`)
    expect(fim.status).toBe(200)
    expect(fim.body.data.games[0]).toMatchObject({ result: 'HOME_WINS' })
    expect(fim.body.data.standings[0]).toMatchObject({ team: 'A', wins: 1, points: 3 })
    expect((await chefe.patch(`${BASE}/1/jogos/1/encerrar`)).status).toBe(422)
    expect((await chefe.patch(`${BASE}/1/jogos/99/encerrar`)).status).toBe(404)
    // Gol de jogo encerrado não sai mais.
    expect((await chefe.delete(`${BASE}/1/gols/1`)).status).toBe(422)
  })

  it('encerrar a pelada fecha o jogo aberto; estatísticas contam vitórias POR JOGO', async () => {
    const { chefe } = await peladaRolando()
    // Jogo 1: A 1 x 0 C (gol do J1). Jogo 2: A 0 x 1 B (gol do J4), fica aberto até encerrar a pelada.
    await chefe.post(`${BASE}/1/jogos`, { homeTeam: 'A', awayTeam: 'C' })
    await chefe.post(`${BASE}/1/gols`, { scorerId: 1 })
    await chefe.patch(`${BASE}/1/jogos/1/encerrar`)
    await chefe.post(`${BASE}/1/jogos`, { homeTeam: 'A', awayTeam: 'B' })
    await chefe.post(`${BASE}/1/gols`, { scorerId: 4 })
    await chefe.post(`${BASE}/1/lances`, { type: 'YELLOW_CARD', playerId: 5 })

    const fim = await chefe.patch(`${BASE}/1/encerrar`)
    expect(fim.body.data).toMatchObject({ status: 'FINISHED', result: null })
    expect(fim.body.data.games.map((j) => j.result)).toEqual(['HOME_WINS', 'AWAY_WINS'])

    const j1 = (await chefe.get('/api/grupos/1/players/1/stats')).body.data
    expect(j1).toMatchObject({ matches: 1, wins: 1, losses: 1, draws: 0, goals: 1, goalDifference: 0 })
    expect(j1.recentes[0]).toMatchObject({ resultado: 'E', format: 'PELADA', wins: 1, losses: 1 })
    const j7 = (await chefe.get('/api/grupos/1/players/7/stats')).body.data
    expect(j7).toMatchObject({ matches: 1, wins: 0, losses: 1 })
    const j5 = (await chefe.get('/api/grupos/1/players/5/stats')).body.data
    expect(j5).toMatchObject({ wins: 1, yellowCards: 1 })

    const historico = (await chefe.get(`${BASE}/historico`)).body.data.items[0]
    expect(historico).toMatchObject({ format: 'PELADA', gamesCount: 2, score: { A: 1, B: 1, C: 0 }, leader: 'B' }) // B: 3 pontos e saldo +1
  })

  it('diminuir os times com alguém escalado no time que some -> 422', async () => {
    const { chefe } = await cenario()
    await chefe.post(BASE, { date: '2026-11-27T20:00', location: 'Quadra', format: 'PELADA', teamCount: 4 })
    await chefe.put(`${BASE}/1/escalacao`, { teamA: [1], teamB: [2], teamC: [3], teamD: [4] })
    const res = await chefe.put(`${BASE}/1`, { date: '2026-11-27T20:00', location: 'Quadra', format: 'PELADA', teamCount: 3 })
    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/Time D/)
  })

  it('jogo único não tem jogos (422)', async () => {
    const { chefe } = await cenario()
    await chefe.post(BASE, { date: '2026-11-27T20:00', location: 'Quadra' })
    await chefe.put(`${BASE}/1/escalacao`, { teamA: [1, 2, 3], teamB: [4, 5, 6] })
    await chefe.patch(`${BASE}/1/iniciar`)
    expect((await chefe.post(`${BASE}/1/jogos`, { homeTeam: 'A', awayTeam: 'B' })).status).toBe(422)
  })
})
