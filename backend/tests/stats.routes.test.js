// App COMPLETO (login, guardas, rotas, serviço) com repositórios em memória.
// As partidas são jogadas pela própria API, como o organizador faria na tela.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

const jogadores = [1, 2, 3, 4, 5, 6].map((id) => ({
  id, name: `Jogador ${id}`, nickname: `J${id}`, nicknameKey: `j${id}`, active: true,
  position: id === 1 ? 'FORWARD' : id === 4 ? 'GOALKEEPER' : 'MIDFIELDER',
}))

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return cookieDe(res)
}

async function cenario() {
  // Relógio: 21/11/2026 (as partidas são de 20/11, então já podem ser encerradas).
  const ctx = montarApp({ jogadores, agora: () => new Date('2026-11-21T12:00:00Z') })
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

  // Joga uma partida inteira: times 1,2,3 x 4,5,6; `gols` = [{ scorerId, assistId }...]
  async function jogarPartida(gols, { date = '2026-11-20T19:00:00-03:00', encerrar = true } = {}) {
    const { body } = await chefe.post('/api/matches', { date, location: 'Quadra' })
    const id = body.data.id
    await chefe.put(`/api/matches/${id}/escalacao`, { teamA: [1, 2, 3], teamB: [4, 5, 6] })
    await chefe.patch(`/api/matches/${id}/iniciar`)
    for (const gol of gols) await chefe.post(`/api/matches/${id}/gols`, gol)
    if (encerrar) await chefe.patch(`/api/matches/${id}/encerrar`)
    return id
  }

  return { ...ctx, chefe, maria: api(mariaCookie), jogarPartida }
}

describe('GET /api/players/:id/stats', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).get('/api/players/1/stats')).status).toBe(401)
  })

  it('jogador comum consegue ver (200) e vem zerado sem partidas', async () => {
    const { maria } = await cenario()
    const res = await maria.get('/api/players/1/stats')
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ playerId: 1, matches: 0, goals: 0, goalsPerMatch: 0 })
  })

  it('calcula a partir das súmulas encerradas', async () => {
    const { maria, jogarPartida } = await cenario()
    await jogarPartida([{ scorerId: 1, assistId: 2 }, { scorerId: 1 }]) // A vence por 2x0
    await jogarPartida([{ scorerId: 4 }]) // B vence por 1x0

    const res = await maria.get('/api/players/1/stats')

    expect(res.body.data).toMatchObject({
      matches: 2, wins: 1, losses: 1, draws: 0, goals: 2, assists: 0, goalsPerMatch: 1, goalDifference: 1, // +2 e -1
    })
    expect((await maria.get('/api/players/2/stats')).body.data.assists).toBe(1)
  })

  it('partida não encerrada não conta', async () => {
    const { maria, jogarPartida } = await cenario()
    await jogarPartida([{ scorerId: 1 }], { encerrar: false })
    expect((await maria.get('/api/players/1/stats')).body.data).toMatchObject({ matches: 0, goals: 0 })
  })

  it('filtra por período (?de=&ate=)', async () => {
    const { maria, jogarPartida } = await cenario()
    await jogarPartida([{ scorerId: 1 }], { date: '2026-10-10T19:00:00-03:00' })
    await jogarPartida([{ scorerId: 1 }], { date: '2026-11-10T19:00:00-03:00' })

    const res = await maria.get('/api/players/1/stats?de=2026-11-01&ate=2026-12-01')

    expect(res.body.data.matches).toBe(1)
  })

  it('jogador inexistente -> 404; id inválido, datas inválidas -> 400', async () => {
    const { maria } = await cenario()
    expect((await maria.get('/api/players/99/stats')).status).toBe(404)
    expect((await maria.get('/api/players/abc/stats')).status).toBe(400)
    expect((await maria.get('/api/players/1/stats?de=ontem')).status).toBe(400)
  })
})

describe('GET /api/rankings', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).get('/api/rankings')).status).toBe(401)
  })

  it('geral exige 3 partidas; artilharia e assistências aparecem antes', async () => {
    const { maria, jogarPartida } = await cenario()
    await jogarPartida([{ scorerId: 1, assistId: 2 }])
    await jogarPartida([{ scorerId: 1 }])

    const res = await maria.get('/api/rankings')

    expect(res.status).toBe(200)
    expect(res.body.data.geral).toEqual([]) // só 2 partidas
    expect(res.body.data.artilharia.map((l) => [l.playerId, l.goals])).toEqual([[1, 2]])
    expect(res.body.data.assistencias.map((l) => [l.playerId, l.assists])).toEqual([[2, 1]])
  })

  it('com 3 partidas o time vencedor lidera com 9 pontos', async () => {
    const { maria, jogarPartida } = await cenario()
    for (let i = 0; i < 3; i++) await jogarPartida([{ scorerId: 1 }])

    const { geral } = (await maria.get('/api/rankings')).body.data

    expect(geral).toHaveLength(6)
    expect(geral[0]).toMatchObject({ points: 9, position: 1 })
    expect(geral.at(-1)).toMatchObject({ points: 0, position: 6 })
  })

  it('período: mes considera só o mês do relógio (novembro/2026)', async () => {
    const { maria, jogarPartida } = await cenario()
    await jogarPartida([{ scorerId: 1 }], { date: '2026-10-10T19:00:00-03:00' })
    await jogarPartida([{ scorerId: 4 }], { date: '2026-11-10T19:00:00-03:00' })

    const mes = (await maria.get('/api/rankings?periodo=mes')).body.data.artilharia
    const tudo = (await maria.get('/api/rankings?periodo=tudo')).body.data.artilharia

    expect(mes.map((l) => l.playerId)).toEqual([4])
    expect(tudo.map((l) => l.playerId).sort()).toEqual([1, 4])
  })

  it('período inválido -> 400', async () => {
    const { maria } = await cenario()
    expect((await maria.get('/api/rankings?periodo=semana')).status).toBe(400)
  })
})

