// Fotos dos jogadores pela API completa: enviar em binário, ver, listar versões, remover,
// quem pode e isolamento entre grupos.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]
const jogadores = [
  { id: 1, name: 'José da Silva', nickname: 'Zé', nicknameKey: 'zé', position: 'FORWARD', active: true },
  { id: 2, name: 'Roberto Lima', nickname: 'Beto', nicknameKey: 'beto', position: 'GOALKEEPER', active: true },
  { id: 3, name: 'Fora do Grupo', nickname: 'Outro', nicknameKey: 'outro', position: 'DEFENDER', active: true, groupId: 2 },
]
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 7)])
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 9)])

async function cenario() {
  const ctx = montarApp({ jogadores })
  ctx.groupsRepo.adicionarGrupo({ name: 'Outro grupo', inviteCode: 'OUTRO234' })
  const quem = {}
  for (const nome of ['Chefe', 'Maria', 'Visita']) {
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
    const cookie = cookieDe(res)
    quem[nome.toLowerCase()] = {
      get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
      put: (url, bytes, tipo = 'image/jpeg') =>
        request(ctx.app).put(url).set('Cookie', cookie).set('Content-Type', tipo).send(bytes),
      del: (url) => request(ctx.app).delete(url).set('Cookie', cookie),
    }
  }
  ctx.participacaoDe('chefe@x.com').role = 'ORGANIZER'
  ctx.participacaoDe('maria@x.com').playerId = 2 // Maria joga como Beto
  return { ...ctx, ...quem }
}

describe('fotos dos jogadores', () => {
  it('admin envia a foto (200), ela aparece na lista de versões e volta igual, com o tipo certo', async () => {
    const { chefe, maria } = await cenario()

    const res = await chefe.put('/api/grupos/1/players/1/foto', JPEG)

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ playerId: 1, version: expect.any(Number) })
    expect((await maria.get('/api/grupos/1/players/fotos')).body.data).toEqual([res.body.data])
    const foto = await maria.get(`/api/grupos/1/players/1/foto?v=${res.body.data.version}`).buffer(true)
    expect(foto.status).toBe(200)
    expect(foto.headers['content-type']).toBe('image/jpeg')
    expect(foto.headers['cache-control']).toContain('private')
    expect(Buffer.compare(foto.body, JPEG)).toBe(0)
  })

  it('trocar a foto muda a versão (o navegador busca a nova)', async () => {
    const { chefe } = await cenario()
    const v1 = (await chefe.put('/api/grupos/1/players/1/foto', JPEG)).body.data.version
    const v2 = (await chefe.put('/api/grupos/1/players/1/foto', PNG, 'image/png')).body.data.version

    expect(v2).not.toBe(v1)
    expect((await chefe.get('/api/grupos/1/players/1/foto')).headers['content-type']).toBe('image/png')
  })

  it('o próprio jogador troca e tira a SUA foto', async () => {
    const { maria } = await cenario()

    expect((await maria.put('/api/grupos/1/players/2/foto', JPEG)).status).toBe(200)
    expect((await maria.del('/api/grupos/1/players/2/foto')).status).toBe(204)
    expect((await maria.get('/api/grupos/1/players/2/foto')).status).toBe(404)
    expect((await maria.get('/api/grupos/1/players/fotos')).body.data).toEqual([])
  })

  it('membro não mexe na foto de outro jogador (403)', async () => {
    const { chefe, maria, visita } = await cenario()
    await chefe.put('/api/grupos/1/players/1/foto', JPEG)

    expect((await maria.put('/api/grupos/1/players/1/foto', PNG, 'image/png')).status).toBe(403)
    expect((await visita.del('/api/grupos/1/players/1/foto')).status).toBe(403)
    expect((await chefe.get('/api/grupos/1/players/1/foto')).headers['content-type']).toBe('image/jpeg')
  })

  it('arquivo que não é imagem ou sem Content-Type de imagem -> 400', async () => {
    const { chefe } = await cenario()

    expect((await chefe.put('/api/grupos/1/players/1/foto', Buffer.from('<svg></svg> fingindo ser jpeg'))).status).toBe(400)
    const semTipo = await chefe.put('/api/grupos/1/players/1/foto', JSON.stringify({ foto: 'x' }), 'application/json')
    expect(semTipo.status).toBe(400)
  })

  it('acima de 200 KB -> 413, e nada é gravado', async () => {
    const { chefe } = await cenario()
    const grande = Buffer.concat([JPEG, Buffer.alloc(201 * 1024)])

    const res = await chefe.put('/api/grupos/1/players/1/foto', grande)

    expect(res.status).toBe(413)
    expect(res.body.erro).toBeTruthy()
    expect((await chefe.get('/api/grupos/1/players/fotos')).body.data).toEqual([])
  })

  it('jogador sem foto, inexistente ou de outro grupo -> 404', async () => {
    const { chefe } = await cenario()

    expect((await chefe.get('/api/grupos/1/players/1/foto')).status).toBe(404)
    expect((await chefe.get('/api/grupos/1/players/99/foto')).status).toBe(404)
    expect((await chefe.put('/api/grupos/1/players/3/foto', JPEG)).status).toBe(404)
  })

  it('a lista de versões só mostra jogadores do grupo', async () => {
    const { chefe, photosRepo } = await cenario()
    await photosRepo.salvar(3, { mimeType: 'image/jpeg', data: JPEG }) // foto no outro grupo
    await chefe.put('/api/grupos/1/players/2/foto', JPEG)

    expect((await chefe.get('/api/grupos/1/players/fotos')).body.data.map((f) => f.playerId)).toEqual([2])
  })

  it('sem login -> 401', async () => {
    const { app } = await cenario()
    expect((await request(app).get('/api/grupos/1/players/fotos')).status).toBe(401)
  })
})
