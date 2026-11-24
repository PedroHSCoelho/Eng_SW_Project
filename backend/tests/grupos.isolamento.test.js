// Isolamento entre grupos, com o app COMPLETO e repositórios em memória.
// Dois grupos criados pela API: "Quinta" (Ana organiza) e "Firma" (Bia organiza), cada um com
// 6 jogadores e uma partida finalizada. Nada de um grupo pode aparecer ou ser usado no outro.
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { montarApp } from './helpers/appDeTeste.js'

const cookieDe = (res) => res.headers['set-cookie']?.[0]?.split(';')[0]
const posicoes = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD', 'DEFENDER', 'MIDFIELDER']

async function cenario() {
  const ctx = montarApp({ comGrupoDeTeste: false, agora: () => new Date('2026-11-21T12:00:00Z') })
  const api = async (nome) => {
    const res = await request(ctx.app)
      .post('/api/auth/register')
      .send({ name: nome, email: `${nome.toLowerCase()}@x.com`, password: 'senha-forte-1' })
    const cookie = cookieDe(res)
    return {
      get: (url) => request(ctx.app).get(url).set('Cookie', cookie),
      post: (url, corpo) => request(ctx.app).post(url).set('Cookie', cookie).send(corpo),
      put: (url, corpo) => request(ctx.app).put(url).set('Cookie', cookie).send(corpo),
      patch: (url) => request(ctx.app).patch(url).set('Cookie', cookie),
    }
  }

  // Monta um grupo: organizador cria, cadastra 6 jogadores e joga uma partida 1 x 0.
  async function montarGrupo(organizador, nome, prefixo) {
    const grupo = (await organizador.post('/api/grupos', { name: nome })).body.data
    const base = `/api/grupos/${grupo.id}`
    const ids = []
    for (let i = 1; i <= 6; i++) {
      const res = await organizador.post(`${base}/players`, { name: `${prefixo} ${i}`, nickname: `${prefixo}${i}`, position: posicoes[i - 1] })
      ids.push(res.body.data.id)
    }
    const partida = (await organizador.post(`${base}/matches`, { date: '2026-11-20T19:00:00-03:00', location: nome })).body.data
    await organizador.put(`${base}/matches/${partida.id}/escalacao`, { teamA: ids.slice(0, 3), teamB: ids.slice(3) })
    await organizador.patch(`${base}/matches/${partida.id}/iniciar`)
    await organizador.post(`${base}/matches/${partida.id}/gols`, { scorerId: ids[0] })
    await organizador.patch(`${base}/matches/${partida.id}/encerrar`)
    return { grupo, base, ids, partidaId: partida.id }
  }

  const ana = await api('Ana')
  const bia = await api('Bia')
  const quinta = await montarGrupo(ana, 'Quinta', 'Q')
  const firma = await montarGrupo(bia, 'Firma', 'F')
  return { ...ctx, ana, bia, quinta, firma }
}

describe('um grupo não enxerga o outro', () => {
  it('organizadora de um grupo recebe 404 em tudo do outro grupo', async () => {
    const { ana, firma } = await cenario()
    for (const url of ['', '/players', '/matches', '/matches/historico', '/rankings', '/membros']) {
      expect((await ana.get(`${firma.base}${url}`)).status).toBe(404)
    }
    expect((await ana.post(`${firma.base}/players`, { name: 'Intruso', nickname: 'Intruso', position: 'FORWARD' })).status).toBe(404)
  })

  it('listas, histórico e ranking só trazem o que é do grupo', async () => {
    const { ana, quinta } = await cenario()

    const jogadores = (await ana.get(`${quinta.base}/players`)).body.data
    const partidas = (await ana.get(`${quinta.base}/matches`)).body.data
    const historico = (await ana.get(`${quinta.base}/matches/historico`)).body.data
    const ranking = (await ana.get(`${quinta.base}/rankings`)).body.data

    expect(jogadores.map((j) => j.nickname)).toEqual(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'])
    expect(partidas.map((p) => p.location)).toEqual(['Quinta'])
    expect(historico.items.map((p) => p.location)).toEqual(['Quinta'])
    expect(JSON.stringify(ranking)).not.toMatch(/"F\d"/)
  })

  it('id de partida ou jogador de outro grupo, usado pela URL do MEU grupo, dá 404', async () => {
    const { ana, quinta, firma } = await cenario()
    expect((await ana.get(`${quinta.base}/matches/${firma.partidaId}`)).status).toBe(404)
    expect((await ana.get(`${quinta.base}/players/${firma.ids[0]}`)).status).toBe(404)
    expect((await ana.get(`${quinta.base}/players/${firma.ids[0]}/stats`)).status).toBe(404)
    expect((await ana.get(`${quinta.base}/players/${firma.ids[0]}/ratings`)).status).toBe(404)
    expect((await ana.get(`${quinta.base}/matches/${firma.partidaId}/destaque`)).status).toBe(404)
  })

  it('não escala nem sorteia jogador de outro grupo (vira "não existe")', async () => {
    const { ana, quinta, firma } = await cenario()
    const nova = (await ana.post(`${quinta.base}/matches`, { date: '2026-11-27T19:00:00-03:00', location: 'Quinta' })).body.data

    const escalacao = await ana.put(`${quinta.base}/matches/${nova.id}/escalacao`, {
      teamA: quinta.ids.slice(0, 3),
      teamB: [quinta.ids[3], quinta.ids[4], firma.ids[0]],
    })
    const sorteio = await ana.post(`${quinta.base}/sorteio`, { playerIds: [...quinta.ids.slice(0, 5), firma.ids[0]] })

    expect(escalacao.status).toBe(422)
    expect(escalacao.body.erro).toBe(`Jogador ${firma.ids[0]} não existe`)
    expect(sorteio.status).toBe(422)
    expect(sorteio.body.erro).toBe(`Jogador ${firma.ids[0]} não existe`)
  })

  it('apelido igual em grupos diferentes é permitido', async () => {
    const { ana, quinta } = await cenario()
    const res = await ana.post(`${quinta.base}/players`, { name: 'Outro', nickname: 'F1', position: 'FORWARD' })
    expect(res.status).toBe(201)
  })

  it('ser organizador em um grupo não dá poder em outro de que participo como membro', async () => {
    const { ana, bia, firma } = await cenario()
    const convite = (await bia.get(firma.base)).body.data.inviteCode
    await ana.post(`/api/convites/${convite}/entrar`, { nickname: 'Aninha', position: 'FORWARD' })

    expect((await ana.get(`${firma.base}/players`)).status).toBe(200)
    expect((await ana.post(`${firma.base}/players`, { name: 'Novo', nickname: 'Novo', position: 'FORWARD' })).status).toBe(403)
  })
})
