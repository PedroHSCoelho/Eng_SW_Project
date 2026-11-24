// App COMPLETO (login, guardas, rotas, serviço, errorHandler) com repositórios em memória.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]

// Jogadores 1 a 6 ativos e o 7 inativo.
const jogadores = [
  ...[1, 2, 3, 4, 5, 6].map((id) => ({ id, name: `Jogador ${id}`, nickname: `J${id}`, nicknameKey: `j${id}`, position: 'MIDFIELDER', active: true })),
  { id: 7, name: 'Parado', nickname: 'Parado', nicknameKey: 'parado', position: 'DEFENDER', active: false },
]
const novaPartida = { date: '2026-11-20T19:00:00-03:00', location: 'Quadra da UNIFESP' }
const escalacaoCompleta = { teamA: [1, 2, 3], teamB: [4, 5, 6] }

async function cadastrar(app, nome) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
  return cookieDe(res)
}

// "Chefe" é organizador do grupo de teste (promovido direto no repositório); "Maria" é membro.
// O relógio fica no dia seguinte à partida, para ela poder ser encerrada.
async function cenario({ agora = () => new Date('2026-11-21T12:00:00Z') } = {}) {
  const ctx = montarApp({ jogadores, agora })
  const chefe = await cadastrar(ctx.app, 'Chefe')
  ctx.participacaoDe('chefe@x.com').role = 'ORGANIZER'
  const maria = await cadastrar(ctx.app, 'Maria')
  const api = (cookie) => ({
    get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
    post: (url, corpo) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
    put: (url, corpo) => request(ctx.app).put(url).set('Cookie', cookie).send(corpo),
    patch: (url) => request(ctx.app).patch(url).set('Cookie', cookie),
    delete: (url) => request(ctx.app).delete(url).set('Cookie', cookie),
  })
  return { ...ctx, chefe: api(chefe), maria: api(maria) }
}

describe('permissões em /api/grupos/1/matches', () => {
  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).get('/api/grupos/1/matches')).status).toBe(401)
  })

  it('jogador vê as partidas, mas não cria (403)', async () => {
    const { maria } = await cenario()
    expect((await maria.get('/api/grupos/1/matches')).status).toBe(200)
    expect((await maria.post('/api/grupos/1/matches', novaPartida)).status).toBe(403)
  })
})

describe('POST /api/grupos/1/matches', () => {
  it('organizador cria: 201, agendada e sem escalação', async () => {
    const { chefe } = await cenario()

    const res = await chefe.post('/api/grupos/1/matches', { ...novaPartida, status: 'FINISHED' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ id: 1, status: 'SCHEDULED', location: 'Quadra da UNIFESP', players: [] })
  })

  it('400 com data inválida', async () => {
    const { chefe } = await cenario()
    const res = await chefe.post('/api/grupos/1/matches', { ...novaPartida, date: 'sexta' })
    expect(res.status).toBe(400)
    expect(res.body.erro).toMatch(/data/i)
  })
})

describe('PUT /api/grupos/1/matches/:id/escalacao', () => {
  it('grava os dois times', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)

    const res = await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)

    expect(res.status).toBe(200)
    expect(res.body.data.players).toHaveLength(6)
    expect(res.body.data.players.filter((p) => p.team === 'A').map((p) => p.playerId)).toEqual([1, 2, 3])
  })

  it('422 quando o jogador está nos dois times', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)

    const res = await chefe.put('/api/grupos/1/matches/1/escalacao', { teamA: [1, 2], teamB: [2, 3] })

    expect(res.status).toBe(422)
    expect(res.body.erro).toBe('Um jogador não pode estar nos dois times')
  })

  it('422 quando escala jogador inativo', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)

    const res = await chefe.put('/api/grupos/1/matches/1/escalacao', { teamA: [1, 7], teamB: [] })

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/inativo/)
  })

  it('400 quando o time não é uma lista (nunca 500)', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)

    expect((await chefe.put('/api/grupos/1/matches/1/escalacao', {})).status).toBe(400)
  })

  it('404 em partida que não existe', async () => {
    const { chefe } = await cenario()
    expect((await chefe.put('/api/grupos/1/matches/99/escalacao', escalacaoCompleta)).status).toBe(404)
  })
})

