// Nota do admin (0 a 5, de 0,5 em 0,5) pela API completa: só admin dá e só admin vê.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]
const jogadores = [
  { id: 1, name: 'José da Silva', nickname: 'Zé', nicknameKey: 'zé', position: 'FORWARD', active: true },
  { id: 2, name: 'Roberto Lima', nickname: 'Beto', nicknameKey: 'beto', position: 'GOALKEEPER', active: true },
]

async function cenario() {
  const ctx = montarApp({ jogadores })
  const quem = {}
  for (const nome of ['Chefe', 'Maria']) {
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
    const cookie = cookieDe(res)
    quem[nome.toLowerCase()] = {
      get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
      patch: (url, corpo) => request(ctx.app).patch(url).set('Cookie', cookie).send(corpo),
    }
  }
  ctx.participacaoDe('chefe@x.com').role = 'ORGANIZER'
  return { ...ctx, ...quem }
}

describe('nota do admin', () => {
  it('admin dá nota com meio ponto (200) e vê a nota na lista e no jogador', async () => {
    const { chefe } = await cenario()

    const res = await chefe.patch('/api/grupos/1/players/1/nota', { skill: 3.5 })

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ id: 1, nickname: 'Zé', skill: 3.5 })
    const lista = (await chefe.get('/api/grupos/1/players')).body.data
    expect(lista.map((j) => [j.id, j.skill])).toEqual([[1, 3.5], [2, null]])
    expect((await chefe.get('/api/grupos/1/players/1')).body.data.skill).toBe(3.5)
  })

  it('0, 0,5 e 5 valem; null apaga a nota', async () => {
    const { chefe } = await cenario()
    for (const skill of [0, 0.5, 5]) expect((await chefe.patch('/api/grupos/1/players/1/nota', { skill })).body.data.skill).toBe(skill)
    expect((await chefe.patch('/api/grupos/1/players/1/nota', { skill: null })).body.data.skill).toBeNull()
  })

  it('fora da escala ou fora do meio ponto -> 400', async () => {
    const { chefe } = await cenario()
    for (const skill of [3.3, -0.5, 5.5, '4', undefined]) {
      const res = await chefe.patch('/api/grupos/1/players/1/nota', skill === undefined ? {} : { skill })
      expect(res.status).toBe(400)
    }
  })

  it('membro não dá nota (403) e NÃO vê a nota de ninguém', async () => {
    const { chefe, maria } = await cenario()
    await chefe.patch('/api/grupos/1/players/1/nota', { skill: 4 })

    expect((await maria.patch('/api/grupos/1/players/1/nota', { skill: 5 })).status).toBe(403)
    const lista = (await maria.get('/api/grupos/1/players')).body.data
    expect(lista.every((j) => !('skill' in j))).toBe(true)
    expect('skill' in (await maria.get('/api/grupos/1/players/1')).body.data).toBe(false)
  })

  it('jogador de outro grupo -> 404', async () => {
    const { chefe } = await cenario()
    expect((await chefe.patch('/api/grupos/1/players/99/nota', { skill: 3 })).status).toBe(404)
  })
})