describe('GET /api/players/:id/stats (recentes)', () => {
  it('traz as últimas partidas como V, E ou D, mais recente primeiro', async () => {
    const { maria, jogarPartida } = await cenario()
    await jogarPartida([{ scorerId: 1 }], { date: '2026-11-10T19:00:00-03:00' }) // A vence: V para o 1
    await jogarPartida([{ scorerId: 4 }], { date: '2026-11-15T19:00:00-03:00' }) // B vence: D para o 1

    const { recentes } = (await maria.get('/api/players/1/stats')).body.data

    expect(recentes.map((r) => r.resultado)).toEqual(['D', 'V'])
    expect(recentes[0]).toMatchObject({ golsPro: 0, golsContra: 1 })
  })
})

describe('GET /api/rankings?posicao= (ranking por posição)', () => {
  // Jogadores: 1 = atacante, 4 = goleiro, os demais meio-campistas (ver o início do arquivo).
  async function jogarComGols() {
    const ctx = await cenario()
    await ctx.jogarPartida([{ scorerId: 1 }, { scorerId: 2 }, { scorerId: 2 }, { scorerId: 4 }])
    return ctx
  }

  it('filtra o ranking pela posição: só aparecem jogadores dela', async () => {
    const { maria } = await jogarComGols()

    const atacantes = (await maria.get('/api/rankings?posicao=FORWARD')).body.data
    const meias = (await maria.get('/api/rankings?posicao=MIDFIELDER')).body.data
    const goleiros = (await maria.get('/api/rankings?posicao=GOALKEEPER')).body.data

    expect(atacantes.artilharia.map((l) => l.playerId)).toEqual([1])
    expect(meias.artilharia.map((l) => [l.playerId, l.goals])).toEqual([[2, 2]])
    expect(goleiros.artilharia.map((l) => l.playerId)).toEqual([4])
  })

  it('sem o filtro (ou vazio) o ranking inclui todas as posições', async () => {
    const { maria } = await jogarComGols()

    const todos = (await maria.get('/api/rankings')).body.data.artilharia.map((l) => l.playerId).sort()
    const vazio = (await maria.get('/api/rankings?posicao=')).body.data.artilharia.map((l) => l.playerId).sort()

    expect(todos).toEqual([1, 2, 4])
    expect(vazio).toEqual(todos)
  })

  it('a posição vale também para o ranking geral e combina com o período', async () => {
    const { maria, jogarPartida } = await cenario()
    for (let i = 0; i < 3; i++) await jogarPartida([{ scorerId: 1 }]) // 3 partidas: todos entram no geral

    const geral = (await maria.get('/api/rankings?posicao=GOALKEEPER&periodo=tudo')).body.data.geral

    expect(geral.map((l) => l.playerId)).toEqual([4]) // só o goleiro (o 4), que jogou as 3
    expect(geral[0]).toMatchObject({ position: 1, matches: 3 })
  })

  it('posição inválida -> 400', async () => {
    const { maria } = await cenario()
    const res = await maria.get('/api/rankings?posicao=goleiro')
    expect(res.status).toBe(400)
    expect(res.body.erro).toMatch(/Posição inválida/)
  })
})

describe('GET /api/players/:id/stats?periodo= (estatísticas por período)', () => {
  it('periodo=mes considera só o mês do relógio (novembro/2026)', async () => {
    const { maria, jogarPartida } = await cenario()
    await jogarPartida([{ scorerId: 1 }], { date: '2026-10-10T19:00:00-03:00' }) // outubro
    await jogarPartida([{ scorerId: 1 }, { scorerId: 1 }], { date: '2026-11-10T19:00:00-03:00' }) // novembro

    const mes = (await maria.get('/api/players/1/stats?periodo=mes')).body.data
    const tudo = (await maria.get('/api/players/1/stats?periodo=tudo')).body.data
    const ano = (await maria.get('/api/players/1/stats?periodo=ano')).body.data

    expect(mes).toMatchObject({ matches: 1, goals: 2 })
    expect(tudo).toMatchObject({ matches: 2, goals: 3 })
    expect(ano).toMatchObject({ matches: 2, goals: 3 })
    expect(mes.recentes).toHaveLength(1) // as últimas partidas respeitam o mesmo período
  })

  it('período inválido, ou periodo junto com de/ate -> 400', async () => {
    const { maria } = await cenario()
    expect((await maria.get('/api/players/1/stats?periodo=semana')).status).toBe(400)
    expect((await maria.get('/api/players/1/stats?periodo=mes&de=2026-11-01')).status).toBe(400)
  })
})