describe('PATCH /api/grupos/1/matches/:id/iniciar', () => {
  it('422 se algum time tem menos de 3 jogadores', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/1/escalacao', { teamA: [1, 2, 3], teamB: [4, 5] })

    const res = await chefe.patch('/api/grupos/1/matches/1/iniciar')

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/pelo menos 3/)
  })

  it('inicia e, depois disso, a escalação fica travada', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)

    const res = await chefe.patch('/api/grupos/1/matches/1/iniciar')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('IN_PROGRESS')

    const depois = await chefe.put('/api/grupos/1/matches/1/escalacao', { teamA: [1, 2, 3], teamB: [4, 5, 6, 2] })
    expect(depois.status).toBe(422)
    expect(depois.body.erro).toMatch(/agendada/)
  })
})

// Partida 1 criada, escalada (1, 2, 3 x 4, 5, 6) e iniciada.
async function partidaEmAndamento(opcoes) {
  const ctx = await cenario(opcoes)
  await ctx.chefe.post('/api/grupos/1/matches', novaPartida)
  await ctx.chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)
  await ctx.chefe.patch('/api/grupos/1/matches/1/iniciar')
  return ctx
}

describe('POST /api/grupos/1/matches/:id/gols', () => {
  it('lança o gol: 201 e a partida com o gol, no time do autor', async () => {
    const { chefe } = await partidaEmAndamento()

    const res = await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 4, assistId: 5, minute: 12, team: 'A' })

    expect(res.status).toBe(201)
    expect(res.body.data.goals).toEqual([
      expect.objectContaining({ scorerId: 4, assistId: 5, minute: 12, team: 'B', ownGoal: false }),
    ])
  })

  it('gol contra vai para o adversário', async () => {
    const { chefe } = await partidaEmAndamento()

    const res = await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 1, ownGoal: true })

    expect(res.body.data.goals[0].team).toBe('B')
  })

  it('422 quando a assistência é de jogador do outro time', async () => {
    const { chefe } = await partidaEmAndamento()

    const res = await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 1, assistId: 4 })

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/mesmo time/)
  })

  it('422 quando o autor não está escalado', async () => {
    const { chefe } = await partidaEmAndamento()
    const res = await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 7 })
    expect(res.status).toBe(422)
  })

  it('422 em partida que ainda não começou', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)

    const res = await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 1 })

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/em andamento/)
  })

  it('400 sem autor e 403 para jogador', async () => {
    const { chefe, maria } = await partidaEmAndamento()
    expect((await chefe.post('/api/grupos/1/matches/1/gols', {})).status).toBe(400)
    expect((await maria.post('/api/grupos/1/matches/1/gols', { scorerId: 1 })).status).toBe(403)
  })
})

describe('DELETE /api/grupos/1/matches/:id/gols/:goalId', () => {
  it('remove o gol lançado errado', async () => {
    const { chefe } = await partidaEmAndamento()
    await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 1 })

    const res = await chefe.delete('/api/grupos/1/matches/1/gols/1')

    expect(res.status).toBe(200)
    expect(res.body.data.goals).toEqual([])
  })

  it('404 para gol que não é desta partida', async () => {
    const { chefe } = await partidaEmAndamento()
    expect((await chefe.delete('/api/grupos/1/matches/1/gols/99')).status).toBe(404)
  })
})

