// App COMPLETO (login, guardas, rotas, serviço) com repositórios em memória.
// Cada jogador (1 a 6) tem uma conta ligada a ele; o 7 não joga a partida; "Chefe" é organizador sem jogador.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

const jogadores = [1, 2, 3, 4, 5, 6, 7].map((id) => ({
  id, name: `Jogador ${id}`, nickname: `J${id}`, nicknameKey: `j${id}`, position: 'MIDFIELDER', active: true,
}))

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return cookieDe(res)
}

async function cenario() {
  let agora = new Date('2026-11-21T12:00:00Z') // partida de 20/11: já pode ser encerrada
  const ctx = montarApp({ jogadores, agora: () => agora })
  const api = (cookie) => ({
    get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
    post: (url, corpo) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
    put: (url, corpo) => request(ctx.app).put(url).set('Cookie', cookie).send(corpo),
    patch: (url) => request(ctx.app).patch(url).set('Cookie', cookie),
  })

  const chefe = api(await cadastrar(ctx.app, 'Chefe'))
  ctx.usersRepo.usuarios.find((u) => u.email === 'chefe@x.com').role = 'ORGANIZER'

  // j[1]..j[7]: conta ligada ao jogador de mesmo número
  const j = {}
  for (const id of [1, 2, 3, 4, 5, 6, 7]) {
    j[id] = api(await cadastrar(ctx.app, `Conta${id}`))
    ctx.usersRepo.usuarios.find((u) => u.email === `conta${id}@x.com`).playerId = id
  }

  // Partida 1: times 1,2,3 x 4,5,6; o jogador 2 faz 1 gol. `encerrar: false` deixa em andamento.
  async function jogarPartida({ encerrar = true } = {}) {
    const { body } = await chefe.post('/api/matches', { date: '2026-11-20T19:00:00-03:00', location: 'Quadra' })
    const id = body.data.id
    await chefe.put(`/api/matches/${id}/escalacao`, { teamA: [1, 2, 3], teamB: [4, 5, 6] })
    await chefe.patch(`/api/matches/${id}/iniciar`)
    await chefe.post(`/api/matches/${id}/gols`, { scorerId: 2 })
    if (encerrar) await chefe.patch(`/api/matches/${id}/encerrar`)
    return id
  }

  return { ...ctx, chefe, j, jogarPartida, passarHoras: (h) => { agora = new Date(agora.getTime() + h * 3600_000) } }
}

describe('PUT /api/matches/:id/avaliacoes', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).put('/api/matches/1/avaliacoes').send({ ratedId: 2, score: 4 })).status).toBe(401)
  })

  it('jogador comum (não organizador) avalia: 200 com a nota salva', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()

    const res = await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 4, comment: 'jogou bem' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ matchId: id, ratedId: 2, score: 4, comment: 'jogou bem' })
    expect(res.body.data.raterId).toBeUndefined() // quem avaliou não é devolvido
  })

  it('avaliar de novo EDITA a nota (não duplica)', async () => {
    const { j, jogarPartida, ratingsRepo } = await cenario()
    const id = await jogarPartida()

    await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 4 })
    const res = await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 2 })

    expect(res.body.data.score).toBe(2)
    expect(ratingsRepo.notas).toHaveLength(1)
  })

  it('o avaliador vem da conta logada: raterId no corpo é ignorado', async () => {
    const { j, jogarPartida, ratingsRepo } = await cenario()
    const id = await jogarPartida()

    await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 5, raterId: 3 })

    expect(ratingsRepo.notas[0].raterId).toBe(1)
  })

  it('nota inválida ou avaliado inválido -> 400', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    for (const corpo of [{ ratedId: 2, score: 0 }, { ratedId: 2, score: 6 }, { ratedId: 2, score: 3.5 }, { ratedId: 2 }, { score: 3 }]) {
      expect((await j[1].put(`/api/matches/${id}/avaliacoes`, corpo)).status).toBe(400)
    }
  })

  it('não avalia a si mesmo (422)', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    const res = await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 1, score: 3 })
    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/si mesmo/)
  })

  it('quem não jogou não avalia, e quem não jogou não é avaliado (422)', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    expect((await j[7].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 3 })).status).toBe(422)
    expect((await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 7, score: 3 })).status).toBe(422)
  })

  it('conta sem jogador ligado (organizador) não avalia (422)', async () => {
    const { chefe, jogarPartida } = await cenario()
    const id = await jogarPartida()
    expect((await chefe.put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 3 })).status).toBe(422)
  })

  it('partida não finalizada -> 422', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida({ encerrar: false })
    expect((await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 3 })).status).toBe(422)
  })

  it('prazo de 48h: até 48h vale, depois -> 422', async () => {
    const { j, jogarPartida, passarHoras } = await cenario()
    const id = await jogarPartida() // encerrada em 21/11 12:00Z (relógio do cenário)

    passarHoras(48)
    expect((await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 3 })).status).toBe(200)

    passarHoras(1)
    const res = await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 3 })
    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/48 horas/)
  })

  it('partida inexistente -> 404; id inválido -> 400', async () => {
    const { j } = await cenario()
    expect((await j[1].put('/api/matches/99/avaliacoes', { ratedId: 2, score: 3 })).status).toBe(404)
    expect((await j[1].put('/api/matches/abc/avaliacoes', { ratedId: 2, score: 3 })).status).toBe(400)
  })
})

