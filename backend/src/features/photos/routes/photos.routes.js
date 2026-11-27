// Casca HTTP das fotos. Montado dentro de /api/grupos/:grupoId ANTES do router de jogadores,
// que só deixa admin escrever: aqui o próprio jogador também troca a sua foto.
//
// A imagem viaja em binário puro (não em JSON/base64): PUT com Content-Type image/jpeg e os
// bytes no corpo. O express.raw lê esses bytes num Buffer, com limite de tamanho.
import express, { Router } from 'express'
import { ValidationError } from '../../../errors/AppError.js'
import { TAMANHO_MAXIMO_DA_FOTO } from '../core/photos.core.js'

function lerId(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Id inválido')
  return id
}

const lerImagem = express.raw({ type: 'image/*', limit: TAMANHO_MAXIMO_DA_FOTO })

export function criarPhotosRouter(service) {
  const router = Router()

  // [{ playerId, version }] de quem tem foto no grupo.
  router.get('/players/fotos', async (req, res) => {
    res.json({ data: await service.listar(req.participacao) })
  })

  // A imagem. "private": só o navegador de quem pediu guarda (a foto é do grupo, não é pública).
  // A URL leva ?v=<version>; quando a foto muda, a URL muda, então o cache pode ser longo.
  router.get('/players/:id/foto', async (req, res) => {
    const foto = await service.ver(req.participacao, lerId(req))
    res.set('Content-Type', foto.mimeType)
    res.set('Cache-Control', 'private, max-age=31536000, immutable')
    res.send(Buffer.from(foto.data))
  })

  router.put('/players/:id/foto', lerImagem, async (req, res) => {
    res.json({ data: await service.trocar(req.participacao, lerId(req), req.body) })
  })

  router.delete('/players/:id/foto', async (req, res) => {
    await service.remover(req.participacao, lerId(req))
    res.status(204).end()
  })

  return router
}
