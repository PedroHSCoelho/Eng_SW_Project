import { Router } from 'express'

const router = Router()

// GET /api/health -> confirma que o servidor está de pé
router.get('/', (req, res) => {
  res.json({ status: 'ok', hora: new Date().toISOString() })
})

// GET /api/health/db -> confirma que o banco de dados responde
router.get('/db', async (req, res) => {
  try {
    const { default: prisma } = await import('../db.js')
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', banco: 'conectado' })
  } catch (erro) {
    res.status(503).json({ status: 'erro', banco: 'indisponível' })
  }
})

export default router
