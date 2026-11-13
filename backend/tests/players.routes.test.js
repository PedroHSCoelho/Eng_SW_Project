import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { errorHandler, notFound } from '../src/middlewares/errorHandler.js'
import { criarPlayersService } from '../src/features/players/players.service.js'
import { criarPlayersRouter } from '../src/features/players/players.routes.js'

// Repositório em memória: comporta-se como o banco para o que a API precisa.
// Serviço, rotas e errorHandler são os REAIS; só o banco é trocado.
function criarRepoEmMemoria() {
  let proximoId = 1
  const jogadores = []
  return {
    listar: async ({ busca, apenasAtivos }) =>
      jogadores.filter(
        (j) =>
          (!apenasAtivos || j.active) &&
          (!busca || j.nickname.toLowerCase().includes(busca.toLowerCase()) ||
            j.name.toLowerCase().includes(busca.toLowerCase())),
      ),
    buscarPorId: async (id) => jogadores.find((j) => j.id === id) ?? null,
    buscarPorNicknameKey: async (key) => jogadores.find((j) => j.nicknameKey === key) ?? null,
    criar: async (dados) => {
      const jogador = { id: proximoId++, active: true, ...dados }
      jogadores.push(jogador)
      return jogador
    },
    atualizar: async (id, dados) => Object.assign(jogadores.find((j) => j.id === id), dados),
    excluir: async (id) => jogadores.splice(jogadores.findIndex((j) => j.id === id), 1),
    possuiPartidas: async (id) => id === 1, // o jogador 1 "já jogou"
  }
}

const novo = { name: 'João Silva', nickname: 'Zé', position: 'FORWARD' }
let app

beforeEach(() => {
  app = express()
  app.use(express.json())
  app.use('/api/players', criarPlayersRouter(criarPlayersService(criarRepoEmMemoria())))
  app.use(notFound)
  app.use(errorHandler)
})

describe('POST /api/players', () => {
  it('cria o jogador: 201 e { data } com nicknameKey calculado pelo servidor', async () => {
    const res = await request(app).post('/api/players').send({ ...novo, nicknameKey: 'hack' })

    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ id: 1, nickname: 'Zé', nicknameKey: 'zé', active: true })
  })

  it('400 com { erro } quando o nome é inválido', async () => {
    const res = await request(app).post('/api/players').send({ ...novo, name: 'J' })

    expect(res.status).toBe(400)
    expect(res.body.erro).toMatch(/nome/i)
  })

  it('400 quando o corpo está vazio (nunca 500)', async () => {
    const res = await request(app).post('/api/players')

    expect(res.status).toBe(400)
  })

  it('422 quando o apelido já existe, sem diferenciar maiúsculas', async () => {
    await request(app).post('/api/players').send(novo)
    const res = await request(app).post('/api/players').send({ ...novo, nickname: 'ZÉ' })

    expect(res.status).toBe(422)
    expect(res.body.erro).toBe('Apelido já está em uso')
  })
})

describe('GET /api/players', () => {
  it('lista os jogadores e filtra por busca e por ativos', async () => {
    await request(app).post('/api/players').send(novo)
    await request(app).post('/api/players').send({ ...novo, name: 'Maria', nickname: 'Mari' })
    await request(app).patch('/api/players/2/inativar')

    const todos = await request(app).get('/api/players')
    const busca = await request(app).get('/api/players?busca=zé')
    const ativos = await request(app).get('/api/players?ativos=true')

    expect(todos.body.data).toHaveLength(2)
    expect(busca.body.data).toHaveLength(1)
    expect(ativos.body.data.map((j) => j.nickname)).toEqual(['Zé'])
  })
})

describe('GET /api/players/:id', () => {
  it('200 com o jogador', async () => {
    await request(app).post('/api/players').send(novo)
    const res = await request(app).get('/api/players/1')

    expect(res.status).toBe(200)
    expect(res.body.data.nickname).toBe('Zé')
  })

  it('404 quando não existe', async () => {
    const res = await request(app).get('/api/players/99')

    expect(res.status).toBe(404)
    expect(res.body.erro).toBe('Jogador não encontrado')
  })

  it.each(['abc', '0', '-1', '1.5'])('400 para id inválido (%s)', async (id) => {
    const res = await request(app).get(`/api/players/${id}`)

    expect(res.status).toBe(400)
    expect(res.body.erro).toBe('Id inválido')
  })
})

describe('PUT /api/players/:id', () => {
  it('atualiza nome, apelido e posição', async () => {
    await request(app).post('/api/players').send(novo)
    const res = await request(app)
      .put('/api/players/1')
      .send({ name: 'João S.', nickname: 'Zeca', position: 'DEFENDER' })

    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ nickname: 'Zeca', nicknameKey: 'zeca', position: 'DEFENDER' })
  })

  it('422 ao tentar usar o apelido de outro jogador', async () => {
    await request(app).post('/api/players').send(novo)
    await request(app).post('/api/players').send({ ...novo, name: 'Maria', nickname: 'Mari' })
    const res = await request(app).put('/api/players/2').send({ ...novo, name: 'Maria' })

    expect(res.status).toBe(422)
  })
})

describe('PATCH /api/players/:id/inativar', () => {
  it('marca como inativo', async () => {
    await request(app).post('/api/players').send(novo)
    const res = await request(app).patch('/api/players/1/inativar')

    expect(res.status).toBe(200)
    expect(res.body.data.active).toBe(false)
  })
})

describe('DELETE /api/players/:id', () => {
  it('422 para quem já tem partida (o jogador 1 do repositório falso)', async () => {
    await request(app).post('/api/players').send(novo)
    const res = await request(app).delete('/api/players/1')

    expect(res.status).toBe(422)
    expect(res.body.erro).toMatch(/inative/i)
  })

  it('204 para quem nunca jogou', async () => {
    await request(app).post('/api/players').send(novo)
    await request(app).post('/api/players').send({ ...novo, nickname: 'Mari' })
    const res = await request(app).delete('/api/players/2')

    expect(res.status).toBe(204)
  })
})