describe('POST/DELETE /api/grupos/1/matches/:id/lances (cartões e defesas)', () => {
  async function emAndamento() {
    const ctx = await cenario()
    await ctx.chefe.post('/api/grupos/1/matches', novaPartida)
    await ctx.chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)
    await ctx.chefe.patch('/api/grupos/1/matches/1/iniciar')
    return ctx
  }

  it('lança cartão e defesa: 201 e a partida com os lances', async () => {
    const { chefe } = await emAndamento()

    await chefe.post('/api/grupos/1/matches/1/lances', { type: 'YELLOW_CARD', playerId: 1, minute: 12 })
    const res = await chefe.post('/api/grupos/1/matches/1/lances', { type: 'DIFFICULT_SAVE', playerId: 4 })

    expect(res.status).toBe(201)
    expect(res.body.data.events.map((e) => [e.type, e.playerId])).toEqual([['YELLOW_CARD', 1], ['DIFFICULT_SAVE', 4]])
    expect(res.body.data.score).toEqual({ A: 0, B: 0 }) // lance não mexe no placar
  })

  it('segundo amarelo expulsa: o terceiro lance do jogador é recusado (422)', async () => {
    const { chefe } = await emAndamento()
    await chefe.post('/api/grupos/1/matches/1/lances', { type: 'YELLOW_CARD', playerId: 1 })
    await chefe.post('/api/grupos/1/matches/1/lances', { type: 'YELLOW_CARD', playerId: 1 })

    const res = await chefe.post('/api/grupos/1/matches/1/lances', { type: 'RED_CARD', playerId: 1 })

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/expulso/)
  })

  it('400 com tipo inválido; 422 com jogador fora da escalação; 403 para membro', async () => {
    const { chefe, maria } = await emAndamento()
    expect((await chefe.post('/api/grupos/1/matches/1/lances', { type: 'GOL', playerId: 1 })).status).toBe(400)
    expect((await chefe.post('/api/grupos/1/matches/1/lances', { type: 'RED_CARD', playerId: 7 })).status).toBe(422)
    expect((await maria.post('/api/grupos/1/matches/1/lances', { type: 'RED_CARD', playerId: 1 })).status).toBe(403)
  })

  it('422 antes de a partida começar', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)
    const res = await chefe.post('/api/grupos/1/matches/1/lances', { type: 'YELLOW_CARD', playerId: 1 })
    expect(res.status).toBe(422)
  })

  it('remove o lance lançado errado; 404 para lance que não é desta partida', async () => {
    const { chefe } = await emAndamento()
    await chefe.post('/api/grupos/1/matches/1/lances', { type: 'RED_CARD', playerId: 2 })

    const res = await chefe.delete('/api/grupos/1/matches/1/lances/1')

    expect(res.status).toBe(200)
    expect(res.body.data.events).toEqual([])
    expect((await chefe.delete('/api/grupos/1/matches/1/lances/99')).status).toBe(404)
  })

  it('depois de encerrada, os lances entram nas estatísticas e no ranking de defesas', async () => {
    const { chefe } = await emAndamento()
    await chefe.post('/api/grupos/1/matches/1/lances', { type: 'DIFFICULT_SAVE', playerId: 4 })
    await chefe.post('/api/grupos/1/matches/1/lances', { type: 'YELLOW_CARD', playerId: 4 })
    await chefe.patch('/api/grupos/1/matches/1/encerrar')

    const stats = await chefe.get('/api/grupos/1/players/4/stats')
    expect(stats.body.data).toMatchObject({ difficultSaves: 1, yellowCards: 1, redCards: 0 })
    const ranking = await chefe.get('/api/grupos/1/rankings')
    expect(ranking.body.data.defesas.map((l) => [l.playerId, l.difficultSaves])).toEqual([[4, 1]])
    // Com a súmula fechada, não entra nem sai lance.
    expect((await chefe.post('/api/grupos/1/matches/1/lances', { type: 'RED_CARD', playerId: 1 })).status).toBe(422)
    expect((await chefe.delete('/api/grupos/1/matches/1/lances/1')).status).toBe(422)
  })
})

describe('PATCH /api/grupos/1/matches/:id/encerrar', () => {
  it('encerra com placar calculado pelos gols e grava o resultado', async () => {
    const { chefe } = await partidaEmAndamento()
    await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 4 })
    await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 1, ownGoal: true })
    await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 2, assistId: 3 })

    const res = await chefe.patch('/api/grupos/1/matches/1/encerrar')

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ status: 'FINISHED', result: 'B_WINS', score: { A: 1, B: 2 } })
    expect(res.body.data.finishedAt).toBe('2026-11-21T12:00:00.000Z')
  })

  it('sem gols termina empatada em 0 x 0', async () => {
    const { chefe } = await partidaEmAndamento()
    const res = await chefe.patch('/api/grupos/1/matches/1/encerrar')
    expect(res.body.data).toMatchObject({ result: 'DRAW', score: { A: 0, B: 0 } })
  })

  it('422 ao encerrar duas vezes', async () => {
    const { chefe } = await partidaEmAndamento()
    await chefe.patch('/api/grupos/1/matches/1/encerrar')

    const res = await chefe.patch('/api/grupos/1/matches/1/encerrar')

    expect(res.status).toBe(422)
    expect(res.body.erro).toBe('A partida já foi encerrada')
  })

  it('422 ao encerrar partida marcada para o futuro', async () => {
    const { chefe } = await partidaEmAndamento({ agora: () => new Date('2026-11-19T12:00:00Z') })

    const res = await chefe.patch('/api/grupos/1/matches/1/encerrar')

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/futuro/)
  })

  it('depois de encerrada, a súmula não muda (gol, remoção de gol e escalação)', async () => {
    const { chefe } = await partidaEmAndamento()
    await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 1 })
    await chefe.patch('/api/grupos/1/matches/1/encerrar')

    expect((await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 2 })).status).toBe(422)
    expect((await chefe.delete('/api/grupos/1/matches/1/gols/1')).status).toBe(422)
    expect((await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)).status).toBe(422)
    expect((await chefe.get('/api/grupos/1/matches/1')).body.data.score).toEqual({ A: 1, B: 0 })
  })

  it('jogador não encerra (403)', async () => {
    const { maria } = await partidaEmAndamento()
    expect((await maria.patch('/api/grupos/1/matches/1/encerrar')).status).toBe(403)
  })
})

