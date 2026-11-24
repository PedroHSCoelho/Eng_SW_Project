// App COMPLETO (login, guardas, rotas, serviço) com repositórios em memória.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

// Jogadores 1 a 6 ativos (o 3 é goleiro) e o 7 inativo.
const jogadores = [
  ...[1, 2, 3, 4, 5, 6].map((id) => ({
    id, name: `Jogador ${id}`, nickname: `J${id}`, nicknameKey: `j${id}`, active: true,
    position: id === 3 ? 'GOALKEEPER' : 'MIDFIELDER',
  })),
  { id: 7, name: 'Parado', nickname: 'Parado', nicknameKey: 'parado', position: 'DEFENDER', active: false },
]

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return cookieDe(res)
}

async function cenario() {
  const ctx = montarApp({ jogadores, aleatorio: () => 0 })
  const chefe = await cadastrar(ctx.app, 'Chefe')
  ctx.participacaoDe('chefe@x.com').role = 'ORGANIZER'
  const maria = await cadastrar(ctx.app, 'Maria')
  const sortear = (cookie, corpo) => request(ctx.app).post('/api/grupos/1/sorteio').set('Cookie', cookie).send(corpo)
  // Nota do admin pela própria API: `darNota(5, 4.5)` = jogador 5 com nota 4,5.
  const darNota = (id, skill) =>
    request(ctx.app).patch(`/api/grupos/1/players/${id}/nota`).set('Cookie', chefe).send({ skill })
  return { ...ctx, chefe, maria, sortear, darNota }
}

const idsDe = (time) => time.players.map((p) => p.id).sort((a, b) => a - b)

describe('POST /api/grupos/1/sorteio', () => {
  it('sem login -> 401; jogador comum -> 403', async () => {
    const { app, maria, sortear } = await cenario()
    expect((await request(app).post('/api/grupos/1/sorteio').send({ playerIds: [1, 2, 3, 4, 5, 6] })).status).toBe(401)
    expect((await sortear(maria, { playerIds: [1, 2, 3, 4, 5, 6] })).status).toBe(403)
  })

  it('organizador sorteia: 200 com os dois times de 3 e a diferença', async () => {
    const { chefe, sortear } = await cenario()

    const res = await sortear(chefe, { playerIds: [1, 2, 3, 4, 5, 6] })

    expect(res.status).toBe(200)
    const { teamA, teamB, difference } = res.body.data
    expect(teamA.players).toHaveLength(3)
    expect(teamB.players).toHaveLength(3)
    expect([...idsDe(teamA), ...idsDe(teamB)].sort()).toEqual([1, 2, 3, 4, 5, 6])
    expect(difference).toBe(0) // todos sem nota = 2,5
    expect(teamA.players[0]).toMatchObject({ nickname: expect.any(String), position: expect.any(String), strength: 2.5 })
  })

  it('a força vem da nota do admin: os dois melhores ficam em times diferentes', async () => {
    const { chefe, sortear, darNota } = await cenario()
    expect((await darNota(1, 5)).status).toBe(200)
    expect((await darNota(2, 5)).status).toBe(200)

    const { teamA, teamB } = (await sortear(chefe, { playerIds: [1, 2, 3, 4, 5, 6] })).body.data

    expect(idsDe(teamA).includes(1)).not.toBe(idsDe(teamA).includes(2))
    expect(teamA.strength).toBe(teamB.strength) // {5; 2,5; 2,5} x {5; 2,5; 2,5}
  })

  it('meio ponto conta, e quem não tem nota vale 2,5', async () => {
    const { chefe, sortear, darNota } = await cenario()
    await darNota(1, 0.5)

    const { teamA, teamB } = (await sortear(chefe, { playerIds: [1, 2, 3, 4, 5, 6] })).body.data

    const todos = [...teamA.players, ...teamB.players]
    expect(todos.find((p) => p.id === 1).strength).toBe(0.5)
    expect(todos.find((p) => p.id === 2).strength).toBe(2.5)
  })

  it('jogador inativo ou inexistente -> 422', async () => {
    const { chefe, sortear } = await cenario()
    const inativo = await sortear(chefe, { playerIds: [1, 2, 3, 4, 5, 7] })
    expect(inativo.status).toBe(422)
    expect(inativo.body.erro).toMatch(/inativo/)
    expect((await sortear(chefe, { playerIds: [1, 2, 3, 4, 5, 99] })).status).toBe(422)
  })

  it('entrada inválida -> 400', async () => {
    const { chefe, sortear } = await cenario()
    for (const corpo of [{}, { playerIds: 'x' }, { playerIds: [1, 2, 3] }, { playerIds: [1, 2, 3, 4, 5, 5] }, { playerIds: [1, 2, 3, 4, 5, 'a'] }]) {
      expect((await sortear(chefe, corpo)).status, JSON.stringify(corpo)).toBe(400)
    }
  })

  it('não grava nada: nenhuma partida é criada pelo sorteio', async () => {
    const { chefe, sortear, matchesRepo } = await cenario()
    await sortear(chefe, { playerIds: [1, 2, 3, 4, 5, 6] })
    expect(matchesRepo.partidas).toHaveLength(0)
  })
})