describe('GET /api/matches/:id/avaliacoes/pendentes', () => {
  it('lista quem ainda falta avaliar e diminui conforme avalia', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()

    const antes = await j[1].get(`/api/matches/${id}/avaliacoes/pendentes`)
    expect(antes.body.data.open).toBe(true)
    expect(antes.body.data.pending.map((p) => p.playerId)).toEqual([2, 3, 4, 5, 6])

    await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 4 })
    const depois = await j[1].get(`/api/matches/${id}/avaliacoes/pendentes`)
    expect(depois.body.data.pending.map((p) => p.playerId)).toEqual([3, 4, 5, 6])
  })

  it('depois do prazo ou fora da partida: janela fechada e sem pendências', async () => {
    const { j, jogarPartida, passarHoras } = await cenario()
    const id = await jogarPartida()

    expect((await j[7].get(`/api/matches/${id}/avaliacoes/pendentes`)).body.data.pending).toEqual([])

    passarHoras(49)
    const res = await j[1].get(`/api/matches/${id}/avaliacoes/pendentes`)
    expect(res.body.data).toMatchObject({ open: false, pending: [] })
  })

  it('partida inexistente -> 404', async () => {
    const { j } = await cenario()
    expect((await j[1].get('/api/matches/99/avaliacoes/pendentes')).status).toBe(404)
  })
})

describe('GET /api/players/:id/ratings (média no perfil)', () => {
  it('com menos de 3 avaliações: "sem avaliações suficientes", sem média', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 5 })
    await j[3].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 5 })

    const res = await j[2].get('/api/players/2/ratings')

    expect(res.status).toBe(200)
    expect(res.body.data.geral).toEqual({ average: null, count: 2 })
    expect(res.body.data.mensagem).toBe('sem avaliações suficientes')
  })

  it('com 3 avaliações: média com 1 casa; o jogador não vê quem avaliou', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    for (const [quem, nota] of [[1, 5], [3, 4], [4, 4]]) {
      await j[quem].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: nota })
    }

    const res = await j[2].get('/api/players/2/ratings')

    expect(res.body.data.geral).toEqual({ average: 4.3, count: 3 })
    expect(res.body.data.porPartida).toEqual([{ matchId: id, average: 4.3, count: 3 }])
    expect(res.body.data.mensagem).toBeNull()
    expect(JSON.stringify(res.body)).not.toMatch(/raterId|rater/)
  })

  it('jogador inexistente -> 404', async () => {
    const { j } = await cenario()
    expect((await j[1].get('/api/players/99/ratings')).status).toBe(404)
  })
})

describe('GET /api/matches/:id/destaque', () => {
  it('maior média da partida (com 3 notas), com o apelido', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    for (const quem of [1, 3, 4]) await j[quem].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 5 })
    for (const quem of [1, 2, 4]) await j[quem].put(`/api/matches/${id}/avaliacoes`, { ratedId: 3, score: 3 })

    const res = await j[5].get(`/api/matches/${id}/destaque`)

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ playerId: 2, average: 5, count: 3, goals: 1 })
  })

  it('sem notas suficientes ou partida não finalizada: null', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    expect((await j[1].get(`/api/matches/${id}/destaque`)).body.data).toBeNull()

    const andamento = await jogarPartida({ encerrar: false })
    expect((await j[1].get(`/api/matches/${andamento}/destaque`)).body.data).toBeNull()
  })

  it('partida inexistente -> 404', async () => {
    const { j } = await cenario()
    expect((await j[1].get('/api/matches/99/destaque')).status).toBe(404)
  })
})

describe('GET /api/matches/:id/avaliacoes/minhas', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).get('/api/matches/1/avaliacoes/minhas')).status).toBe(401)
  })

  it('devolve só as MINHAS notas (com o comentário), nunca as de outros jogadores', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 4, comment: 'jogou bem' })
    await j[3].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 1 }) // de outra pessoa

    const res = await j[1].get(`/api/matches/${id}/avaliacoes/minhas`)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([{ ratedId: 2, nickname: null, score: 4, comment: 'jogou bem' }])
  })

  it('depois de reavaliar, mostra a nota nova (edição)', async () => {
    const { j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 4 })
    await j[1].put(`/api/matches/${id}/avaliacoes`, { ratedId: 2, score: 2, comment: 'mudei de ideia' })

    const res = await j[1].get(`/api/matches/${id}/avaliacoes/minhas`)

    expect(res.body.data).toEqual([{ ratedId: 2, nickname: null, score: 2, comment: 'mudei de ideia' }])
  })

  it('conta sem jogador ligado: lista vazia; partida inexistente: 404', async () => {
    const { chefe, j, jogarPartida } = await cenario()
    const id = await jogarPartida()
    expect((await chefe.get(`/api/matches/${id}/avaliacoes/minhas`)).body.data).toEqual([])
    expect((await j[1].get('/api/matches/99/avaliacoes/minhas')).status).toBe(404)
  })
})