describe('GET /api/grupos/1/matches: placar na lista', () => {
  it('cada partida traz o placar calculado e não traz a lista de gols', async () => {
    const { chefe, maria } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)
    await chefe.patch('/api/grupos/1/matches/1/iniciar')
    await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 1 })
    await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 2 })
    await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 4 })
    await chefe.post('/api/grupos/1/matches', novaPartida) // a 2ª continua agendada

    const lista = (await maria.get('/api/grupos/1/matches')).body.data

    const primeira = lista.find((p) => p.id === 1)
    expect(primeira).toMatchObject({ status: 'IN_PROGRESS', score: { A: 2, B: 1 } })
    expect(primeira.goals).toBeUndefined()
    expect(lista.find((p) => p.id === 2)).toMatchObject({ status: 'SCHEDULED', score: { A: 0, B: 0 } })
  })
})

describe('PUT /api/grupos/1/matches/:id (editar data e local)', () => {
  const novosDados = { date: '2026-12-05T20:00:00-03:00', location: 'Quadra nova' }

  it('nomes livres dos times: guarda ao criar, aparece na lista e muda ao editar', async () => {
    const { chefe } = await cenario()
    const criada = await chefe.post('/api/grupos/1/matches', { ...novaPartida, teamNames: { A: 'Amarelo', B: 'Azul' } })
    expect(criada.status).toBe(201)
    expect(criada.body.data.teamNames).toEqual({ A: 'Amarelo', B: 'Azul' })
    const lista = (await chefe.get('/api/grupos/1/matches')).body.data
    expect(lista.find((p) => p.id === criada.body.data.id).teamNames).toEqual({ A: 'Amarelo', B: 'Azul' })
    const editada = await chefe.put(`/api/grupos/1/matches/${criada.body.data.id}`, { ...novaPartida, teamNames: { A: 'Com camisa' } })
    expect(editada.body.data.teamNames).toEqual({ A: 'Com camisa' })
    expect((await chefe.post('/api/grupos/1/matches', { ...novaPartida, teamNames: { A: 'Azul', B: 'AZUL' } })).status).toBe(422)
  })

  it('organizador edita a partida agendada: 200 com os novos dados', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)

    const res = await chefe.put('/api/grupos/1/matches/1', novosDados)

    expect(res.status).toBe(200)
    expect(res.body.data.location).toBe('Quadra nova')
    expect(new Date(res.body.data.date).toISOString()).toBe('2026-12-05T23:00:00.000Z')
  })

  it('jogador comum -> 403', async () => {
    const { chefe, maria } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    expect((await maria.put('/api/grupos/1/matches/1', novosDados)).status).toBe(403)
  })

  it('status, resultado e id enviados no corpo são ignorados', async () => {
    const { chefe, matchesRepo } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)

    await chefe.put('/api/grupos/1/matches/1', { ...novosDados, status: 'FINISHED', result: 'A_WINS', id: 99 })

    expect(matchesRepo.partidas[0]).toMatchObject({ id: 1, status: 'SCHEDULED' })
    expect(matchesRepo.partidas[0].result).toBeUndefined()
  })

  it('depois de iniciada, finalizada ou cancelada -> 422', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)
    await chefe.patch('/api/grupos/1/matches/1/iniciar')
    const emAndamento = await chefe.put('/api/grupos/1/matches/1', novosDados)
    expect(emAndamento.status).toBe(422)
    expect(emAndamento.body.erro).toMatch(/agendada/)

    await chefe.patch('/api/grupos/1/matches/1/encerrar')
    expect((await chefe.put('/api/grupos/1/matches/1', novosDados)).status).toBe(422)

    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.patch('/api/grupos/1/matches/2/cancelar')
    expect((await chefe.put('/api/grupos/1/matches/2', novosDados)).status).toBe(422)
  })

  it('dados inválidos -> 400; partida inexistente -> 404; id inválido -> 400', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    expect((await chefe.put('/api/grupos/1/matches/1', { date: 'ontem', location: 'Quadra' })).status).toBe(400)
    expect((await chefe.put('/api/grupos/1/matches/1', { date: novosDados.date, location: 'x' })).status).toBe(400)
    expect((await chefe.put('/api/grupos/1/matches/99', novosDados)).status).toBe(404)
    expect((await chefe.put('/api/grupos/1/matches/abc', novosDados)).status).toBe(400)
  })
})

describe('PATCH /api/grupos/1/matches/:id/cancelar', () => {
  it('cancela uma partida agendada e uma em andamento: 200 e status CANCELED', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/2/escalacao', escalacaoCompleta)
    await chefe.patch('/api/grupos/1/matches/2/iniciar')

    const agendada = await chefe.patch('/api/grupos/1/matches/1/cancelar')
    const andamento = await chefe.patch('/api/grupos/1/matches/2/cancelar')

    expect(agendada.status).toBe(200)
    expect(agendada.body.data.status).toBe('CANCELED')
    expect(andamento.body.data.status).toBe('CANCELED')
  })

  it('jogador comum -> 403', async () => {
    const { chefe, maria } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    expect((await maria.patch('/api/grupos/1/matches/1/cancelar')).status).toBe(403)
  })

  it('finalizada ou já cancelada -> 422; inexistente -> 404', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)
    await chefe.patch('/api/grupos/1/matches/1/iniciar')
    await chefe.patch('/api/grupos/1/matches/1/encerrar')
    const finalizada = await chefe.patch('/api/grupos/1/matches/1/cancelar')
    expect(finalizada.status).toBe(422)
    expect(finalizada.body.erro).toMatch(/finalizada/)

    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.patch('/api/grupos/1/matches/2/cancelar')
    expect((await chefe.patch('/api/grupos/1/matches/2/cancelar')).status).toBe(422)
    expect((await chefe.patch('/api/grupos/1/matches/99/cancelar')).status).toBe(404)
  })

  it('depois de cancelada, nenhuma outra ação é aceita (escalar, iniciar, gol, encerrar)', async () => {
    const { chefe } = await cenario()
    await chefe.post('/api/grupos/1/matches', novaPartida)
    await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)
    await chefe.patch('/api/grupos/1/matches/1/iniciar')
    await chefe.patch('/api/grupos/1/matches/1/cancelar')

    expect((await chefe.put('/api/grupos/1/matches/1/escalacao', escalacaoCompleta)).status).toBe(422)
    expect((await chefe.patch('/api/grupos/1/matches/1/iniciar')).status).toBe(422)
    expect((await chefe.post('/api/grupos/1/matches/1/gols', { scorerId: 1 })).status).toBe(422)
    expect((await chefe.patch('/api/grupos/1/matches/1/encerrar')).status).toBe(422)
  })

  it('partida cancelada fica de fora do histórico, das estatísticas e do ranking', async () => {
    const { chefe, maria } = await cenario()
    // Partida 1: jogada e encerrada (A vence por 1x0). Partida 2: com gol, mas cancelada.
    for (const id of [1, 2]) {
      await chefe.post('/api/grupos/1/matches', novaPartida)
      await chefe.put(`/api/grupos/1/matches/${id}/escalacao`, escalacaoCompleta)
      await chefe.patch(`/api/grupos/1/matches/${id}/iniciar`)
      await chefe.post(`/api/grupos/1/matches/${id}/gols`, { scorerId: 1 })
    }
    await chefe.patch('/api/grupos/1/matches/1/encerrar')
    await chefe.patch('/api/grupos/1/matches/2/cancelar')

    const historico = (await maria.get('/api/grupos/1/matches/historico')).body.data
    const stats = (await maria.get('/api/grupos/1/players/1/stats')).body.data
    const ranking = (await maria.get('/api/grupos/1/rankings')).body.data

    expect(historico.items.map((p) => p.id)).toEqual([1])
    expect(stats).toMatchObject({ matches: 1, goals: 1 })
    expect(ranking.artilharia[0]).toMatchObject({ playerId: 1, goals: 1 })
  })
})
